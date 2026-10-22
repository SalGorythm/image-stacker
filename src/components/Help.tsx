import { useEffect, useRef } from 'react';
import { PASTE_KEY } from '../lib/files';

const STEPS: [string, string][] = [
  ['Add images or a PDF', `Drop files anywhere, use Choose files, or press ${PASTE_KEY} to paste a screenshot. A PDF opens a page picker so you import only the slides you need.`],
  ['Put them in order', 'Drag rows, use the arrows, or tap a number to move an image to a position. Sort by file name if they arrive mixed up.'],
  ['Split into stacks', 'Under Groups, choose Every N images (add more sizes with + Next) or type ranges like 1-4, 5-8. Each stack becomes one image.'],
  ['Lay them out', 'Stack top to bottom, side by side, or in a grid. Turn on Join overlapping screenshots to stitch a long chat without repeats.'],
  ['Tidy and label', 'Trim edges, add a caption such as "Answers {range}", number each image, or add a watermark. Use ◩ on a row to blur private details.'],
  ['Send it', 'Pick WhatsApp quality so text stays sharp after sending, or cut stacks into Instagram slides. Then Share, Download (images, a ZIP, or a PDF), or Copy.'],
];

interface Props {
  onClose: () => void;
}

export function Help({ onClose }: Props) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="picker help">
        <div className="picker-head">
          <strong id="help-title">How Image Stacker works</strong>
          <span className="stat">Nothing leaves your device</span>
        </div>
        <ol className="steps">
          {STEPS.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="hint">Your images and settings are kept in this browser, so a reload doesn't lose them. Use Clear to remove them.</p>
        <div className="row picker-foot">
          <button ref={close} className="btn primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
