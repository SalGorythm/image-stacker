import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { cantOpen, loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages } from '../lib/files';
import { normaliseFiles } from '../lib/heic';
import type { OcrLang } from '../lib/ocr';
import { saveBlob } from '../lib/render';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

const LANGS: [string, OcrLang[]][] = [
  ['English', ['eng']],
  ['English + Urdu', ['eng', 'urd']],
  ['English + Arabic', ['eng', 'ara']],
  ['English + Hindi', ['eng', 'hin']],
  ['Urdu', ['urd']],
  ['Arabic', ['ara']],
  ['Hindi', ['hin']],
];

interface Entry { id: number; name: string; url: string; img: HTMLImageElement; text: string | null; confidence: number }
let seq = 0;

/** Copy text: reads the text in photos and screenshots on this device, in English, Urdu, Arabic or Hindi. */
export function TextTool({ intakeRef, toast, show }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('ocr-lang') || 'English'; } catch { return 'English'; } });
  const [progress, setProgress] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const langs = (LANGS.find(l => l[0] === lang) ?? LANGS[0])[1];

  useEffect(() => { try { localStorage.setItem('ocr-lang', lang); } catch { /* ignore */ } }, [lang]);

  const read = async (list: Entry[], ls: OcrLang[]) => {
    const { readText } = await import('../lib/ocr');
    for (const [i, e] of list.entries()) {
      setProgress(`Reading ${i + 1} of ${list.length}…${i === 0 ? ' (the first time downloads the reader, a few MB)' : ''}`);
      try {
        const r = await readText(e.img, ls, p => setProgress(`Reading ${i + 1} of ${list.length}… ${Math.round(p * 100)}%`));
        setEntries(prev => prev.map(x => (x.id === e.id ? { ...x, text: r.text.trim(), confidence: r.confidence } : x)));
      } catch {
        setEntries(prev => prev.map(x => (x.id === e.id ? { ...x, text: '' } : x)));
        show('Could not read text in that image.', { err: true });
      }
    }
    setProgress('');
  };

  const add = async (incoming: File[]) => {
    const files = (await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }))).filter(f => f.type.startsWith('image/'));
    if (!files.length) return show('Add photos or screenshots with text.', { err: true });
    const out: Entry[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try { out.push({ id: ++seq, name: f.name || `image-${seq}`, url, img: await loadImg(url), text: null, confidence: 0 }); }
      catch { URL.revokeObjectURL(url); show(cantOpen(f.name), { err: true }); }
    }
    setEntries(p => [...p, ...out]);
    read(out, langs);
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };
  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); show('Text copied.'); }
    catch { show('This browser blocked copying. Select the text and copy it instead.', { err: true }); }
  };
  const all = entries.filter(e => e.text).map(e => (entries.length > 1 ? `— ${e.name} —\n${e.text}` : e.text)).join('\n\n');
  const rtl = langs.includes('urd') || langs.includes('ara');

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Copy text</h1>
        <p>Get the text out of photos and screenshots, in English, Urdu, Arabic or Hindi, so you can copy, edit or forward it. Read on this device; nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Images">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos or screenshots" accept="image/*,.heic,.heif" />
          <div className="settings">
            <label htmlFor="ocr-lang">Language</label>
            <select id="ocr-lang" value={lang} onChange={e => setLang(e.target.value)}>
              {LANGS.map(([l]) => <option key={l}>{l}</option>)}
            </select>
          </div>
          {rtl && <p className="hint warn-text">Urdu and Arabic are read less reliably than English on this device: Nastaliq script and ligatures such as بسم الله are often missed. Check the text before you use it.</p>}
          {entries.length > 0 && <button className="btn sm" disabled={!!progress} onClick={() => { setEntries(p => p.map(e => ({ ...e, text: null }))); read(entries, langs); }}>Read again in {lang}</button>}
          <p className="hint">Clear, straight, well-lit text reads best. For paper, use Scan first, then read the cleaned page.</p>
        </section>
        <section className="panel preview" aria-label="Text">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Text{progress ? ` · ${progress}` : ''}</span>
            {all && <div className="row">
              <button className="btn sm primary" onClick={() => copy(all)}>Copy all</button>
              <button className="btn sm" onClick={() => saveBlob(new Blob([all], { type: 'text/plain;charset=utf-8' }), 'text.txt')}>Download .txt</button>
            </div>}
          </div>
          {!entries.length && <p className="placeholder">Add an image and its text shows up here.</p>}
          <ul className="fit-list">
            {entries.map(e => (
              <li key={e.id} className="text-row">
                <img src={e.url} alt="" className="text-thumb" />
                <div className="text-body">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="name">{e.name}</span>
                    <span className="row">
                      {e.text && <button className="btn sm" onClick={() => copy(e.text!)}>Copy</button>}
                      <button className="icon del" aria-label={`Remove ${e.name}`} onClick={() => setEntries(p => p.filter(x => x.id !== e.id))}>✕</button>
                    </span>
                  </div>
                  {e.text === null ? <p className="hint">Reading…</p> : e.text ? (
                    <textarea dir="auto" rows={Math.min(14, Math.max(3, e.text.split('\n').length + 1))} value={e.text} onChange={ev => setEntries(p => p.map(x => (x.id === e.id ? { ...x, text: ev.target.value } : x)))} />
                  ) : <p className="hint">No text found.</p>}
                  {e.text && e.confidence < 60 && <p className="hint warn-text">Low confidence ({Math.round(e.confidence)}%). Check the text carefully.</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className={'toast' + (toast?.err ? ' err' : '')} role="status">
            {toast?.msg}
            {toast?.action && <button className="toast-act" onClick={toast.action.fn}>{toast.action.label}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
