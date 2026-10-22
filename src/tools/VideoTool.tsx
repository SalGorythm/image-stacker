import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ToastOptions, ToastState } from '../hooks';
import { cantOpen, loadImg } from '../lib/files';
import { normaliseFiles } from '../lib/heic';
import { slideAt, slideshowLength, wipeAt } from '../lib/motion';
import { canShareFiles, saveBlob } from '../lib/render';
import { drawPhoto, makeVideo } from '../lib/video';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

type Mode = 'wipe' | 'slides';
type Size = 'status' | 'square' | 'wide';
const SIZES: Record<Size, { w: number; h: number; label: string }> = {
  status: { w: 1080, h: 1920, label: 'Status 9:16' },
  square: { w: 1080, h: 1080, label: 'Square' },
  wide: { w: 1280, h: 720, label: 'Wide 16:9' },
};
const WIPE_SECONDS = 5;
interface Photo { id: number; name: string; img: HTMLImageElement }
let seq = 0;

function pill(x: CanvasRenderingContext2D, text: string, cx: number, y: number, W: number) {
  const fs = Math.round(W * 0.04);
  x.font = `600 ${fs}px "IBM Plex Sans", system-ui, sans-serif`;
  const w = x.measureText(text).width + fs * 1.2, h = fs * 1.7;
  x.fillStyle = 'rgba(0,0,0,.55)';
  x.beginPath(); x.roundRect(cx - w / 2, y, w, h, h / 2); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, cx, y + h / 2 + fs * 0.05);
}

/**
 * Video: a before/after wipe or a slideshow of photos as an MP4 that plays in WhatsApp chats and
 * Status. Made on this device.
 */
export function VideoTool({ intakeRef, toast, show }: Props) {
  const [mode, setMode] = useState<Mode>('wipe');
  const [size, setSize] = useState<Size>('status');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [labels, setLabels] = useState({ on: true, before: 'Before', after: 'After' });
  const [hold, setHold] = useState(2.5);
  const [motion, setMotion] = useState(true);
  const [fit, setFit] = useState<'cover' | 'contain'>('contain');
  const [busy, setBusy] = useState('');
  const [video, setVideo] = useState<{ url: string; blob: Blob } | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const beforeIn = useRef<HTMLInputElement>(null), afterIn = useRef<HTMLInputElement>(null), slidesIn = useRef<HTMLInputElement>(null);
  const { w: W, h: H } = SIZES[size];
  const seconds = mode === 'wipe' ? WIPE_SECONDS * 2 : slideshowLength(Math.max(1, photos.length), hold, 0.6);

  const open = async (incoming: File[]) => {
    const files = (await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }))).filter(f => f.type.startsWith('image/'));
    const out: Photo[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try { out.push({ id: ++seq, name: f.name, img: await loadImg(url) }); } catch { show(cantOpen(f.name), { err: true }); }
    }
    return out;
  };
  const add = async (files: File[], slot?: 0 | 1) => {
    const got = await open(files);
    if (!got.length) return;
    setVideo(null);
    if (mode === 'wipe') {
      setPhotos(p => {
        const n = p.slice(0, 2);
        if (slot != null) n[slot] = got[0];
        else got.forEach(g => { const free = !n[0] ? 0 : !n[1] ? 1 : 1; n[free] = g; });
        return n;
      });
    } else setPhotos(p => [...p, ...got]);
  };
  useEffect(() => {
    intakeRef.current = f => add(f);
    return () => { intakeRef.current = null; };
  });

  /** One frame at time t: the same drawing feeds the live preview and the encoder. */
  const frame = (x: CanvasRenderingContext2D, t: number) => {
    x.fillStyle = '#111'; x.fillRect(0, 0, W, H);
    if (mode === 'wipe') {
      const [a, b] = photos;
      if (!a || !b) return;
      const p = wipeAt(t, WIPE_SECONDS);
      drawPhoto(x, a.img, W, H, fit);
      const edge = W * p;
      x.save(); x.beginPath(); x.rect(0, 0, edge, H); x.clip(); drawPhoto(x, b.img, W, H, fit); x.restore();
      if (p > 0 && p < 1) { x.fillStyle = '#fff'; x.fillRect(edge - W * 0.004, 0, W * 0.008, H); }
      if (labels.on) {
        if (p < 0.98) pill(x, labels.before, W * 0.75, H * 0.05, W);
        if (p > 0.02) pill(x, labels.after, W * 0.25, H * 0.05, W);
      }
      return;
    }
    if (!photos.length) return;
    const s = slideAt(t, photos.length, hold, 0.6);
    const z = (k: number, local: number) => (motion ? 1 + 0.06 * Math.min(1, local / (hold + 0.6)) * (k % 2 ? -1 : 1) + (k % 2 ? 0.06 : 0) : 1);
    drawPhoto(x, photos[s.i].img, W, H, fit, z(s.i, s.local));
    if (s.mix > 0) { x.globalAlpha = s.mix; drawPhoto(x, photos[s.next].img, W, H, fit, z(s.next, 0)); x.globalAlpha = 1; }
  };

  // Live preview loop (paused while the video is being made, so the two don't compete)
  useEffect(() => {
    const c = cv.current;
    if (!c || busy) return;
    c.width = W; c.height = H;
    const x = c.getContext('2d')!;
    let raf = 0;
    const start = performance.now();
    const tick = () => { frame(x, ((performance.now() - start) / 1000) % seconds); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  });

  const ready = mode === 'wipe' ? photos.length >= 2 && !!photos[0] && !!photos[1] : photos.length >= 2;
  const render = async () => {
    setBusy('Making the video… 0%');
    try {
      const blob = await makeVideo(W, H, seconds, frame, p => setBusy(`Making the video… ${Math.round(p * 100)}%`));
      if (video) URL.revokeObjectURL(video.url);
      setVideo({ blob, url: URL.createObjectURL(blob) });
      show(blob.type === 'video/mp4' ? 'Video ready (MP4).' : 'Video ready. This browser could only make WebM, which some phones and WhatsApp may not play; try Chrome or Safari for MP4.');
    } catch { show('This browser could not make the video. Try Chrome, Edge or Safari.', { err: true }); }
    finally { setBusy(''); }
  };
  const file = () => new File([video!.blob], `${mode === 'wipe' ? 'before-after' : 'slideshow'}.${video!.blob.type === 'video/mp4' ? 'mp4' : 'webm'}`, { type: video!.blob.type });

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Video</h1>
        <p>Turn photos into a short video for WhatsApp chats or Status: a before/after reveal or a slideshow. Made on this device, saved as MP4.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Video settings">
          <div className="seg" role="radiogroup" aria-label="Kind of video">
            {([['wipe', 'Before / after'], ['slides', 'Slideshow']] as [Mode, string][]).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); setPhotos([]); setVideo(null); }}>{l}</button>
            ))}
          </div>
          {mode === 'wipe' ? (
            <div className="ba-slots">
              {([0, 1] as const).map(i => (
                <button key={i} className="ba-slot" onClick={() => (i ? afterIn : beforeIn).current?.click()}>
                  {photos[i] ? <img src={photos[i].img.src} alt="" /> : <span>{i ? 'Choose the after photo' : 'Choose the before photo'}</span>}
                  <strong>{i ? 'After' : 'Before'}</strong>
                </button>
              ))}
              <input ref={beforeIn} type="file" accept="image/*,.heic,.heif" hidden onChange={e => { add([...(e.target.files || [])], 0); e.target.value = ''; }} />
              <input ref={afterIn} type="file" accept="image/*,.heic,.heif" hidden onChange={e => { add([...(e.target.files || [])], 1); e.target.value = ''; }} />
            </div>
          ) : (
            <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
              <div className="row">
                <button className="btn primary" onClick={() => slidesIn.current?.click()}>Add photos</button>
                <span className="hint">{photos.length ? `${photos.length} photos · ${Math.round(seconds)} s` : 'Add two or more photos'}</span>
              </div>
              <input ref={slidesIn} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={e => { add([...(e.target.files || [])]); e.target.value = ''; }} />
              <ul className="list">
                {photos.map((p, i) => (
                  <li key={p.id} className="item">
                    <span className="handle" aria-hidden="true" /><span className="num">{i + 1}</span>
                    <img src={p.img.src} alt="" />
                    <div className="meta"><div className="name">{p.name}</div></div>
                    <div className="acts">
                      <button className="icon" aria-label="Move up" disabled={i === 0} onClick={() => setPhotos(ps => { const n = ps.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>↑</button>
                      <button className="icon" aria-label="Move down" disabled={i === photos.length - 1} onClick={() => setPhotos(ps => { const n = ps.slice(); [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}>↓</button>
                      <button className="icon del" aria-label="Remove" onClick={() => setPhotos(ps => ps.filter(x => x.id !== p.id))}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="section">
            <span className="label">Style</span>
            <div className="settings">
              <label>Size</label>
              <div className="seg" role="radiogroup" aria-label="Size">
                {(Object.keys(SIZES) as Size[]).map(k => <button key={k} type="button" role="radio" aria-checked={size === k} className={size === k ? 'on' : ''} onClick={() => { setSize(k); setVideo(null); }}>{SIZES[k].label}</button>)}
              </div>
              <label>Photos</label>
              <div className="seg" role="radiogroup" aria-label="Fit">
                <button type="button" role="radio" aria-checked={fit === 'contain'} className={fit === 'contain' ? 'on' : ''} onClick={() => setFit('contain')}>Whole photo</button>
                <button type="button" role="radio" aria-checked={fit === 'cover'} className={fit === 'cover' ? 'on' : ''} onClick={() => setFit('cover')}>Fill the frame</button>
              </div>
              {mode === 'slides' && (<><label htmlFor="v-hold">Each photo</label>
                <div className="inline"><input id="v-hold" type="range" min={1} max={6} step={0.5} value={hold} onChange={e => setHold(Number(e.target.value))} /><span className="stat">{hold} s</span></div></>)}
            </div>
            {mode === 'wipe' ? (
              <label className="check"><input type="checkbox" checked={labels.on} onChange={e => setLabels(l => ({ ...l, on: e.target.checked }))} />Show "Before" and "After" labels</label>
            ) : (
              <label className="check"><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)} />Gentle zoom on each photo</label>
            )}
          </div>
        </section>
        <section className="panel preview" aria-label="Preview">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">{video ? 'Your video' : 'Live preview'}{busy ? ` · ${busy}` : ''}</span>
            <span className="stat">{W} × {H} · {Math.round(seconds)} s</span>
          </div>
          <div className="stage card-stage">
            {video ? <video src={video.url} className="card-canvas" controls loop autoPlay muted playsInline /> : <canvas ref={cv} className="card-canvas" />}
          </div>
          <div className="export">
            {!video && <button className="btn primary" disabled={!ready || !!busy} onClick={render}>Make video</button>}
            {video && <button className="btn primary" onClick={() => { const f = file(); saveBlob(f, f.name); }}>Download</button>}
            {video && canShareFiles && <button className="btn" onClick={async () => {
              try { await navigator.share({ files: [file()] }); } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
            }}>Share</button>}
            {video && <button className="btn" onClick={() => setVideo(null)}>Edit again</button>}
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
