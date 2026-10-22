/** An area to hide, in fractions (0–1) of the full, untrimmed image. */
export interface Redaction {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'blur' | 'pixel' | 'box';
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

/** A rectangle from two drag corners, clamped to the 0–1 image space. */
export function fromDrag(x0: number, y0: number, x1: number, y1: number): Rect {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const ax = c(Math.min(x0, x1)), ay = c(Math.min(y0, y1));
  return { x: ax, y: ay, w: c(Math.max(x0, x1)) - ax, h: c(Math.max(y0, y1)) - ay };
}

let scratch: HTMLCanvasElement | null = null;
const tmp = (w: number, h: number) => {
  scratch ??= document.createElement('canvas');
  scratch.width = Math.max(1, Math.round(w));
  scratch.height = Math.max(1, Math.round(h));
  return scratch;
};

/**
 * Hides areas on a canvas that already shows the image. `place` maps a redaction (in image
 * fractions) to canvas pixels; `clip` keeps the effect inside this image's own tile.
 * Blur shrinks the area hard and scales it back up smoothly, which works in every browser;
 * pixelate does the same without smoothing; box paints it solid.
 */
export function applyRedactions(x: CanvasRenderingContext2D, list: Redaction[] | undefined, place: (r: Rect) => Rect, clip: Rect) {
  if (!list?.length) return;
  for (const r of list) {
    const t = intersect(place(r), clip);
    if (!t) continue;
    const X = Math.floor(t.x), Y = Math.floor(t.y), W = Math.ceil(t.w + t.x - X), H = Math.ceil(t.h + t.y - Y);
    if (r.kind === 'box') {
      x.fillStyle = '#111';
      x.fillRect(X, Y, W, H);
      continue;
    }
    // Size of one block: big enough that text underneath can't be read back
    const block = Math.max(6, Math.round(Math.max(clip.w / (r.kind === 'blur' ? 70 : 55), Math.min(W, H) / 8)));
    const s = tmp(W / block, H / block);
    const sx = s.getContext('2d')!;
    sx.imageSmoothingEnabled = true;
    sx.imageSmoothingQuality = 'high';
    sx.drawImage(x.canvas, X, Y, W, H, 0, 0, s.width, s.height);
    const smooth = x.imageSmoothingEnabled;
    x.imageSmoothingEnabled = r.kind === 'blur';
    x.drawImage(s, 0, 0, s.width, s.height, X, Y, W, H);
    x.imageSmoothingEnabled = smooth;
  }
}
