import { CAPTION_RATIO, fillCaption, textOn, type StackMeta } from './captions';
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

/** Size of each image after trimming, for layout. */
const sizer = (s: Settings) => (it: Item) => {
  const c = cropOf(it, s);
  return { w: imgW(it) * (1 - c.l - c.r), h: imgH(it) * (1 - c.t - c.b), vector: !!it.src };
};

/** Caption band sizes for layout: one band above or below when a caption is set. */
const bands = (s: Settings) => {
  const on = s.caption.trim() !== '';
  return { head: on && s.captionPos === 'top' ? CAPTION_RATIO : 0, foot: on && s.captionPos === 'bottom' ? CAPTION_RATIO : 0 };
};

export function stackLayout(list: Item[], s: Settings, hq: boolean): Layout<Item> | null {
  return layout(list, sizer(s), {
    gap: s.gap,
    width: s.width,
    q: hq ? QUALITY_WIDTH[s.quality] : 0,
    ...CANVAS_LIMITS,
    box: hq && s.quality === 'whatsapp' ? WHATSAPP_BOX : undefined,
    ...bands(s),
  });
}

export const stackAdvice = (list: Item[], s: Settings) =>
  whatsappAdvice(list, sizer(s), { gap: s.gap, width: s.width, q: QUALITY_WIDTH.whatsapp, ...bands(s) });

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
export async function paint(c: HTMLCanvasElement, L: Layout<Item>, s: Settings, hq: boolean, meta?: StackMeta) {
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

  let y = L.headH;
  for (const p of L.parts) {
    const cr = cropOf(p.it, s), keepW = 1 - cr.l - cr.r, keepH = 1 - cr.t - cr.b;
    let src: HTMLImageElement | HTMLCanvasElement = p.it.img;
    if (hq && p.it.src && p.w > imgW(p.it) * keepW) {
      try { src = await renderPage(p.it.src, p.w / keepW); } catch { /* fall back to stored image */ }
    }
    const sw = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
    const sh = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
    const left = Math.round((L.width - p.w) / 2);
    x.drawImage(src, cr.l * sw, cr.t * sh, keepW * sw, keepH * sh, left, y, p.w, p.h);
    if (src !== p.it.img && src instanceof HTMLCanvasElement) src.width = src.height = 0;
    // Hidden areas are stored in full-image fractions; map them through this image's trim to its tile
    const top = y;
    applyRedactions(x, p.it.redact, r => ({
      x: left + ((r.x - cr.l) / keepW) * p.w,
      y: top + ((r.y - cr.t) / keepH) * p.h,
      w: (r.w / keepW) * p.w,
      h: (r.h / keepH) * p.h,
    }), { x: left, y: top, w: p.w, h: p.h });
    const pos = meta?.positions?.get(p.it.id);
    if (s.numbers && pos) badge(x, pos, left, y, L.width);
    y += p.h + L.gap;
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

async function renderExport(st: Stack, s: Settings) {
  const L = stackLayout(st.list, s, true);
  if (!L) throw new Error('Nothing to export');
  const c = document.createElement('canvas');
  await paint(c, L, s, true, st);
  return c;
}

export async function imageBlob(st: Stack, s: Settings) {
  const c = await renderExport(st, s);
  const b = s.fmt === 'png' ? await canvasBlob(c, 'image/png') : await canvasBlob(c, 'image/jpeg', 0.95);
  c.width = c.height = 0;
  if (!b) throw new Error(TOO_BIG);
  return b;
}

/** One page per stack, each page sized to its image (PDF pages max out at 14400pt). */
export async function buildPdf(stacks: Stack[], s: Settings, progress?: (i: number) => void) {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | undefined;
  for (let i = 0; i < stacks.length; i++) {
    progress?.(i);
    const c = await renderExport(stacks[i], s);
    const blob = await canvasBlob(c, 'image/jpeg', 0.95);
    if (!blob) throw new Error(TOO_BIG);
    const k = Math.min(0.75, 14400 / Math.max(c.width, c.height));
    const pw = c.width * k, ph = c.height * k, o = pw > ph ? 'l' : 'p';
    c.width = c.height = 0;
    if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [pw, ph], orientation: o, compress: true });
    else pdf.addPage([pw, ph], o);
    pdf.addImage(new Uint8Array(await blob.arrayBuffer()), 'JPEG', 0, 0, pw, ph, undefined, 'NONE');
  }
  return pdf!.output('blob');
}

export async function buildZip(files: { name: string; stack: Stack }[], s: Settings, progress?: (i: number) => void) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    progress?.(i);
    zip.file(files[i].name, await imageBlob(files[i].stack, s));
  }
  return zip.generateAsync({ type: 'blob' });
}

/** ClipboardItem gets a promise so the write starts inside the click (Safari requires that). */
export function copyStack(st: Stack, s: Settings) {
  const blob = renderExport(st, s)
    .then(c => canvasBlob(c, 'image/png'))
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
 * Renders stacks as files ready for the share sheet: one image per stack,
 * or a single PDF holding every stack as a page.
 */
export async function shareFiles(stacks: Stack[], names: string[], pdfName: string, s: Settings, progress?: (i: number) => void) {
  if (s.fmt === 'pdf') return [new File([await buildPdf(stacks, s, progress)], pdfName, { type: 'application/pdf' })];
  const files: File[] = [];
  for (let i = 0; i < stacks.length; i++) {
    progress?.(i);
    const b = await imageBlob(stacks[i], s);
    files.push(new File([b], names[i], { type: b.type }));
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
