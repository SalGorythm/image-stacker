import { describe, expect, it } from 'vitest';
import { fitText, pickFont, rtlFirst, textStyle, wrapLines } from './script';

describe('script detection', () => {
  it('gives Urdu Nastaliq, Arabic Naskh, English nothing', () => {
    expect(pickFont('یہ ہمارا اسکول ہے', 'auto')).toBe('nastaliq');
    expect(pickFont('مَرْحَبًا بِكُمْ', 'auto')).toBe('naskh');
    expect(pickFont('Revision, Part 1', 'auto')).toBeNull();
    expect(pickFont('الحمد لله', 'amiri')).toBe('amiri');
    expect(pickFont('جوابات سبق نمبر ۳', 'auto')).toBe('nastaliq');
  });
  it('sets direction by the first strong letter', () => {
    expect(rtlFirst('سورة الفاتحة 1')).toBe(true);
    expect(rtlFirst('Chapter الف')).toBe(false);
    expect(textStyle('یہ', 'auto').lineHeight).toBeGreaterThan(textStyle('hello', 'auto').lineHeight);
  });
});

// Every character is 10px wide at size 10, scaling with size
const measure = (s: string, size = 10) => s.length * size;

describe('wrapLines', () => {
  it('wraps on spaces and keeps line breaks', () => {
    expect(wrapLines('aa bb cc\ndd', 50, s => measure(s))).toEqual(['aa bb', 'cc', 'dd']);
  });
});

describe('fitText', () => {
  it('uses the largest size that fits the box', () => {
    const r = fitText('one two three four', 200, 100, 1.2, measure, 40);
    expect(r.lines.length * r.size * 1.2).toBeLessThanOrEqual(100);
    expect(r.lines.every(l => measure(l, r.size) <= 200)).toBe(true);
    expect(r.size).toBeGreaterThan(12);
  });
  it('stops at the minimum when nothing fits', () => {
    expect(fitText('x'.repeat(500), 100, 20, 1.2, measure, 40, 12).size).toBe(12);
  });
});
