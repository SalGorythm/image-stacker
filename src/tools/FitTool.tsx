import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import type { FitSpec } from '../lib/fit';
import { fitImage, kb, type FitResult } from '../lib/fitImage';
import { loadImg, NO_IMAGE, PASTE_KEY, readClipboardImages, cantOpen } from '../lib/files';
import { handoff } from '../lib/handoff';
import { normaliseFiles } from '../lib/heic';
import { PRESETS } from '../lib/presets';
import { canShareFiles, saveBlob, zipFiles } from '../lib/render';
import { pageH1 } from '../seo/pages';

interface Source {
  id: number;
  name: string;
  img: HTMLImageElement;
  url: string;
}

interface Props {
  /** App routes dropped and pasted files here while this tool is open. */
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
  /** Set by "compress image to N KB" pages: start with that maximum instead of the last rules. */
  maxKB?: number;
}

const SPEC_KEY = 'fit-spec';
const BLANK: FitSpec = { shape: 'cover', pad: false };
let seq = 0;

function loadSpec(): { spec: FitSpec; preset: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(SPEC_KEY) || 'null');
    if (raw && typeof raw === 'object') return { spec: { ...BLANK, ...raw.spec }, preset: String(raw.preset || '') };
  } catch { /* private mode */ }
  return { spec: BLANK, preset: '' };
}

const num = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v)) || undefined);
const outName = (name: string, r: FitResult) =>
  `${name.replace(/\.[^.]+$/, '') || 'photo'}-${r.w}x${r.h}-${Math.round(r.blob.size / 1024)}kb.jpg`;

/**
 * Fit to size: makes photos and signatures meet a form's rules (KB range, exact pixels).
 * Files stay in memory only; ID photos and signatures are never saved, not even in this browser.
 */
export function FitTool({ intakeRef, toast, show, maxKB }: Props) {
  const init = useMemo(() => {
    const saved = loadSpec();
    return maxKB ? { spec: { ...BLANK, pad: saved.spec.pad, maxKB }, preset: '' } : saved;
  }, [maxKB]);
  const [spec, setSpec] = useState<FitSpec>(init.spec);
  const [preset, setPreset] = useState(init.preset);
  const [files, setFiles] = useState<Source[]>([]);
  const [results, setResults] = useState<Map<number, FitResult>>(new Map());
  const [working, setWorking] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(SPEC_KEY, JSON.stringify({ spec, preset })); } catch { /* ignore */ }
  }, [spec, preset]);

  const add = async (incoming: File[]) => {
    const list = await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }));
    const imgs = list.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return show('Those files are not images. Fit to size works on photos and scans (JPG, PNG, WebP).', { err: true });
    const out: Source[] = [];
    for (const f of imgs) {
      const url = URL.createObjectURL(f);
      try { out.push({ id: ++seq, name: f.name || `photo-${seq}.jpg`, img: await loadImg(url), url }); }
      catch { URL.revokeObjectURL(url); show(cantOpen(f.name), { err: true }); }
    }
    if (out.length) setFiles(prev => [...prev, ...out]);
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });
  // A cleaned signature (or another tool's output) arrives here when the tool opens
  useEffect(() => {
    if (!handoff.files.length) return;
    const got = handoff.files;
    handoff.files = [];
    add(got);
    show('Signature added. Pick your form\'s preset or type its rules.');
  }, []);

  // Re-fit every file whenever the rules or the files change (debounced so typing stays smooth)
  useEffect(() => {
    if (!files.length) { setResults(new Map()); return; }
    let live = true;
    const t = setTimeout(async () => {
      setWorking(true);
      const next = new Map<number, FitResult>();
      for (const f of files) {
        if (!live) return;
        try { next.set(f.id, await fitImage(f.img, spec)); } catch { /* leave out */ }
        if (live) setResults(new Map(next));
      }
      if (live) setWorking(false);
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [files, spec]);

  const previews = useMemo(() => {
    const m = new Map<number, string>();
    results.forEach((r, id) => m.set(id, URL.createObjectURL(r.blob)));
    return m;
  }, [results]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  const set = (patch: Partial<FitSpec>) => { setSpec(s => ({ ...s, ...patch })); setPreset(''); };
  const choose = (id: string) => {
    setPreset(id);
    const p = PRESETS.find(x => x.id === id);
    if (p) setSpec({ ...BLANK, pad: spec.pad, ...p.spec, shape: p.spec.shape ?? 'cover' });
  };
  const active = PRESETS.find(p => p.id === preset);
  const both = !!(spec.width && spec.height);
  const ready = files.filter(f => results.get(f.id));
  const failing = ready.filter(f => results.get(f.id)!.status !== 'ok').length;

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };
  const save = (f: Source) => {
    const r = results.get(f.id)!;
    saveBlob(r.blob, outName(f.name, r));
  };
  const saveAll = async () => {
    const list = ready.map(f => ({ name: outName(f.name, results.get(f.id)!), blob: results.get(f.id)!.blob }));
    if (list.length === 1) return saveBlob(list[0].blob, list[0].name);
    saveBlob(await zipFiles(list), 'fitted.zip');
    show(`Saved fitted.zip with ${list.length} files.`);
  };
  const share = async (list: Source[]) => {
    const fl = list.map(f => { const r = results.get(f.id)!; return new File([r.blob], outName(f.name, r), { type: 'image/jpeg' }); });
    try { await navigator.share({ files: fl }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };
  const remove = (id: number) => setFiles(prev => prev.filter(f => f.id !== id));

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>{pageH1('Fit to size')}</h1>
        <p>Make a photo or signature meet a form's rules: a KB range and exact pixels. Nothing is uploaded, and nothing is saved on this device.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Rules">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos or signatures" accept="image/*,.heic,.heif" />
          <div className="section" id="fit-rules">
            <span className="label">The form's rules</span>
            <div className="settings">
              <label htmlFor="fit-preset">Preset</label>
              <select id="fit-preset" value={preset} onChange={e => choose(e.target.value)}>
                <option value="">Custom</option>
                {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {active && (
              <div className="preset-note">
                <span>{active.note}</span>
                <span className="hint">
                  Source: <a href={active.source.url} target="_blank" rel="noreferrer">{active.source.label}</a> · checked {active.checked}. Always compare with your own notice.
                </span>
              </div>
            )}
            <div className="settings">
              <label htmlFor="fit-min">Size</label>
              <div className="inline">
                <input id="fit-min" type="number" min={0} placeholder="min" aria-label="Minimum KB" value={spec.minKB ?? ''} onChange={e => set({ minKB: num(e.target.value) })} />
                <span className="stat">to</span>
                <input type="number" min={0} placeholder="max" aria-label="Maximum KB" value={spec.maxKB ?? ''} onChange={e => set({ maxKB: num(e.target.value) })} />
                <span className="stat">KB</span>
              </div>
              <label htmlFor="fit-w">Pixels</label>
              <div className="inline">
                <input id="fit-w" type="number" min={1} placeholder="width" aria-label="Width in pixels" value={spec.width ?? ''} onChange={e => set({ width: num(e.target.value) })} />
                <span className="stat">×</span>
                <input type="number" min={1} placeholder="height" aria-label="Height in pixels" value={spec.height ?? ''} onChange={e => set({ height: num(e.target.value) })} />
                <span className="stat">px</span>
              </div>
              {both && (
                <>
                  <label htmlFor="fit-shape">Shape</label>
                  <select id="fit-shape" value={spec.shape} onChange={e => set({ shape: e.target.value as FitSpec['shape'] })}>
                    <option value="cover">Crop to fill (photos)</option>
                    <option value="contain">Fit inside, white border (signatures)</option>
                  </select>
                </>
              )}
            </div>
            <label className="check">
              <input type="checkbox" checked={spec.pad} onChange={e => setSpec(s => ({ ...s, pad: e.target.checked }))} />
              Pad small files up to the minimum
            </label>
            <p className="hint">
              Leave pixels blank to keep the photo's shape and let the size adjust. Files always come out as JPG.
              Padding adds hidden filler to a file that is still too small at the best quality; the picture does not change.
            </p>
          </div>
        </section>

        <section className="panel preview" aria-label="Results">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">
              Results{files.length ? ` · ${files.length} file${files.length > 1 ? 's' : ''}` : ''}
              {working && ' · working…'}
            </span>
            {ready.length > 0 && (
              <span className={'badge ' + (failing ? 'bad' : 'ok')}>
                {failing ? `${failing} need${failing > 1 ? '' : 's'} attention` : 'All pass'}
              </span>
            )}
          </div>
          {!files.length && <p className="placeholder">Add a photo or signature and it shows up here, fitted to the rules.</p>}
          <ul className="fit-list">
            {files.map(f => {
              const r = results.get(f.id);
              return (
                <li key={f.id} className="fit-row">
                  <div className="fit-thumb">{r ? <img src={previews.get(f.id)} alt="" /> : <span className="thumb-ph" />}</div>
                  <div className="meta">
                    <div className="name" title={f.name}>{f.name}</div>
                    <div className="dims">
                      {r ? `${r.w}×${r.h} · ${kb(r.blob.size)} · quality ${Math.round(r.q * 100)}%${r.padded ? ' · padded' : ''}` : 'Fitting…'}
                    </div>
                    {r && r.status !== 'ok' && <div className="fit-reason">{r.reason}</div>}
                  </div>
                  <div className="fit-acts">
                    {r && <span className={'badge ' + (r.status === 'ok' ? 'ok' : 'bad')}>{r.status === 'ok' ? 'Pass' : r.status === 'too-big' ? 'Too big' : 'Too small'}</span>}
                    {r && <button className="btn sm" onClick={() => save(f)}>Download</button>}
                    {r && canShareFiles && <button className="btn sm" onClick={() => share([f])}>Share</button>}
                    <button className="icon del" aria-label={`Remove ${f.name}`} onClick={() => remove(f.id)}>✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {ready.length > 1 && (
            <div className="export">
              <button className="btn primary" onClick={saveAll}>Download all ({ready.length})</button>
              {canShareFiles && <button className="btn" onClick={() => share(ready)}>Share all</button>}
              <button className="btn" onClick={() => setFiles([])}>Clear</button>
            </div>
          )}
          <div className={'toast' + (toast?.err ? ' err' : '')} role="status">
            {toast?.msg}
            {toast?.action && <button className="toast-act" onClick={toast.action.fn}>{toast.action.label}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
