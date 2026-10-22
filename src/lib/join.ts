import { findJoinTwoStep, type Gray } from './overlap';
import { imgH, imgW, type Item } from './types';

const grays = new WeakMap<object, Map<number, Gray>>();

/** A greyscale copy of an image at the given width, made once and remembered. */
function grayOf(img: HTMLImageElement | HTMLCanvasElement, width: number): Gray {
  let m = grays.get(img);
  if (!m) grays.set(img, (m = new Map()));
  const hit = m.get(width);
  if (hit) return hit;
  const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const w = Math.max(1, Math.min(W, width)), h = Math.max(1, Math.round((H * w) / W));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, w, h);
  const px = x.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) data[i] = (px[i * 4] * 77 + px[i * 4 + 1] * 150 + px[i * 4 + 2] * 29) >> 8;
  const g = { w, h, data };
  m.set(width, g);
  return g;
}

/** Where to cut two overlapping screenshots, as fractions of their height. */
export interface Seam {
  /** Cut from the bottom of the first (its fixed footer). */
  aBottom: number;
  /** Cut from the top of the second (its header plus everything the first already showed). */
  bTop: number;
}

const seams = new Map<string, Seam | null>();

/** How screenshot b continues screenshot a, or null if they don't overlap. Remembered per pair. */
export function seamBetween(a: Item, b: Item): Seam | null {
  const key = a.id + ':' + b.id;
  if (seams.has(key)) return seams.get(key)!;
  let seam: Seam | null = null;
  if (imgW(a) === imgW(b) && imgH(a) === imgH(b)) {
    try {
      const big = Math.min(imgW(a), 1200);
      const j = findJoinTwoStep([grayOf(a.img, 96), grayOf(b.img, 96)], [grayOf(a.img, big), grayOf(b.img, big)]);
      if (j) {
        const H = grayOf(a.img, big).h;
        seam = { aBottom: j.bottom / H, bTop: (H - j.bottom - j.shift) / H };
      }
    } catch { /* unreadable pixels: treat as not overlapping */ }
  }
  seams.set(key, seam);
  return seam;
}
