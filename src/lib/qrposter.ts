import { drawQr, qrMatrix } from './qr';
import { ensureFont, fitText, rtlFirst, textStyle } from './script';

export type PosterSize = 'status' | 'post' | 'square' | 'a4';
export type PosterLook = 'fresh' | 'plain' | 'dark';

export const POSTER_SIZES: Record<PosterSize, { w: number; h: number; label: string }> = {
  status: { w: 1080, h: 1920, label: 'Status' },
  post: { w: 1080, h: 1350, label: 'Post' },
  square: { w: 1080, h: 1080, label: 'Square' },
  a4: { w: 2480, h: 3508, label: 'A4 print' },
};

const LOOKS: Record<PosterLook, { bg: string; title: string; text: string; muted: string; label: string }> = {
  fresh: { label: 'Fresh', bg: '#e7f3ec', title: '#16422e', text: '#1f2a24', muted: '#4f6158' },
  plain: { label: 'Plain', bg: '#ffffff', title: '#141819', text: '#1f2426', muted: '#5f666a' },
  dark: { label: 'Dark', bg: '#122230', title: '#ffffff', text: '#e8eef3', muted: '#a9b8c4' },
};
export const POSTER_LOOKS = LOOKS;

export interface Poster {
  payload: string;
  title: string;
  subtitle: string;
  details: string;
  size: PosterSize;
  look: PosterLook;
}

const SANS = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

function block(x: CanvasRenderingContext2D, text: string, cx: number, top: number, width: number, height: number, max: number, weight: number, color: string) {
  if (!text.trim()) return;
  const st = textStyle(text, 'auto');
  const fam = st.font ? st.family : SANS;
  const w = st.font ? 400 : weight;
  const fit = fitText(text.trim(), width, height, st.lineHeight, (s, size) => { x.font = `${w} ${size}px ${fam}`; return x.measureText(s).width; }, max, Math.round(max * 0.35));
  x.font = `${w} ${fit.size}px ${fam}`;
  x.fillStyle = color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const lh = fit.size * st.lineHeight, y0 = top + (height - fit.lines.length * lh) / 2;
  for (const [i, l] of fit.lines.entries()) {
    x.direction = rtlFirst(l) ? 'rtl' : 'ltr';
    x.fillText(l, cx, y0 + lh * (i + 0.5));
  }
  x.direction = 'ltr';
}

/** A poster or Status image with the QR code in a white card, a title above and details below. */
export async function renderPoster(c: HTMLCanvasElement, p: Poster) {
  await ensureFont(`${p.title} ${p.subtitle} ${p.details}`, 'auto');
  const { w: W, h: H } = POSTER_SIZES[p.size];
  const L = LOOKS[p.look];
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = L.bg;
  x.fillRect(0, 0, W, H);
  const pad = W * 0.09, inner = W - 2 * pad;
  const tall = H / W > 1.5;
  block(x, p.title, W / 2, H * (tall ? 0.1 : 0.05), inner, H * (tall ? 0.13 : 0.13), Math.round(W * 0.085), 700, L.title);
  block(x, p.subtitle, W / 2, H * (tall ? 0.23 : 0.18), inner, H * 0.06, Math.round(W * 0.042), 400, L.muted);

  const q = Math.min(W * 0.66, H * (tall ? 0.42 : 0.5));
  const cardPad = q * 0.07, card = q + 2 * cardPad;
  const cx = (W - card) / 2, cy = H * (tall ? 0.31 : 0.26);
  x.save();
  x.shadowColor = 'rgba(0,0,0,.14)'; x.shadowBlur = W * 0.02; x.shadowOffsetY = W * 0.006;
  x.fillStyle = '#ffffff';
  x.beginPath(); x.roundRect(cx, cy, card, card, card * 0.06); x.fill();
  x.restore();
  if (p.payload) drawQr(x, qrMatrix(p.payload), cx + cardPad, cy + cardPad, q);

  const below = cy + card + H * 0.025;
  block(x, p.details, W / 2, below, inner, H * 0.09, Math.round(W * 0.05), 600, L.text);
  block(x, 'Scan with your phone camera', W / 2, H * 0.9, inner, H * 0.05, Math.round(W * 0.03), 400, L.muted);
}

/** Just the QR code, large and with its white quiet zone, for printing or adding elsewhere. */
export function renderQrOnly(c: HTMLCanvasElement, payload: string, size = 1200) {
  c.width = size; c.height = size;
  drawQr(c.getContext('2d')!, qrMatrix(payload), 0, 0, size);
}
