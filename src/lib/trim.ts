/** Fractions of the original image removed from each edge (0–1). */
export interface Crop {
  t: number;
  b: number;
  l: number;
  r: number;
}

export const NO_CROP: Crop = { t: 0, b: 0, l: 0, r: 0 };

/**
 * Finds plain margins: rows and columns, scanned in from each edge, whose pixels all
 * match the top-left corner's colour (within `tol` per channel, ignoring `allow` of
 * stray pixels such as JPEG noise). Returns nothing to trim when the margins would
 * swallow almost the whole image.
 */
export function detectBlank(px: Uint8ClampedArray, w: number, h: number, tol = 24, allow = 0.01): Crop {
  const bg = [px[0], px[1], px[2]];
  const differs = (i: number) =>
    Math.abs(px[i] - bg[0]) > tol || Math.abs(px[i + 1] - bg[1]) > tol || Math.abs(px[i + 2] - bg[2]) > tol;
  const rowBlank = (y: number) => {
    let n = 0;
    for (let x = 0; x < w; x++) if (differs((y * w + x) * 4) && ++n > allow * w) return false;
    return true;
  };
  const colBlank = (x: number, y0: number, y1: number) => {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (differs((y * w + x) * 4) && ++n > allow * (y1 - y0 + 1)) return false;
    return true;
  };
  let t = 0;
  while (t < h - 1 && rowBlank(t)) t++;
  let b = h - 1;
  while (b > t && rowBlank(b)) b--;
  let l = 0;
  while (l < w - 1 && colBlank(l, t, b)) l++;
  let r = w - 1;
  while (r > l && colBlank(r, t, b)) r--;
  const crop = { t: t / h, b: (h - 1 - b) / h, l: l / w, r: (w - 1 - r) / w };
  return crop.t + crop.b >= 0.9 || crop.l + crop.r >= 0.9 ? NO_CROP : crop;
}

/** Auto trim plus the manual percentages, kept so at least 10% of each side survives. */
export function combine(auto: Crop, manual: { t: number; b: number; l: number; r: number }): Crop {
  const m = (v: number) => Math.min(45, Math.max(0, v || 0)) / 100;
  let t = auto.t + m(manual.t), b = auto.b + m(manual.b), l = auto.l + m(manual.l), r = auto.r + m(manual.r);
  const fixV = t + b > 0.9 ? 0.9 / (t + b) : 1, fixH = l + r > 0.9 ? 0.9 / (l + r) : 1;
  t *= fixV; b *= fixV; l *= fixH; r *= fixH;
  return { t, b, l, r };
}

const cache = new WeakMap<object, Crop>();

/** Blank margins of an image, measured once on a small copy and remembered. */
export function blankEdges(img: HTMLImageElement | HTMLCanvasElement): Crop {
  const hit = cache.get(img);
  if (hit) return hit;
  const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const k = Math.min(1, 400 / Math.max(W, H));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * k));
  c.height = Math.max(1, Math.round(H * k));
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, c.width, c.height);
  let crop = NO_CROP;
  try {
    crop = detectBlank(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
  } catch { /* unreadable pixels: leave as is */ }
  cache.set(img, crop);
  return crop;
}
