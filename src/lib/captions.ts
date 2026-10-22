/** Which stack is being drawn, for caption placeholders and image numbers. */
export interface StackMeta {
  /** 1-based positions, e.g. "18-27". */
  label: string;
  /** 0-based stack index. */
  index: number;
  total: number;
  /** item id → position in the full list (1-based), for image numbers. */
  positions?: Map<number, number>;
}

/** Caption band height as a fraction of the stack's width. */
export const CAPTION_RATIO = 0.075;

/**
 * Fills caption placeholders: {range} → "18-27", {first} → "18", {last} → "27",
 * {n} → stack number, {total} → number of stacks. Unknown braces are left as typed.
 */
export function fillCaption(tpl: string, m: Pick<StackMeta, 'label' | 'index' | 'total'>): string {
  const [first, last = first] = m.label.split('-');
  const values: Record<string, string> = {
    range: m.label,
    first,
    last,
    n: String(m.index + 1),
    total: String(m.total),
  };
  // In Arabic-script captions, keep inserted numbers left to right ("18-27" must not show as "27-18")
  const iso = /[\u0600-\u06FF]/.test(tpl) ? (v: string) => `\u2066${v}\u2069` : (v: string) => v;
  return tpl.replace(/\{(\w+)\}/g, (all, k: string) => (values[k.toLowerCase()] != null ? iso(values[k.toLowerCase()]) : all)).trim();
}

/** Dark text on light gaps, white text on dark ones. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#1d2420';
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.55 ? '#1d2420' : '#ffffff';
}
