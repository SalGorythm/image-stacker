import type { Format } from './types';

export const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const PASTE_KEY = isMac ? '⌘V' : 'Ctrl+V';
export const NO_IMAGE = 'No image on the clipboard. Copy an image or take a screenshot first.';

/** Images (and PDFs) from a paste event: Finder/Explorer file copies first, then raw image data. */
export function filesFromPaste(dt: DataTransfer, isPdf: (f: File) => boolean): File[] {
  let files = [...dt.files].filter(f => f.type.startsWith('image/') || isPdf(f));
  if (!files.length)
    files = [...dt.items]
      .filter(i => i.kind === 'file' && i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter((f): f is File => !!f);
  return files;
}

/** Reads images via the async Clipboard API (the Paste button). Throws if access is blocked. */
export async function readClipboardImages(): Promise<File[]> {
  const files: File[] = [];
  for (const ci of await navigator.clipboard.read()) {
    const t = ci.types.find(t => t.startsWith('image/'));
    if (t) files.push(new File([await ci.getType(t)], '', { type: t }));
  }
  return files;
}

export function baseName(fname: string) {
  return fname.trim().replace(/\.(png|jpe?g|zip|pdf)$/i, '') || 'stacked';
}
export const extOf = (f: Format) => (f === 'jpg' ? 'jpg' : f === 'pdf' ? 'pdf' : 'png');

/** "stacked.png" for a single stack, "stacked-02 (5-8).png" when there are several. */
export function fileName(fname: string, fmt: Format, i: number, labels: string[]) {
  if (labels.length < 2) return `${baseName(fname)}.${extOf(fmt)}`;
  return `${baseName(fname)}-${String(i + 1).padStart(String(labels.length).length, '0')} (${labels[i]}).${extOf(fmt)}`;
}

export function makeSample(n: number) {
  const c = document.createElement('canvas');
  c.width = 1232;
  c.height = 693;
  const x = c.getContext('2d')!;
  x.fillStyle = '#e9d3a8'; x.fillRect(0, 0, 1232, 693);
  x.fillStyle = '#fafafa'; x.fillRect(50, 50, 1132, 590);
  x.strokeStyle = '#7a9a3a'; x.lineWidth = 2; x.strokeRect(62, 62, 1108, 566);
  x.textAlign = 'center';
  x.fillStyle = '#b22222'; x.font = 'bold 30px sans-serif'; x.fillText('EXAMPLE SLIDE', 616, 140);
  x.fillStyle = '#222'; x.font = 'bold 64px Georgia,serif'; x.fillText('Question ' + n, 616, 330);
  x.fillStyle = '#666'; x.font = '28px sans-serif'; x.fillText('Replace with your own images', 616, 400);
  return c;
}

/** Files the service worker parked after another app shared them into the installed app. */
export async function takeSharedFiles(): Promise<File[]> {
  if (!new URLSearchParams(location.search).has('shared') || !('caches' in window)) return [];
  history.replaceState(null, '', location.pathname);
  const cache = await caches.open('shared-files');
  const files: File[] = [];
  for (const req of await cache.keys()) {
    const res = await cache.match(req);
    if (res) {
      const name = decodeURIComponent(res.headers.get('x-name') || '') || 'shared';
      files.push(new File([await res.blob()], name, { type: res.headers.get('content-type') || '' }));
    }
    await cache.delete(req);
  }
  return files;
}

/** A small JPEG of an image for list rows (2× the row's 56px for sharp screens). Falls back to the full image. */
export async function makeThumb(img: HTMLImageElement | HTMLCanvasElement, fallback: string): Promise<string> {
  try {
    const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    const k = Math.min(1, 160 / W);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * k));
    c.height = Math.max(1, Math.round(H * k));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.8));
    return b ? URL.createObjectURL(b) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * macOS blocks an installed web app from reading files kept inside other apps (WhatsApp Desktop,
 * Photos, Mail). The file still arrives but can't be read, so check before using it and explain.
 */
let onBlocked: (names: string[]) => void = () => {};
export const setBlockedHandler = (fn: (names: string[]) => void) => { onBlocked = fn; };

export const blockedMessage = (names: string[]) =>
  `Couldn't read ${names.length === 1 ? names[0] : `${names.length} files`}. On a Mac, the installed app can't open files kept inside other apps such as WhatsApp or Photos. Save it to Downloads or Desktop first and add it from there, or use PhotoSize in the browser.`;

/** Keeps only the files this app is allowed to read, reporting the rest once. */
export async function readableOnly(files: File[]): Promise<File[]> {
  const ok: File[] = [], blocked: string[] = [];
  for (const f of files) {
    try { await f.slice(0, 16).arrayBuffer(); ok.push(f); } catch { blocked.push(f.name || 'that file'); }
  }
  if (blocked.length) onBlocked(blocked);
  return ok;
}

/** One message for a file that won't open, covering the Mac installed-app case where macOS blocks it. */
export const cantOpen = (name: string) =>
  `Couldn't open ${name || 'that file'}. If it came from another app (WhatsApp, Photos, Mail) on a Mac, save it to Downloads or Desktop first and add it from there: macOS blocks the installed app from other apps' files.`;
