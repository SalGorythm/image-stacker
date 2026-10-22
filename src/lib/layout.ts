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
  /** True when shrunk to fit the requested box. */
  boxed: boolean;
  /** Caption bands above and below the images, in px (0 when there is none). */
  headH: number;
  footH: number;
}

export interface LayoutOptions {
  gap: number;
  width: WidthMode;
  /** HD target width for PDF pages (0 = as stored). */
  q: number;
  maxSide: number;
  maxArea: number;
  /** Fit the finished stack inside this box (long and short side), e.g. WhatsApp's HD limit. */
  box?: { long: number; short: number };
  /** Caption band heights as a fraction of the stack's width (they scale with it). */
  head?: number;
  foot?: number;
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
  const bands = ((o.head || 0) + (o.foot || 0)) * B.width;
  const tall = raw.reduce((t, p) => t + p.h, 0) + gap0 * (raw.length - 1) + bands;
  const limitFit = Math.min(1, o.maxSide / tall, o.maxSide / B.width, Math.sqrt(o.maxArea / (B.width * tall)));
  let boxFit = 1;
  if (o.box) {
    const long = Math.max(B.width, tall), short = Math.min(B.width, tall);
    boxFit = Math.min(1, o.box.long / long, o.box.short / short);
  }
  const fit = Math.min(limitFit, boxFit);
  // Round down inside a box so the finished stack never ends up a pixel over it
  const r = boxFit < limitFit ? Math.floor : Math.round;
  const parts = list.map((it, i) => ({ it, w: r(raw[i].w * fit), h: r(raw[i].h * fit) }));
  const gap = r(gap0 * fit);
  const headH = r((o.head || 0) * B.width * fit), footH = r((o.foot || 0) * B.width * fit);
  return {
    parts,
    width: r(B.width * fit),
    gap,
    headH,
    footH,
    height: headH + parts.reduce((t, p) => t + p.h, 0) + gap * (parts.length - 1) + footH,
    reduced: limitFit < 1 && limitFit <= boxFit,
    boxed: boxFit < 1 && boxFit < limitFit,
  };
}
