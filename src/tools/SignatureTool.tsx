import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages, cantOpen } from '../lib/files';
import { handoff } from '../lib/handoff';
import { normaliseFiles } from '../lib/heic';
import { canShareFiles, canvasBlob, saveBlob } from '../lib/render';
import { inkMask, renderSignature, type InkColour, type InkMask } from '../lib/signature';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

/** Photos are analysed at most this big on their long side; plenty for a signature, and quick on phones. */
const WORK = 2000;

/**
 * Signature: turns a phone photo of a signature into clean ink on white or transparent,
 * cropped to the ink. Nothing is uploaded or saved.
 */
export function SignatureTool({ intakeRef, toast, show }: Props) {
  const [name, setName] = useState('signature');
  const [src, setSrc] = useState<HTMLCanvasElement | null>(null);
  const [strength, setStrength] = useState(0);
  const [colour, setColour] = useState<InkColour>('black');
  const [transparent, setTransparent] = useState(false);
  const [margin, setMargin] = useState(8);
  const [mask, setMask] = useState<InkMask | null>(null);
  const [preview, setPreview] = useState('');
  const out = useRef<HTMLCanvasElement | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const add = async (incoming: File[]) => {
    const files = await normaliseFiles(incoming.slice(0, 1), n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }));
    if (incoming.length > 1) files.push(...incoming.slice(1));
    const f = files.find(x => x.type.startsWith('image/'));
    if (!f) return show('Add a photo of the signature (JPG or PNG).', { err: true });
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImg(url);
      const k = Math.min(1, WORK / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height);
      setSrc(c);
      setName((f.name || 'signature').replace(/\.[^.]+$/, ''));
      if (files.length > 1) show('Signature works on one photo at a time; the first one is shown.');
    } catch { show(cantOpen(f.name), { err: true }); }
    finally { URL.revokeObjectURL(url); }
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });

  // Finding the ink is the slow part, so it reruns only for a new photo or a new strength
  useEffect(() => {
    if (!src) return;
    const t = setTimeout(() => {
      const d = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height).data;
      setMask(inkMask(d, src.width, src.height, strength));
    }, 120);
    return () => clearTimeout(t);
  }, [src, strength]);

  useEffect(() => {
    if (!src || !mask) return;
    const c = renderSignature(src, mask, { colour, transparent, margin });
    out.current = c;
    let url = '';
    canvasBlob(c, 'image/png').then(b => { if (b) { url = URL.createObjectURL(b); setPreview(url); } });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [src, mask, colour, transparent, margin]);

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };

  /** JPG always has a white background; PNG keeps transparency when chosen. */
  const file = async (type: 'png' | 'jpg') => {
    const c = out.current!;
    let draw = c;
    if (type === 'jpg' && transparent) {
      draw = document.createElement('canvas');
      draw.width = c.width; draw.height = c.height;
      const x = draw.getContext('2d')!;
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0);
    }
    const b = await canvasBlob(draw, type === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    return new File([b!], `${name}-clean.${type}`, { type: b!.type });
  };
  const toFit = async () => {
    handoff.files = [await file('jpg')];
    location.hash = '#/fit';
  };
  const share = async () => {
    try { await navigator.share({ files: [await file('png')] }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };

  const found = mask?.box;
  const info = useMemo(() => {
    if (!src || !mask) return '';
    if (!found) return 'No ink found. Move "Pick up faint ink" towards More, or use a photo with more light.';
    return `${out.current?.width ?? '…'} × ${out.current?.height ?? '…'} px`;
  }, [src, mask, found, preview]);

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Signature</h1>
        <p>Turn a phone photo of a signature into clean ink on white or a transparent background, cropped neatly. Then fit it to a form's size in one tap. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Signature settings">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="a photo of a signature" accept="image/*,.heic,.heif" />
          <p className="hint">Sign on plain white paper with a dark pen, then photograph it flat in good light. Shadows are evened out for you.</p>
          <div className="section">
            <span className="label">Clean up</span>
            <div className="settings">
              <label htmlFor="sig-strength">Faint ink</label>
              <div className="inline">
                <span className="stat">Less</span>
                <input id="sig-strength" type="range" min={-30} max={40} step={2} value={strength} onChange={e => setStrength(Number(e.target.value))} />
                <span className="stat">More</span>
              </div>
              <label>Ink</label>
              <div className="seg" role="radiogroup" aria-label="Ink colour">
                {(['original', 'black', 'blue'] as InkColour[]).map(k => (
                  <button key={k} type="button" role="radio" aria-checked={colour === k} className={colour === k ? 'on' : ''} onClick={() => setColour(k)}>
                    {k === 'original' ? 'As written' : k === 'black' ? 'Black' : 'Blue'}
                  </button>
                ))}
              </div>
              <label>Background</label>
              <div className="seg" role="radiogroup" aria-label="Background">
                <button type="button" role="radio" aria-checked={!transparent} className={!transparent ? 'on' : ''} onClick={() => setTransparent(false)}>White</button>
                <button type="button" role="radio" aria-checked={transparent} className={transparent ? 'on' : ''} onClick={() => setTransparent(true)}>Transparent</button>
              </div>
              <label htmlFor="sig-margin">Margin</label>
              <div className="inline">
                <input id="sig-margin" type="range" min={0} max={30} value={margin} onChange={e => setMargin(Number(e.target.value))} />
                <span className="stat">{margin}%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel preview" aria-label="Result">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Result</span>
            {info && <span className="stat">{info}</span>}
          </div>
          <div className={'stage sig-stage' + (transparent ? ' checker' : '')}>
            {preview && found ? <img src={preview} alt="Cleaned signature" className="sig-out" /> : (
              <p className="placeholder">{src ? info || 'Finding the ink…' : 'Add a photo of a signature and the cleaned version shows up here.'}</p>
            )}
          </div>
          <div className="export">
            <button className="btn primary" disabled={!found} onClick={toFit}>Fit for a form →</button>
            <button className="btn" disabled={!found} onClick={async () => { const f = await file('png'); saveBlob(f, f.name); }}>Download PNG</button>
            <button className="btn" disabled={!found} onClick={async () => { const f = await file('jpg'); saveBlob(f, f.name); }}>Download JPG</button>
            {canShareFiles && <button className="btn" disabled={!found} onClick={share}>Share</button>}
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
