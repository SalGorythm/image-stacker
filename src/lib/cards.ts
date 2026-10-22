import { ensureFont, fitText, rtlFirst, textStyle, type ScriptFont } from './script';

export type CardTemplate = 'paper' | 'night' | 'green' | 'plain' | 'notice';
export type CardSize = 'status' | 'post' | 'square';

export const CARD_SIZES: Record<CardSize, { w: number; h: number; label: string }> = {
  status: { w: 1080, h: 1920, label: 'WhatsApp Status' },
  post: { w: 1080, h: 1350, label: 'Post 4:5' },
  square: { w: 1080, h: 1080, label: 'Square' },
};

interface Palette { bg: string; main: string; sub: string; line: string; band?: string; bandInk?: string }
export const TEMPLATES: Record<CardTemplate, Palette & { label: string }> = {
  paper: { label: 'Paper', bg: '#f6f1e7', main: '#1f3d2b', sub: '#5b5446', line: '#b69b62' },
  night: { label: 'Night', bg: '#0f1b2d', main: '#e8c97a', sub: '#c9d1dc', line: '#b8964f' },
  green: { label: 'Green', bg: '#0f4d33', main: '#ffffff', sub: '#cfe5d8', line: '#d9b96a' },
  plain: { label: 'Plain', bg: '#ffffff', main: '#16191b', sub: '#5c6166', line: '#d5d8da' },
  notice: { label: 'Notice', bg: '#ffffff', main: '#16191b', sub: '#4d5358', line: '#2f6b4f', band: '#2f6b4f', bandInk: '#ffffff' },
};

export interface Card {
  text: string;
  sub: string;
  footer: string;
  template: CardTemplate;
  size: CardSize;
  font: ScriptFont;
}

const LATIN_SERIF = 'Georgia, "Times New Roman", serif';

/** An eight-pointed star (two overlapping squares), a simple geometric ornament. */
function star(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string) {
  x.save();
  x.fillStyle = fill;
  for (const a of [0, Math.PI / 4]) {
    x.save();
    x.translate(cx, cy);
    x.rotate(a);
    x.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    x.restore();
  }
  x.restore();
}

export function decorate(x: CanvasRenderingContext2D, W: number, H: number, t: CardTemplate, p: Palette) {
  const m = W * 0.045;
  if (t === 'paper' || t === 'night') {
    x.strokeStyle = p.line;
    x.lineWidth = W * 0.004;
    x.strokeRect(m, m, W - 2 * m, H - 2 * m);
    x.lineWidth = W * 0.0018;
    x.strokeRect(m * 1.35, m * 1.35, W - 2.7 * m, H - 2.7 * m);
    for (const [cx, cy] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) star(x, cx, cy, W * 0.018, p.line);
    star(x, W / 2, H * 0.12, W * 0.022, p.line);
  } else if (t === 'green') {
    x.save();
    x.globalAlpha = 0.07;
    const step = W / 7;
    for (let yy = step / 2; yy < H; yy += step) for (let xx = step / 2; xx < W; xx += step) star(x, xx, yy, step * 0.28, '#ffffff');
    x.restore();
    x.strokeStyle = p.line;
    x.lineWidth = W * 0.003;
    x.strokeRect(m, m, W - 2 * m, H - 2 * m);
  } else if (t === 'notice') {
    x.fillStyle = p.band!;
    x.fillRect(0, 0, W, H * 0.13);
  }
}

/** Draws lines centred on x, each with its own direction, starting at y with a given line height. */
function lines(x: CanvasRenderingContext2D, list: string[], cx: number, y: number, lh: number) {
  for (const [i, l] of list.entries()) {
    x.direction = rtlFirst(l) ? 'rtl' : 'ltr';
    x.fillText(l, cx, y + lh * (i + 0.5));
  }
  x.direction = 'ltr';
}

/** Renders a card at full size. Text sizes itself to the space; Arabic and Urdu get their own fonts. */
export async function renderCard(c: HTMLCanvasElement, card: Card) {
  await ensureFont(`${card.text} ${card.sub} ${card.footer}`, card.font);
  const { w: W, h: H } = CARD_SIZES[card.size];
  const p = TEMPLATES[card.template];
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = p.bg;
  x.fillRect(0, 0, W, H);
  decorate(x, W, H, card.template, p);
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  const pad = W * 0.13;
  const top = card.template === 'notice' ? H * 0.19 : H * 0.17;
  const bottom = H * 0.86;
  const subH = card.sub.trim() ? (bottom - top) * 0.26 : 0;
  const mainH = bottom - top - subH;

  // Footer: in the band for a notice, otherwise small at the bottom
  if (card.footer.trim()) {
    const st = textStyle(card.footer, card.font);
    const fs = card.template === 'notice' ? Math.round((H * 0.05) / (st.lineHeight / 1.3)) : Math.round(W * 0.03);
    x.font = `${st.font ? 400 : 600} ${fs}px ${st.font ? st.family : '"IBM Plex Sans", system-ui, sans-serif'}`;
    x.fillStyle = card.template === 'notice' ? p.bandInk! : p.sub;
    x.direction = rtlFirst(card.footer) ? 'rtl' : 'ltr';
    x.fillText(card.footer.trim(), W / 2, card.template === 'notice' ? H * 0.065 : H * 0.925, W - 2 * pad);
    x.direction = 'ltr';
  }

  const text = card.text.trim() || ' ';
  const st = textStyle(text, card.font);
  const family = st.font ? st.family : LATIN_SERIF;
  const measure = (s: string, size: number) => { x.font = `${st.font ? 400 : 600} ${size}px ${family}`; return x.measureText(s).width; };
  const fit = fitText(text, W - 2 * pad, mainH, st.lineHeight, measure, Math.round(W * 0.11), Math.round(W * 0.03));
  x.font = `${st.font ? 400 : 600} ${fit.size}px ${family}`;
  x.fillStyle = p.main;
  const lh = fit.size * st.lineHeight;
  lines(x, fit.lines, W / 2, top + (mainH - fit.lines.length * lh) / 2, lh);

  if (subH) {
    const ss = textStyle(card.sub, card.font);
    const sfam = ss.font ? ss.family : '"IBM Plex Sans", system-ui, sans-serif';
    const sm = (s: string, size: number) => { x.font = `400 ${size}px ${sfam}`; return x.measureText(s).width; };
    const sf = fitText(card.sub.trim(), W - 2 * pad, subH, ss.lineHeight, sm, Math.round(W * 0.045), Math.round(W * 0.022));
    x.font = `400 ${sf.size}px ${sfam}`;
    x.fillStyle = p.sub;
    const slh = sf.size * ss.lineHeight;
    // A short rule between the main text and the second line
    x.fillStyle = p.line;
    x.fillRect(W / 2 - W * 0.06, top + mainH + slh * 0.1, W * 0.12, Math.max(2, W * 0.002));
    x.fillStyle = p.sub;
    lines(x, sf.lines, W / 2, top + mainH + slh * 0.4 + (subH - sf.lines.length * slh) / 2, slh);
  }
}
