import { describe, expect, it } from 'vitest';
import { combine, detectBlank, NO_CROP } from './trim';

/** A w×h white image with a black rectangle from (x0,y0) to (x1,y1) exclusive. */
function img(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const px = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set([0, 0, 0, 255], (y * w + x) * 4);
  return px;
}

describe('detectBlank', () => {
  it('finds white margins around content', () => {
    const c = detectBlank(img(100, 50, 10, 5, 80, 40), 100, 50);
    expect(c).toEqual({ t: 0.1, b: 0.2, l: 0.1, r: 0.2 });
  });
  it('ignores a few stray pixels in a margin', () => {
    const px = img(200, 100, 20, 20, 180, 80);
    px.set([0, 0, 0, 255], (5 * 200 + 100) * 4); // one dark speck in the top margin
    expect(detectBlank(px, 200, 100).t).toBe(0.2);
  });
  it('leaves a blank image alone', () => {
    expect(detectBlank(img(10, 10, 0, 0, 0, 0), 10, 10)).toEqual(NO_CROP);
  });
});

describe('combine', () => {
  it('adds manual percent to detected margins', () => {
    const c = combine({ t: 0.1, b: 0, l: 0, r: 0 }, { t: 5, b: 10, l: 0, r: 0 });
    expect(c.t).toBeCloseTo(0.15);
    expect(c.b).toBeCloseTo(0.1);
  });
  it('always keeps at least 10% of the image', () => {
    const c = combine({ t: 0.5, b: 0.3, l: 0, r: 0 }, { t: 45, b: 45, l: 0, r: 0 });
    expect(c.t + c.b).toBeCloseTo(0.9);
  });
});
