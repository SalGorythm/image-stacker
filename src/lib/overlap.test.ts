import { describe, expect, it } from 'vitest';
import { findJoin, findJoinTwoStep, type Gray } from './overlap';

// Deterministic noise so every content row is distinct, like text in a chat
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const rows = (n: number, w: number) => Array.from({ length: n }, () => Uint8Array.from({ length: w }, () => Math.floor(rand() * 256)));

function img(w: number, parts: Uint8Array[][]): Gray {
  const all = parts.flat();
  const data = new Uint8Array(all.length * w);
  all.forEach((r, i) => data.set(r, i * w));
  return { w, h: all.length, data };
}
/** Shrinks a Gray by an integer factor, averaging blocks (like drawing it smaller). */
function shrink(g: Gray, k: number): Gray {
  const w = Math.floor(g.w / k), h = Math.floor(g.h / k), data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) s += g.data[(y * k + j) * g.w + x * k + i];
    data[y * w + x] = s / (k * k);
  }
  return { w, h, data };
}

describe('findJoin', () => {
  const W = 96;
  const header = rows(20, W), footer = rows(16, W), content = rows(700, W);
  // First screenshot shows content 0-399, the second 250-649 (scrolled by 250 rows)
  const a = img(W, [header, content.slice(0, 400), footer]);
  const b = img(W, [header, content.slice(250, 650), footer]);

  it('finds the fixed header, footer and the scroll distance', () => {
    expect(findJoin(a, b)).toEqual({ top: 20, bottom: 16, shift: 250 });
  });

  it('refuses images that do not overlap', () => {
    const c = img(W, [header, rows(400, W), footer]);
    expect(findJoin(a, c)).toBeNull();
  });

  it('refuses plain images, where any shift would match', () => {
    const flat = (v: number) => [Array.from({ length: 300 }, () => new Uint8Array(W).fill(v))];
    expect(findJoin(img(W, flat(240)), img(W, flat(240)))).toBeNull();
  });

  it('refines a coarse estimate to the exact row', () => {
    const big = (x: Gray[]) => x as [Gray, Gray];
    const j = findJoinTwoStep(big([shrink(a, 4), shrink(b, 4)]), big([a, b]));
    expect(j?.shift).toBe(250);
  });
});
