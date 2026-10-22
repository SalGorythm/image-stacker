import type { WidthMode } from './types';

/** What layout needs to know about an image: its stored size and whether it can be re-rendered larger (PDF). */
export interface Sized {
  w: number;
  h: number;
  vector: boolean;
}

export interface Part<T> {
  it: T;
  x: number;
  y: number;
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

export type Arrange = 'vertical' | 'horizontal' | 'grid';

export interface LayoutOptions {
  gap: number;
  /** How images are matched in size: the largest, the smallest, or left as they are. */
  width: WidthMode;
  /** HD target width of the finished image when it holds PDF pages (0 = as stored). */
  q: number;
  maxSide: number;
  maxArea: number;
  /** Fit the finished stack inside this box (long and short side), e.g. WhatsApp's HD limit. */
  box?: { long: number; short: number };
  /** Caption band heights as a fraction of the stack's width (they scale with it). */
  head?: number;
  foot?: number;
  /** joined[i]: images i and i+1 continue each other, so no gap goes between them (top to bottom only). */
  joined?: boolean[];
  arrange?: Arrange;
  /** Columns for a grid. */
  columns?: number;
}

// Browsers refuse to export canvases past these limits (Safari is much stricter on area)
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
export const CANVAS_LIMITS = { maxSide: 32000, maxArea: isSafari ? 16e6 : 120e6 };

type Box = { x: number; y: number; w: number; h: number };

/**
 * Matches image sizes: side by side they share a height, otherwise a width
 * ('widest' uses the largest, 'narrowest' the smallest; 'original' leaves them).
 */
function matchSizes(s: Sized[], o: LayoutOptions) {
  if (o.width === 'original') return s.map(d => ({ w: d.w, h: d.h }));
  const side = o.arrange === 'horizontal';
  const vals = s.map(d => (side ? d.h : d.w));
  const t = o.width === 'narrowest' ? Math.min(...vals) : Math.max(...vals);
  return s.map(d => (side ? { w: (d.w * t) / d.h, h: t } : { w: t, h: (d.h * t) / d.w }));
}

/** Places sized images with the given gap; images are centred in their row or column. */
function place(sizes: { w: number; h: number }[], gap: number, o: LayoutOptions): { boxes: Box[]; W: number; H: number } {
  const n = sizes.length;
  if (o.arrange === 'horizontal') {
    const H = Math.max(...sizes.map(z => z.h));
    let x = 0;
    const boxes = sizes.map(z => { const b = { x, y: (H - z.h) / 2, w: z.w, h: z.h }; x += z.w + gap; return b; });
    return { boxes, W: x - gap, H };
  }
  const C = o.arrange === 'grid' ? Math.max(1, Math.min(n, Math.floor(o.columns || 2))) : 1;
  const cell = Math.max(...sizes.map(z => z.w));
  const boxes: Box[] = [];
  let y = 0;
  for (let r = 0; r * C < n; r++) {
    const row = sizes.slice(r * C, r * C + C);
    const rowH = Math.max(...row.map(z => z.h));
    row.forEach((z, c) => boxes.push({ x: c * (cell + gap) + (cell - z.w) / 2, y: y + (rowH - z.h) / 2, w: z.w, h: z.h }));
    const last = r * C + row.length - 1;
    y += rowH + (last === n - 1 ? 0 : C === 1 && o.joined?.[last] ? 0 : gap);
  }
  return { boxes, W: C * cell + (C - 1) * gap, H: y };
}

/**
 * Lays out one stack. HD enlarges the whole stack (gap included) when it holds PDF pages; then it
 * shrinks if it would pass the browser's canvas limits or the requested box. Sizes are rounded
 * before the final placement so joined images meet without a hairline.
 */
export function layout<T>(list: T[], size: (it: T) => Sized, o: LayoutOptions): Layout<T> | null {
  if (!list.length) return null;
  const s = list.map(size);
  const gap0 = Math.max(0, o.gap || 0);
  const sizes = matchSizes(s, o);
  const nat = place(sizes, gap0, o);
  const bands = (o.head || 0) + (o.foot || 0);

  const up = o.q && s.some(d => d.vector) ? Math.max(1, o.q / nat.W) : 1;
  const W1 = nat.W * up, H1 = (nat.H + bands * nat.W) * up;
  const limitFit = Math.min(1, o.maxSide / H1, o.maxSide / W1, Math.sqrt(o.maxArea / (W1 * H1)));
  let boxFit = 1;
  if (o.box) boxFit = Math.min(1, o.box.long / Math.max(W1, H1), o.box.short / Math.min(W1, H1));
  const k = up * Math.min(limitFit, boxFit);
  // Round down inside a box so the finished stack never ends up a pixel over it
  const r = boxFit < limitFit ? Math.floor : Math.round;

  const gap = r(gap0 * k);
  const fin = place(sizes.map(z => ({ w: r(z.w * k), h: r(z.h * k) })), gap, o);
  const headH = r((o.head || 0) * nat.W * k), footH = r((o.foot || 0) * nat.W * k);
  return {
    parts: fin.boxes.map((b, i) => ({ it: list[i], x: Math.round(b.x), y: headH + Math.round(b.y), w: b.w, h: b.h })),
    width: Math.round(fin.W),
    gap,
    headH,
    footH,
    height: headH + Math.round(fin.H) + footH,
    reduced: limitFit < 1 && limitFit <= boxFit,
    boxed: boxFit < 1 && boxFit < limitFit,
  };
}
