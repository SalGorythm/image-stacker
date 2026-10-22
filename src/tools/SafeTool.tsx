import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropZone } from '../components/DropZone';
import type { ToastOptions, ToastState } from '../hooks';
import { readMeta, stripMeta, type PhotoMeta } from '../lib/exif';
import { kb } from '../lib/fitImage';
import { heicToJpeg, isHeic, isImageFile } from '../lib/heic';
import { loadImg, NO_IMAGE, PASTE_KEY, readableOnly, readClipboardImages, cantOpen } from '../lib/files';
import { canShareFiles, canvasBlob, saveBlob, zipFiles } from '../lib/render';

interface Props {
  intakeRef: RefObject<((files: File[]) => void) | null>;
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

interface Entry {
  id: number;
  file: File;
  thumb: string;
  meta: PhotoMeta;
  clean: File;
  /** An iPhone HEIC photo: converted to JPG, so its hidden details could not be listed. */
  heic: boolean;
  /** True when the format had to be re-saved as JPG (no lossless strip for it). */
  resaved: boolean;
}

let seq = 0;

/** Clean copy: lossless for JPEG and PNG; other formats are re-saved as a high-quality JPG. */
async function cleanCopy(f: File, meta: PhotoMeta): Promise<{ clean: File; resaved: boolean }> {
  const base = (f.name || 'photo').replace(/\.[^.]+$/, '');
  const bytes = new Uint8Array(await f.arrayBuffer());
  const stripped = stripMeta(bytes, meta.orientation);
  if (stripped) {
    const ext = f.type === 'image/png' ? 'png' : 'jpg';
    return { clean: new File([stripped], `${base}-clean.${ext}`, { type: f.type || 'image/jpeg' }), resaved: false };
  }
  const url = URL.createObjectURL(f);
  try {
    const img = await loadImg(url);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    const b = await canvasBlob(c, 'image/jpeg', 0.95);
    return { clean: new File([b!], `${base}-clean.jpg`, { type: 'image/jpeg' }), resaved: true };
  } finally { URL.revokeObjectURL(url); }
}

const fmt = (n: number) => n.toFixed(4);

/**
 * Safe to share: shows what a photo gives away (location, phone model, date) and makes a clean
 * copy without touching the picture. Nothing is uploaded or saved.
 */
export function SafeTool({ intakeRef, toast, show }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const add = async (files: File[]) => {
    const imgs = (await readableOnly(files)).filter(isImageFile);
    if (!imgs.length) return show('Add photos (JPG, PNG, HEIC, WebP).', { err: true });
    const out: Entry[] = [];
    for (const f of imgs) {
      try {
        if (isHeic(f)) {
          // The JPG made from a HEIC carries no hidden data at all, so it is already the clean copy
          show(`Opening ${f.name}…`, { keep: true });
          const jpg = await heicToJpeg(f);
          const clean = new File([jpg], jpg.name.replace(/\.jpg$/, '-clean.jpg'), { type: 'image/jpeg' });
          out.push({ id: ++seq, file: f, thumb: URL.createObjectURL(jpg), meta: { extras: [] }, clean, resaved: true, heic: true });
          continue;
        }
        const meta = readMeta(new Uint8Array(await f.slice(0, 512 * 1024).arrayBuffer()));
        const { clean, resaved } = await cleanCopy(f, meta);
        out.push({ id: ++seq, file: f, thumb: URL.createObjectURL(f), meta, clean, resaved, heic: false });
      } catch { show(cantOpen(f.name), { err: true }); }
    }
    setEntries(prev => [...prev, ...out]);
    const located = out.filter(e => e.meta.gps).length;
    if (out.length) show(located ? `${located} of ${out.length} photo${out.length > 1 ? 's' : ''} show where they were taken.` : 'No location found in these photos.');
  };
  useEffect(() => {
    intakeRef.current = add;
    return () => { intakeRef.current = null; };
  });
  const thumbs = useRef<string[]>([]);
  thumbs.current = entries.map(e => e.thumb);
  useEffect(() => () => thumbs.current.forEach(u => URL.revokeObjectURL(u)), []);

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`Press ${PASTE_KEY} to paste instead.`, { err: true });
    try {
      const got = await readClipboardImages();
      if (!got.length) return show(NO_IMAGE, { err: true });
      add(got);
    } catch { show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true }); }
  };
  const share = async (list: Entry[]) => {
    try { await navigator.share({ files: list.map(e => e.clean) }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };
  const saveAll = async () => {
    if (entries.length === 1) return saveBlob(entries[0].clean, entries[0].clean.name);
    saveBlob(await zipFiles(entries.map(e => ({ name: e.clean.name, blob: e.clean }))), 'clean-photos.zip');
    show(`Saved clean-photos.zip with ${entries.length} photos.`);
  };
  const located = entries.filter(e => e.meta.gps).length;

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>Safe to share</h1>
        <p>See what your photos give away, like where they were taken and on which phone, and get clean copies with that removed. The picture itself is not changed. Nothing is uploaded.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="Add photos">
          <DropZone flash={false} onFiles={add} onPasteClick={pasteClick} inputRef={input} what="photos" accept="image/*,.heic,.heif" />
          <div className="section">
            <span className="label">When this matters</span>
            <ul className="tips">
              <li>Phones save the exact place a photo was taken inside the file.</li>
              <li>Normal WhatsApp photo sends usually remove it. <strong>Sending as a document</strong>, email, AirDrop and uploads to websites usually keep it.</li>
              <li>Photos of children, your home, or ID documents are worth cleaning before you share them as files.</li>
            </ul>
          </div>
        </section>

        <section className="panel preview" aria-label="What each photo shows">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Photos{entries.length ? ` · ${entries.length}` : ''}</span>
            {entries.length > 0 && (
              <span className={'badge ' + (located ? 'bad' : 'ok')}>{located ? `${located} with location` : 'No location found'}</span>
            )}
          </div>
          {!entries.length && <p className="placeholder">Add photos to see what they reveal.</p>}
          <ul className="fit-list">
            {entries.map(e => (
              <li key={e.id} className="fit-row">
                <div className="fit-thumb"><img src={e.thumb} alt="" /></div>
                <div className="meta">
                  <div className="name" title={e.file.name}>{e.file.name}</div>
                  <div className="facts">
                    {e.heic ? <span className="fact">iPhone HEIC photo: details not listed, the JPG copy has none</span> : e.meta.gps ? (
                      <span className="fact bad">
                        Location {fmt(e.meta.gps.lat)}, {fmt(e.meta.gps.lon)}{' '}
                        <a href={`https://www.openstreetmap.org/?mlat=${e.meta.gps.lat}&mlon=${e.meta.gps.lon}#map=16/${e.meta.gps.lat}/${e.meta.gps.lon}`} target="_blank" rel="noreferrer">see on map</a>
                      </span>
                    ) : <span className="fact ok">No location</span>}
                    {e.meta.device && <span className="fact">Phone: {e.meta.device}</span>}
                    {e.meta.taken && <span className="fact">Taken: {e.meta.taken.replace(/^(\d{4}):(\d\d):(\d\d)/, '$1-$2-$3')}</span>}
                    {e.meta.extras.length > 0 && <span className="fact">Also: {e.meta.extras.join(', ')}</span>}
                  </div>
                  <div className="dims">
                    Clean copy {kb(e.clean.size)}{e.resaved ? ' · re-saved as JPG' : ' · picture unchanged'}
                  </div>
                </div>
                <div className="fit-acts">
                  <button className="btn sm" onClick={() => saveBlob(e.clean, e.clean.name)}>Download clean</button>
                  {canShareFiles && <button className="btn sm" onClick={() => share([e])}>Share clean</button>}
                  <button className="icon del" aria-label={`Remove ${e.file.name}`} onClick={() => setEntries(p => p.filter(x => x.id !== e.id))}>✕</button>
                </div>
              </li>
            ))}
          </ul>
          {entries.length > 1 && (
            <div className="export">
              <button className="btn primary" onClick={saveAll}>Download all clean ({entries.length})</button>
              {canShareFiles && <button className="btn" onClick={() => share(entries)}>Share all clean</button>}
              <button className="btn" onClick={() => setEntries([])}>Clear</button>
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
