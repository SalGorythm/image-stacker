import { describe, expect, it } from 'vitest';
import { parseQuiz, quizCards } from './quiz';

describe('parseQuiz', () => {
  it('reads Q:/A: lines, including numbered and multi-line ones', () => {
    const qs = parseQuiz('Q1: Paudhe apna khana kaise banate hain?\nAns: Dhoop, paani aur hawa se,\nis ko photosynthesis kehte hain\n\nQuestion 2. What is gravity?\nAnswer - The pull between objects');
    expect(qs).toEqual([
      { q: 'Paudhe apna khana kaise banate hain?', a: 'Dhoop, paani aur hawa se,\nis ko photosynthesis kehte hain' },
      { q: 'What is gravity?', a: 'The pull between objects' },
    ]);
  });
  it('reads Urdu سوال / جواب', () => {
    expect(parseQuiz('سوال: پاکستان کا دارالحکومت کیا ہے؟\nجواب: اسلام آباد')).toEqual([{ q: 'پاکستان کا دارالحکومت کیا ہے؟', a: 'اسلام آباد' }]);
  });
  it('reads blank-line separated blocks: first line question, rest answer', () => {
    expect(parseQuiz('Who wrote Hamlet?\nWilliam Shakespeare\n\nHow many days in a leap year?\n366')).toEqual([
      { q: 'Who wrote Hamlet?', a: 'William Shakespeare' },
      { q: 'How many days in a leap year?', a: '366' },
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
