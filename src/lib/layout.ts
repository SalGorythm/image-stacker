import type { WidthMode } from './types';

/** What layout needs to know about an image: its stored size and whether it can be re-rendered larger (PDF). */
export interface Sized {
  w: number;
  h: number;
  vector: boolean;
}

export interface Part<T> {
  it: T;
  w: number;
  h: number;
}

export interface Layout<T> {
  parts: Part<T>[];
  width: number;
  height: number;
  gap: number;
  /** True when shrunk to stay inside the browser's canvas limits. */
  reduced: boolean;
}

export interface LayoutOptions {
  gap: number;
  width: WidthMode;
  /** HD target width for PDF pages (0 = as stored). */
  q: number;
  maxSide: number;
  maxArea: number;
}

// Browsers refuse to export canvases past these limits (Safari is much stricter on area)
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
export const CANVAS_LIMITS = { maxSide: 32000, maxArea: isSafari ? 16e6 : 120e6 };

/**
 * Lays out one stack top to bottom. Everything, gap included, is scaled together when HD
 * enlarges PDF pages, then shrunk if it would pass the browser's canvas limits.
 */
export function layout<T>(list: T[], size: (it: T) => Sized, o: LayoutOptions): Layout<T> | null {
  if (!list.length) return null;
  const build = (hq: number) => {
    const s = list.map(it => {
      const d = size(it);
      const w = hq && d.vector ? Math.max(hq, d.w) : d.w;
      return { w, h: (d.h * w) / d.w };
    });
    const ws = s.map(x => x.w);
    const target = o.width === 'narrowest' ? Math.min(...ws) : Math.max(...ws);
    return { s, target, width: o.width === 'original' ? Math.max(...ws) : target };
  };
  const base = build(0);
  const B = o.q ? build(o.q) : base;
  const raw = B.s.map(x => (o.width === 'original' ? x : { w: B.target, h: (x.h * B.target) / x.w }));
  const gap0 = (Math.max(0, o.gap || 0) * B.width) / base.width;
  const tall = raw.reduce((t, p) => t + p.h, 0) + gap0 * (raw.length - 1);
  const fit = Math.min(1, o.maxSide / tall, o.maxSide / B.width, Math.sqrt(o.maxArea / (B.width * tall)));
  const parts = list.map((it, i) => ({ it, w: Math.round(raw[i].w * fit), h: Math.round(raw[i].h * fit) }));
  const gap = Math.round(gap0 * fit);
  return {
    parts,
    width: Math.round(B.width * fit),
    gap,
    height: parts.reduce((t, p) => t + p.h, 0) + gap * (parts.length - 1),
    reduced: fit < 1,
  };
}
