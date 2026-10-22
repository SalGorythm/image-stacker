export type MarkPos = 'tl' | 'tr' | 'bl' | 'br' | 'c' | 'tile';

export interface MarkLayout {
  pos: MarkPos;
  /** Logo width as a percent of the image's shorter side (so portrait and landscape match). */
  size: number;
  /** Gap from the edges, percent of the shorter side. */
  margin: number;
}

/**
 * Where the logo goes on one image: a single box, or many boxes tiled in staggered rows for
 * "tile" (harder to crop out). Sizes follow the image's shorter side so every photo looks alike.
 */
export function markBoxes(W: number, H: number, logoW: number, logoH: number, o: MarkLayout) {
  const short = Math.min(W, H);
  const w = Math.max(1, (short * o.size) / 100), h = (w * logoH) / logoW, m = (short * o.margin) / 100;
  if (o.pos === 'tile') {
    // Tiled marks are drawn smaller and packed in staggered rows so no part of the photo is free of them
    const tw = w * 0.6, th = h * 0.6, gx = tw * 1.5, gy = th * 1.45, boxes: { x: number; y: number; w: number; h: number }[] = [];
    for (let r = 0, y = -th / 2; y < H; r++, y += gy)
      for (let x = (r % 2 ? gx / 2 : 0) - tw / 2; x < W; x += gx) boxes.push({ x, y, w: tw, h: th });
    return boxes;
  }
  const x = o.pos === 'tl' || o.pos === 'bl' ? m : o.pos === 'c' ? (W - w) / 2 : W - w - m;
  const y = o.pos === 'tl' || o.pos === 'tr' ? m : o.pos === 'c' ? (H - h) / 2 : H - h - m;
  return [{ x, y, w, h }];
}
