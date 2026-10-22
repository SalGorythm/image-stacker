import { useState, type RefObject } from 'react';
import { PASTE_KEY } from '../lib/files';
import { drag } from '../lib/drag';

interface Props {
  flash: boolean;
  onFiles: (files: File[]) => void;
  onPasteClick: () => void;
  /** Owned by App so the header's "PDF pages" link can open the same chooser. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** What this tool takes, e.g. "images or a PDF" (default) or "photos or signatures". */
  what?: string;
  accept?: string;
}

// Dropping files is handled page-wide in App; this only shows the highlight.
export function DropZone({ flash, onFiles, onPasteClick, inputRef: input, what = 'images or a PDF', accept = 'image/*,application/pdf,.pdf' }: Props) {
  const [over, setOver] = useState(false);
  const enter = (e: React.DragEvent) => {
    if (drag.id != null) return;
    e.preventDefault();
    setOver(true);
  };
  return (
    <div
      id="add"
      className={'drop' + (over || flash ? ' over' : '')}
      onDragEnter={enter}
      onDragOver={enter}
      onDragLeave={() => setOver(false)}
      onDrop={() => setOver(false)}
    >
      <strong>
        <span className="mouse-only">Drop {what} here</span>
        <span className="touch-only">Add {what}</span>
      </strong>
      <small className="kbd-hint">
        or press <kbd>{PASTE_KEY}</kbd> anywhere to paste from the clipboard
      </small>
      <div className="row">
        <button className="btn primary" onClick={() => input.current?.click()}>Choose files</button>
        <button className="btn" onClick={onPasteClick}>Paste</button>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple
          hidden
          onChange={e => {
            onFiles([...(e.target.files || [])]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
