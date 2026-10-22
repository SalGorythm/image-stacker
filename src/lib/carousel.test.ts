import { describe, expect, it } from 'vitest';
import { cutPoints } from './carousel';

// Four 300px images with 20px gaps: 0-300, 320-620, 640-940, 960-1260
const spans: [number, number][] = [[0, 300], [320, 620], [640, 940], [960, 1260]];

describe('cutPoints', () => {
  it('cuts evenly when images may be split', () => {
    expect(cutPoints(1260, 500, spans, false)).toEqual([[0, 500], [500, 1000], [1000, 1260]]);
  });
  it('moves each cut back to an image edge to keep images whole', () => {
    expect(cutPoints(1260, 650, spans, true)).toEqual([[0, 640], [640, 1260]]);
  });
  it('cuts through an image only when it is longer than a page', () => {
    expect(cutPoints(1000, 400, [[0, 1000]], true)).toEqual([[0, 400], [400, 800], [800, 1000]]);
  });
  it('returns one piece when everything fits', () => expect(cutPoints(300, 500, spans, true)).toEqual([[0, 300]]));
});
