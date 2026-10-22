export interface QA { q: string; a: string }

const Q = /^\s*(?:q(?:uestion)?\s*\d*\s*[:.)\-]|\d+\s*[.):-]|سوال\s*\d*\s*[:.)\-])\s*/i;
const A = /^\s*(?:a(?:ns(?:wer)?)?\s*\d*\s*[:.)\-]|جواب\s*\d*\s*[:.)\-])\s*/i;

/**
 * Reads questions and answers typed or pasted in any of the usual shapes:
 * "Q: … / A: …" lines (also "Question 1.", "1)", "Answer:", "Ans -", Urdu سوال / جواب), or
 * blocks separated by a blank line where the first line is the question and the rest the answer.
 */
export function parseQuiz(text: string): QA[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const tagged = lines.some(l => Q.test(l)) && lines.some(l => A.test(l));
  const out: QA[] = [];
  if (tagged) {
    let cur: QA | null = null, field: 'q' | 'a' = 'q';
    for (const raw of lines) {
      if (A.test(raw) && cur) { field = 'a'; cur.a = raw.replace(A, ''); continue; }
      if (Q.test(raw)) { if (cur) out.push(cur); cur = { q: raw.replace(Q, ''), a: '' }; field = 'q'; continue; }
      if (cur && raw.trim()) cur[field] += (cur[field] ? '\n' : '') + raw.trim();
    }
    if (cur) out.push(cur);
  } else {
    for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
      const ls = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (ls.length) out.push({ q: ls[0], a: ls.slice(1).join('\n') });
    }
  }
  return out.map(x => ({ q: x.q.trim(), a: x.a.trim() })).filter(x => x.q);
}

export type QuizOrder = 'end' | 'after' | 'same';
export type QuizCard =
  | { kind: 'question'; n: number; q: string; a?: string }
  | { kind: 'answer'; n: number; q: string; a: string }
  | { kind: 'answers'; items: { n: number; a: string }[]; page: number; pages: number };

/** The cards in order. Answers at the end are grouped a few per card so they stay readable. */
export function quizCards(qs: QA[], order: QuizOrder, perAnswerCard = 6): QuizCard[] {
  const cards: QuizCard[] = [];
  qs.forEach((x, i) => {
    const n = i + 1;
    if (order === 'same') cards.push({ kind: 'question', n, q: x.q, a: x.a });
    else {
      cards.push({ kind: 'question', n, q: x.q });
      if (order === 'after' && x.a) cards.push({ kind: 'answer', n, q: x.q, a: x.a });
    }
  });
  if (order === 'end') {
    const items = qs.map((x, i) => ({ n: i + 1, a: x.a })).filter(x => x.a);
    const pages = Math.ceil(items.length / perAnswerCard);
    for (let p = 0; p < pages; p++) cards.push({ kind: 'answers', items: items.slice(p * perAnswerCard, (p + 1) * perAnswerCard), page: p + 1, pages });
  }
  return cards;
}
