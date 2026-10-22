import { docs } from './pdf';
import type { Redaction } from './redact';
import { DEFAULT_SETTINGS, type Item, type PdfSrc, type Settings } from './types';

// Images are kept in IndexedDB so an accidental reload doesn't lose them
let dbP: Promise<IDBDatabase> | null = null;
function open() {
  return (dbP ??= new Promise((res, rej) => {
    const r = indexedDB.open('image-stacker', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
async function get<T>(k: string): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = db.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
async function set(k: string, v: unknown) {
  const db = await open();
  return new Promise<void>((res, rej) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(v, k);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

interface Saved {
  items: { id: number; name: string; blob: Blob; src?: PdfSrc; redact?: Redaction[] }[];
  docs?: { id: string; name: string; blob: Blob }[];
  seq: number;
  pasteN: number;
}

export function saveItems(items: Item[], seq: number, pasteN: number) {
  const used = new Set(items.map(it => it.src?.doc).filter(Boolean));
  return set('state', {
    items: items.flatMap(it => (it.blob ? [{ id: it.id, name: it.name, blob: it.blob, src: it.src, redact: it.redact }] : [])),
    docs: [...docs].filter(([id]) => used.has(id)).map(([id, d]) => ({ id, name: d.name, blob: d.blob })),
    seq,
    pasteN,
  } satisfies Saved);
}

export async function loadItems(loadImg: (url: string) => Promise<HTMLImageElement>) {
  const s = await get<Saved>('state');
  if (!s?.items?.length) return null;
  (s.docs || []).forEach(d => docs.set(d.id, { name: d.name, blob: d.blob }));
  const items: Item[] = [];
  for (const r of s.items) {
    try {
      const url = URL.createObjectURL(r.blob);
      items.push({ id: r.id, name: r.name, blob: r.blob, src: r.src, redact: r.redact, url, img: await loadImg(url) });
    } catch { /* skip unreadable */ }
  }
  return items.length ? { items, seq: s.seq || 0, pasteN: s.pasteN || 0 } : null;
}

const SETTINGS_KEY = 'stacker-settings';
const OPTIONS: Partial<Record<keyof Settings, readonly string[]>> = {
  width: ['widest', 'narrowest', 'original'],
  fmt: ['png', 'jpg', 'pdf'],
  quality: ['hd', '4k', 'std', 'whatsapp'],
  gmode: ['all', 'every', 'ranges'],
  gtail: ['rest', 'repeat'],
  captionPos: ['top', 'bottom'],
  arrange: ['vertical', 'horizontal', 'grid'],
};

/** Reads saved settings, including the older single-file version's format (gsize as "4,3,5"). */
export function loadSettings(): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, trim: { ...DEFAULT_SETTINGS.trim } };
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (raw.gap != null && !isNaN(+raw.gap)) s.gap = +raw.gap;
    if (typeof raw.gapColor === 'string') s.gapColor = raw.gapColor;
    for (const k of Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]) {
      if (OPTIONS[k]!.includes(raw[k])) (s as unknown as Record<string, string>)[k] = raw[k];
    }
    if (Array.isArray(raw.sizes)) s.sizes = raw.sizes.map(String);
    else if (typeof raw.gsize === 'string') s.sizes = raw.gsize.split(',');
    if (typeof raw.granges === 'string') s.granges = raw.granges;
    if (typeof raw.fname === 'string') s.fname = raw.fname;
    if (raw.trim && typeof raw.trim === 'object')
      for (const k of ['t', 'b', 'l', 'r'] as const) s.trim[k] = Math.min(45, Math.max(0, Number(raw.trim[k]) || 0));
    if (typeof raw.autoTrim === 'boolean') s.autoTrim = raw.autoTrim;
    if (typeof raw.caption === 'string') s.caption = raw.caption;
    if (typeof raw.numbers === 'boolean') s.numbers = raw.numbers;
    if (typeof raw.watermark === 'string') s.watermark = raw.watermark;
    if (typeof raw.joinOverlap === 'boolean') s.joinOverlap = raw.joinOverlap;
    if (raw.columns != null) s.columns = Math.min(8, Math.max(1, Math.floor(Number(raw.columns)) || 2));
  } catch { /* private mode or bad JSON */ }
  return s;
}
export function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
