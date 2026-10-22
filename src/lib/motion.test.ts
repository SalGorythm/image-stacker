import { describe, expect, it } from 'vitest';
import { slideAt, slideshowLength, wipeAt } from './motion';

describe('wipeAt', () => {
  it('holds, sweeps to after, holds, sweeps back', () => {
    expect(wipeAt(0, 5)).toBe(0);
    expect(wipeAt(2.5, 5)).toBe(1);
    expect(wipeAt(1.35, 5)).toBeCloseTo(0.5, 1);
    expect(wipeAt(4.8, 5)).toBe(0);
  });
  it('loops', () => expect(wipeAt(7.5, 5)).toBe(wipeAt(2.5, 5)));
});

describe('slideAt', () => {
  it('holds each photo, then crossfades to the next', () => {
    expect(slideAt(1, 3, 2, 0.5)).toMatchObject({ i: 0, next: 0, mix: 0 });
    const f = slideAt(2.25, 3, 2, 0.5);
    expect(f.i).toBe(0);
    expect(f.next).toBe(1);
    expect(f.mix).toBeCloseTo(0.5, 2);
    expect(slideAt(5, 3, 2, 0.5)).toMatchObject({ i: 2, mix: 0 });
  });
  it('knows the total length', () => expect(slideshowLength(3, 2, 0.5)).toBe(7));
});
