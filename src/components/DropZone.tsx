import { useRef, useState } from 'react';
import { PASTE_KEY } from '../lib/files';
import { drag } from '../lib/drag';

interface Props {
  flash: boolean;
  onFiles: (files: File[]) => void;
  onPasteClick: () => void;
}

// Dropping files is handled page-wide in App; this only shows the highlight.
export function DropZone({ flash, onFiles, onPasteClick }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const enter = (e: React.DragEvent) => {
    if (drag.id != null) return;
    e.preventDefault();
    setOver(true);
  };
  return (
    <div
      className={'drop' + (over || flash ? ' over' : '')}
      onDragEnter={enter}
      onDragOver={enter}
      onDragLeave={() => setOver(false)}
      onDrop={() => setOver(false)}
    >
      <strong>
        <span className="mouse-only">Drop images or a PDF here</span>
        <span className="touch-only">Add images or a PDF</span>
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
          accept="image/*,application/pdf,.pdf"
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
