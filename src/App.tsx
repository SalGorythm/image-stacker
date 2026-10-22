import { useEffect, useMemo, useRef, useState } from 'react';
import { DropZone } from './components/DropZone';
import { ImageList } from './components/ImageList';
import { Preview } from './components/Preview';
import { GroupSettings, LayoutSettings, TrimSettings } from './components/Settings';
import { useEvent, useToast } from './hooks';
import { drag } from './lib/drag';
import {
  fileName, filesFromPaste, loadImg, makeSample, NO_IMAGE, PASTE_KEY, readClipboardImages, baseName, takeSharedFiles,
} from './lib/files';
import { computeGroups } from './lib/groups';
import { isDeck, isPdf, pdfPages } from './lib/pdf';
import { buildPdf, buildZip, canShareFiles, copyStack, imageBlob, saveBlob, shareFiles, TOO_BIG } from './lib/render';
import { loadItems, loadSettings, saveItems, saveSettings } from './lib/storage';
import type { Item, PdfSrc, Settings } from './lib/types';

let seq = 0;
let pasteN = 0;

function sampleItems(): Item[] {
  return [1, 2].map(n => {
    const img = makeSample(n);
    return { id: ++seq, name: `example-${n}.png`, img, url: img.toDataURL('image/png') };
  });
}

export default function App() {
  const [s, setS] = useState<Settings>(loadSettings);
  const update = (patch: Partial<Settings>) => setS(prev => ({ ...prev, ...patch }));
  useEffect(() => saveSettings(s), [s]);

  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [cur, setCur] = useState(0);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  // Samples have no blob: they are never saved and disappear when real images arrive
  const isSample = items.length > 0 && !items[0].blob;

  // Restore last session's images, or show the examples
  useEffect(() => {
    loadItems(loadImg)
      .catch(() => null)
      .then(r => {
        if (r) {
          seq = Math.max(seq, r.seq);
          pasteN = r.pasteN;
          setItems(r.items);
          show(`Restored ${r.items.length} image${r.items.length > 1 ? 's' : ''} from last time.`);
        } else setItems(sampleItems());
        setReady(true);
        // Opened from the share sheet of another app: add what was shared
        return takeSharedFiles().then(files => { if (files.length) addFiles(files); });
      })
      .catch(() => show('Could not open the shared files. Try sharing them again.', { err: true }));
    // addFiles is a stable useEvent callback declared below, so it is read inside the callback only
  }, [show]);

  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!ready || isSample) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveItems(items, seq, pasteN).catch(() => show('Could not save images for next time. Browser storage may be full.', { err: true }));
    }, 300);
  }, [items, ready, isSample, show]);

  const { groups, info } = useMemo(
    () => computeGroups(items, { mode: s.gmode, sizes: s.sizes, tail: s.gtail, ranges: s.granges }),
    [items, s.gmode, s.sizes, s.gtail, s.granges],
  );
  const c = Math.max(0, Math.min(cur, groups.length - 1));
  const multi = groups.length > 1;
  const list = groups[c]?.list ?? [];
  const tags = useMemo(() => {
    const m = new Map<number, number[]>();
    if (multi) groups.forEach((g, gi) => g.list.forEach(it => m.set(it.id, [...(m.get(it.id) || []), gi])));
    return m;
  }, [groups, multi]);
  const current = useMemo(() => new Set(multi ? list.map(it => it.id) : []), [list, multi]);

  const addFiles = useEvent(async (files: File[]) => {
    const queue: { file: File; src?: PdfSrc }[] = [];
    for (const f of files) {
      if (isPdf(f)) {
        try {
          queue.push(...(await pdfPages(f, (n, t) => show(`Reading ${f.name}: page ${n} of ${t}…`, { keep: true }))));
        } catch {
          show(`Could not read ${f.name}. Is it a valid PDF?`, { err: true });
        }
      } else if (f.type.startsWith('image/')) queue.push({ file: f });
    }
    if (!queue.length) {
      if (files.some(isDeck)) show('Export the presentation as PDF first (File → Export → PDF), then drop the PDF here.', { err: true });
      else if (!files.some(isPdf)) show('Those files are not images or PDFs.', { err: true });
      return;
    }
    const added: Item[] = [];
    for (const { file: f, src } of queue) {
      try {
        const url = URL.createObjectURL(f);
        const img = await loadImg(url);
        let name = f.name;
        if (!name || /^image\.\w+$/.test(name)) name = `Pasted ${++pasteN}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
        added.push({ id: ++seq, name, img, url, blob: f, src });
      } catch {
        show('Could not read ' + (f.name || 'that image'), { err: true });
      }
    }
    if (!added.length) return;
    setItems(prev => [...prev.filter(it => it.blob), ...added]);
    show(`Added ${added.length} image${added.length > 1 ? 's' : ''}.` + (files.some(isDeck) ? ' (Presentations need exporting to PDF first.)' : ''));
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
  });

  const pasteClick = async () => {
    if (!navigator.clipboard?.read) return show(`This browser can't read the clipboard from a button. Press ${PASTE_KEY} instead.`, { err: true });
    try {
      const files = await readClipboardImages();
      if (!files.length) return show(NO_IMAGE, { err: true });
      addFiles(files);
    } catch {
      show(`Clipboard access was blocked. Press ${PASTE_KEY} instead.`, { err: true });
    }
  };

  // Removing is instant; the toast offers Undo instead of asking first
  const removeItems = (ids: Set<number>, msg: string) => {
    const before = items;
    setItems(items.filter(it => !ids.has(it.id)));
    if (isSample) return;
    show(msg, { action: { label: 'Undo', fn: () => { setItems(before); show('Restored.'); } } });
  };
  const removeStack = () => {
    if (!multi) return;
    const n = list.length;
    removeItems(new Set(list.map(it => it.id)), `Removed stack ${c + 1} (${n} image${n > 1 ? 's' : ''}).`);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to || from < 0) return;
    const next = items.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setItems(next);
  };
  const sort = (v: string) => {
    const cmp = (a: Item, b: Item) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    const next = items.slice();
    if (v === 'az') next.sort(cmp);
    else if (v === 'za') next.sort((a, b) => cmp(b, a));
    else if (v === 'added') next.sort((a, b) => a.id - b.id);
    setItems(next);
  };

  const run = async (fn: () => Promise<void>) => {
    if (isSample) return show('Add your own images first. These are examples.', { err: true });
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      show(e instanceof Error && e.message === TOO_BIG ? TOO_BIG : 'Export failed. Check your connection and try again.', { err: true });
    } finally {
      setBusy(false);
    }
  };
  const labels = groups.map(g => g.label);
  const save = () => run(async () => {
    const name = fileName(s.fname, s.fmt, c, labels);
    show('Preparing…', { keep: true });
    saveBlob(s.fmt === 'pdf' ? await buildPdf([list], s) : await imageBlob(list, s), name);
    show('Saved ' + name);
  });
  const saveAll = () => run(async () => {
    const n = groups.length, base = baseName(s.fname);
    if (s.fmt === 'pdf') {
      saveBlob(await buildPdf(groups.map(g => g.list), s, i => show(`Building page ${i + 1} of ${n}…`, { keep: true })), base + '.pdf');
      return show(`Saved ${base}.pdf with ${n} pages.`);
    }
    const files = groups.map((g, i) => ({ name: fileName(s.fname, s.fmt, i, labels), list: g.list }));
    saveBlob(await buildZip(files, s, i => show(`Building image ${i + 1} of ${n}…`, { keep: true })), base + '.zip');
    show(`Saved ${base}.zip with ${n} images.`);
  });
  // Rendering HD stacks can outlast the click's permission to open the share sheet;
  // then the toast offers "Share now", which is a fresh click.
  const share = (all: boolean) => run(async () => {
    const idx = all ? groups.map((_, i) => i) : [c];
    const n = idx.length;
    show('Preparing…', { keep: true });
    const files = await shareFiles(
      idx.map(i => groups[i].list),
      idx.map(i => fileName(s.fname, s.fmt === 'pdf' ? 'png' : s.fmt, i, labels)),
      all ? `${baseName(s.fname)}.pdf` : fileName(s.fname, 'pdf', c, labels),
      s,
      i => n > 1 && show(`Building image ${i + 1} of ${n}…`, { keep: true }),
    );
    if (!navigator.canShare?.({ files })) return show('This browser cannot share these files. Use Download instead.', { err: true });
    const send = async (): Promise<void> => {
      try {
        await navigator.share({ files });
        show(files.length > 1 ? `Shared ${files.length} images.` : 'Shared.');
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        if (name === 'AbortError') show('Sharing cancelled.');
        else if (name === 'NotAllowedError') show('Ready to share.', { keep: true, action: { label: 'Share now', fn: send } });
        else show('Sharing failed. Use Download instead.', { err: true });
      }
    };
    await send();
  });
  const copy = () => run(async () => {
    try {
      await copyStack(list, s);
      show('Copied. Paste it into WhatsApp or anywhere else.');
    } catch (e) {
      show(e instanceof Error && e.message === TOO_BIG ? TOO_BIG : 'This browser blocked copying images. Use Download instead.', { err: true });
    }
  });

  // Page-wide: drop files anywhere, paste anywhere, ← / → to step through stacks
  const onPaste = useEvent((e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    const files = filesFromPaste(e.clipboardData, isPdf);
    if (files.length) { e.preventDefault(); addFiles(files); }
    else if (!(e.target as HTMLElement).closest?.('input,textarea')) show(NO_IMAGE, { err: true });
  });
  const onKey = useEvent((e: KeyboardEvent) => {
    if (!multi || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest?.('input,select,textarea')) return;
    if (e.key === 'ArrowLeft' && c > 0) setCur(c - 1);
    else if (e.key === 'ArrowRight' && c < groups.length - 1) setCur(c + 1);
  });
  useEffect(() => {
    const over = (e: DragEvent) => { if (drag.id == null && e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (drag.id == null && e.dataTransfer?.files.length) { e.preventDefault(); addFiles([...e.dataTransfer.files]); }
    };
    document.addEventListener('dragover', over);
    document.addEventListener('drop', drop);
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('dragover', over);
      document.removeEventListener('drop', drop);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKey);
    };
  }, [addFiles, onPaste, onKey]);

  const n = list.length;
  return (
    <div className="wrap">
      <header>
        <h1>Image Stacker</h1>
        <p>Add, order, stack, save. Images stay in your browser.</p>
      </header>

      <div className="grid">
        <section className="panel" aria-label="Images and settings">
          <DropZone flash={flash} onFiles={addFiles} onPasteClick={pasteClick} />

          {items.length > 0 && (
            <div className="section">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label">Order · {items.length} image{items.length > 1 ? 's' : ''}</span>
                <div className="row">
                  <select aria-label="Sort images" id="sort" value="" onChange={e => sort(e.target.value)}>
                    <option value="">Sort…</option>
                    <option value="az">Filename A → Z</option>
                    <option value="za">Filename Z → A</option>
                    <option value="added">Order added</option>
                  </select>
                  <button
                    className="btn sm"
                    onClick={() => { setCur(0); removeItems(new Set(items.map(it => it.id)), `Removed all ${items.length} images.`); }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {isSample && <div className="sample">These two are examples. They disappear when you add your own images.</div>}
              <ImageList
                items={items}
                tags={tags}
                current={current}
                onMove={move}
                onRemove={it => removeItems(new Set([it.id]), `Removed ${it.name}.`)}
                onJump={setCur}
              />
            </div>
          )}

          <LayoutSettings s={s} update={update} />
          <TrimSettings s={s} update={update} />
          <GroupSettings
            s={s}
            update={update}
            info={info}
            removeLabel={multi ? `Remove stack ${c + 1} (${n})` : null}
            removeTitle={`Remove the ${n} image${n > 1 ? 's' : ''} in stack ${c + 1} (#${groups[c]?.label}). You can undo.`}
            onRemoveStack={removeStack}
            onModeChange={() => setCur(0)}
          />
        </section>

        <Preview
          s={s}
          update={update}
          list={list}
          cur={c}
          count={groups.length}
          label={groups[c]?.label ?? ''}
          busy={busy}
          toast={toast}
          onNav={d => setCur(c + d)}
          onRemoveStack={removeStack}
          onSave={save}
          onSaveAll={saveAll}
          onCopy={copy}
          onShare={canShareFiles ? share : undefined}
          onSplit={max => {
            // Spread evenly: 10 images with a max of 6 become 5 + 5, not 6 + 4, so every stack is wider
            const N = items.length, k = Math.ceil(N / Math.ceil(N / max));
            update({ gmode: 'every', sizes: [String(k)] });
            setCur(0);
            show(`Split into stacks of ${k}. Each one fits WhatsApp HD.`);
          }}
        />
      </div>
    </div>
  );
}
