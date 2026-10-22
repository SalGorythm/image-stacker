import { describe, expect, it } from 'vitest';
import { layout, type Sized } from './layout';

const big = { maxSide: 32000, maxArea: 120e6 };
const id = (s: Sized) => s;
const slide = (w = 1600, h = 900, vector = true): Sized => ({ w, h, vector });

describe('layout', () => {
  it('keeps aspect ratio when scaling to the widest', () => {
    const L = layout([slide(1000, 500, false), slide(500, 500, false)], id, { gap: 10, width: 'widest', q: 0, ...big })!;
    expect(L.parts.map(p => [p.w, p.h])).toEqual([[1000, 500], [1000, 1000]]);
    expect(L.height).toBe(1510);
  });

  it('enlarges PDF pages for HD and scales the gap with them', () => {
    const L = layout([slide(), slide()], id, { gap: 18, width: 'widest', q: 2560, ...big })!;
    expect(L.width).toBe(2560);
    expect(L.gap).toBe(29);
    expect(L.parts[0].h).toBe(1440);
  });

  it('does not enlarge raster images', () => {
    const L = layout([slide(1232, 693, false)], id, { gap: 0, width: 'widest', q: 2560, ...big })!;
    expect(L.width).toBe(1232);
  });

  it('shrinks to fit canvas limits and says so', () => {
    const L = layout(Array(30).fill(slide()), id, { gap: 0, width: 'widest', q: 3840, maxSide: 32000, maxArea: 16e6 })!;
    expect(L.reduced).toBe(true);
    expect(L.width * L.height).toBeLessThanOrEqual(16e6 * 1.01);
  });

  it('returns null for an empty stack', () => expect(layout([], id, { gap: 0, width: 'widest', q: 0, ...big })).toBeNull());
});
