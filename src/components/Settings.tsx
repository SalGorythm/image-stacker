import { useEffect, useRef } from 'react';
import { readSizes } from '../lib/groups';
import type { GroupMode, Settings, Tail, WidthMode } from '../lib/types';

interface Props {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
}

export function LayoutSettings({ s, update }: Props) {
  return (
    <div className="section" id="layout">
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
        <label htmlFor="arrange">Arrange</label>
        <div className="inline">
          <select id="arrange" value={s.arrange} onChange={e => update({ arrange: e.target.value as Settings['arrange'] })}>
            <option value="vertical">Top to bottom</option>
            <option value="horizontal">Side by side</option>
            <option value="grid">Grid</option>
          </select>
          {s.arrange === 'grid' && (
            <>
              <input
                type="number"
                min={1}
                max={8}
                value={s.columns}
                aria-label="Columns"
                style={{ width: 64, flex: 'none' }}
                onChange={e => update({ columns: Math.min(8, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })}
              />
              <span className="stat">columns</span>
            </>
          )}
        </div>
        <label htmlFor="width">Size</label>
        <select id="width" value={s.width} onChange={e => update({ width: e.target.value as WidthMode })}>
          <option value="widest">{s.arrange === 'horizontal' ? 'Match the tallest' : 'Match the widest'}</option>
          <option value="narrowest">{s.arrange === 'horizontal' ? 'Match the shortest' : 'Match the narrowest'}</option>
          <option value="original">Keep original sizes</option>
        </select>
      </div>
      {s.arrange === 'vertical' && <label className="check">
        <input type="checkbox" checked={s.joinOverlap} onChange={e => update({ joinOverlap: e.target.checked })} />
        Join overlapping screenshots
      </label>}
      {s.joinOverlap && s.arrange === 'vertical' && (
        <p className="hint">Consecutive screenshots of a long chat or page are joined where they overlap, and the repeated part is removed.</p>
      )}
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
    <div className="section" id="groups">
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

const EDGES = [['t', 'Top'], ['b', 'Bottom'], ['l', 'Left'], ['r', 'Right']] as const;

export function TrimSettings({ s, update }: Props) {
  const any = s.autoTrim || EDGES.some(([k]) => s.trim[k] > 0);
  return (
    <div className="section" id="trim">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="label">Trim edges</span>
        {any && (
          <button className="btn sm" onClick={() => update({ trim: { t: 0, b: 0, l: 0, r: 0 }, autoTrim: false })}>
            Reset
          </button>
        )}
      </div>
      <label className="check">
        <input type="checkbox" checked={s.autoTrim} onChange={e => update({ autoTrim: e.target.checked })} />
        Remove plain margins automatically
      </label>
      <div className="trim">
        {EDGES.map(([k, name]) => (
          <label key={k} className="trim-edge">
            <span>{name}</span>
            <input
              type="number"
              min={0}
              max={45}
              step={0.5}
              value={s.trim[k]}
              aria-label={`Trim ${name.toLowerCase()} (percent)`}
              onChange={e => update({ trim: { ...s.trim, [k]: Math.min(45, Math.max(0, Number(e.target.value) || 0)) } })}
            />
            <span className="stat">%</span>
          </label>
        ))}
      </div>
      <p className="hint">Applies to every image, in percent of its size, so mixed sizes trim alike.</p>
    </div>
  );
}

export function CaptionSettings({ s, update }: Props) {
  return (
    <div className="section" id="captions">
      <span className="label">Captions</span>
      <div className="settings">
        <label htmlFor="caption">Caption</label>
        <div className="inline">
          <input
            type="text"
            id="caption"
            placeholder="e.g. Answers {range}"
            value={s.caption}
            maxLength={120}
            onChange={e => update({ caption: e.target.value })}
          />
          <select
            aria-label="Caption position"
            value={s.captionPos}
            onChange={e => update({ captionPos: e.target.value as Settings['captionPos'] })}
          >
            <option value="top">Above</option>
            <option value="bottom">Below</option>
          </select>
        </div>
        <label htmlFor="watermark">Watermark</label>
        <input
          type="text"
          id="watermark"
          placeholder="Optional, bottom-right corner"
          value={s.watermark}
          maxLength={60}
          onChange={e => update({ watermark: e.target.value })}
        />
      </div>
      <label className="check">
        <input type="checkbox" checked={s.numbers} onChange={e => update({ numbers: e.target.checked })} />
        Number each image by its place in the list
      </label>
      <p className="hint">
        In the caption, <code>{'{range}'}</code> becomes the stack's images (e.g. 18-27), <code>{'{first}'}</code> and{' '}
        <code>{'{last}'}</code> its first and last, <code>{'{n}'}</code> the stack number and <code>{'{total}'}</code> the number of stacks.
      </p>
    </div>
  );
}
