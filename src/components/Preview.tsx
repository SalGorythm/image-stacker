import { useEffect, useMemo, useRef } from 'react';
import { SLIDE } from '../lib/carousel';
import { paint, PREVIEW_LIMITS, slicesOf, stackAdvice, stackLayout } from '../lib/render';
import type { StackMeta } from '../lib/captions';
import type { Format, Item, Quality, Settings } from '../lib/types';
import type { ToastState } from '../hooks';

interface Props {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
  list: Item[];
  /** Which stack this is, for caption placeholders and image numbers. */
  meta?: StackMeta;
  cur: number;
  count: number;
  label: string;
  busy: boolean;
  toast: ToastState | null;
  onNav: (delta: number) => void;
  onRemoveStack: () => void;
  onSave: () => void;
  onSaveAll: () => void;
  onCopy: () => void;
  /** Present only where the browser can share files. */
  onShare?: (all: boolean) => void;
  /** Re-split everything into stacks of this many images. */
  onSplit: (perStack: number) => void;
}

export function Preview(p: Props) {
  const { s, list, count } = p;
  const cv = useRef<HTMLCanvasElement>(null);
  const multi = count > 1;

  // Preview uses stored images; the size label shows what the export will be at the chosen quality
  const capOn = s.caption.trim() !== '';
  const L = useMemo(() => stackLayout(list, s, false, PREVIEW_LIMITS), [list, s.gap, s.width, s.trim, s.autoTrim, capOn, s.captionPos, s.joinOverlap, s.arrange, s.columns]);
  const E = useMemo(() => stackLayout(list, s, true), [list, s.gap, s.width, s.quality, s.trim, s.autoTrim, capOn, s.captionPos, s.joinOverlap, s.arrange, s.columns]);
  const wa = s.quality === 'whatsapp';
  const slides = useMemo(() => (E && s.slice !== 'off' ? slicesOf(E, s)?.cuts.length ?? 0 : 0), [E, s.slice, s.sliceWhole, s.arrange]);
  const advice = useMemo(() => (wa ? stackAdvice(list, s) : null), [wa, list, s.gap, s.width, s.trim, s.autoTrim, capOn, s.captionPos, s.joinOverlap, s.arrange, s.columns]);
  useEffect(() => {
    if (!L || !cv.current) return;
    const c = cv.current;
    paint(c, L, s, false, p.meta).then(() => {
      // Carousel cuts as dashed lines across the preview
      const sl = slicesOf(L, s);
      if (!sl) return;
      const x = c.getContext('2d')!;
      const lw = Math.max(2, Math.round((sl.side ? L.height : L.width) / 300));
      x.save();
      x.lineWidth = lw;
      x.setLineDash([lw * 4, lw * 3]);
      x.strokeStyle = '#d0342c';
      for (const [, end] of sl.cuts.slice(0, -1)) {
        x.beginPath();
        if (sl.side) { x.moveTo(end, 0); x.lineTo(end, L.height); } else { x.moveTo(0, end); x.lineTo(L.width, end); }
        x.stroke();
      }
      x.restore();
    });
  }, [L, s.gapColor, s.caption, s.numbers, s.watermark, s.slice, s.sliceWhole, s.captionFont, p.meta]);

  return (
    <section className="panel preview" id="export" aria-label="Preview">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="label">Preview</span>
        {multi && (
          <div className="gnav">
            <button className="icon" aria-label="Previous group" disabled={p.cur <= 0} onClick={() => p.onNav(-1)}>‹</button>
            <span className="stat">Image {p.cur + 1} of {count} · #{p.label}</span>
            <button className="icon" aria-label="Next group" disabled={p.cur >= count - 1} onClick={() => p.onNav(1)}>›</button>
            <button className="icon del" aria-label="Remove this stack" title="Remove the images in this stack" onClick={p.onRemoveStack}>✕</button>
          </div>
        )}
        {E && (
          <span
            className="stat"
            title={list.some(it => it.src) ? '' : 'These images are exported at their full original size. HD and 4K sharpen pages imported from a PDF.'}
          >
            {slides ? `${slides} slide${slides > 1 ? 's' : ''} · ${SLIDE[s.slice as 'portrait'].w} × ${SLIDE[s.slice as 'portrait'].h}` : `${E.width} × ${E.height} px`}
            {E.reduced && ' · reduced to fit browser limit'}
            {E.joined.some(Boolean) && ` · ${E.joined.filter(Boolean).length} joined`}
            {wa && ' · fits WhatsApp HD'}
          </span>
        )}
      </div>
      {advice && !advice.readable && (
        <div className="warn" role="note">
          <span>
            Too tall for WhatsApp: this stack would arrive only {advice.width}px wide, so text will be hard to read.
            {advice.maxPerStack < list.length && ` Stacks of up to ${advice.maxPerStack} image${advice.maxPerStack > 1 ? 's' : ''} stay sharp.`}
          </span>
          {advice.maxPerStack < list.length && (
            <button className="btn sm" onClick={() => p.onSplit(advice.maxPerStack)}>
              Split to fit WhatsApp
            </button>
          )}
        </div>
      )}
      <div className="stage">
        <canvas ref={cv} hidden={!L} />
        {!L && <p className="placeholder">Add images and the stacked result shows up here.</p>}
      </div>
      <div className="export">
        <select id="fmt" aria-label="Format" value={s.fmt} onChange={e => p.update({ fmt: e.target.value as Format })}>
          <option value="png">PNG · lossless</option>
          <option value="jpg">JPG · smaller</option>
          <option value="pdf">PDF</option>
        </select>
        <select
          id="quality"
          aria-label="Quality"
          value={s.quality}
          title="HD and 4K re-render PDF pages at that width, so text stays sharp. WhatsApp fits each stack inside 4096 × 2692 so WhatsApp's HD send doesn't shrink it again. Photos and screenshots are never enlarged."
          onChange={e => p.update({ quality: e.target.value as Quality })}
        >
          <option value="hd">HD · 2560px</option>
          <option value="4k">4K · 3840px</option>
          <option value="whatsapp">WhatsApp · fits HD send</option>
          <option value="std">Standard</option>
        </select>
        <select
          id="slice"
          aria-label="Slices"
          value={s.slice}
          title="Cut each stack into Instagram carousel slides"
          onChange={e => p.update({ slice: e.target.value as Settings['slice'] })}
        >
          <option value="off">One image per stack</option>
          <option value="portrait">Instagram slides 4:5</option>
          <option value="square">Instagram slides 1:1</option>
        </select>
        <input type="text" id="fname" aria-label="File name" value={s.fname} onChange={e => p.update({ fname: e.target.value })} />
      </div>
      {s.slice !== 'off' && (
        <label className="check">
          <input type="checkbox" checked={s.sliceWhole} onChange={e => p.update({ sliceWhole: e.target.checked })} />
          Keep images whole (cut between images, not through them)
        </label>
      )}
      <div className="export">
        <button className={'btn' + (multi ? '' : ' primary')} disabled={!L || p.busy} onClick={p.onSave}>
          {multi ? 'Download this one' : 'Download'}
        </button>
        {p.onShare && (
          <button className="btn" disabled={!L || p.busy} onClick={() => p.onShare!(false)}>
            {multi ? 'Share this one' : 'Share'}
          </button>
        )}
        <button className="btn" disabled={!L || p.busy} onClick={p.onCopy}>Copy</button>
        {multi && (
          <button className="btn primary" disabled={p.busy} onClick={p.onSaveAll}>
            Download all {count} ({s.fmt === 'pdf' ? 'PDF' : 'ZIP'})
          </button>
        )}
        {multi && p.onShare && (
          <button className="btn" disabled={p.busy} onClick={() => p.onShare!(true)}>Share all {count}</button>
        )}
      </div>
      <div className={'toast' + (p.toast?.err ? ' err' : '')} role="status">
        {p.toast?.msg}
        {p.toast?.action && (
          <button className="toast-act" onClick={p.toast.action.fn}>{p.toast.action.label}</button>
        )}
      </div>
    </section>
  );
}
