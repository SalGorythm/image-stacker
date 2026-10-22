import { describe, expect, it } from 'vitest';
import { fillCaption, textOn } from './captions';

describe('fillCaption', () => {
  const m = { label: '18-27', index: 1, total: 3 };
  it('fills range, first, last, n and total', () =>
    expect(fillCaption('Answers {range} ({first} to {last}) · {n}/{total}', m)).toBe('Answers 18-27 (18 to 27) · 2/3'));
  it('handles a single image stack', () => expect(fillCaption('Slide {first}–{last}', { label: '7', index: 0, total: 1 })).toBe('Slide 7–7'));
  it('keeps numbers left to right inside Arabic-script captions', () =>
    expect(fillCaption('جوابات {range}', m)).toBe('جوابات \u206618-27\u2069'));
  it('leaves unknown placeholders alone', () => expect(fillCaption('{range} {nope}', m)).toBe('18-27 {nope}'));
});

describe('textOn', () => {
  it('picks dark text on white and white text on dark', () => {
    expect(textOn('#ffffff')).toBe('#1d2420');
    expect(textOn('#1d2420')).toBe('#ffffff');
  });
});
