import { searchQuality } from './fit';

const A4 = { w: 595.28, h: 841.89 }; // points
const jpeg = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q));

function scaled(c: HTMLCanvasElement, k: number) {
  const s = document.createElement('canvas');
  s.width = Math.max(1, Math.round(c.width * k));
  s.height = Math.max(1, Math.round(c.height * k));
  const x = s.getContext('2d')!;
  x.imageSmoothingQuality = 'high';
  x.drawImage(c, 0, 0, s.width, s.height);
  return s;
}

/** A page as JPEG within `budget` bytes: lower quality first (not below 35%), then fewer pixels. */
async function pageJpeg(c: HTMLCanvasElement, budget: number) {
  let cur = c;
  for (let i = 0; i < 8; i++) {
    const r = await searchQuality(q => jpeg(cur, q).then(b => b.size), budget, 0.35, 0.9, 7);
    if (r) return jpeg(cur, r.q);
    if (Math.max(cur.width, cur.height) < 700) break;
    cur = scaled(cur, 0.8);
  }
  return jpeg(cur, 0.35);
}

/**
 * Puts pages on A4 (portrait or landscape to match each page), centred. With `capBytes`, every page
 * gets an equal share of the limit, and the whole file is checked and squeezed again if needed.
 */
export async function pagesToPdf(pages: HTMLCanvasElement[], capBytes?: number, progress?: (i: number) => void): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let budget = capBytes ? (capBytes * 0.96 - 2500 * pages.length - 4000) / pages.length : Infinity;
  for (let attempt = 0; attempt < 4; attempt++) {
    let pdf: InstanceType<typeof jsPDF> | undefined;
    for (const [i, c] of pages.entries()) {
      progress?.(i);
      const blob = Number.isFinite(budget) ? await pageJpeg(c, Math.max(8000, budget)) : await jpeg(c, 0.85);
      const land = c.width > c.height;
      const pw = land ? A4.h : A4.w, ph = land ? A4.w : A4.h;
      const k = Math.min(pw / c.width, ph / c.height);
      const w = c.width * k, h = c.height * k;
      if (!pdf) pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: land ? 'l' : 'p', compress: true });
      else pdf.addPage('a4', land ? 'l' : 'p');
      pdf.addImage(new Uint8Array(await blob.arrayBuffer()), 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'NONE');
    }
    const out = pdf!.output('blob');
    if (!capBytes || out.size <= capBytes) return out;
    budget *= (capBytes / out.size) * 0.95;
  }
  throw new Error('TOO_BIG_FOR_CAP');
}
