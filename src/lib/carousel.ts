export type SliceMode = 'off' | 'portrait' | 'square';

/** Instagram carousel slide sizes. */
export const SLIDE: Record<Exclude<SliceMode, 'off'>, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
};

/**
 * Where to cut a strip of length `len` into pieces no longer than `page`. With `whole`, cuts are
 * moved back to the nearest edge of an image (the spans) so no image is split, unless an image is
 * longer than a page by itself, which is then cut where the page ends.
 */
export function cutPoints(len: number, page: number, spans: [number, number][], whole: boolean): [number, number][] {
  const out: [number, number][] = [];
  const inside = (c: number) => spans.some(([a, b]) => a < c - 0.5 && c + 0.5 < b);
  let start = 0;
  while (start < len - 0.5) {
    let end = Math.min(len, start + page);
    if (whole && end < len) {
      let best = -1;
      for (const [a, b] of spans)
        for (const c of [a, b]) if (c > start + 1 && c <= end && !inside(c)) best = Math.max(best, c);
      if (best > 0) end = best;
    }
    out.push([start, end]);
    start = end;
  }
  return out;
}
