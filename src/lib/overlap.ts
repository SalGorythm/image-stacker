/** A greyscale copy of an image, one byte per pixel, row by row. */
export interface Gray {
  w: number;
  h: number;
  data: Uint8Array;
}

/**
 * How two consecutive scrolling screenshots line up, in rows of the images they were measured on:
 * `top` rows of fixed header (status bar, app bar) and `bottom` rows of fixed footer appear in both;
 * between them, row r of the second image shows what row r + `shift` showed in the first.
 */
export interface Join {
  top: number;
  bottom: number;
  shift: number;
}

/** Mean absolute difference between row ra of a and row rb of b, giving up once it passes `cap`. */
function rowDiff(a: Gray, ra: number, b: Gray, rb: number) {
  let s = 0;
  const oa = ra * a.w, ob = rb * b.w;
  for (let x = 0; x < a.w; x++) s += Math.abs(a.data[oa + x] - b.data[ob + x]);
  return s / a.w;
}

/** How much a row varies across its width; flat rows (plain background) carry no matching signal. */
function rowDetail(g: Gray, r: number) {
  let s = 0;
  const o = r * g.w;
  for (let x = 1; x < g.w; x++) s += Math.abs(g.data[o + x] - g.data[o + x - 1]);
  return s / g.w;
}

const SAME = 3; // rows this close count as identical
const MATCH = 5; // an overlap this close counts as a match

/** Rows that are identical at the same place in both images, from the top or from the bottom. */
export function fixedRows(a: Gray, b: Gray, fromTop: boolean, max: number) {
  let n = 0;
  while (n < max) {
    const r = fromTop ? n : a.h - 1 - n;
    if (rowDiff(a, r, b, r) >= SAME) break;
    n++;
  }
  return n;
}

/** Mean row difference of the overlap for one shift, or Infinity once it passes `cap`. */
function overlapCost(a: Gray, b: Gray, lo: number, hi: number, d: number, cap: number) {
  const n = hi - d - lo;
  let sum = 0;
  for (let r = lo; r < hi - d; r++) {
    sum += rowDiff(a, r + d, b, r);
    if (sum > cap * n) return Infinity;
  }
  return sum / n;
}

/** Fixed header/footer rows and every shift whose overlap costs less than `match`, best first. */
function scan(a: Gray, b: Gray, match: number, near?: { shift: number; slack: number }) {
  if (a.w !== b.w || a.h !== b.h) return null;
  const H = a.h;
  const top = fixedRows(a, b, true, Math.floor(H * 0.35));
  const bottom = fixedRows(a, b, false, Math.floor(H * 0.35));
  const lo = top, hi = H - bottom, mid = hi - lo;
  if (mid < H * 0.2) return null;
  const minOverlap = Math.max(4, Math.round(mid * 0.08));
  let from = 1, to = mid - minOverlap;
  if (near) { from = Math.max(from, near.shift - near.slack); to = Math.min(to, near.shift + near.slack); }
  const costs: { d: number; cost: number }[] = [];
  for (let d = from; d <= to; d++) costs.push({ d, cost: overlapCost(a, b, lo, hi, d, match) });
  // Keep local minima only: a smooth image matches itself at many neighbouring shifts
  const minima = costs.filter((c, i) => c.cost < match && (i === 0 || c.cost <= costs[i - 1].cost) && (i === costs.length - 1 || c.cost <= costs[i + 1].cost));
  minima.sort((x, y) => x.cost - y.cost);
  return { top, bottom, lo, hi, minima };
}

/** A match across plain background proves nothing: the shared rows must carry some detail. */
function detailed(b: Gray, lo: number, end: number) {
  let detail = 0;
  for (let r = lo; r < end; r++) detail += rowDetail(b, r);
  return detail / Math.max(1, end - lo) >= 1.5;
}

/**
 * Finds where screenshot b continues screenshot a, or null when they don't overlap (different
 * sizes, nothing scrolled, or the shared part is too plain to trust).
 * `near` limits the search to shifts close to an estimate from a smaller copy.
 */
export function findJoin(a: Gray, b: Gray, near?: { shift: number; slack: number }, match = MATCH): Join | null {
  const r = scan(a, b, match, near);
  const best = r?.minima[0];
  if (!r || !best || !detailed(b, r.lo, r.hi - best.d)) return null;
  return { top: r.top, bottom: r.bottom, shift: best.d };
}

/**
 * Coarse search on small copies proposes a few shifts; each is checked on larger copies with the
 * strict threshold, and the best confirmed one wins. Shrinking blends neighbouring rows, so the
 * coarse pass is loose, and smooth images (chat backgrounds) give it false candidates to weed out.
 */
export function findJoinTwoStep(small: [Gray, Gray], large: [Gray, Gray]): Join | null {
  const c = scan(small[0], small[1], MATCH * 3);
  if (!c) return null;
  const f = large[0].h / small[0].h;
  let best: { j: Join; cost: number } | null = null;
  for (const cand of c.minima.slice(0, 8)) {
    const near = { shift: Math.round(cand.d * f), slack: Math.ceil(f) + 2 };
    const r = scan(large[0], large[1], MATCH, near);
    const m = r?.minima[0];
    if (r && m && (!best || m.cost < best.cost) && detailed(large[1], r.lo, r.hi - m.d))
      best = { j: { top: r.top, bottom: r.bottom, shift: m.d }, cost: m.cost };
  }
  return best?.j ?? null;
}
