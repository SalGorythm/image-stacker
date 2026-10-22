import { describe, expect, it } from 'vitest';
import { findPage, homography, pageSize, project, type Quad } from './scan';

describe('homography', () => {
  it('maps each corner onto its target', () => {
    const from: Quad = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 140 }, { x: 0, y: 140 }];
    const to: Quad = [{ x: 12, y: 30 }, { x: 410, y: 8 }, { x: 440, y: 590 }, { x: 25, y: 560 }];
    const h = homography(from, to);
    from.forEach((p, i) => {
      const q = project(h, p.x, p.y);
      expect(q.x).toBeCloseTo(to[i].x, 6);
      expect(q.y).toBeCloseTo(to[i].y, 6);
    });
  });
});

describe('pageSize', () => {
  it('uses the longer opposite edges and caps the long side', () => {
    const q: Quad = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 210, y: 300 }, { x: 0, y: 290 }];
    expect(pageSize(q, 10000)).toEqual({ w: 210, h: 300 });
    expect(pageSize(q, 150)).toEqual({ w: 105, h: 150 });
  });
});

describe('findPage', () => {
  // A white, tilted sheet on a dark table
  const w = 160, h = 200, px = new Uint8ClampedArray(w * h * 4);
  const corners: Quad = [{ x: 40, y: 30 }, { x: 130, y: 45 }, { x: 115, y: 175 }, { x: 25, y: 160 }];
  const inside = (x: number, y: number) => {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      const c = Math.sign((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x));
      if (c !== 0) { if (sign && c !== sign) return false; sign = c; }
    }
    return true;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = inside(x + 0.5, y + 0.5) ? 235 : 60;
    px.set([v, v, v, 255], (y * w + x) * 4);
  }
  it('finds the four corners of the sheet', () => {
    const q = findPage(px, w, h)!;
    q.forEach((p, i) => {
      expect(Math.abs(p.x * w - corners[i].x)).toBeLessThan(3);
      expect(Math.abs(p.y * h - corners[i].y)).toBeLessThan(3);
    });
  });
  it('gives up when there is no page', () => {
    const flat = new Uint8ClampedArray(w * h * 4).fill(200);
    expect(findPage(flat, w, h)).toBeNull();
  });
});
