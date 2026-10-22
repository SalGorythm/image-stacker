import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { fitImage, kb, type FitResult } from '../lib/fitImage';
import { loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages, cantOpen } from '../lib/files';
import { handoff } from '../lib/handoff';
import { normaliseFiles } from '../lib/heic';
import { backgroundCheck, coverView, guides, ID_SPECS, placeFace, printSheet, type IdSpec, type View } from '../lib/idphoto';
import { canShareFiles, canvasBlob, saveBlob } from '../lib/render';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

/** Chrome on Android (and some other browsers) can find faces natively; elsewhere framing is by hand. */
type NativeFaceDetector = { detect(src: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> };
const Detector = (globalThis as unknown as { FaceDetector?: new (o?: object) => NativeFaceDetector }).FaceDetector;

const SPEC_KEY = 'photo-spec';

function framed(src: HTMLCanvasElement, v: View, s: IdSpec) {
  const c = document.createElement('canvas');
  c.width = s.px.w; c.height = s.px.h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingQuality = 'high';
  x.translate(c.width / 2, c.height / 2);
  x.rotate((v.rot * Math.PI) / 180);
  x.scale(v.zoom, v.zoom);
  x.translate(-v.cx, -v.cy);
  x.drawImage(src, 0, 0);
  return c;
}

/**
 * Passport and ID photo: frame a photo to a country's rules with crown and chin guides, check the
 * background, and get the digital file (exact pixels and KB) and a 6 × 4 in print sheet.
 */
export function PhotoTool({ intakeRef, toast, show }: Props) {
  const [specId, setSpecId] = useState(() => { try { return localStorage.getItem(SPEC_KEY) || 'in'; } catch { return 'in'; } });
  const spec = ID_SPECS.find(s => s.id === specId) ?? ID_SPECS[0];
  const [src, setSrc] = useState<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [digital, setDigital] = useState<FitResult | null>(null);
  const [preview, setPreview] = useState('');
  const frame = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const dragAt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { try { localStorage.setItem(SPEC_KEY, specId); } catch { /* ignore */ } }, [specId]);

  const autoPlace = async (c: HTMLCanvasElement, s: IdSpec) => {
    if (!Detector) return false;
    try {
      const faces = await new Detector({ fastMode: false, maxDetectedFaces: 1 }).detect(c);
      if (!faces.length) return false;
      const b = faces[0].boundingBox;
      setView(placeFace({ x: b.x, y: b.y, width: b.width, height: b.height }, s));
      return true;
    } catch { return false; }
  };

  const add = async (incoming: File[]) => {
    const files = await normaliseFiles(incoming.slice(0, 1), n => show(`Opening ${n}…`, { keep: true }));
    const f = files.find(x => x.type.startsWith('image/'));
    if (!f) return show('Add a photo of the person (JPG, PNG, HEIC).', { err: true });
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImg(url);
      const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      setSrc(c);
      setView(coverView(c.width, c.height, spec));
      const placed = await autoPlace(c, spec);
      show(placed ? 'Face found and placed. Check it sits between the guides.' : 'Drag and zoom so the top of the head touches the top line and the chin sits in the green band.');
    } catch { show(cantOpen(f.name), { err: true }); }
    finally { URL.revokeObjectURL(url); }
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });
  // A cut-out on white handed over from Remove background
  useEffect(() => {
    if (!handoff.files.length) return;
    const got = handoff.files;
    handoff.files = [];
    add(got);
  }, []);

  // Switching country keeps the photo but reframes it to the new shape
  const switchSpec = (id: string) => {
    setSpecId(id);
    const s = ID_SPECS.find(x => x.id === id)!;
    if (src) { setView(coverView(src.width, src.height, s)); autoPlace(src, s); }
  };

  // Live framing view with guides on top
  const g = guides(spec);
  useEffect(() => {
    const c = frame.current;
    if (!c) return;
    c.width = spec.px.w; c.height = spec.px.h;
    const x = c.getContext('2d')!;
    if (src && view) x.drawImage(framed(src, view, spec), 0, 0);
    else { x.fillStyle = '#eef0ee'; x.fillRect(0, 0, c.width, c.height); }
    const lw = Math.max(2, c.width / 200);
    x.fillStyle = 'rgba(47,140,90,.22)';
    x.fillRect(0, g.chinMin, c.width, g.chinMax - g.chinMin);
    x.strokeStyle = '#2f8c5a'; x.lineWidth = lw; x.setLineDash([lw * 4, lw * 3]);
    x.beginPath(); x.moveTo(0, g.crown); x.lineTo(c.width, g.crown); x.moveTo(0, g.chin); x.lineTo(c.width, g.chin);
    x.moveTo(c.width / 2, 0); x.lineTo(c.width / 2, c.height); x.stroke();
    x.setLineDash([]);
    x.beginPath();
    x.ellipse(c.width / 2, (g.crown + g.chin) / 2, (g.chin - g.crown) * 0.37, (g.chin - g.crown) / 2, 0, 0, Math.PI * 2);
    x.stroke();
  }, [src, view, spec, g.chin, g.chinMax, g.chinMin, g.crown]);

  // The finished digital photo, fitted to the size limits (debounced while dragging)
  const bg = useMemo(() => {
    if (!src || !view) return null;
    const c = framed(src, view, spec);
    return backgroundCheck(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, c.width, c.height, spec.crown);
  }, [src, view, spec]);
  useEffect(() => {
    if (!src || !view) { setDigital(null); return; }
    let live = true, url = '';
    const t = setTimeout(async () => {
      const r = await fitImage(framed(src, view, spec), { width: spec.px.w, height: spec.px.h, shape: 'cover', minKB: spec.kb?.min, maxKB: spec.kb?.max, pad: true });
      if (!live) return;
      setDigital(r);
      url = URL.createObjectURL(r.blob);
      setPreview(url);
    }, 250);
    return () => { live = false; clearTimeout(t); if (url) URL.revokeObjectURL(url); };
  }, [src, view, spec]);

  const toOut = (dx: number) => (dx * spec.px.w) / (frame.current?.getBoundingClientRect().width || spec.px.w);
  const zoomBy = (f: number) => setView(v => (v ? { ...v, zoom: v.zoom * f } : v));
  const cover = src ? coverView(src.width, src.height, spec).zoom : 1;

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };
  const fileName = (kind: string) => `${spec.id}-photo${kind}.jpg`;
  const sheetFile = async () => {
    const p = printSheet(spec);
    const c = document.createElement('canvas');
    c.width = p.sheet.w; c.height = p.sheet.h;
    const x = c.getContext('2d')!;
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    const one = framed(src!, view!, spec);
    x.imageSmoothingQuality = 'high';
    x.strokeStyle = '#c8cbc9'; x.lineWidth = 2;
    for (const s of p.slots) { x.drawImage(one, s.x, s.y, p.photo.w, p.photo.h); x.strokeRect(s.x - 1, s.y - 1, p.photo.w + 2, p.photo.h + 2); }
    const b = await canvasBlob(c, 'image/jpeg', 0.95);
    return new File([b!], fileName('-print-6x4'), { type: 'image/jpeg' });
  };
  const share = async (f: File) => {
    try { await navigator.share({ files: [f] }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };
  const digitalFile = () => new File([digital!.blob], fileName(''), { type: 'image/jpeg' });

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Passport photo</h1>
        <p>Frame a photo to your country's passport or ID rules, check the background, and download the digital file or a 6 × 4 print sheet. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Photo and rules">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="a photo of the person" accept="image/*,.heic,.heif" />
          <p className="hint">Stand in front of a plain light wall, face the camera, even light, no shadows. Ask someone else to take it from about 1.5 m away.</p>
          <div className="section">
            <span className="label">Rules</span>
            <div className="settings">
              <label htmlFor="id-spec">Document</label>
              <select id="id-spec" value={spec.id} onChange={e => switchSpec(e.target.value)}>
                {ID_SPECS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="preset-note">
              <span>
                {spec.px.w} × {spec.px.h} px · head {Math.round(spec.head[0] * 100)}–{Math.round(spec.head[1] * 100)}% of the height · {spec.background} background
                {spec.kb && ` · ${spec.kb.min ? `${spec.kb.min} KB–` : 'up to '}${spec.kb.max! >= 1024 ? `${spec.kb.max! / 1024} MB` : `${spec.kb.max} KB`}`}
              </span>
              <span className="hint">Source: <a href={spec.source.url} target="_blank" rel="noreferrer">{spec.source.label}</a> · checked {spec.checked}. Always compare with the official instructions.</span>
            </div>
          </div>
          {src && view && (
            <div className="section">
              <span className="label">Adjust</span>
              <div className="settings">
                <label htmlFor="id-zoom">Zoom</label>
                <input id="id-zoom" type="range" min={0.5} max={4} step={0.01} value={view.zoom / cover} onChange={e => setView({ ...view, zoom: cover * Number(e.target.value) })} />
                <label htmlFor="id-tilt">Straighten</label>
                <div className="inline">
                  <input id="id-tilt" type="range" min={-10} max={10} step={0.5} value={view.rot} onChange={e => setView({ ...view, rot: Number(e.target.value) })} />
                  <span className="stat">{view.rot}°</span>
                </div>
              </div>
              <div className="row">
                {Detector && <button className="btn sm" onClick={async () => { if (!(await autoPlace(src, spec))) show('No face found. Frame it by hand.', { err: true }); }}>Place face automatically</button>}
                <button className="btn sm" onClick={() => setView(coverView(src.width, src.height, spec))}>Reset</button>
              </div>
            </div>
          )}
        </section>

        <section className="panel preview" aria-label="Framing">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Frame: drag to move, scroll or pinch to zoom</span>
            {bg && <span className={'badge ' + (bg.ok ? 'ok' : 'bad')}>{bg.ok ? 'Background OK' : `Background ${bg.issues.join(', ')}`}</span>}
          </div>
          <div className="id-pair">
            <canvas
              ref={frame}
              className="id-frame"
              onPointerDown={e => { if (!view) return; dragAt.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={e => {
                if (!dragAt.current || !view) return;
                const dx = toOut(e.clientX - dragAt.current.x), dy = toOut(e.clientY - dragAt.current.y);
                dragAt.current = { x: e.clientX, y: e.clientY };
                const a = (-view.rot * Math.PI) / 180;
                setView({ ...view, cx: view.cx - (dx * Math.cos(a) - dy * Math.sin(a)) / view.zoom, cy: view.cy - (dx * Math.sin(a) + dy * Math.cos(a)) / view.zoom });
              }}
              onPointerUp={() => { dragAt.current = null; }}
              onWheel={e => { if (view) zoomBy(e.deltaY < 0 ? 1.04 : 1 / 1.04); }}
            />
            <div className="id-out">
              <span className="label">Digital photo</span>
              {preview && digital ? (
                <>
                  <img src={preview} alt="Finished photo" />
                  <span className="stat">{digital.w}×{digital.h} · {kb(digital.blob.size)}{digital.padded ? ' · padded' : ''}</span>
                  <span className={'badge ' + (digital.status === 'ok' ? 'ok' : 'bad')}>{digital.status === 'ok' ? 'Meets size rules' : digital.reason}</span>
                </>
              ) : <p className="placeholder">Add a photo to start.</p>}
            </div>
          </div>
          <div className="export">
            <button className="btn primary" disabled={!digital} onClick={() => { const f = digitalFile(); saveBlob(f, f.name); }}>Download digital</button>
            <button className="btn" disabled={!digital} onClick={async () => { const f = await sheetFile(); saveBlob(f, f.name); show(`Saved a 6 × 4 in print sheet with ${printSheet(spec).slots.length} copies.`); }}>Download print sheet</button>
            {canShareFiles && <button className="btn" disabled={!digital} onClick={() => share(digitalFile())}>Share</button>}
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
