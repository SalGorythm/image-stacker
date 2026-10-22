import { CAPTION_RATIO, fillCaption, textOn, type StackMeta } from './captions';
import { cutPoints, SLIDE } from './carousel';
import { seamBetween } from './join';
import { CANVAS_LIMITS, layout, type Layout } from './layout';
import { renderPage } from './pdf';
import { imgH, imgW, QUALITY_WIDTH, WHATSAPP_BOX, type Item, type Settings } from './types';
import { applyRedactions } from './redact';
import { blankEdges, combine, NO_CROP, type Crop } from './trim';
import { whatsappAdvice } from './whatsapp';

export const TOO_BIG = 'The image is too large for this browser to export. Try fewer images per group, Standard quality, or JPG.';

/** One stack to draw: its images plus which stack it is (for captions and numbers). */
export interface Stack extends StackMeta {
  list: Item[];
}

const noTrim = (s: Settings) => !s.autoTrim && !s.trim.t && !s.trim.b && !s.trim.l && !s.trim.r;

/** What is cut from each edge of this image: detected blank margins (if on) plus the manual trim. */
export function cropOf(it: Item, s: Settings): Crop {
  if (noTrim(s)) return NO_CROP;
  return combine(s.autoTrim ? blankEdges(it.img) : NO_CROP, s.trim);
}

/** A stack's layout plus what was cut from each image and which neighbours were joined. */
export interface StackLayout extends Layout<Item> {
  crops: Crop[];
  joined: boolean[];
}

/**
 * Trim for each image, and for overlapping screenshots (when joining is on) the seam: the first
 * loses its fixed footer, the second everything the first already showed.
 */
function prepare(list: Item[], s: Settings) {
  const crops = list.map(it => cropOf(it, s));
  const joined = list.map(() => false);
  if (s.joinOverlap && s.arrange === 'vertical')
    for (let i = 0; i < list.length - 1; i++) {
      const seam = seamBetween(list[i], list[i + 1]);
      if (!seam) continue;
      joined[i] = true;
      crops[i] = { ...crops[i], b: seam.aBottom };
      crops[i + 1] = { ...crops[i + 1], t: seam.bTop };
    }
  const size = (i: number) => {
    const c = crops[i], it = list[i];
    return { w: imgW(it) * (1 - c.l - c.r), h: imgH(it) * (1 - c.t - c.b), vector: !!it.src };
  };
  return { crops, joined, size, idx: list.map((_, i) => i) };
}

/** Caption band sizes for layout: one band above or below when a caption is set. */
const bands = (s: Settings) => {
  const on = s.caption.trim() !== '';
  return { head: on && s.captionPos === 'top' ? CAPTION_RATIO : 0, foot: on && s.captionPos === 'bottom' ? CAPTION_RATIO : 0 };
};

/** The on-screen preview never needs more pixels than this; exports use the full size. */
export const PREVIEW_LIMITS = { maxSide: 12000, maxArea: 6e6 };

/** Gives the browser a moment to paint progress and handle taps between heavy steps. */
const breathe = () => new Promise(r => setTimeout(r, 0));

export function stackLayout(list: Item[], s: Settings, hq: boolean, limits = CANVAS_LIMITS): StackLayout | null {
  const P = prepare(list, s);
  const L = layout(P.idx, P.size, {
    gap: s.gap,
    width: s.width,
    q: hq ? QUALITY_WIDTH[s.quality] : 0,
    ...limits,
    box: hq && s.quality === 'whatsapp' ? WHATSAPP_BOX : undefined,
    ...bands(s),
    joined: P.joined,
    arrange: s.arrange,
    columns: s.columns,
  });
  return L && { ...L, parts: L.parts.map(p => ({ ...p, it: list[p.it] })), crops: P.crops, joined: P.joined };
}

/** The WhatsApp readability check is for tall stacks; side-by-side and grids skip it. */
export function stackAdvice(list: Item[], s: Settings) {
  if (s.arrange !== 'vertical') return null;
  const P = prepare(list, s);
  return whatsappAdvice(P.idx, P.size, { gap: s.gap, width: s.width, q: QUALITY_WIDTH.whatsapp, ...bands(s), joined: P.joined });
}

const FONT = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Writes text centred in a band, shrinking it to fit the width. */
function bandText(x: CanvasRenderingContext2D, text: string, w: number, y: number, h: number, color: string) {
  let fs = Math.round(h * 0.42);
  x.font = `600 ${fs}px ${FONT}`;
  const max = w * 0.92;
  const tw = x.measureText(text).width;
  if (tw > max) { fs = Math.max(8, Math.floor((fs * max) / tw)); x.font = `600 ${fs}px ${FONT}`; }
  x.fillStyle = color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, y + h / 2);
}

/** A rounded number badge in the top-left corner of an image. */
function badge(x: CanvasRenderingContext2D, n: number, left: number, top: number, w: number) {
  const fs = Math.max(10, Math.round(w * 0.026));
  x.font = `600 ${fs}px ${FONT}`;
  const text = String(n);
  const pw = x.measureText(text).width + fs * 0.9, ph = fs * 1.5, m = fs * 0.6;
  x.fillStyle = 'rgba(29,36,32,.82)';
  x.beginPath();
  x.roundRect(left + m, top + m, Math.max(pw, ph), ph, ph / 2);
  x.fill();
  x.fillStyle = '#ffffff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, left + m + Math.max(pw, ph) / 2, top + m + ph / 2 + fs * 0.04);
}

/**
 * Draws a stack: caption band, each image trimmed, image numbers, watermark. With hq, PDF pages
 * are re-rendered so their trimmed part comes out at the size it's drawn.
 */
export async function paint(c: HTMLCanvasElement, L: StackLayout, s: Settings, hq: boolean, meta?: StackMeta) {
  c.width = L.width;
  c.height = L.height;
  const x = c.getContext('2d')!;
  x.fillStyle = s.gapColor;
  x.fillRect(0, 0, L.width, L.height);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  const ink = textOn(s.gapColor);
  const caption = meta ? fillCaption(s.caption, meta) : s.caption.trim();
  if (caption && L.headH) bandText(x, caption, L.width, 0, L.headH, ink);

  for (const [k, p] of L.parts.entries()) {
    const cr = L.crops[k], keepW = 1 - cr.l - cr.r, keepH = 1 - cr.t - cr.b;
    let src: HTMLImageElement | HTMLCanvasElement = p.it.img;
    if (hq && p.it.src && p.w > imgW(p.it) * keepW) {
      try { src = await renderPage(p.it.src, p.w / keepW); } catch { /* fall back to stored image */ }
    }
    const sw = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
    const sh = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
    const left = p.x, top = p.y;
    x.drawImage(src, cr.l * sw, cr.t * sh, keepW * sw, keepH * sh, left, top, p.w, p.h);
    if (src !== p.it.img && src instanceof HTMLCanvasElement) src.width = src.height = 0;
    // Hidden areas are stored in full-image fractions; map them through this image's trim to its tile
    applyRedactions(x, p.it.redact, r => ({
      x: left + ((r.x - cr.l) / keepW) * p.w,
      y: top + ((r.y - cr.t) / keepH) * p.h,
      w: (r.w / keepW) * p.w,
      h: (r.h / keepH) * p.h,
    }), { x: left, y: top, w: p.w, h: p.h });
    const pos = meta?.positions?.get(p.it.id);
    if (s.numbers && pos) badge(x, pos, left, top, Math.max(p.w, L.width / 2));
  }

  if (caption && L.footH) bandText(x, caption, L.width, L.height - L.footH, L.footH, ink);
  const mark = s.watermark.trim();
  if (mark) {
    const fs = Math.max(10, Math.round(L.width * 0.02));
    x.font = `500 ${fs}px ${FONT}`;
    x.textAlign = 'right';
    x.textBaseline = 'bottom';
    const mx = L.width - fs, my = L.height - L.footH - fs * 0.7;
    x.lineWidth = Math.max(2, fs * 0.18);
    x.strokeStyle = 'rgba(255,255,255,.75)';
    x.strokeText(mark, mx, my);
    x.fillStyle = 'rgba(29,36,32,.6)';
    x.fillText(mark, mx, my);
  }
}

export const canvasBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob | null>(r => c.toBlob(r, type, q));

/**
 * Carousel cuts for a layout: ranges along the long axis (down a stack, across a side-by-side
 * strip), in the layout's own pixels. Null when slicing is off.
 */
export function slicesOf(L: StackLayout, s: Settings) {
  if (s.slice === 'off') return null;
  const S = SLIDE[s.slice], side = s.arrange === 'horizontal';
  const len = side ? L.width : L.height;
  const page = side ? S.w * (L.height / S.h) : S.h * (L.width / S.w);
  const spans = L.parts.map(p => (side ? [p.x, p.x + p.w] : [p.y, p.y + p.h]) as [number, number]);
  if (!side && L.headH) spans.push([0, L.headH]);
  if (!side && L.footH) spans.push([L.height - L.footH, L.height]);
  return { side, cuts: cutPoints(len, page, spans, s.sliceWhole) };
}

/** A stack drawn at export quality: one canvas, or one per carousel slide when slicing. */
async function renderPieces(st: Stack, s: Settings): Promise<HTMLCanvasElement[]> {
  const L = stackLayout(st.list, s, true);
  if (!L) throw new Error('Nothing to export');
  const c = document.createElement('canvas');
  await paint(c, L, s, true, st);
  const sl = slicesOf(L, s);
  if (!sl || s.slice === 'off') return [c];
  const S = SLIDE[s.slice];
  const k = sl.side ? S.h / L.height : S.w / L.width;
  const pieces = sl.cuts.map(([a, b]) => {
    const p = document.createElement('canvas');
    p.width = S.w;
    p.height = S.h;
    const x = p.getContext('2d')!;
    x.fillStyle = s.gapColor;
    x.fillRect(0, 0, S.w, S.h);
    x.imageSmoothingQuality = 'high';
    // Whole images sit centred on their slide; plain cuts start at the top (or left) edge
    const len = (b - a) * k, off = s.sliceWhole ? ((sl.side ? S.w : S.h) - len) / 2 : 0;
    if (sl.side) x.drawImage(c, a, 0, b - a, L.height, off, 0, len, S.h);
    else x.drawImage(c, 0, a, L.width, b - a, 0, off, S.w, len);
    return p;
  });
  c.width = c.height = 0;
  return pieces;
}

const encode = async (c: HTMLCanvasElement, s: Settings) => {
  const b = s.fmt === 'png' ? await canvasBlob(c, 'image/png') : await canvasBlob(c, 'image/jpeg', 0.95);
  c.width = c.height = 0;
  if (!b) throw new Error(TOO_BIG);
  return b;
};

/** "stacked-2 (6-10).png" → "stacked-2 (6-10) - 3.png" for the third slide. */
const slideName = (name: string, i: number) => name.replace(/(\.\w+)$/, ` - ${i + 1}$1`);

/** The image files for one stack: one, or one per slide when slicing. */
export async function stackFiles(st: Stack, s: Settings, name: string) {
  const pieces = await renderPieces(st, s);
  const out: { name: string; blob: Blob }[] = [];
  for (const [i, c] of pieces.entries()) out.push({ name: pieces.length > 1 ? slideName(name, i) : name, blob: await encode(c, s) });
  return out;
}

/** One page per stack (or per slide), each page sized to its image (PDF pages max out at 14400pt). */
export async function buildPdf(stacks: Stack[], s: Settings, progress?: (i: number) => void) {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | undefined;
  for (let i = 0; i < stacks.length; i++) {
    progress?.(i);
    await breathe();
    for (const c of await renderPieces(stacks[i], s)) {
      const blob = await canvasBlob(c, 'image/jpeg', 0.95);
      if (!blob) throw new Error(TOO_BIG);
      const k = Math.min(0.75, 14400 / Math.max(c.width, c.height));
      const pw = c.width * k, ph = c.height * k, o = pw > ph ? 'l' : 'p';
      c.width = c.height = 0;
      if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [pw, ph], orientation: o, compress: true });
      else pdf.addPage([pw, ph], o);
      pdf.addImage(new Uint8Array(await blob.arrayBuffer()), 'JPEG', 0, 0, pw, ph, undefined, 'NONE');
    }
  }
  return pdf!.output('blob');
}

export async function zipFiles(files: { name: string; blob: Blob }[]) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  return zip.generateAsync({ type: 'blob' });
}

export async function buildZip(files: { name: string; stack: Stack }[], s: Settings, progress?: (i: number) => void) {
  const all: { name: string; blob: Blob }[] = [];
  for (let i = 0; i < files.length; i++) {
    progress?.(i);
    await breathe();
    all.push(...(await stackFiles(files[i].stack, s, files[i].name)));
  }
  return zipFiles(all);
}

/** ClipboardItem gets a promise so the write starts inside the click (Safari requires that). Copies the first slide when slicing. */
export function copyStack(st: Stack, s: Settings) {
  const blob = renderPieces(st, s)
    .then(p => canvasBlob(p[0], 'image/png'))
    .then(b => b || Promise.reject(new Error(TOO_BIG)));
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** Whether this browser can hand image files to the system share sheet (most phones; some desktops). */
export const canShareFiles = (() => {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
})();

/**
 * Renders stacks as files ready for the share sheet: one image per stack (or per slide),
 * or a single PDF holding every stack as a page.
 */
export async function shareFiles(stacks: Stack[], names: string[], pdfName: string, s: Settings, progress?: (i: number) => void) {
  if (s.fmt === 'pdf') return [new File([await buildPdf(stacks, s, progress)], pdfName, { type: 'application/pdf' })];
  const files: File[] = [];
  for (let i = 0; i < stacks.length; i++) {
    progress?.(i);
    await breathe();
    for (const f of await stackFiles(stacks[i], s, names[i])) files.push(new File([f.blob], f.name, { type: f.blob.type }));
  }
  return files;
}

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
