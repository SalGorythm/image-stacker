import { describe, expect, it } from 'vitest';
import type { OcrWord } from './ocr';
import { findSensitive, luhn } from './sensitive';

let x = 0;
const line = (n: number, ...texts: string[]): OcrWord[] => { x = 0; return texts.map(t => { const w = { text: t, confidence: 90, line: n, box: { x, y: n * 30, w: t.length * 10, h: 20 } }; x += t.length * 10 + 8; return w; }); };

describe('findSensitive', () => {
  it('joins a phone number written in pieces and covers all of it', () => {
    const f = findSensitive(line(0, 'Call', '+92', '300', '123', '4567', 'today'));
    expect(f).toHaveLength(1);
    expect(f[0].kind).toBe('phone');
    expect(f[0].text).toBe('+92 300 123 4567');
    expect(f[0].box.x).toBeLessThan(50);
  });
  it('finds emails, CNIC numbers and card numbers', () => {
    const kinds = findSensitive([
      ...line(1, 'Email:', 'ali.khan@example.com'),
      ...line(2, 'CNIC', '42101-1234567-1'),
      ...line(3, '4111', '1111', '1111', '1111'),
    ]).map(f => f.kind).sort();
    expect(kinds).toEqual(['card', 'email', 'id']);
  });
  it('ignores short numbers like dates and prices', () => {
    expect(findSensitive(line(4, 'Paid', '450', 'on', '12/10/2026'))).toEqual([]);
  });
});

describe('luhn', () => {
  it('accepts a valid test card and rejects a near miss', () => {
    expect(luhn('4111111111111111')).toBe(true);
    expect(luhn('4111111111111112')).toBe(false);
  });
});
