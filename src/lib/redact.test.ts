import { describe, expect, it } from 'vitest';
import { fromDrag, intersect } from './redact';

describe('fromDrag', () => {
  it('normalises a drag in any direction and clamps to the image', () => {
    expect(fromDrag(0.8, 0.9, 0.2, -0.1)).toEqual({ x: 0.2, y: 0, w: 0.6000000000000001, h: 0.9 });
  });
});

describe('intersect', () => {
  it('returns the overlap', () => expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toEqual({ x: 5, y: 5, w: 5, h: 5 }));
  it('returns null when apart', () => expect(intersect({ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: 2, w: 1, h: 1 })).toBeNull());
});
