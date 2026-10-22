import { useEffect, useRef } from 'react';
import { readSizes } from '../lib/groups';
import type { GroupMode, Settings, Tail, WidthMode } from '../lib/types';

interface Props {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
}

export function LayoutSettings({ s, update }: Props) {
  return (
    <div className="section">
      <span className="label">Layout</span>
      <div className="settings">
        <label htmlFor="gap">Gap</label>
        <div className="inline">
          <input
            type="number"
            id="gap"
            min={0}
            max={400}
            value={s.gap}
            onChange={e => update({ gap: Math.max(0, Number(e.target.value) || 0) })}
          />
          <span className="stat">px</span>
          <input
            type="color"
            value={s.gapColor}
            aria-label="Gap colour"
            title="Gap colour"
            onChange={e => update({ gapColor: e.target.value })}
          />
        </div>
        <label htmlFor="width">Width</label>
        <select id="width" value={s.width} onChange={e => update({ width: e.target.value as WidthMode })}>
          <option value="widest">Scale all to widest</option>
          <option value="narrowest">Scale all to narrowest</option>
          <option value="original">Keep original, centre</option>
        </select>
      </div>
    </div>
  );
}

interface GroupProps extends Props {
  info: string;
  /** Shown next to "+ Next" when there are several stacks. */
  removeLabel: string | null;
  removeTitle: string;
  onRemoveStack: () => void;
  onModeChange: () => void;
}

export function GroupSettings({ s, update, info, removeLabel, removeTitle, onRemoveStack, onModeChange }: GroupProps) {
  const box = useRef<HTMLSpanElement>(null);
  const focusLast = useRef(false);
  useEffect(() => {
    if (!focusLast.current) return;
    focusLast.current = false;
    box.current?.querySelector<HTMLInputElement>('.sz:last-child input')?.select();
  }, [s.sizes.length]);

  const setSize = (i: number, v: string) => update({ sizes: s.sizes.map((x, j) => (j === i ? v : x)) });
  const sizes = readSizes(s.sizes);

  return (
    <div className="section">
      <span className="label">Groups</span>
      <div className="settings">
        <label htmlFor="gmode">Split</label>
        <select
          id="gmode"
          value={s.gmode}
          onChange={e => { update({ gmode: e.target.value as GroupMode }); onModeChange(); }}
        >
          <option value="all">One image with everything</option>
          <option value="every">Every N images</option>
          <option value="ranges">Custom ranges</option>
        </select>

        {s.gmode === 'every' && (
          <>
            <label>Per image</label>
            <div className="sizes">
              <span className="sizes" ref={box}>
                {s.sizes.map((v, i) => (
                  <span className="sz" key={i}>
                    {i > 0 && <span className="hint">then</span>}
                    <input
                      type="number"
                      min={1}
                      max={999}
                      aria-label={`Group ${i + 1} size`}
                      value={v}
                      onChange={e => setSize(i, e.target.value)}
                    />
                    {i > 0 && (
                      <button
                        className="icon"
                        aria-label="Remove this size"
                        onClick={() => update({ sizes: s.sizes.filter((_, j) => j !== i) })}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </span>
              <button
                className="btn sm"
                title="Add another group size"
                onClick={() => {
                  focusLast.current = true;
                  update({ sizes: [...s.sizes, String(sizes.at(-1))] });
                }}
              >
                + Next
              </button>
              {removeLabel && (
                <button className="btn sm danger" title={removeTitle} onClick={onRemoveStack}>{removeLabel}</button>
              )}
            </div>
            {sizes.length > 1 && (
              <>
                <label htmlFor="gtail">After that</label>
                <select
                  id="gtail"
                  value={s.gtail}
                  onChange={e => { update({ gtail: e.target.value as Tail }); onModeChange(); }}
                >
                  <option value="rest">Put the rest in one image</option>
                  <option value="repeat">Repeat the last size</option>
                </select>
              </>
            )}
          </>
        )}

        {s.gmode === 'ranges' && (
          <>
            <label htmlFor="granges">Ranges</label>
            <input
              type="text"
              id="granges"
              placeholder="1-4, 5-8, 9-12"
              value={s.granges}
              onChange={e => update({ granges: e.target.value })}
            />
          </>
        )}
      </div>
      {info && <p className="hint">{info}</p>}
    </div>
  );
}
