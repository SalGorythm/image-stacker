import { describe, expect, it } from 'vitest';
import { computeGroups, pagesFrom, parseRanges, readSizes, toRanges, type GroupOptions } from './groups';

const items = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const labels = (n: number, o: Partial<GroupOptions>) =>
  computeGroups(items(n), { mode: 'every', sizes: ['4'], tail: 'rest', ranges: '', ...o }).groups.map(g => g.label);

describe('readSizes', () => {
  it('drops empty and invalid boxes', () => expect(readSizes(['3', '', 'x', '0', '5'])).toEqual([3, 5]));
  it('falls back to 4', () => expect(readSizes([''])).toEqual([4]));
});

describe('every N', () => {
  it('repeats a single size', () => expect(labels(10, { sizes: ['4'] })).toEqual(['1-4', '5-8', '9-10']));
  it('puts the rest in one stack after several sizes', () =>
    expect(labels(20, { sizes: ['4', '3', '5'] })).toEqual(['1-4', '5-7', '8-12', '13-20']));
  it('can repeat the last size instead', () =>
    expect(labels(20, { sizes: ['4', '3', '5'], tail: 'repeat' })).toEqual(['1-4', '5-7', '8-12', '13-17', '18-20']));
  it('describes the split', () =>
    expect(computeGroups(items(50), { mode: 'every', sizes: ['4'], tail: 'rest', ranges: '' }).info).toBe('50 images → 13 stacked images.'));
});

describe('ranges', () => {
  it('parses, clamps and swaps', () => {
    expect(parseRanges('1-4, 9 – 6, 12, 40-60, abc', 50)).toEqual({ out: [[1, 4], [6, 9], [12, 12], [40, 50]], bad: ['abc'] });
  });
  it('rejects ranges past the end', () => expect(parseRanges('60-70', 50).bad).toEqual(['60-70']));
  it('reports unused images and falls back to everything when empty', () => {
    expect(computeGroups(items(10), { mode: 'ranges', sizes: [], tail: 'rest', ranges: '1-4' }).info).toBe('6 images are not in any group.');
    const r = computeGroups(items(3), { mode: 'ranges', sizes: [], tail: 'rest', ranges: '' });
    expect(r.groups.map(g => g.label)).toEqual(['1-3']);
  });
});

describe('all', () => {
  it('is one stack, or none when empty', () => {
    expect(labels(5, { mode: 'all' })).toEqual(['1-5']);
    expect(labels(0, { mode: 'all' })).toEqual([]);
  });
});

describe('page selection text', () => {
  it('writes pages as ranges', () => expect(toRanges([7, 1, 2, 3, 5, 8])).toBe('1-3, 5, 7-8'));
  it('reads ranges back into pages', () => expect(pagesFrom('3-5, 1, 4, 40', 10)).toEqual([1, 3, 4, 5]));
  it('round-trips', () => expect(pagesFrom(toRanges([2, 3, 4, 9]), 10)).toEqual([2, 3, 4, 9]));
});
