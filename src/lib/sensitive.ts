import type { OcrWord } from './ocr';

export interface Finding { kind: 'phone' | 'email' | 'id' | 'card'; text: string; box: { x: number; y: number; w: number; h: number } }

const union = (ws: OcrWord[]) => {
  const x0 = Math.min(...ws.map(w => w.box.x)), y0 = Math.min(...ws.map(w => w.box.y));
  const x1 = Math.max(...ws.map(w => w.box.x + w.box.w)), y1 = Math.max(...ws.map(w => w.box.y + w.box.h));
  // A little padding so blur covers the glyph edges
  const p = Math.max(2, (y1 - y0) * 0.15);
  return { x: x0 - p, y: y0 - p, w: x1 - x0 + 2 * p, h: y1 - y0 + 2 * p };
};

const digits = (s: string) => s.replace(/\D/g, '');
const numberish = (s: string) => /^[+(]?[\d()\-–.\s/]*\d[\d()\-–.\s/]*$/.test(s);

/** Luhn check: separates real card numbers from other long digit strings. */
export function luhn(n: string) {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = +n[n.length - 1 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return n.length >= 13 && sum % 10 === 0;
}

/**
 * Finds private details in recognised text: phone numbers (written in pieces like "+92 300 123 4567"),
 * emails, Pakistan CNIC / India Aadhaar style ID numbers, and card numbers. Neighbouring number
 * pieces on one line are joined before judging them.
 */
export function findSensitive(words: OcrWord[]): Finding[] {
  const out: Finding[] = [];
  for (const w of words)
    if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(w.text)) out.push({ kind: 'email', text: w.text, box: union([w]) });

  const lines = new Map<number, OcrWord[]>();
  for (const w of words) lines.set(w.line, [...(lines.get(w.line) ?? []), w]);
  for (const ws of lines.values()) {
    let run: OcrWord[] = [];
    const flush = () => {
      if (!run.length) return;
      const text = run.map(r => r.text).join(' '), d = digits(text);
      let kind: Finding['kind'] | null = null;
      if (/^\d{5}-\d{7}-\d$/.test(text.replace(/\s/g, '')) || /^\d{4}\s?\d{4}\s?\d{4}$/.test(text.trim())) kind = 'id';
      else if (d.length >= 13 && d.length <= 19 && luhn(d)) kind = 'card';
      else if (d.length >= 9 && d.length <= 15) kind = 'phone';
      if (kind) out.push({ kind, text, box: union(run) });
      run = [];
    };
    for (const w of ws.sort((a, b) => a.box.x - b.box.x)) {
      if (numberish(w.text)) run.push(w);
      else flush();
    }
    flush();
  }
  return out;
}
