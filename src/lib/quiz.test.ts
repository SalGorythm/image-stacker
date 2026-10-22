import { describe, expect, it } from 'vitest';
import { parseQuiz, quizCards } from './quiz';

describe('parseQuiz', () => {
  it('reads Q:/A: lines, including numbered and multi-line ones', () => {
    const qs = parseQuiz('Q1: Surah Al-Fil ke mutabiq kya seekh milta hai?\nAns: Allah apni kisi bhi maqlooq se\napna kaam le sakta hai\n\nQuestion 2. What is Falah?\nAnswer - Success with no failure after it');
    expect(qs).toEqual([
      { q: 'Surah Al-Fil ke mutabiq kya seekh milta hai?', a: 'Allah apni kisi bhi maqlooq se\napna kaam le sakta hai' },
      { q: 'What is Falah?', a: 'Success with no failure after it' },
    ]);
  });
  it('reads Urdu سوال / جواب', () => {
    expect(parseQuiz('سوال: فلاح کیا ہے؟\nجواب: کامیابی')).toEqual([{ q: 'فلاح کیا ہے؟', a: 'کامیابی' }]);
  });
  it('reads blank-line separated blocks: first line question, rest answer', () => {
    expect(parseQuiz('Who built the Kaaba?\nIbrahim and Ismail\n\nHow many surahs?\n114')).toEqual([
      { q: 'Who built the Kaaba?', a: 'Ibrahim and Ismail' },
      { q: 'How many surahs?', a: '114' },
    ]);
  });
});

describe('quizCards', () => {
  const qs = Array.from({ length: 8 }, (_, i) => ({ q: `Q${i + 1}`, a: `A${i + 1}` }));
  it('puts all answers at the end, a few per card', () => {
    const c = quizCards(qs, 'end');
    expect(c.filter(x => x.kind === 'question')).toHaveLength(8);
    expect(c.slice(8).map(x => x.kind === 'answers' && x.items.length)).toEqual([6, 2]);
  });
  it('can follow each question with its answer, or show both on one card', () => {
    expect(quizCards(qs.slice(0, 2), 'after').map(x => x.kind)).toEqual(['question', 'answer', 'question', 'answer']);
    expect(quizCards(qs.slice(0, 2), 'same')).toHaveLength(2);
  });
});
