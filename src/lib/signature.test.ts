import { describe, expect, it } from 'vitest';
import { inkMask, otsu } from './signature';

/** A 200×100 sheet whose paper darkens from left (240) to right (150), like a shadow, with dark ink strokes. */
function sheet(ink: (x: number, y: number) => boolean) {
  const w = 200, h = 100, px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const paper = 240 - (90 * x) / w;
      const v = ink(x, y) ? paper * 0.35 : paper;
      px.set([v, v, v, 255], (y * w + x) * 4);
    }
  return { px, w, h };
}

describe('otsu', () => {
  it('splits two clusters', () => {
    const t = otsu(Float32Array.from([...Array(50).fill(30), ...Array(50).fill(220)]));
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(220);
  });
});

describe('inkMask', () => {
  const stroke = (x: number, y: number) => x >= 40 && x < 170 && y >= 45 && y < 52;
  it('finds the strokes and their box, even across a shadow', () => {
    const { px, w, h } = sheet(stroke);
    const m = inkMask(px, w, h);
    expect(m.box).toEqual({ x: 40, y: 45, w: 130, h: 7 });
    // The darker, shadowed paper on the right is not mistaken for ink
    expect(m.alpha[20 * w + 190]).toBe(0);
    expect(m.alpha[48 * w + 160]).toBe(1);
  });
  it('reports a blank page as having no ink', () => {
    const { px, w, h } = sheet(() => false);
    expect(inkMask(px, w, h).box).toBeNull();
  });
});
