import { useState } from 'react';
import { drag } from '../lib/drag';
import { imgH, imgW, type Item } from '../lib/types';

interface Props {
  items: Item[];
  /** item id → indexes of the stacks it belongs to (only when there are several stacks). */
  tags: Map<number, number[]>;
  current: Set<number>;
  onMove: (from: number, to: number) => void;
  onRemove: (it: Item) => void;
  onJump: (group: number) => void;
}

export function ImageList({ items, tags, current, onMove, onRemove, onJump }: Props) {
  const [target, setTarget] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <ul className="list">
      {items.map((it, i) => {
        const g = tags.get(it.id);
        const cls = ['item', current.has(it.id) && 'cur', dragging === it.id && 'dragging', target === it.id && 'target']
          .filter(Boolean)
          .join(' ');
        return (
          <li
            key={it.id}
            className={cls}
            draggable
            onClick={e => { if (g && !(e.target as HTMLElement).closest('button')) onJump(g[0]); }}
            onDragStart={e => {
              drag.id = it.id;
              setDragging(it.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', 'x');
            }}
            onDragEnd={() => { drag.id = null; setDragging(null); setTarget(null); }}
            onDragOver={e => { if (drag.id == null) return; e.preventDefault(); setTarget(it.id); }}
            onDragLeave={() => setTarget(t => (t === it.id ? null : t))}
            onDrop={e => {
              if (drag.id == null) return;
              e.preventDefault();
              e.stopPropagation();
              const from = items.findIndex(x => x.id === drag.id);
              setTarget(null);
              onMove(from, i);
            }}
          >
            <span className="handle" aria-hidden="true">⋮⋮</span>
            <button
              className="num"
              title="Move to position…"
              aria-label={`Image ${i + 1}. Move to position`}
              onClick={() => {
                const v = prompt(`Move "${it.name}" to position (1–${items.length}):`, String(i + 1));
                const to = Math.floor(Number(v)) - 1;
                if (v != null && to >= 0 && to < items.length) onMove(i, to);
              }}
            >
              {i + 1}
            </button>
            <img alt="" src={it.url} />
            <div className="meta">
              <div className="name" title={it.name}>{it.name}</div>
              <div className="dims">
                {g && <span className="gtag">→ image {g.map(x => x + 1).join(', ')}</span>}
                {imgW(it)}×{imgH(it)}
              </div>
            </div>
            <div className="acts">
              <button className="icon" aria-label="Move up" disabled={i === 0} onClick={() => onMove(i, i - 1)}>↑</button>
              <button className="icon" aria-label="Move down" disabled={i === items.length - 1} onClick={() => onMove(i, i + 1)}>↓</button>
              <button className="icon del" aria-label="Remove" onClick={() => onRemove(it)}>✕</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
