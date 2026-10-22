import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { kb } from '../lib/fitImage';
import { loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages } from '../lib/files';
import { normaliseFiles } from '../lib/heic';
import { pagesToPdf } from '../lib/pdfOut';
import { canShareFiles, canvasBlob, saveBlob, zipFiles } from '../lib/render';
import { enhance, findPage, pageSize, warp, WHOLE, type Quad, type ScanLook } from '../lib/scan';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

interface Page {
  id: number;
  name: string;
  /** The photo, at most SRC_MAX on its long side. */
  src: HTMLCanvasElement;
  /** Page corners as fractions of the photo. */
  quad: Quad;
  found: boolean;
}

const SRC_MAX = 3000;
const OUT_MAX = 2200; // long side of a finished page, about 190 dpi on A4
const CAPS: [string, number | undefined][] = [['No limit', undefined], ['5 MB', 5e6], ['2 MB', 2e6], ['1 MB', 1e6], ['500 KB', 5e5]];
let seq = 0;

function toCanvas(img: HTMLImageElement | HTMLCanvasElement, rotate = 0) {
  const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const k = Math.min(1, SRC_MAX / Math.max(W, H));
  const w = Math.round(W * k), h = Math.round(H * k);
  const c = document.createElement('canvas');
  const side = rotate % 180 !== 0;
  c.width = side ? h : w; c.height = side ? w : h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.translate(c.width / 2, c.height / 2);
  x.rotate((rotate * Math.PI) / 180);
  x.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}

/** Looks for the page on a small copy of the photo. */
function detect(src: HTMLCanvasElement): { quad: Quad; found: boolean } {
  const k = Math.min(1, 360 / Math.max(src.width, src.height));
  const s = document.createElement('canvas');
  s.width = Math.round(src.width * k); s.height = Math.round(src.height * k);
  const x = s.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(src, 0, 0, s.width, s.height);
  const q = findPage(x.getImageData(0, 0, s.width, s.height).data, s.width, s.height);
  return q ? { quad: q, found: true } : { quad: WHOLE, found: false };
}

type Shape = 'auto' | 'a4' | 'letter';
const RATIO: Record<Exclude<Shape, 'auto'>, number> = { a4: Math.SQRT2, letter: 11 / 8.5 };

/**
 * The finished page: straightened and cleaned. A photo can't tell the page's true proportions
 * exactly, so A4 or Letter can be imposed (portrait or landscape, whichever is closer).
 */
function finish(p: Page, look: ScanLook, shape: Shape = 'auto') {
  const sx = p.src.getContext('2d', { willReadFrequently: true })!;
  const quad = p.quad.map(q => ({ x: q.x * p.src.width, y: q.y * p.src.height })) as Quad;
  let { w, h } = pageSize(quad, OUT_MAX);
  if (shape !== 'auto') {
    const r = RATIO[shape], long = Math.max(w, h);
    [w, h] = h >= w ? [Math.round(long / r), long] : [long, Math.round(long / r)];
  }
  const img = enhance(warp(sx.getImageData(0, 0, p.src.width, p.src.height), quad, w, h), look);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c;
}

/**
 * Scan: phone photos of paper become straight, clean pages (corners found automatically and
 * adjustable), saved as an A4 PDF that can stay under a size limit, or as images.
 */
export function ScanTool({ intakeRef, toast, show }: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [sel, setSel] = useState(0);
  const [look, setLook] = useState<ScanLook>('colour');
  const [cap, setCap] = useState<number | undefined>(undefined);
  const [shape, setShape] = useState<Shape>('a4');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const page = pages[Math.min(sel, pages.length - 1)];

  const add = async (incoming: File[]) => {
    const files = (await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }))).filter(f => f.type.startsWith('image/'));
    if (!files.length) return show('Add photos of the pages (JPG, PNG, HEIC).', { err: true });
    const out: Page[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try {
        const src = toCanvas(await loadImg(url));
        out.push({ id: ++seq, name: f.name, src, ...detect(src) });
      } catch { show(`Could not open ${f.name}.`, { err: true }); }
      finally { URL.revokeObjectURL(url); }
    }
    setPages(p => { setSel(p.length); return [...p, ...out]; });
    const missed = out.filter(p => !p.found).length;
    show(missed ? `Added ${out.length} page${out.length > 1 ? 's' : ''}. On ${missed}, drag the corners to the page edges.` : `Added ${out.length} page${out.length > 1 ? 's' : ''}. Page edges found.`);
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });

  // Preview of the selected page, redone when its corners or the look change
  useEffect(() => {
    if (!page) { setPreview(''); return; }
    let url = '', live = true;
    const t = setTimeout(async () => {
      const b = await canvasBlob(finish(page, look, shape), 'image/jpeg', 0.85);
      if (live && b) { url = URL.createObjectURL(b); setPreview(url); }
    }, 150);
    return () => { live = false; clearTimeout(t); if (url) URL.revokeObjectURL(url); };
  }, [page, look, shape]);

  const update = (id: number, patch: Partial<Page>) => setPages(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const rotate = (p: Page) => { const src = toCanvas(p.src, 90); update(p.id, { src, ...detect(src) }); };
  const move = (i: number, d: number) => setPages(ps => {
    const j = i + d;
    if (j < 0 || j >= ps.length) return ps;
    const n = ps.slice(); [n[i], n[j]] = [n[j], n[i]]; setSel(j); return n;
  });

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };

  const makePdf = async () => {
    const done = pages.map((p, i) => { show(`Cleaning page ${i + 1} of ${pages.length}…`, { keep: true }); return finish(p, look, shape); });
    const blob = await pagesToPdf(done, cap, i => show(`Building page ${i + 1} of ${pages.length}…`, { keep: true }));
    return new File([blob], 'scan.pdf', { type: 'application/pdf' });
  };
  const run = async (fn: () => Promise<void>) => {
    if (!pages.length) return;
    setBusy(true);
    try { await fn(); }
    catch (e) { show(e instanceof Error && e.message === 'TOO_BIG_FOR_CAP' ? 'These pages cannot fit under that limit. Choose a bigger limit or fewer pages.' : 'Could not make the file. Try again.', { err: true }); }
    finally { setBusy(false); }
  };
  const savePdf = () => run(async () => { const f = await makePdf(); saveBlob(f, f.name); show(`Saved scan.pdf (${kb(f.size)}, ${pages.length} page${pages.length > 1 ? 's' : ''}).`); });
  const sharePdf = () => run(async () => {
    const f = await makePdf();
    try { await navigator.share({ files: [f] }); show('Shared.'); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  });
  const saveImages = () => run(async () => {
    const files: { name: string; blob: Blob }[] = [];
    for (const [i, p] of pages.entries()) {
      show(`Cleaning page ${i + 1} of ${pages.length}…`, { keep: true });
      const b = await canvasBlob(finish(p, look, shape), 'image/jpeg', 0.9);
      files.push({ name: `scan-${String(i + 1).padStart(2, '0')}.jpg`, blob: b! });
    }
    if (files.length === 1) saveBlob(files[0].blob, files[0].name);
    else saveBlob(await zipFiles(files), 'scan-pages.zip');
    show(`Saved ${files.length} page${files.length > 1 ? 's' : ''}.`);
  });

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Scan</h1>
        <p>Turn phone photos of paper into straight, clean pages and save them as one PDF, even under a size limit. No watermark, no account, nothing uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Pages">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos of pages" accept="image/*,.heic,.heif" />
          <p className="hint">Lay the paper on a darker surface and take the photo from straight above for the best result.</p>
          {pages.length > 0 && (
            <div className="section">
              <span className="label">Pages · {pages.length}</span>
              <ul className="list">
                {pages.map((p, i) => (
                  <li key={p.id} className={'item' + (p === page ? ' cur' : '')} onClick={e => { if (!(e.target as HTMLElement).closest('button')) setSel(i); }}>
                    <span className="handle" aria-hidden="true" />
                    <span className="num">{i + 1}</span>
                    <canvas className="scan-thumb" ref={c => { if (c && c.dataset.id !== String(p.id) + p.src.width) { c.dataset.id = String(p.id) + p.src.width; c.width = 112; c.height = Math.round((112 * p.src.height) / p.src.width); c.getContext('2d')!.drawImage(p.src, 0, 0, c.width, c.height); } }} />
                    <div className="meta">
                      <div className="name" title={p.name}>{p.name}</div>
                      <div className="dims">{p.found ? 'Page found' : 'Set corners'}</div>
                    </div>
                    <div className="acts">
                      <button className="icon" aria-label="Rotate" title="Rotate a quarter turn" onClick={() => rotate(p)}>⟳</button>
                      <button className="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button className="icon" aria-label="Move down" disabled={i === pages.length - 1} onClick={() => move(i, 1)}>↓</button>
                      <button className="icon del" aria-label="Remove" onClick={() => setPages(ps => ps.filter(x => x.id !== p.id))}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="section">
            <span className="label">Output</span>
            <div className="settings">
              <label>Look</label>
              <div className="seg" role="radiogroup" aria-label="Look">
                {([['colour', 'Clean colour'], ['bw', 'Black & white'], ['grey', 'Grey'], ['original', 'Original']] as [ScanLook, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={look === k} className={look === k ? 'on' : ''} onClick={() => setLook(k)}>{l}</button>
                ))}
              </div>
              <label htmlFor="scan-shape">Page shape</label>
              <select id="scan-shape" value={shape} onChange={e => setShape(e.target.value as Shape)}>
                <option value="a4">A4</option>
                <option value="letter">US Letter</option>
                <option value="auto">As photographed</option>
              </select>
              <label htmlFor="scan-cap">PDF size</label>
              <select id="scan-cap" value={String(cap ?? '')} onChange={e => setCap(e.target.value ? Number(e.target.value) : undefined)}>
                {CAPS.map(([l, v]) => <option key={l} value={String(v ?? '')}>{v ? `Under ${l}` : l}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="panel preview" aria-label="Page">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">{page ? `Page ${pages.indexOf(page) + 1}: drag the corners to the page edges` : 'Page'}</span>
            {page && (
              <div className="row">
                <button className="btn sm" onClick={() => update(page.id, detect(page.src))}>Find edges</button>
                <button className="btn sm" onClick={() => update(page.id, { quad: WHOLE, found: false })}>Whole photo</button>
              </div>
            )}
          </div>
          {!page && <p className="placeholder">Add photos of pages and they show up here.</p>}
          {page && (
            <div className="scan-pair">
              <CornerEditor page={page} onChange={quad => update(page.id, { quad, found: true })} />
              <div className="scan-result">{preview ? <img src={preview} alt="Cleaned page" /> : <p className="placeholder">Cleaning…</p>}</div>
            </div>
          )}
          <div className="export">
            <button className="btn primary" disabled={!pages.length || busy} onClick={savePdf}>Download PDF</button>
            {canShareFiles && <button className="btn" disabled={!pages.length || busy} onClick={sharePdf}>Share PDF</button>}
            <button className="btn" disabled={!pages.length || busy} onClick={saveImages}>Download as images</button>
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

/** The photo with four draggable corner handles (mouse or finger). */
function CornerEditor({ page, onChange }: { page: Page; onChange: (q: Quad) => void }) {
  const [url, setUrl] = useState('');
  const [quad, setQuad] = useState<Quad>(page.quad);
  const box = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  useEffect(() => setQuad(page.quad), [page.quad]);
  useEffect(() => {
    let u = '';
    canvasBlob(page.src, 'image/jpeg', 0.8).then(b => { if (b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [page.src]);
  const W = page.src.width, H = page.src.height;
  const at = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const r = Math.max(W, H) / 45;
  return (
    <div className="scan-edit">
      {url && <img src={url} alt="" />}
      <svg
        ref={box}
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={e => {
          if (drag.current == null) return;
          const q = quad.slice() as Quad;
          q[drag.current] = at(e);
          setQuad(q);
        }}
        onPointerUp={() => { if (drag.current != null) { drag.current = null; onChange(quad); } }}
      >
        <polygon points={quad.map(p => `${p.x * W},${p.y * H}`).join(' ')} className="scan-poly" style={{ strokeWidth: r / 4 }} />
        {quad.map((p, i) => (
          <circle
            key={i}
            cx={p.x * W}
            cy={p.y * H}
            r={r}
            className="scan-handle"
            style={{ strokeWidth: r / 4 }}
            onPointerDown={e => { drag.current = i; (e.target as Element).setPointerCapture?.(e.pointerId); box.current!.setPointerCapture(e.pointerId); }}
          />
        ))}
      </svg>
    </div>
  );
}
