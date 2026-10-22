import { CANVAS_LIMITS, layout, type Layout } from './layout';
import { renderPage } from './pdf';
import { imgH, imgW, QUALITY_WIDTH, type Item, type Settings } from './types';

export const TOO_BIG = 'The image is too large for this browser to export. Try fewer images per group, Standard quality, or JPG.';

const size = (it: Item) => ({ w: imgW(it), h: imgH(it), vector: !!it.src });

export function stackLayout(list: Item[], s: Settings, hq: boolean): Layout<Item> | null {
  return layout(list, size, { gap: s.gap, width: s.width, q: hq ? QUALITY_WIDTH[s.quality] : 0, ...CANVAS_LIMITS });
}

/** Draws a stack. With hq, PDF pages are re-rendered at the size they're drawn instead of scaling the stored preview. */
export async function paint(c: HTMLCanvasElement, L: Layout<Item>, bg: string, hq: boolean) {
  c.width = L.width;
  c.height = L.height;
  const x = c.getContext('2d')!;
  x.fillStyle = bg;
  x.fillRect(0, 0, L.width, L.height);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  let y = 0;
  for (const p of L.parts) {
    let src: CanvasImageSource = p.it.img;
    if (hq && p.it.src && p.w > imgW(p.it)) {
      try { src = await renderPage(p.it.src, p.w); } catch { /* fall back to stored image */ }
    }
    x.drawImage(src, Math.round((L.width - p.w) / 2), y, p.w, p.h);
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
  await paint(c, L, s.gapColor, true);
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

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
