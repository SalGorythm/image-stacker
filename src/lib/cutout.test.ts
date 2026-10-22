import { describe, expect, it } from 'vitest';
import { shapeMask } from './cutout';

describe('shapeMask', () => {
  const raw = Float32Array.from([-3, -1, 0, 1, 3]);
  it('makes the background clear and the subject solid', () => {
    const m = shapeMask(raw);
    expect(m[0]).toBeLessThan(0.01);
    expect(m[4]).toBeGreaterThan(0.99);
    expect(m[2]).toBeCloseTo(0.5, 1);
  });
  it('keeps more of the subject when the edge moves out', () => {
    expect(shapeMask(raw, 0.8)[1]).toBeGreaterThan(shapeMask(raw, 0)[1]);
    expect(shapeMask(raw, -0.8)[3]).toBeLessThan(shapeMask(raw, 0)[3]);
  });
});
