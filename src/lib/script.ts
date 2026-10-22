/** Fonts for Arabic-script text, self-hosted (OFL) so they also work offline. */
export type ScriptFont = 'auto' | 'naskh' | 'nastaliq' | 'amiri';

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
// Urdu letters and digits that standard Arabic does not use: ٹ ڈ ڑ ں ے ۓ ھ ۃ ڻ, ی ک گ ہ, ۰–۹
const URDU = /[\u0679\u0688\u0691\u06BA\u06D2\u06D3\u06BE\u06C3\u06BB\u06CC\u06A9\u06AF\u06C1\u06F0-\u06F9]/;

export const hasArabicScript = (s: string) => ARABIC.test(s);
export const looksUrdu = (s: string) => URDU.test(s);

const FAMILY: Record<Exclude<ScriptFont, 'auto'>, string> = {
  naskh: '"Noto Naskh Arabic"',
  nastaliq: '"Noto Nastaliq Urdu"',
  amiri: '"Amiri"',
};
const LATIN = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

/** Which Arabic-script font a piece of text gets: the chosen one, or Nastaliq for Urdu and Naskh for Arabic. */
export function pickFont(text: string, choice: ScriptFont): Exclude<ScriptFont, 'auto'> | null {
  if (!hasArabicScript(text)) return null;
  if (choice !== 'auto') return choice;
  return looksUrdu(text) ? 'nastaliq' : 'naskh';
}

/**
 * How to draw a piece of text: font stack (Arabic font first, Latin after for mixed text),
 * direction, and line height. Nastaliq's tall letters need far more room between lines.
 */
export function textStyle(text: string, choice: ScriptFont) {
  const f = pickFont(text, choice);
  return {
    family: f ? `${FAMILY[f]}, ${LATIN}` : LATIN,
    rtl: !!f && rtlFirst(text),
    lineHeight: f === 'nastaliq' ? 2.1 : f ? 1.7 : 1.3,
    font: f,
  };
}

/** Right to left when the first strong letter is Arabic script (so "Surah الفاتحة" stays left to right). */
export function rtlFirst(text: string) {
  for (const ch of text) {
    if (ARABIC.test(ch)) return true;
    if (/[A-Za-zÀ-ɏ]/.test(ch)) return false;
  }
  return false;
}

const LOADERS: Record<Exclude<ScriptFont, 'auto'>, () => Promise<unknown>> = {
  naskh: () => import('@fontsource/noto-naskh-arabic/arabic-400.css'),
  nastaliq: () => import('@fontsource/noto-nastaliq-urdu/arabic-400.css'),
  amiri: () => import('@fontsource/amiri/arabic-400.css'),
};
const loading = new Map<string, Promise<void>>();

/** Loads the font a piece of text needs (only the Arabic part of it), once. Canvas can't wait on its own. */
export function ensureFont(text: string, choice: ScriptFont): Promise<void> {
  const f = pickFont(text, choice);
  if (!f || typeof document === 'undefined') return Promise.resolve();
  let p = loading.get(f);
  if (!p) {
    p = LOADERS[f]()
      .then(() => document.fonts.load(`400 40px ${FAMILY[f]}`, 'اردو'))
      .then(() => undefined)
      .catch(() => { loading.delete(f); });
    loading.set(f, p);
  }
  return p;
}

/** Splits text into lines no wider than `max`, keeping the author's own line breaks. */
export function wrapLines(text: string, max: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = words[0];
    for (const w of words.slice(1)) {
      const next = line + ' ' + w;
      if (measure(next) <= max) line = next;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

/**
 * The largest font size (between min and max) at which the text, wrapped to `width`, fits in
 * `height`. `measure(text, size)` gives the width of text at a size.
 */
export function fitText(text: string, width: number, height: number, lineHeight: number, measure: (s: string, size: number) => number, max: number, min = 12) {
  for (let size = max; size >= min; size = Math.floor(size * 0.94)) {
    const lines = wrapLines(text, width, s => measure(s, size));
    const fitsWide = lines.every(l => measure(l, size) <= width);
    if (fitsWide && lines.length * size * lineHeight <= height) return { size, lines };
    if (size === min) break;
  }
  return { size: min, lines: wrapLines(text, width, s => measure(s, min)) };
}
