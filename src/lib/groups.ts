import type { GroupMode, Tail } from './types';

export interface Group<T> {
  /** 1-based positions, e.g. "1-4" or "7". */
  label: string;
  list: T[];
}

export interface GroupOptions {
  mode: GroupMode;
  sizes: string[];
  tail: Tail;
  ranges: string;
}

export function readSizes(sizes: string[]): number[] {
  const v = sizes.map(x => Math.floor(Number(x)) || 0).filter(x => x > 0);
  return v.length ? v : [4];
}

/** Parses "1-4, 5-8, 9" into clamped 1-based [start, end] pairs; unreadable tokens go to `bad`. */
export function parseRanges(s: string, n: number) {
  const out: [number, number][] = [];
  const bad: string[] = [];
  for (const tok of s.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean)) {
    const m = tok.match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
    if (!m) { bad.push(tok); continue; }
    let a = +m[1], b = m[2] ? +m[2] : a;
    if (a > b) [a, b] = [b, a];
    a = Math.max(1, a);
    b = Math.min(n, b);
    if (a > b) { bad.push(tok); continue; }
    out.push([a, b]);
  }
  return { out, bad };
}

/**
 * Splits items into stacks. "every": sizes are used in turn; one size repeats ("every N"),
 * with several the rest either goes into one final stack or keeps repeating the last size.
 */
export function computeGroups<T>(items: T[], o: GroupOptions): { groups: Group<T>[]; info: string } {
  const n = items.length;
  let info = '';
  let ranges: [number, number][] = [];

  if (o.mode === 'every' && n) {
    const sizes = readSizes(o.sizes);
    const rest = sizes.length > 1 && o.tail === 'rest';
    for (let a = 1, i = 0; a <= n; i++) {
      const k = i >= sizes.length && rest ? n : sizes[Math.min(i, sizes.length - 1)];
      ranges.push([a, Math.min(n, a + k - 1)]);
      a += k;
    }
    if (sizes.length > 1 && ranges.length > 1)
      info = `${n} images → ${ranges.length} stacked images (${sizes.join(', ')}, then ${rest ? 'the rest' : sizes.at(-1) + ' each'}).`;
  } else if (o.mode === 'ranges' && n) {
    const { out, bad } = parseRanges(o.ranges, n);
    ranges = out;
    const used = new Set<number>();
    out.forEach(([a, b]) => { for (let i = a; i <= b; i++) used.add(i); });
    const parts: string[] = [];
    if (!out.length) info = 'Type ranges like 1-4, 5-8. Until then everything is one image.';
    if (bad.length) parts.push('Ignored: ' + bad.join(', '));
    if (out.length && used.size < n) parts.push(`${n - used.size} image${n - used.size > 1 ? 's are' : ' is'} not in any group`);
    if (parts.length) info = (info ? info + ' ' : '') + parts.join(' · ') + '.';
  }

  if (!ranges.length) ranges = n ? [[1, n]] : [];
  const groups = ranges.map(([a, b]) => ({ label: a === b ? String(a) : `${a}-${b}`, list: items.slice(a - 1, b) }));
  if (o.mode !== 'all' && groups.length > 1 && !info) info = `${n} images → ${groups.length} stacked images.`;
  return { groups, info };
}

/** Writes sorted page numbers back as ranges: [1,2,3,5,7,8] → "1-3, 5, 7-8". */
export function toRanges(nums: number[]): string {
  const out: string[] = [];
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    out.push(a === sorted[i] ? String(a) : `${a}-${sorted[i]}`);
  }
  return out.join(', ');
}

/** Page numbers named by a ranges string, in page order, without repeats. */
export function pagesFrom(text: string, n: number): number[] {
  const set = new Set<number>();
  for (const [a, b] of parseRanges(text, n).out) for (let i = a; i <= b; i++) set.add(i);
  return [...set].sort((a, b) => a - b);
}
