import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { cantOpen, loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages } from '../lib/files';
import { normaliseFiles } from '../lib/heic';
import { canShareFiles, canvasBlob, saveBlob, zipFiles } from '../lib/render';
import { ensureFont, textStyle } from '../lib/script';
import { markBoxes, type MarkPos } from '../lib/watermark';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

interface Photo { id: number; name: string; type: string; img: HTMLImageElement; url: string }
interface Opts { pos: MarkPos; size: number; margin: number; opacity: number; text: string; ink: 'light' | 'dark' }
const KEY = 'wm-opts', LOGO_KEY = 'wm-logo';
const DEFAULTS: Opts = { pos: 'br', size: 22, margin: 3, opacity: 70, text: '', ink: 'light' };
const POS: [MarkPos, string][] = [['tl', '↖'], ['tr', '↗'], ['c', '●'], ['bl', '↙'], ['br', '↘'], ['tile', 'Tile']];
let seq = 0;

/** The mark: the logo, the text under it, or both, on a transparent canvas. */
async function buildMark(logo: HTMLImageElement | null, o: Opts) {
  const text = o.text.trim();
  if (!logo && !text) return null;
  await ensureFont(text, 'auto');
  const st = textStyle(text, 'auto');
  const base = logo ? Math.max(logo.naturalWidth, 600) : 1200;
  const fs = Math.round(base * 0.16);
  const c = document.createElement('canvas');
  const x = c.getContext('2d')!;
  const font = `${st.font ? 400 : 700} ${fs}px ${st.family}`;
  x.font = font;
  const tw = text ? x.measureText(text).width : 0;
  const lw = logo ? base : 0, lh = logo ? (base * logo.naturalHeight) / logo.naturalWidth : 0;
  const th = text ? fs * st.lineHeight : 0, gap = logo && text ? fs * 0.3 : 0;
  c.width = Math.ceil(Math.max(lw, tw + fs * 0.4));
  c.height = Math.ceil(lh + gap + th);
  if (logo) x.drawImage(logo, (c.width - lw) / 2, 0, lw, lh);
  if (text) {
    x.font = font;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.direction = st.rtl ? 'rtl' : 'ltr';
    x.lineJoin = 'round';
    x.lineWidth = fs * 0.12;
    x.strokeStyle = o.ink === 'light' ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.6)';
    x.fillStyle = o.ink === 'light' ? '#ffffff' : '#141414';
    const y = lh + gap + th / 2;
    x.strokeText(text, c.width / 2, y);
    x.fillText(text, c.width / 2, y);
  }
  return c;
}

function stamp(p: Photo, mark: HTMLCanvasElement, o: Opts) {
  const W = p.img.naturalWidth, H = p.img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.drawImage(p.img, 0, 0);
  x.globalAlpha = o.opacity / 100;
  x.imageSmoothingQuality = 'high';
  const tile = o.pos === 'tile';
  for (const b of markBoxes(W, H, mark.width, mark.height, o)) {
    if (!tile) { x.drawImage(mark, b.x, b.y, b.w, b.h); continue; }
    x.save();
    x.translate(b.x + b.w / 2, b.y + b.h / 2);
    x.rotate(-Math.PI / 8);
    x.drawImage(mark, -b.w / 2, -b.h / 2, b.w, b.h);
    x.restore();
  }
  return c;
}

/** Watermark: put a logo and/or text on many photos at once, same placement on every one. */
export function WatermarkTool({ intakeRef, toast, show }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sel, setSel] = useState(0);
  const [o, setO] = useState<Opts>(() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; } });
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Opts>) => setO(v => ({ ...v, ...p }));

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ignore */ } }, [o]);
  // The saved logo (kept small) comes back next time
  useEffect(() => {
    try { const d = localStorage.getItem(LOGO_KEY); if (d) loadImg(d).then(setLogo).catch(() => {}); } catch { /* ignore */ }
  }, []);

  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    const [file] = await normaliseFiles([f]);
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      const k = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/png');
      setLogo(await loadImg(data));
      try { localStorage.setItem(LOGO_KEY, data); } catch { /* too big to remember: fine */ }
    } catch { show(cantOpen(f.name), { err: true }); }
    finally { URL.revokeObjectURL(url); }
  };

  const add = async (incoming: File[]) => {
    const files = (await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }))).filter(f => f.type.startsWith('image/'));
    if (!files.length) return show('Add photos (JPG, PNG, HEIC).', { err: true });
    const out: Photo[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try { out.push({ id: ++seq, name: f.name || `photo-${seq}.jpg`, type: f.type, img: await loadImg(url), url }); }
      catch { URL.revokeObjectURL(url); show(cantOpen(f.name), { err: true }); }
    }
    setPhotos(p => [...p, ...out]);
    show(`Added ${out.length} photo${out.length > 1 ? 's' : ''}.`);
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });

  const current = photos[Math.min(sel, photos.length - 1)];
  useEffect(() => {
    let url = '', live = true;
    (async () => {
      if (!current) { setPreview(''); return; }
      const mark = await buildMark(logo, o);
      const c = mark ? stamp(current, mark, o) : null;
      const b = c ? await canvasBlob(c, 'image/jpeg', 0.85) : null;
      if (live) { url = b ? URL.createObjectURL(b) : ''; setPreview(url || current.url); }
    })();
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [current, logo, o]);

  const outputs = async () => {
    const mark = await buildMark(logo, o);
    if (!mark) throw new Error('nomark');
    const files: File[] = [];
    for (const [i, p] of photos.entries()) {
      show(`Watermarking ${i + 1} of ${photos.length}…`, { keep: true });
      const png = p.type === 'image/png';
      const b = await canvasBlob(stamp(p, mark, o), png ? 'image/png' : 'image/jpeg', 0.92);
      files.push(new File([b!], `${p.name.replace(/\.[^.]+$/, '')}-wm.${png ? 'png' : 'jpg'}`, { type: b!.type }));
      await new Promise(r => setTimeout(r, 0));
    }
    return files;
  };
  const run = async (fn: (files: File[]) => Promise<void>) => {
    setBusy(true);
    try { await fn(await outputs()); }
    catch (e) { show(e instanceof Error && e.message === 'nomark' ? 'Choose a logo or type the watermark text first.' : 'Could not finish. Try again.', { err: true }); }
    finally { setBusy(false); }
  };
  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Watermark</h1>
        <p>Put your logo or name on many photos at once, in the same place on every one. Photos keep their full size. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Watermark settings">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos" accept="image/*,.heic,.heif" />
          <div className="section">
            <span className="label">Your mark</span>
            <div className="row">
              <button className="btn sm" onClick={() => logoInput.current?.click()}>{logo ? 'Change logo' : 'Choose logo'}</button>
              {logo && <img src={logo.src} alt="Logo" className="wm-logo" />}
              {logo && <button className="btn sm" onClick={() => { setLogo(null); try { localStorage.removeItem(LOGO_KEY); } catch { /* ignore */ } }}>Remove logo</button>}
              <input ref={logoInput} type="file" accept="image/*,.heic,.heif" hidden onChange={e => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <div className="settings">
              <label htmlFor="wm-text">Text</label>
              <input id="wm-text" type="text" dir="auto" value={o.text} placeholder="e.g. © Quiz Circle 2026 (optional)" onChange={e => set({ text: e.target.value })} />
              {o.text.trim() && (<><label>Text colour</label>
                <div className="seg" role="radiogroup" aria-label="Text colour">
                  <button type="button" role="radio" aria-checked={o.ink === 'light'} className={o.ink === 'light' ? 'on' : ''} onClick={() => set({ ink: 'light' })}>White</button>
                  <button type="button" role="radio" aria-checked={o.ink === 'dark'} className={o.ink === 'dark' ? 'on' : ''} onClick={() => set({ ink: 'dark' })}>Dark</button>
                </div></>)}
            </div>
            <p className="hint">A PNG logo with a transparent background looks best.</p>
          </div>
          <div className="section">
            <span className="label">Placement</span>
            <div className="pos-grid" role="radiogroup" aria-label="Position">
              {POS.map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={o.pos === k} aria-label={{ tl: 'Top left', tr: 'Top right', c: 'Centre', bl: 'Bottom left', br: 'Bottom right', tile: 'Tiled' }[k]} className={'btn sm' + (o.pos === k ? ' primary' : '')} onClick={() => set({ pos: k })}>{l}</button>
              ))}
            </div>
            <div className="settings">
              <label htmlFor="wm-size">Size</label>
              <div className="inline"><input id="wm-size" type="range" min={5} max={60} value={o.size} onChange={e => set({ size: Number(e.target.value) })} /><span className="stat">{o.size}%</span></div>
              <label htmlFor="wm-op">Opacity</label>
              <div className="inline"><input id="wm-op" type="range" min={10} max={100} value={o.opacity} onChange={e => set({ opacity: Number(e.target.value) })} /><span className="stat">{o.opacity}%</span></div>
              {o.pos !== 'tile' && o.pos !== 'c' && (<><label htmlFor="wm-m">Margin</label>
                <div className="inline"><input id="wm-m" type="range" min={0} max={12} value={o.margin} onChange={e => set({ margin: Number(e.target.value) })} /><span className="stat">{o.margin}%</span></div></>)}
            </div>
          </div>
        </section>
        <section className="panel preview" aria-label="Preview">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">{photos.length ? `Photo ${photos.indexOf(current) + 1} of ${photos.length}` : 'Preview'}</span>
            {photos.length > 1 && <div className="gnav">
              <button className="icon" aria-label="Previous photo" disabled={sel <= 0} onClick={() => setSel(s => s - 1)}>‹</button>
              <button className="icon" aria-label="Next photo" disabled={sel >= photos.length - 1} onClick={() => setSel(s => s + 1)}>›</button>
            </div>}
          </div>
          <div className="stage">{preview ? <img src={preview} alt="Watermarked preview" className="wm-preview" /> : <p className="placeholder">Add photos and choose a logo or text.</p>}</div>
          <div className="export">
            <button className="btn primary" disabled={!photos.length || busy} onClick={() => run(async fs => {
              if (fs.length === 1) saveBlob(fs[0], fs[0].name);
              else saveBlob(await zipFiles(fs.map(f => ({ name: f.name, blob: f }))), 'watermarked.zip');
              show(`Saved ${fs.length} watermarked photo${fs.length > 1 ? 's' : ''}.`);
            })}>{photos.length > 1 ? `Download all ${photos.length} (ZIP)` : 'Download'}</button>
            {canShareFiles && <button className="btn" disabled={!photos.length || busy} onClick={() => run(async fs => {
              try { await navigator.share({ files: fs }); show('Shared.'); }
              catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
            })}>Share</button>}
            {photos.length > 0 && <button className="btn" onClick={() => { setPhotos([]); setSel(0); }}>Clear</button>}
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
