import { CANVAS_LIMITS, layout, type Layout } from './layout';
import { renderPage } from './pdf';
import { imgH, imgW, QUALITY_WIDTH, WHATSAPP_BOX, type Item, type Settings } from './types';
import { blankEdges, combine, NO_CROP, type Crop } from './trim';
import { whatsappAdvice } from './whatsapp';

export const TOO_BIG = 'The image is too large for this browser to export. Try fewer images per group, Standard quality, or JPG.';

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

export function stackLayout(list: Item[], s: Settings, hq: boolean): Layout<Item> | null {
  return layout(list, sizer(s), {
    gap: s.gap,
    width: s.width,
    q: hq ? QUALITY_WIDTH[s.quality] : 0,
    ...CANVAS_LIMITS,
    box: hq && s.quality === 'whatsapp' ? WHATSAPP_BOX : undefined,
  });
}

export const stackAdvice = (list: Item[], s: Settings) =>
  whatsappAdvice(list, sizer(s), s.gap, s.width, QUALITY_WIDTH.whatsapp);

/**
 * Draws a stack, each image trimmed. With hq, PDF pages are re-rendered so that their trimmed
 * part comes out at the size it's drawn, instead of scaling up the stored preview.
 */
export async function paint(c: HTMLCanvasElement, L: Layout<Item>, s: Settings, hq: boolean) {
  c.width = L.width;
  c.height = L.height;
  const x = c.getContext('2d')!;
  x.fillStyle = s.gapColor;
  x.fillRect(0, 0, L.width, L.height);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  let y = 0;
  for (const p of L.parts) {
    const cr = cropOf(p.it, s), keepW = 1 - cr.l - cr.r, keepH = 1 - cr.t - cr.b;
    let src: HTMLImageElement | HTMLCanvasElement = p.it.img;
    if (hq && p.it.src && p.w > imgW(p.it) * keepW) {
      try { src = await renderPage(p.it.src, p.w / keepW); } catch { /* fall back to stored image */ }
    }
    const sw = src instanceof HTMLImageElement ? src.naturalWidth : src.width;
    const sh = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
    x.drawImage(src, cr.l * sw, cr.t * sh, keepW * sw, keepH * sh, Math.round((L.width - p.w) / 2), y, p.w, p.h);
    if (src !== p.it.img && src instanceof HTMLCanvasElement) src.width = src.height = 0;
    y += p.h + L.gap;
  }
}

export const canvasBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob | null>(r => c.toBlob(r, type, q));

async function renderExport(list: Item[], s: Settings) {
  const L = stackLayout(list, s, true);
  if (!L) throw new Error('Nothing to export');
  const c = document.createElement('canvas');
  await paint(c, L, s, true);
  return c;
}

export async function imageBlob(list: Item[], s: Settings) {
  const c = await renderExport(list, s);
  const b = s.fmt === 'png' ? await canvasBlob(c, 'image/png') : await canvasBlob(c, 'image/jpeg', 0.95);
  c.width = c.height = 0;
  if (!b) throw new Error(TOO_BIG);
  return b;
}

/** One page per stack, each page sized to its image (PDF pages max out at 14400pt). */
export async function buildPdf(lists: Item[][], s: Settings, progress?: (i: number) => void) {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | undefined;
  for (let i = 0; i < lists.length; i++) {
    progress?.(i);
    const c = await renderExport(lists[i], s);
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

export async function buildZip(files: { name: string; list: Item[] }[], s: Settings, progress?: (i: number) => void) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    progress?.(i);
    zip.file(files[i].name, await imageBlob(files[i].list, s));
  }
  return zip.generateAsync({ type: 'blob' });
}

/** ClipboardItem gets a promise so the write starts inside the click (Safari requires that). */
export function copyStack(list: Item[], s: Settings) {
  const blob = renderExport(list, s)
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
export async function shareFiles(lists: Item[][], names: string[], pdfName: string, s: Settings, progress?: (i: number) => void) {
  if (s.fmt === 'pdf') return [new File([await buildPdf(lists, s, progress)], pdfName, { type: 'application/pdf' })];
  const files: File[] = [];
  for (let i = 0; i < lists.length; i++) {
    progress?.(i);
    const b = await imageBlob(lists[i], s);
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
