import { useEffect, useRef, useState } from 'react';
import { pagesFrom, toRanges } from '../lib/groups';
import { thumbnail, type PdfInfo } from '../lib/pdf';

interface Props {
  info: PdfInfo;
  /** Chosen page numbers, or null when cancelled. */
  onDone: (pages: number[] | null) => void;
}

/** Lets people pick which pages of a PDF to import, by tapping thumbnails or typing ranges. */
export function PagePicker({ info, onDone }: Props) {
  const all = Array.from({ length: info.numPages }, (_, i) => i + 1);
  const [picked, setPicked] = useState<Set<number>>(() => new Set(all));
  const [text, setText] = useState(() => toRanges(all));
  const [thumbs, setThumbs] = useState<string[]>([]);
  const field = useRef<HTMLInputElement>(null);

  // Thumbnails render one at a time so the first pages show up quickly
  useEffect(() => {
    let live = true;
    (async () => {
      for (let n = 1; n <= info.numPages && live; n++) {
        try {
          const url = await thumbnail(info.id, n);
          if (live) setThumbs(t => { const c = t.slice(); c[n - 1] = url; return c; });
        } catch { /* leave the placeholder */ }
      }
    })();
    return () => { live = false; };
  }, [info]);

  useEffect(() => {
    field.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(null); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onDone]);

  const choose = (pages: number[]) => { setPicked(new Set(pages)); setText(toRanges(pages)); };
  const toggle = (n: number) => {
    const next = new Set(picked);
    if (next.has(n)) next.delete(n); else next.add(n);
    setPicked(next);
    setText(toRanges([...next]));
  };
  const count = picked.size;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pick-title">
      <form
        className="picker"
        onSubmit={e => { e.preventDefault(); if (count) onDone([...picked].sort((a, b) => a - b)); }}
      >
        <div className="picker-head">
          <strong id="pick-title">Choose pages from {info.name}</strong>
          <span className="stat">{count} of {info.numPages} selected</span>
        </div>
        <div className="row">
          <label className="pick-field">
            <span>Pages</span>
            <input
              ref={field}
              type="text"
              value={text}
              placeholder="e.g. 3-20, 25"
              onChange={e => { setText(e.target.value); setPicked(new Set(pagesFrom(e.target.value, info.numPages))); }}
            />
          </label>
          <button type="button" className="btn sm" onClick={() => choose(all)}>All</button>
          <button type="button" className="btn sm" onClick={() => choose([])}>None</button>
        </div>
        <div className="thumbs">
          {all.map(n => (
            <button
              type="button"
              key={n}
              className={'thumb' + (picked.has(n) ? ' on' : '')}
              aria-pressed={picked.has(n)}
              aria-label={`Page ${n}`}
              onClick={() => toggle(n)}
            >
              {thumbs[n - 1] ? <img src={thumbs[n - 1]} alt="" /> : <span className="thumb-ph" />}
              <span className="thumb-no">{n}</span>
            </button>
          ))}
        </div>
        <div className="row picker-foot">
          <button type="button" className="btn" onClick={() => onDone(null)}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!count}>
            Import {count} page{count === 1 ? '' : 's'}
          </button>
        </div>
      </form>
    </div>
  );
}
