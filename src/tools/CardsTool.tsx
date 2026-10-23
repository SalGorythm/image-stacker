import { useEffect, useRef, useState } from 'react';
import type { ToastOptions, ToastState } from '../hooks';
import { CARD_SIZES, renderCard, TEMPLATES, type Card, type CardSize, type CardTemplate } from '../lib/cards';
import { canShareFiles, canvasBlob, saveBlob } from '../lib/render';
import { hasArabicScript, type ScriptFont } from '../lib/script';
import { pageH1 } from '../seo/pages';

interface Props {
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

const KEY = 'cards-draft';
const EXAMPLE: Card = {
  text: 'Small steps every day add up to big results.',
  sub: 'Keep going',
  footer: 'Your name or group',
  template: 'paper',
  size: 'status',
  font: 'auto',
};

/** Example texts earlier versions saved as a draft; replaced by the current example. */
const OLD_EXAMPLES = ['بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'محنت کامیابی کی کنجی ہے'];

function load(): Card {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (OLD_EXAMPLES.includes(saved.text)) { delete saved.text; delete saved.sub; delete saved.footer; }
    return { ...EXAMPLE, ...saved };
  } catch { return EXAMPLE; }
}

/**
 * Cards: quotes, poems and announcements as images sized for WhatsApp Status or Instagram,
 * with proper Arabic, Urdu (Nastaliq) and English text. Nothing is uploaded.
 */
export function CardsTool({ toast, show }: Props) {
  const [card, setCard] = useState<Card>(load);
  const cv = useRef<HTMLCanvasElement>(null);
  const set = (patch: Partial<Card>) => setCard(c => ({ ...c, ...patch }));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(card)); } catch { /* ignore */ }
    const t = setTimeout(() => { if (cv.current) renderCard(cv.current, card); }, 120);
    return () => clearTimeout(t);
  }, [card]);

  const file = async () => {
    const b = await canvasBlob(cv.current!, 'image/png');
    const name = (card.footer || card.text).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'card';
    return new File([b!], `${name}.png`, { type: 'image/png' });
  };
  const share = async () => {
    try { await navigator.share({ files: [await file()] }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasBlob(cv.current!, 'image/png').then(b => b!) })]);
      show('Copied. Paste it into WhatsApp or anywhere else.');
    } catch { show('This browser blocked copying images. Use Download instead.', { err: true }); }
  };
  const arabic = hasArabicScript(card.text + card.sub + card.footer);

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>{pageH1('Cards')}</h1>
        <p>Make a quote, poem or announcement card for WhatsApp Status or Instagram. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Card text and style">
          <div className="section" style={{ borderTop: 0, paddingTop: 0 }}>
            <label className="label" htmlFor="card-text">Main text</label>
            <textarea id="card-text" dir="auto" rows={4} value={card.text} onChange={e => set({ text: e.target.value })} placeholder="A quote, a line of poetry, a greeting or an announcement" />
            <label className="label" htmlFor="card-sub">Second line</label>
            <textarea id="card-sub" dir="auto" rows={2} value={card.sub} onChange={e => set({ sub: e.target.value })} placeholder="Translation or reference (optional)" />
            <label className="label" htmlFor="card-footer">Footer</label>
            <input id="card-footer" type="text" dir="auto" value={card.footer} onChange={e => set({ footer: e.target.value })} placeholder="Group or channel name (optional)" />
          </div>
          <div className="section">
            <span className="label">Style</span>
            <div className="swatches" role="radiogroup" aria-label="Template">
              {(Object.keys(TEMPLATES) as CardTemplate[]).map(t => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={card.template === t}
                  className={'swatch' + (card.template === t ? ' on' : '')}
                  style={{ background: TEMPLATES[t].bg, color: TEMPLATES[t].main, borderColor: TEMPLATES[t].line }}
                  onClick={() => set({ template: t })}
                >
                  {TEMPLATES[t].label}
                </button>
              ))}
            </div>
            <div className="settings">
              <label>Size</label>
              <div className="seg" role="radiogroup" aria-label="Size">
                {(Object.keys(CARD_SIZES) as CardSize[]).map(k => (
                  <button key={k} type="button" role="radio" aria-checked={card.size === k} className={card.size === k ? 'on' : ''} onClick={() => set({ size: k })}>
                    {CARD_SIZES[k].label}
                  </button>
                ))}
              </div>
              {arabic && (
                <>
                  <label htmlFor="card-font">Font</label>
                  <select id="card-font" value={card.font} onChange={e => set({ font: e.target.value as ScriptFont })}>
                    <option value="auto">Automatic (Nastaliq for Urdu, Naskh for Arabic)</option>
                    <option value="amiri">Amiri (classical, good for poetry)</option>
                    <option value="naskh">Naskh</option>
                    <option value="nastaliq">Nastaliq</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </section>
        <section className="panel preview" aria-label="Card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Card</span>
            <span className="stat">{CARD_SIZES[card.size].w} × {CARD_SIZES[card.size].h} px</span>
          </div>
          <div className="stage card-stage"><canvas ref={cv} className="card-canvas" /></div>
          <div className="export">
            <button className="btn primary" onClick={async () => { const f = await file(); saveBlob(f, f.name); }}>Download</button>
            {canShareFiles && <button className="btn" onClick={share}>Share</button>}
            <button className="btn" onClick={copy}>Copy</button>
            <button className="btn" onClick={() => setCard({ ...EXAMPLE, text: '', sub: '', footer: card.footer })}>New card</button>
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
