/** How much each pixel is ink (0–1), and the box around all of it. */
export interface InkMask {
  alpha: Float32Array;
  box: { x: number; y: number; w: number; h: number } | null;
}

const lumAt = (px: Uint8ClampedArray, i: number) => 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];

/**
 * Paper brightness across the image: the 90th-percentile brightness of each block, smoothly
 * interpolated. Dividing by it flattens shadows and uneven light from a phone photo.
 */
export function paperLevel(lum: Float32Array, w: number, h: number, block = 32): Float32Array {
  const bw = Math.ceil(w / block), bh = Math.ceil(h / block);
  const grid = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      const vals: number[] = [];
      for (let y = by * block; y < Math.min(h, (by + 1) * block); y++)
        for (let x = bx * block; x < Math.min(w, (bx + 1) * block); x++) vals.push(lum[y * w + x]);
      vals.sort((a, b) => a - b);
      grid[by * bw + bx] = Math.max(1, vals[Math.floor(vals.length * 0.9)]);
    }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = Math.min(bh - 1, Math.max(0, (y + 0.5) / block - 0.5)), y0 = Math.floor(gy), y1 = Math.min(bh - 1, y0 + 1), fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = Math.min(bw - 1, Math.max(0, (x + 0.5) / block - 0.5)), x0 = Math.floor(gx), x1 = Math.min(bw - 1, x0 + 1), fx = gx - x0;
      const top = grid[y0 * bw + x0] * (1 - fx) + grid[y0 * bw + x1] * fx;
      const bot = grid[y1 * bw + x0] * (1 - fx) + grid[y1 * bw + x1] * fx;
      out[y * w + x] = top * (1 - fy) + bot * fy;
    }
  }
  return out;
}

/** Otsu's threshold: the grey level that best splits values into two groups (ink and paper). */
export function otsu(values: Float32Array): number {
  const hist = new Array(256).fill(0);
  for (const v of values) hist[Math.max(0, Math.min(255, Math.round(v)))]++;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; t = i; }
  }
  return t;
}

/**
 * Finds the ink in a photo of a signature. `strength` (−40…40) moves the cut-off: higher picks
 * up fainter ink (and more specks). Edges are soft so strokes stay smooth when resized.
 */
export function inkMask(px: Uint8ClampedArray, w: number, h: number, strength = 0): InkMask {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = lumAt(px, i);
  const paper = paperLevel(lum, w, h);
  const norm = new Float32Array(w * h);
  for (let i = 0; i < norm.length; i++) norm[i] = Math.min(255, (lum[i] / paper[i]) * 255);
  // Otsu splits ink from paper; the cut-off goes midway between the two groups' averages, which
  // stays stable when the ink is very uniform (Otsu alone then lands right on the ink's own value)
  const split = otsu(norm);
  let inkSum = 0, inkN = 0, papSum = 0, papN = 0;
  for (const v of norm) { if (v <= split) { inkSum += v; inkN++; } else { papSum += v; papN++; } }
  const mid = inkN && papN ? (inkSum / inkN + papSum / papN) / 2 : split;
  const contrast = inkN && papN ? papSum / papN - inkSum / inkN : 0;
  const t = Math.min(235, mid + strength);
  const soft = 14;
  const alpha = new Float32Array(w * h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = Math.min(1, Math.max(0, (t + soft - norm[i]) / (2 * soft)));
      alpha[i] = a;
      if (a > 0.5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  // Paper with almost no contrast (Otsu splits noise) counts as blank
  let inkCount = 0;
  for (const a of alpha) if (a > 0.5) inkCount++;
  const blank = x1 < 0 || inkCount > w * h * 0.6 || contrast < 40;
  return { alpha: blank ? new Float32Array(w * h) : alpha, box: blank ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}

export type InkColour = 'original' | 'black' | 'blue';
const INK: Record<Exclude<InkColour, 'original'>, [number, number, number]> = { black: [17, 17, 17], blue: [20, 40, 140] };

/**
 * Draws the cleaned signature: only the ink, cropped to it with a margin (percent of the ink box),
 * on white or transparent. Original ink is darkened slightly so faint pen reads well.
 */
export function renderSignature(src: HTMLCanvasElement, mask: InkMask, o: { colour: InkColour; transparent: boolean; margin: number }) {
  const box = mask.box ?? { x: 0, y: 0, w: src.width, h: src.height };
  const m = Math.round((Math.max(box.w, box.h) * o.margin) / 100);
  const x0 = Math.max(0, box.x - m), y0 = Math.max(0, box.y - m);
  const x1 = Math.min(src.width, box.x + box.w + m), y1 = Math.min(src.height, box.y + box.h + m);
  const out = document.createElement('canvas');
  out.width = x1 - x0;
  out.height = y1 - y0;
  const sp = src.getContext('2d')!.getImageData(x0, y0, out.width, out.height).data;
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(out.width, out.height);
  const d = img.data;
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const i = y * out.width + x, a = mask.alpha[(y + y0) * src.width + (x + x0)];
      const [r, g, b] = o.colour === 'original'
        ? [sp[i * 4] * 0.75, sp[i * 4 + 1] * 0.75, sp[i * 4 + 2] * 0.75]
        : INK[o.colour];
      if (o.transparent) d.set([r, g, b, Math.round(a * 255)], i * 4);
      else d.set([255 - (255 - r) * a, 255 - (255 - g) * a, 255 - (255 - b) * a, 255], i * 4);
    }
  ctx.putImageData(img, 0, 0);
  return out;
}
