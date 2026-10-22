import { useEffect, useMemo, useRef } from 'react';
import { paint, stackLayout } from '../lib/render';
import type { Format, Item, Quality, Settings } from '../lib/types';
import type { ToastState } from '../hooks';

interface Props {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
  list: Item[];
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
}

export function Preview(p: Props) {
  const { s, list, count } = p;
  const cv = useRef<HTMLCanvasElement>(null);
  const multi = count > 1;

  // Preview uses stored images; the size label shows what the export will be at the chosen quality
  const L = useMemo(() => stackLayout(list, s, false), [list, s.gap, s.width]);
  const E = useMemo(() => stackLayout(list, s, true), [list, s.gap, s.width, s.quality]);
  useEffect(() => {
    if (L && cv.current) paint(cv.current, L, s.gapColor, false);
  }, [L, s.gapColor]);

  return (
    <section className="panel preview" aria-label="Preview">
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
            {E.width} × {E.height} px{E.reduced && ' · reduced to fit browser limit'}
          </span>
        )}
      </div>
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
          title="HD and 4K re-render PDF pages at that width, so text stays sharp. Photos and screenshots are kept at their full original size."
          onChange={e => p.update({ quality: e.target.value as Quality })}
        >
          <option value="hd">HD · 2560px</option>
          <option value="4k">4K · 3840px</option>
          <option value="std">Standard</option>
        </select>
        <input type="text" id="fname" aria-label="File name" value={s.fname} onChange={e => p.update({ fname: e.target.value })} />
      </div>
      <div className="export">
        <button className={'btn' + (multi ? '' : ' primary')} disabled={!L || p.busy} onClick={p.onSave}>
          {multi ? 'Download this one' : 'Download'}
        </button>
        <button className="btn" disabled={!L || p.busy} onClick={p.onCopy}>Copy</button>
        {multi && (
          <button className="btn primary" disabled={p.busy} onClick={p.onSaveAll}>
            Download all {count} ({s.fmt === 'pdf' ? 'PDF' : 'ZIP'})
          </button>
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
