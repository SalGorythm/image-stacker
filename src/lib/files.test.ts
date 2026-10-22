import { describe, expect, it } from 'vitest';
import { baseName, fileName } from './files';

describe('file names', () => {
  it('strips a typed extension', () => expect(baseName('notes.PNG')).toBe('notes'));
  it('falls back when empty', () => expect(baseName('  ')).toBe('stacked'));
  it('names a single stack plainly', () => expect(fileName('deck', 'jpg', 0, ['1-4'])).toBe('deck.jpg'));
  it('numbers and labels several stacks', () =>
    expect(fileName('deck', 'png', 1, Array(12).fill('').map((_, i) => String(i)))).toBe('deck-02 (1).png'));
});
