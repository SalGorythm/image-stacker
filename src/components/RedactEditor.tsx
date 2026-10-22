import { useEffect, useRef, useState } from 'react';
import { applyRedactions, fromDrag, type Rect, type Redaction } from '../lib/redact';
import { imgH, imgW, type Item } from '../lib/types';

type NativeFaceDetector = { detect(src: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> };
const FaceDetector = (globalThis as unknown as { FaceDetector?: new (o?: object) => NativeFaceDetector }).FaceDetector;
const LABEL = { phone: 'phone number', email: 'email', id: 'ID number', card: 'card number' } as const;

interface Props {
  item: Item;
  onSave: (list: Redaction[]) => void;
  onCancel: () => void;
}

const KINDS: [Redaction['kind'], string][] = [['blur', 'Blur'], ['pixel', 'Pixelate'], ['box', 'Solid box']];

/** Drag over an image to hide parts of it; tap an area to select it. */
export function RedactEditor({ item, onSave, onCancel }: Props) {
  const [list, setList] = useState<Redaction[]>(() => item.redact?.slice() ?? []);
  const [kind, setKind] = useState<Redaction['kind']>('blur');
  const [sel, setSel] = useState<number | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [finding, setFinding] = useState('');
  const cv = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  // Draw the whole image (untrimmed) with its hidden areas applied, then outline each area
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const W = imgW(item), H = imgH(item);
    const k = Math.min(1, 1600 / W);
    c.width = Math.round(W * k);
    c.height = Math.round(H * k);
    const x = c.getContext('2d')!;
    x.drawImage(item.img, 0, 0, c.width, c.height);
    const full = { x: 0, y: 0, w: c.width, h: c.height };
    const place = (r: Rect) => ({ x: r.x * c.width, y: r.y * c.height, w: r.w * c.width, h: r.h * c.height });
    applyRedactions(x, list, place, full);
    const lw = Math.max(2, c.width / 400);
    list.forEach((r, i) => {
      const p = place(r);
      x.setLineDash(i === sel ? [] : [lw * 3, lw * 2]);
      x.lineWidth = i === sel ? lw * 2 : lw;
      x.strokeStyle = i === sel ? '#2f6b4f' : 'rgba(255,255,255,.95)';
      x.strokeRect(p.x, p.y, p.w, p.h);
      if (i !== sel) { x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineDashOffset = lw * 2.5; x.strokeRect(p.x, p.y, p.w, p.h); x.lineDashOffset = 0; }
    });
    if (draft) {
      const p = place(draft);
      x.setLineDash([]);
      x.lineWidth = lw * 2;
      x.strokeStyle = '#2f6b4f';
      x.fillStyle = 'rgba(47,107,79,.18)';
      x.fillRect(p.x, p.y, p.w, p.h);
      x.strokeRect(p.x, p.y, p.w, p.h);
    }
  }, [item, list, sel, draft]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null && !(e.target as HTMLElement).closest('input')) {
        setList(l => l.filter((_, i) => i !== sel));
        setSel(null);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onCancel, sel]);

  /**
   * Reads the image on this device and adds a box over each phone number, email, ID or card number
   * (and faces, where the browser can find them). Everything found can be removed again.
   */
  const findPrivate = async () => {
    setFinding('Reading the text… (the first time downloads the reader, about 7 MB)');
    try {
      const [{ readText }, { findSensitive }] = await Promise.all([import('../lib/ocr'), import('../lib/sensitive')]);
      const W = imgW(item), H = imgH(item);
      const found = findSensitive((await readText(item.img, ['eng'], p => setFinding(`Reading the text… ${Math.round(p * 100)}%`))).words);
      const boxes: (Rect & { what: string })[] = found.map(f => ({ x: f.box.x / W, y: f.box.y / H, w: f.box.w / W, h: f.box.h / H, what: LABEL[f.kind] }));
      if (FaceDetector) {
        try {
          for (const fc of await new FaceDetector({ maxDetectedFaces: 20 }).detect(item.img)) {
            const b = fc.boundingBox;
            boxes.push({ x: b.x / W, y: b.y / H, w: b.width / W, h: b.height / H, what: 'face' });
          }
        } catch { /* faces are a bonus */ }
      }
      const fresh = boxes.filter(b => !list.some(r => Math.abs(r.x - b.x) < 0.01 && Math.abs(r.y - b.y) < 0.01));
      setList(l => [...l, ...fresh.map(({ x, y, w, h }) => ({ x, y, w, h, kind }))]);
      const counts = fresh.reduce<Record<string, number>>((m, b) => ({ ...m, [b.what]: (m[b.what] ?? 0) + 1 }), {});
      setFinding(fresh.length
        ? `Added ${Object.entries(counts).map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`).join(', ')}. Check them, and drag over anything missed.`
        : `Nothing found automatically. Drag over anything private.${FaceDetector ? '' : ' (Faces can only be found automatically in some browsers.)'}`);
    } catch {
      setFinding('Could not read the text in this image. Drag over private details by hand.');
    }
  };

  const at = (e: React.PointerEvent) => {
    const b = cv.current!.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  };
  const hit = (p: { x: number; y: number }) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return null;
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="redact-title">
      <div className="picker redact">
        <div className="picker-head">
          <strong id="redact-title">Hide parts of {item.name}</strong>
          <span className="stat">Drag over what to hide · tap an area to select it</span>
        </div>
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="How to hide">
            {KINDS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                className={kind === k ? 'on' : ''}
                onClick={() => {
                  setKind(k);
                  if (sel != null) setList(l => l.map((r, i) => (i === sel ? { ...r, kind: k } : r)));
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {sel != null && (
            <button type="button" className="btn sm danger" onClick={() => { setList(l => l.filter((_, i) => i !== sel)); setSel(null); }}>
              Remove area
            </button>
          )}
          {list.length > 0 && (
            <button type="button" className="btn sm" onClick={() => { setList([]); setSel(null); }}>Clear all</button>
          )}
          <button type="button" className="btn sm primary" onClick={findPrivate} disabled={finding.startsWith('Reading')}>Find private details</button>
        </div>
        {finding && <p className="hint" role="status">{finding}</p>}
        <div className="redact-stage">
          <canvas
            ref={cv}
            className="redact-canvas"
            onPointerDown={e => {
              const p = at(e);
              const h = hit(p);
              if (h != null) { setSel(h); setKind(list[h].kind); return; }
              setSel(null);
              start.current = p;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={e => {
              if (!start.current) return;
              const p = at(e);
              setDraft(fromDrag(start.current.x, start.current.y, p.x, p.y));
            }}
            onPointerUp={e => {
              const s0 = start.current;
              start.current = null;
              if (!s0) return;
              const p = at(e);
              const r = fromDrag(s0.x, s0.y, p.x, p.y);
              setDraft(null);
              // Ignore taps and tiny slips; anything real becomes a hidden area
              if (r.w > 0.01 && r.h > 0.005) {
                setList(l => [...l, { ...r, kind }]);
                setSel(list.length);
              }
            }}
          />
        </div>
        <div className="row picker-foot">
          <span className="stat" style={{ marginRight: 'auto' }}>
            {list.length ? `${list.length} hidden area${list.length > 1 ? 's' : ''}` : 'Nothing hidden yet'}
          </span>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => onSave(list)}>Done</button>
        </div>
      </div>
    </div>
  );
}
