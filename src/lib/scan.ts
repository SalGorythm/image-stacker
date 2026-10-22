import { otsu, paperLevel } from './signature';

export interface Pt { x: number; y: number }
/** Page corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];

/**
 * Finds a sheet of paper in a photo: the largest bright region (paper is usually lighter than the
 * table under it), then its four extreme corners. Works on a small copy; returns corners as
 * fractions (0–1) of the image, or null when no clear page stands out.
 */
export function findPage(px: Uint8ClampedArray, w: number, h: number): Quad | null {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const t = otsu(lum);
  // Largest connected bright region (4-neighbour flood fill)
  const label = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (label[s] !== -1 || lum[s] <= t) continue;
    let size = 0;
    label[s] = id;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && label[j] === -1 && lum[j] > t) { label[j] = id; stack.push(j); }
    }
    if (size > bestSize) { bestSize = size; best = id; }
    id++;
  }
  // Too small to be a page, or the whole frame (nothing to crop)
  if (best < 0 || bestSize < w * h * 0.15 || bestSize > w * h * 0.97) return null;
  // Corners: extremes of x+y and x−y over the region
  let tl = { s: Infinity, x: 0, y: 0 }, br = { s: -Infinity, x: 0, y: 0 }, tr = { s: -Infinity, x: 0, y: 0 }, bl = { s: Infinity, x: 0, y: 0 };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (label[y * w + x] !== best) continue;
      const a = x + y, d = x - y;
      if (a < tl.s) tl = { s: a, x, y };
      if (a > br.s) br = { s: a, x, y };
      if (d > tr.s) tr = { s: d, x, y };
      if (d < bl.s) bl = { s: d, x, y };
    }
  const f = (p: { x: number; y: number }) => ({ x: (p.x + 0.5) / w, y: (p.y + 0.5) / h });
  return [f(tl), f(tr), f(br), f(bl)];
}

export const WHOLE: Quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

/** Solves the 3×3 projective map (as 8 numbers) that sends each `from` corner to its `to` corner. */
export function homography(from: Quad, to: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i], { x: u, y: v } = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // Gaussian elimination with partial pivoting
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < 8; r++) {
      const k = A[r][c] / A[c][c];
      for (let j = c; j < 8; j++) A[r][j] -= k * A[c][j];
      b[r] -= k * b[c];
    }
  }
  const h = new Array(8).fill(0);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let j = r + 1; j < 8; j++) s -= A[r][j] * h[j];
    h[r] = s / A[r][r];
  }
  return h;
}

export const project = (h: number[], x: number, y: number): Pt => {
  const d = h[6] * x + h[7] * y + 1;
  return { x: (h[0] * x + h[1] * y + h[2]) / d, y: (h[3] * x + h[4] * y + h[5]) / d };
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Output size for a page: the longer of each pair of opposite edges, capped at `max` on the long side. */
export function pageSize(q: Quad, max: number) {
  let w = Math.max(dist(q[0], q[1]), dist(q[3], q[2]));
  let h = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  const k = Math.min(1, max / Math.max(w, h));
  w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
  return { w, h };
}

/**
 * Straightens the page: every output pixel looks up where it came from in the photo (bilinear),
 * so the page comes out flat and rectangular. `quad` is in source pixels.
 */
export function warp(src: ImageData, quad: Quad, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  const H = homography([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], quad);
  const s = src.data, d = out.data, sw = src.width, sh = src.height;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = project(H, x + 0.5, y + 0.5);
      const fx = Math.min(sw - 1.001, Math.max(0, p.x - 0.5)), fy = Math.min(sh - 1.001, Math.max(0, p.y - 0.5));
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4, o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++)
        d[o + c] = (s[i00 + c] * (1 - ax) + s[i10 + c] * ax) * (1 - ay) + (s[i01 + c] * (1 - ax) + s[i11 + c] * ax) * ay;
      d[o + 3] = 255;
    }
  return out;
}

export type ScanLook = 'original' | 'colour' | 'grey' | 'bw';

/**
 * Cleans a straightened page. All looks first divide by the paper's own brightness, which removes
 * shadows and yellow light; then colour keeps the ink colours, grey drops them, and black & white
 * makes crisp text (like a photocopy).
 */
export function enhance(img: ImageData, look: ScanLook): ImageData {
  if (look === 'original') return img;
  const { width: w, height: h, data } = img;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  const paper = paperLevel(lum, w, h, Math.max(16, Math.round(Math.max(w, h) / 40)));
  const out = new ImageData(w, h);
  const o = out.data;
  for (let i = 0; i < w * h; i++) {
    const k = 255 / Math.max(1, paper[i]);
    const n = Math.min(255, lum[i] * k);
    if (look === 'colour') {
      // Lift the paper to white; keep ink colours, with a little extra contrast
      for (let c = 0; c < 3; c++) o[i * 4 + c] = Math.max(0, Math.min(255, (data[i * 4 + c] * k - 255) * 1.15 + 255));
    } else if (look === 'grey') {
      const v = Math.max(0, Math.min(255, (n - 255) * 1.3 + 255));
      o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = v;
    } else {
      // Soft threshold around 72% of paper brightness keeps letter edges smooth
      const v = Math.max(0, Math.min(255, (n - 184) * 6 + 128));
      o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = v;
    }
    o[i * 4 + 3] = 255;
  }
  return out;
}
