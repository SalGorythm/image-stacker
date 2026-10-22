import { maxBytes, minBytes, padJpeg, searchQuality, targetSize, type FitSpec } from './fit';

export interface FitResult {
  blob: Blob;
  w: number;
  h: number;
  /** JPEG quality used (0–1). */
  q: number;
  status: 'ok' | 'too-big' | 'too-small';
  padded: boolean;
  /** Why it could not pass, in plain words. */
  reason?: string;
}

const encode = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q));

function draw(img: HTMLImageElement | HTMLCanvasElement, spec: FitSpec, scale: number) {
  const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const t = targetSize(W, H, spec);
  const k = spec.width || spec.height ? 1 : scale;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(t.out.w * k));
  c.height = Math.max(1, Math.round(t.out.h * k));
  const x = c.getContext('2d')!;
  // JPEG has no transparency: transparent areas and borders become white
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, t.src.x, t.src.y, t.src.w, t.src.h, t.dst.x * k, t.dst.y * k, t.dst.w * k, t.dst.h * k);
  return c;
}

/**
 * Makes a JPEG that meets the spec. Pixel sizes, when given, are kept exactly; otherwise the
 * image may be shrunk to get under the maximum or enlarged (up to 3×) to get over the minimum.
 */
export async function fitImage(img: HTMLImageElement | HTMLCanvasElement, spec: FitSpec): Promise<FitResult> {
  const fixed = !!(spec.width || spec.height);
  const max = spec.maxKB ? maxBytes(spec.maxKB) : Infinity;
  const min = spec.minKB ? minBytes(spec.minKB) : 0;
  let scale = 1;
  let last: FitResult | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const c = draw(img, spec, scale);
    const done = (blob: Blob, q: number, status: FitResult['status'], reason?: string, padded = false): FitResult =>
      ({ blob, w: c.width, h: c.height, q, status, padded, reason });

    let q = 0.92, blob: Blob;
    if (Number.isFinite(max)) {
      const sizes = new Map<number, Blob>();
      // With free pixels, keep quality decent and shrink the picture instead; fixed pixels leave only quality
      const floor = fixed ? 0.05 : 0.55;
      const r = await searchQuality(async qq => { const b = await encode(c, qq); sizes.set(qq, b); return b.size; }, max, floor);
      if (!r) {
        const smallest = sizes.get(floor) ?? (await encode(c, floor));
        last = done(smallest, floor, 'too-big', `Even at the lowest quality this is ${kb(smallest.size)} at ${c.width}×${c.height}. Use smaller pixel sizes.`);
        if (fixed) return last;
        scale *= Math.sqrt(max / smallest.size) * 0.9;
        continue;
      }
      q = r.q;
      blob = sizes.get(q) ?? (await encode(c, q));
    } else blob = await encode(c, q);

    if (blob.size >= min) return done(blob, q, 'ok');

    // Under the minimum: best quality first, then (when the size is free) more pixels, then padding
    const best = await encode(c, 1);
    if (best.size >= min && best.size <= max) {
      const r = await searchQuality(async qq => (await encode(c, qq)).size, max, q, 1);
      const b = r ? await encode(c, r.q) : best;
      if (b.size >= min) return done(b, r?.q ?? 1, 'ok');
      return done(best, 1, 'ok');
    }
    if (!fixed && scale < 3) { scale = Math.min(3, scale * Math.sqrt(min / best.size) * 1.1); continue; }
    if (spec.pad) {
      const bytes = padJpeg(new Uint8Array(await best.arrayBuffer()), min);
      return done(new Blob([bytes], { type: 'image/jpeg' }), 1, 'ok', undefined, true);
    }
    return done(best, 1, 'too-small', `At the best quality this is only ${kb(best.size)} at ${c.width}×${c.height}. Allow padding, or use larger pixel sizes if the portal permits.`);
  }
  return last!;
}

export const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
