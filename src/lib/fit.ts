/** A portal's upload rule. Every field is optional except how to handle a different shape. */
export interface FitSpec {
  minKB?: number;
  maxKB?: number;
  width?: number;
  height?: number;
  /** When both width and height are set: crop to fill, or fit inside with a white border. */
  shape: 'cover' | 'contain';
  /** Allow padding a file up to the minimum KB when no quality can reach it. */
  pad: boolean;
}

/**
 * "KB" means 1000 bytes on some portals and 1024 on others. Aim under the smaller reading of the
 * maximum and over the larger reading of the minimum, so the file passes either way.
 */
export const maxBytes = (kb: number) => Math.floor(kb * 1000);
export const minBytes = (kb: number) => Math.ceil(kb * 1024);

/** Output size in pixels for a source of w×h, plus the source rectangle to draw from it. */
export function targetSize(w: number, h: number, spec: Pick<FitSpec, 'width' | 'height' | 'shape'>) {
  const W = spec.width && spec.width > 0 ? Math.round(spec.width) : 0;
  const H = spec.height && spec.height > 0 ? Math.round(spec.height) : 0;
  if (W && H) {
    if (spec.shape === 'contain') {
      // Whole image inside the box, centred; the rest is white
      const k = Math.min(W / w, H / h);
      const dw = Math.round(w * k), dh = Math.round(h * k);
      return { out: { w: W, h: H }, src: { x: 0, y: 0, w, h }, dst: { x: Math.round((W - dw) / 2), y: Math.round((H - dh) / 2), w: dw, h: dh } };
    }
    // Crop the source to the box's shape, keeping the centre
    const k = Math.max(W / w, H / h);
    const sw = W / k, sh = H / k;
    return { out: { w: W, h: H }, src: { x: (w - sw) / 2, y: (h - sh) / 2, w: sw, h: sh }, dst: { x: 0, y: 0, w: W, h: H } };
  }
  const out = W ? { w: W, h: Math.round((h * W) / w) } : H ? { w: Math.round((w * H) / h), h: H } : { w, h };
  return { out, src: { x: 0, y: 0, w, h }, dst: { x: 0, y: 0, w: out.w, h: out.h } };
}

/**
 * Highest JPEG quality whose file fits under `max` bytes, by binary search
 * (file size grows with quality). Null when even the lowest quality is too big.
 */
export async function searchQuality(sizeAt: (q: number) => Promise<number>, max: number, lo = 0.05, hi = 0.98, steps = 9) {
  const top = await sizeAt(hi);
  if (top <= max) return { q: hi, size: top };
  const bottom = await sizeAt(lo);
  if (bottom > max) return null;
  let best = { q: lo, size: bottom };
  for (let i = 0; i < steps; i++) {
    const q = (lo + hi) / 2;
    const size = await sizeAt(q);
    if (size <= max) { best = { q, size }; lo = q; } else hi = q;
  }
  return best;
}

/**
 * Pads a JPEG to at least `target` bytes by adding comment (COM) segments right after the start
 * marker. Viewers and portals ignore comments, so the picture is unchanged.
 */
export function padJpeg(bytes: Uint8Array<ArrayBuffer>, target: number): Uint8Array<ArrayBuffer> {
  if (bytes.length >= target || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const segs: Uint8Array[] = [];
  let need = target - bytes.length;
  while (need > 0) {
    // Each segment: FF FE + 2-byte length (counts itself) + data; at least 4 bytes, at most 65537
    const len = Math.min(65535, Math.max(2, need - 2));
    const seg = new Uint8Array(len + 2);
    seg[0] = 0xff; seg[1] = 0xfe; seg[2] = len >> 8; seg[3] = len & 0xff;
    seg.fill(0x20, 4);
    segs.push(seg);
    need -= seg.length;
  }
  const out = new Uint8Array(bytes.length + segs.reduce((t, s) => t + s.length, 0));
  out.set(bytes.subarray(0, 2), 0);
  let o = 2;
  for (const s of segs) { out.set(s, o); o += s.length; }
  out.set(bytes.subarray(2), o);
  return out;
}
