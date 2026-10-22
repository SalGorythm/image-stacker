import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { cantOpen, loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages } from '../lib/files';
import { handoff } from '../lib/handoff';
import { normaliseFiles } from '../lib/heic';
import { canShareFiles, canvasBlob, saveBlob, zipFiles } from '../lib/render';
import { navigate } from '../hooks';
import { pageH1 } from '../seo/pages';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

interface Photo { id: number; name: string; img: HTMLImageElement; raw: Float32Array | null; out: string }
type Back = 'transparent' | 'white' | 'colour';
let seq = 0;

/**
 * Remove background: cuts the person or product out of a photo on this device (U²-Net-p model),
 * onto transparency, white or a colour.
 */
export function CutoutTool({ intakeRef, toast, show }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [back, setBack] = useState<Back>('white');
  const [colour, setColour] = useState('#dbe8f4');
  const [edge, setEdge] = useState(0);
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const backdrop = () => (back === 'transparent' ? { kind: 'transparent' as const } : { kind: 'colour' as const, colour: back === 'white' ? '#ffffff' : colour });

  const add = async (incoming: File[]) => {
    const files = (await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }))).filter(f => f.type.startsWith('image/'));
    if (!files.length) return show('Add photos (JPG, PNG, HEIC).', { err: true });
    const fresh: Photo[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImg(url);
        // Work on at most 2400 px: plenty for sharing, and kind to phone memory
        const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        fresh.push({ id: ++seq, name: f.name || `photo-${seq}`, img: await loadImg(c.toDataURL('image/png')), raw: null, out: '' });
      } catch { show(cantOpen(f.name), { err: true }); }
      finally { URL.revokeObjectURL(url); }
    }
    setPhotos(p => [...p, ...fresh]);
    const { subjectMask } = await import('../lib/cutout');
    for (const [i, p] of fresh.entries()) {
      setStatus(`Finding the subject in ${i + 1} of ${fresh.length}…${i === 0 ? ' (the first time downloads the model, about 8 MB)' : ''}`);
      try {
        const raw = await subjectMask(p.img);
        setPhotos(ps => ps.map(x => (x.id === p.id ? { ...x, raw } : x)));
      } catch { show('Background removal could not start on this device.', { err: true }); break; }
    }
    setStatus('');
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });

  // Re-draw every cut-out when the background or edge changes
  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    (async () => {
      const { composite, shapeMask } = await import('../lib/cutout');
      for (const p of photos) {
        if (!p.raw) continue;
        const b = await canvasBlob(composite(p.img, shapeMask(p.raw, edge), backdrop()), 'image/png');
        if (!live || !b) return;
        const u = URL.createObjectURL(b);
        urls.push(u);
        setPhotos(ps => ps.map(x => (x.id === p.id ? { ...x, out: u } : x)));
      }
    })();
    return () => { live = false; urls.forEach(u => setTimeout(() => URL.revokeObjectURL(u), 2000)); };
  }, [photos.map(p => p.id + (p.raw ? "r" : "")).join(), back, colour, edge]);

  const files = async () => {
    const { composite, shapeMask } = await import('../lib/cutout');
    const out: File[] = [];
    for (const p of photos.filter(p => p.raw)) {
      const png = back === 'transparent';
      const b = await canvasBlob(composite(p.img, shapeMask(p.raw!, edge), backdrop()), png ? 'image/png' : 'image/jpeg', 0.92);
      out.push(new File([b!], `${p.name.replace(/\.[^.]+$/, '')}-cutout.${png ? 'png' : 'jpg'}`, { type: b!.type }));
    }
    return out;
  };
  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };
  const ready = photos.filter(p => p.out);

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>{pageH1('Remove background')}</h1>
        <p>Cut a person or product out of a photo and put it on white, a colour, or a transparent background. Done on this device: nothing is uploaded, no credits, full size.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Settings">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos" accept="image/*,.heic,.heif" />
          <p className="hint">Works best when the subject stands out clearly from the background. Check the edges before you use it.</p>
          <div className="section">
            <span className="label">New background</span>
            <div className="settings">
              <label>Background</label>
              <div className="inline">
                <div className="seg" role="radiogroup" aria-label="Background">
                  {([['white', 'White'], ['colour', 'Colour'], ['transparent', 'None']] as [Back, string][]).map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={back === k} className={back === k ? 'on' : ''} onClick={() => setBack(k)}>{l}</button>
                  ))}
                </div>
                {back === 'colour' && <input type="color" value={colour} aria-label="Background colour" onChange={e => setColour(e.target.value)} />}
              </div>
              <label htmlFor="cut-edge">Edge</label>
              <div className="inline"><span className="stat">Trim</span><input id="cut-edge" type="range" min={-1} max={1} step={0.05} value={edge} onChange={e => setEdge(Number(e.target.value))} /><span className="stat">Keep</span></div>
            </div>
          </div>
        </section>
        <section className="panel preview" aria-label="Results">
          <span className="label">Results{status ? ` · ${status}` : ''}</span>
          {!photos.length && <p className="placeholder">Add a photo and the cut-out shows up here.</p>}
          <div className="cut-grid">
            {photos.map(p => (
              <figure key={p.id} className={'cut-item' + (back === 'transparent' ? ' checker' : '')}>
                <img src={p.out || p.img.src} alt="" style={{ opacity: p.out ? 1 : 0.4 }} />
                <figcaption className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="name">{p.name}</span>
                  <button className="icon del" aria-label={`Remove ${p.name}`} onClick={() => setPhotos(ps => ps.filter(x => x.id !== p.id))}>✕</button>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="export">
            <button className="btn primary" disabled={!ready.length} onClick={async () => {
              const fs = await files();
              if (fs.length === 1) saveBlob(fs[0], fs[0].name);
              else saveBlob(await zipFiles(fs.map(f => ({ name: f.name, blob: f }))), 'cutouts.zip');
            }}>{ready.length > 1 ? `Download all ${ready.length} (ZIP)` : 'Download'}</button>
            {canShareFiles && <button className="btn" disabled={!ready.length} onClick={async () => {
              try { await navigator.share({ files: await files() }); }
              catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
            }}>Share</button>}
            {ready.length === 1 && back !== 'transparent' && (
              <button className="btn" onClick={async () => { handoff.files = await files(); navigate('/passport-size-photo'); }}>Use for passport photo →</button>
            )}
          </div>
          <div className={'toast' + (toast?.err ? ' err' : '')} role="status">
            {toast?.msg}
            {toast?.action && <button className="toast-act" onClick={toast.action.fn}>{toast.action.label}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
