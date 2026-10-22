import { useEffect, useMemo, useRef, useState } from 'react';
import type { ToastOptions, ToastState } from '../hooks';
import { CARD_SIZES, TEMPLATES, type CardSize, type CardTemplate } from '../lib/cards';
import { handoff } from '../lib/handoff';
import { parseQuiz, quizCards, type QuizOrder } from '../lib/quiz';
import { renderQuizCard } from '../lib/quizRender';
import { canShareFiles, canvasBlob, saveBlob, zipFiles } from '../lib/render';
import { navigate } from '../hooks';
import { pageH1 } from '../seo/pages';

interface Props {
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

interface Draft { text: string; title: string; footer: string; order: QuizOrder; template: CardTemplate; size: CardSize }
const KEY = 'quiz-draft';
const EXAMPLE: Draft = {
  text: 'Q: What is the largest planet in our solar system?\nA: Jupiter\n\nQ: How many continents are there?\nA: Seven\n\nسوال: پانی کس درجہ حرارت پر ابلتا ہے؟\nجواب: 100 ڈگری سینٹی گریڈ',
  title: 'General knowledge, Part 1', footer: 'Weekly class quiz', order: 'end', template: 'paper', size: 'post',
};

/** Quiz cards: type questions and answers once, get numbered cards ready to post one by one, answers last. */
export function QuizTool({ toast, show }: Props) {
  const [d, setD] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      // Earlier versions saved their example as a draft; show the current example instead
      if (typeof saved.text === 'string' && saved.text.startsWith('Q: Surah Al-Takathur')) { delete saved.text; delete saved.title; delete saved.footer; }
      return { ...EXAMPLE, ...saved };
    } catch { return EXAMPLE; }
  });
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  const set = (p: Partial<Draft>) => setD(v => ({ ...v, ...p }));
  const qs = useMemo(() => parseQuiz(d.text), [d.text]);
  const cards = useMemo(() => quizCards(qs, d.order), [qs, d.order]);
  const i = Math.min(at, Math.max(0, cards.length - 1));
  const style = { title: d.title, footer: d.footer, template: d.template, size: d.size, total: qs.length };

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } }, [d]);
  useEffect(() => {
    const t = setTimeout(() => { if (cv.current && cards[i]) renderQuizCard(cv.current, cards[i], style); }, 100);
    return () => clearTimeout(t);
  }, [cards, i, d.title, d.footer, d.template, d.size]);

  const files = async () => {
    const out: File[] = [];
    const pad = String(cards.length).length;
    for (const [k, card] of cards.entries()) {
      const c = document.createElement('canvas');
      await renderQuizCard(c, card, style);
      const name = card.kind === 'answers' ? `answers${card.pages > 1 ? `-${card.page}` : ''}` : `${card.kind}-${card.n}`;
      out.push(new File([(await canvasBlob(c, 'image/png'))!], `${String(k + 1).padStart(pad, '0')}-${name}.png`, { type: 'image/png' }));
      c.width = c.height = 0;
    }
    return out;
  };
  const run = async (fn: (f: File[]) => Promise<void>) => {
    if (!cards.length) return show('Type at least one question first.', { err: true });
    setBusy(true);
    try { await fn(await files()); } catch { show('Could not make the cards. Try again.', { err: true }); }
    finally { setBusy(false); }
  };

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>{pageH1('Quiz cards')}</h1>
        <p>Type or paste your questions and answers once and get a numbered set of cards to post in your group, with the answers last. Urdu and Arabic work too.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Questions">
          <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
            <label className="label" htmlFor="quiz-text">Questions and answers</label>
            <textarea id="quiz-text" dir="auto" rows={10} value={d.text} onChange={e => set({ text: e.target.value })} />
            <p className="hint">
              Write <code>Q:</code> before each question and <code>A:</code> before its answer (or سوال / جواب), or put each question on its own line with the answer below and a blank line between them.
              {' '}{qs.length ? `${qs.length} question${qs.length > 1 ? 's' : ''} found.` : 'No questions found yet.'}
            </p>
          </div>
          <div className="section">
            <span className="label">Cards</span>
            <div className="settings">
              <label htmlFor="quiz-title">Title</label>
              <input id="quiz-title" type="text" dir="auto" value={d.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Revision, Part 1" />
              <label htmlFor="quiz-footer">Footer</label>
              <input id="quiz-footer" type="text" dir="auto" value={d.footer} onChange={e => set({ footer: e.target.value })} placeholder="Group name (optional)" />
              <label htmlFor="quiz-order">Answers</label>
              <select id="quiz-order" value={d.order} onChange={e => { set({ order: e.target.value as QuizOrder }); setAt(0); }}>
                <option value="end">All together at the end</option>
                <option value="after">After each question</option>
                <option value="same">On the same card</option>
              </select>
              <label>Size</label>
              <div className="seg" role="radiogroup" aria-label="Size">
                {(Object.keys(CARD_SIZES) as CardSize[]).map(k => <button key={k} type="button" role="radio" aria-checked={d.size === k} className={d.size === k ? 'on' : ''} onClick={() => set({ size: k })}>{CARD_SIZES[k].label}</button>)}
              </div>
            </div>
            <div className="swatches" role="radiogroup" aria-label="Style">
              {(Object.keys(TEMPLATES) as CardTemplate[]).map(t => (
                <button key={t} type="button" role="radio" aria-checked={d.template === t} className={'swatch' + (d.template === t ? ' on' : '')}
                  style={{ background: TEMPLATES[t].bg, color: TEMPLATES[t].main, borderColor: TEMPLATES[t].line }} onClick={() => set({ template: t })}>{TEMPLATES[t].label}</button>
              ))}
            </div>
          </div>
        </section>
        <section className="panel preview" aria-label="Cards">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Card {cards.length ? i + 1 : 0} of {cards.length}</span>
            <div className="gnav">
              <button className="icon" aria-label="Previous card" disabled={i <= 0} onClick={() => setAt(i - 1)}>‹</button>
              <button className="icon" aria-label="Next card" disabled={i >= cards.length - 1} onClick={() => setAt(i + 1)}>›</button>
            </div>
          </div>
          <div className="stage card-stage">{cards.length ? <canvas ref={cv} className="card-canvas" /> : <p className="placeholder">Type a question to see the first card.</p>}</div>
          <div className="export">
            <button className="btn primary" disabled={!cards.length || busy} onClick={() => run(async fs => { saveBlob(await zipFiles(fs.map(f => ({ name: f.name, blob: f }))), 'quiz-cards.zip'); show(`Saved ${fs.length} cards, numbered in posting order.`); })}>Download all {cards.length} (ZIP)</button>
            {canShareFiles && <button className="btn" disabled={!cards.length || busy} onClick={() => run(async fs => {
              try { await navigator.share({ files: fs }); } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
            })}>Share all</button>}
            <button className="btn" disabled={!cards.length || busy} onClick={() => run(async fs => { handoff.files = fs; navigate('/'); })}>Send to Stacker</button>
          </div>
          <div className={'toast' + (toast?.err ? ' err' : '')} role="status">
            {toast?.msg}
            {toast?.action && <button className="toast-act" onClick={toast.action.fn}>{toast.action.label}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
