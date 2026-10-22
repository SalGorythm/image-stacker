import { describe, expect, it } from 'vitest';
import { markBoxes } from './watermark';

describe('markBoxes', () => {
  it('puts the logo in the bottom-right corner with a margin, sized by the shorter side', () => {
    const [b] = markBoxes(2000, 1000, 400, 200, { pos: 'br', size: 20, margin: 3 });
    expect(b).toEqual({ x: 2000 - 200 - 30, y: 1000 - 100 - 30, w: 200, h: 100 });
  });
  it('matches size on portrait and landscape photos', () => {
    const a = markBoxes(3000, 2000, 100, 100, { pos: 'tl', size: 10, margin: 0 })[0];
    const b = markBoxes(2000, 3000, 100, 100, { pos: 'tl', size: 10, margin: 0 })[0];
    expect(a.w).toBe(b.w);
  });
  it('centres', () => expect(markBoxes(1000, 1000, 100, 50, { pos: 'c', size: 20, margin: 5 })[0]).toEqual({ x: 400, y: 450, w: 200, h: 100 }));
  it('tiles across the whole image', () => {
    const boxes = markBoxes(1000, 800, 100, 50, { pos: 'tile', size: 15, margin: 0 });
    expect(boxes.length).toBeGreaterThan(10);
    expect(Math.max(...boxes.map(b => b.x + b.w))).toBeGreaterThanOrEqual(1000 - 150);
    expect(Math.max(...boxes.map(b => b.y))).toBeGreaterThan(800 * 0.7);
  });
});
