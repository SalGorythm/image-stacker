import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { kb } from '../lib/fitImage';
import { loadImg, NO_IMAGE, PASTE_KEY, readableOnly, readClipboardImages, cantOpen } from '../lib/files';
import { heicToJpeg, isHeic, isImageFile } from '../lib/heic';
import { canShareFiles, canvasBlob, saveBlob, zipFiles } from '../lib/render';
import { pageH1 } from '../seo/pages';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

type Target = 'jpg' | 'png';
interface Entry { id: number; name: string; from: string; img: HTMLImageElement; url: string }
let seq = 0;

const kind = (f: File) => (isHeic(f) ? 'HEIC' : (f.type.split('/')[1] || f.name.split('.').pop() || 'image').toUpperCase().replace('JPEG', 'JPG').replace('SVG+XML', 'SVG'));

/**
 * Convert: opens HEIC (iPhone), WebP, AVIF, PNG or JPG and saves JPG or PNG, which every
 * phone, computer and website accepts. Nothing is uploaded.
 */
export function ConvertTool({ intakeRef, toast, show }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [target, setTarget] = useState<Target>('jpg');
  const [quality, setQuality] = useState(92);
  const [outs, setOuts] = useState<Map<number, File>>(new Map());
  const input = useRef<HTMLInputElement>(null);

  const add = async (files: File[]) => {
    const imgs = (await readableOnly(files)).filter(isImageFile);
    if (!imgs.length) return show('Add photos or images (HEIC, WebP, AVIF, PNG, JPG).', { err: true });
    const out: Entry[] = [];
    for (const f of imgs) {
      try {
        let src = f;
        if (isHeic(f)) { show(`Opening ${f.name}…`, { keep: true }); src = await heicToJpeg(f); }
        const url = URL.createObjectURL(src);
        out.push({ id: ++seq, name: f.name || `image-${seq}`, from: kind(f), img: await loadImg(url), url });
      } catch { show(cantOpen(f.name), { err: true }); }
    }
    if (out.length) { setEntries(p => [...p, ...out]); show(`Added ${out.length} image${out.length > 1 ? 's' : ''}.`); }
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });

  // Re-encode whenever the target format or quality changes
  useEffect(() => {
    let live = true;
    (async () => {
      const next = new Map<number, File>();
      for (const e of entries) {
        const c = document.createElement('canvas');
        c.width = e.img.naturalWidth; c.height = e.img.naturalHeight;
        const x = c.getContext('2d')!;
        if (target === 'jpg') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(e.img, 0, 0);
        const b = await canvasBlob(c, target === 'jpg' ? 'image/jpeg' : 'image/png', quality / 100);
        c.width = c.height = 0;
        if (!live) return;
        if (b) next.set(e.id, new File([b], `${e.name.replace(/\.[^.]+$/, '')}.${target}`, { type: b.type }));
        setOuts(new Map(next));
      }
    })();
    return () => { live = false; };
  }, [entries, target, quality]);

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };
  const ready = entries.map(e => outs.get(e.id)).filter((f): f is File => !!f);
  const saveAll = async () => {
    if (ready.length === 1) return saveBlob(ready[0], ready[0].name);
    saveBlob(await zipFiles(ready.map(f => ({ name: f.name, blob: f }))), `converted-${target}.zip`);
    show(`Saved converted-${target}.zip with ${ready.length} images.`);
  };
  const share = async (files: File[]) => {
    try { await navigator.share({ files }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>{pageH1('Convert')}</h1>
        <p>Open iPhone HEIC photos, WebP or AVIF images that won't open or upload, and save them as JPG or PNG. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Add images">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos to convert" accept="image/*,.heic,.heif,.avif,.webp" />
          <div className="section">
            <span className="label">Save as</span>
            <div className="settings">
              <label>Format</label>
              <div className="seg" role="radiogroup" aria-label="Format">
                <button type="button" role="radio" aria-checked={target === 'jpg'} className={target === 'jpg' ? 'on' : ''} onClick={() => setTarget('jpg')}>JPG</button>
                <button type="button" role="radio" aria-checked={target === 'png'} className={target === 'png' ? 'on' : ''} onClick={() => setTarget('png')}>PNG</button>
              </div>
              {target === 'jpg' && (
                <>
                  <label htmlFor="cv-q">Quality</label>
                  <div className="inline">
                    <input id="cv-q" type="range" min={50} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} />
                    <span className="stat">{quality}%</span>
                  </div>
                </>
              )}
            </div>
            <p className="hint">JPG is smaller and opens everywhere; transparent areas become white. PNG keeps every pixel and transparency, but files are bigger.</p>
          </div>
        </section>
        <section className="panel preview" aria-label="Converted images">
          <span className="label">Converted{entries.length ? ` · ${entries.length}` : ''}</span>
          {!entries.length && <p className="placeholder">Add images to convert them.</p>}
          <ul className="fit-list">
            {entries.map(e => {
              const o = outs.get(e.id);
              return (
                <li key={e.id} className="fit-row">
                  <div className="fit-thumb"><img src={e.url} alt="" /></div>
                  <div className="meta">
                    <div className="name" title={e.name}>{e.name}</div>
                    <div className="dims">{e.from} → {target.toUpperCase()} · {e.img.naturalWidth}×{e.img.naturalHeight}{o ? ` · ${kb(o.size)}` : ' · converting…'}</div>
                  </div>
                  <div className="fit-acts">
                    {o && <button className="btn sm" onClick={() => saveBlob(o, o.name)}>Download</button>}
                    {o && canShareFiles && <button className="btn sm" onClick={() => share([o])}>Share</button>}
                    <button className="icon del" aria-label={`Remove ${e.name}`} onClick={() => setEntries(p => p.filter(x => x.id !== e.id))}>✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {ready.length > 1 && (
            <div className="export">
              <button className="btn primary" onClick={saveAll}>Download all ({ready.length})</button>
              {canShareFiles && <button className="btn" onClick={() => share(ready)}>Share all</button>}
              <button className="btn" onClick={() => setEntries([])}>Clear</button>
            </div>
          )}
          <div className={'toast' + (toast?.err ? ' err' : '')} role="status">
            {toast?.msg}
            {toast?.action && <button className="toast-act" onClick={toast.action.fn}>{toast.action.label}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
