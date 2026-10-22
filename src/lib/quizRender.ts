import { CARD_SIZES, decorate, TEMPLATES, type CardSize, type CardTemplate } from './cards';
import type { QuizCard } from './quiz';
import { ensureFont, fitText, rtlFirst, textStyle } from './script';

export interface QuizStyle { title: string; footer: string; template: CardTemplate; size: CardSize; total: number }

const SANS = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

/** Text fitted into a box, centred, with each line's own direction. Returns the height used. */
function block(x: CanvasRenderingContext2D, text: string, cx: number, top: number, width: number, height: number, max: number, color: string, latin: string, weight = 600) {
  const st = textStyle(text, 'auto');
  const fam = st.font ? st.family : latin, w = st.font ? 400 : weight;
  const fit = fitText(text, width, height, st.lineHeight, (s, size) => { x.font = `${w} ${size}px ${fam}`; return x.measureText(s).width; }, max, Math.round(max * 0.3));
  x.font = `${w} ${fit.size}px ${fam}`;
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lh = fit.size * st.lineHeight, y0 = top + (height - fit.lines.length * lh) / 2;
  for (const [i, l] of fit.lines.entries()) { x.direction = rtlFirst(l) ? 'rtl' : 'ltr'; x.fillText(l, cx, y0 + lh * (i + 0.5)); }
  x.direction = 'ltr';
}

/** One quiz card: a numbered question, its answer, or a page of answers, in a Cards style. */
export async function renderQuizCard(c: HTMLCanvasElement, card: QuizCard, s: QuizStyle) {
  const all = card.kind === 'answers' ? card.items.map(i => i.a).join(' ') : `${card.q} ${'a' in card ? card.a ?? '' : ''}`;
  await ensureFont(`${all} ${s.title} ${s.footer}`, 'auto');
  const { w: W, h: H } = CARD_SIZES[s.size];
  const p = TEMPLATES[s.template];
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = p.bg; x.fillRect(0, 0, W, H);
  decorate(x, W, H, s.template, p);
  const pad = W * 0.12, inner = W - 2 * pad, cx = W / 2;
  // Paper and Night have a star ornament near the top; start below it
  const top = s.template === 'notice' ? H * 0.16 : s.template === 'paper' || s.template === 'night' ? H * 0.175 : H * 0.12;

  const head = card.kind === 'question' ? `Question ${card.n} of ${s.total}` : card.kind === 'answer' ? `Answer ${card.n}` : `Answers${card.pages > 1 ? ` (${card.page} of ${card.pages})` : ''}`;
  x.font = `700 ${Math.round(W * 0.036)}px ${SANS}`;
  x.fillStyle = s.template === 'notice' ? p.bandInk! : p.line;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(head.toUpperCase(), cx, s.template === 'notice' ? H * 0.065 : top);
  if (s.title.trim()) block(x, s.title.trim(), cx, top + H * 0.025, inner, H * 0.07, Math.round(W * 0.034), p.sub, SANS, 500);

  const bodyTop = top + H * 0.11, bodyBottom = H * 0.86, bodyH = bodyBottom - bodyTop;
  if (card.kind === 'answers') {
    const text = card.items.map(i => `${i.n}. ${i.a}`).join('\n');
    block(x, text, cx, bodyTop, inner, bodyH, Math.round(W * 0.06), p.main, SANS, 500);
  } else if (card.kind === 'answer' || card.a) {
    block(x, card.q, cx, bodyTop, inner, bodyH * 0.38, Math.round(W * 0.05), p.sub, SERIF);
    x.fillStyle = p.line; x.fillRect(cx - W * 0.06, bodyTop + bodyH * 0.42, W * 0.12, Math.max(2, W * 0.003));
    block(x, card.a ?? '', cx, bodyTop + bodyH * 0.48, inner, bodyH * 0.52, Math.round(W * 0.075), p.main, SERIF, 700);
  } else {
    block(x, card.q, cx, bodyTop, inner, bodyH, Math.round(W * 0.08), p.main, SERIF, 700);
  }

  if (s.footer.trim()) {
    x.font = `600 ${Math.round(W * 0.03)}px ${SANS}`;
    x.fillStyle = p.sub; x.textAlign = 'center';
    x.direction = rtlFirst(s.footer) ? 'rtl' : 'ltr';
    x.fillText(s.footer.trim(), cx, H * 0.925, inner);
    x.direction = 'ltr';
  }
}
