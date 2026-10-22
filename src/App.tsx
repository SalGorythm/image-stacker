import { useEffect, useMemo, useRef, useState } from 'react';
import { DropZone } from './components/DropZone';
import { ImageList } from './components/ImageList';
import { Help } from './components/Help';
import { InstallHelp } from './components/InstallHelp';
import { PagePicker } from './components/PagePicker';
import { RedactEditor } from './components/RedactEditor';
import { SiteFooter, SiteHeader, type NavItem, type ToolLink } from './components/Site';
import { FitTool } from './tools/FitTool';
import { CardsTool } from './tools/CardsTool';
import { ConvertTool } from './tools/ConvertTool';
import { CutoutTool } from './tools/CutoutTool';
import { PhotoTool } from './tools/PhotoTool';
import { QrTool } from './tools/QrTool';
import { QuizTool } from './tools/QuizTool';
import { TextTool } from './tools/TextTool';
import { VideoTool } from './tools/VideoTool';
import { WatermarkTool } from './tools/WatermarkTool';
import { SafeTool } from './tools/SafeTool';
import { ScanTool } from './tools/ScanTool';
import { SignatureTool } from './tools/SignatureTool';
import { Preview } from './components/Preview';
import { CaptionSettings, GroupSettings, LayoutSettings, TrimSettings } from './components/Settings';
import { navigate, useEvent, useInstall, usePage, useToast } from './hooks';
import { AdSlot, InfoView, ToolGuide, useSeo } from './seo/PageParts';
import type { InfoPage } from './seo/info';
import { pathOf } from './seo/pages';
import { drag } from './lib/drag';
import {
  fileName, filesFromPaste, loadImg, makeSample, NO_IMAGE, PASTE_KEY, readClipboardImages, baseName, takeSharedFiles, makeThumb, setBlockedHandler, blockedMessage, cantOpen,
} from './lib/files';
import { readMeta } from './lib/exif';
import { normaliseFiles } from './lib/heic';
import { computeGroups } from './lib/groups';
import { handoff } from './lib/handoff';
import { dropPdf, isDeck, isPdf, openPdf, pdfPages, type PdfInfo } from './lib/pdf';
import { buildPdf, buildZip, canShareFiles, copyStack, saveBlob, shareFiles, stackFiles, TOO_BIG, zipFiles, type Stack } from './lib/render';
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
  // Files macOS won't let the installed app read get one clear explanation, whichever tool is open
  useEffect(() => setBlockedHandler(names => show(blockedMessage(names), { err: true })), [show]);
  // Samples have no blob: they are never saved and disappear when real images arrive
  const isSample = items.length > 0 && !items[0].blob;

  // Restore last session's images, or show the examples
  useEffect(() => {
    loadItems(loadImg, makeThumb)
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
  // Each stack knows its range and number (for captions) and every image's position (for numbers)
  const stacks = useMemo<Stack[]>(() => {
    const positions = new Map(items.map((it, i) => [it.id, i + 1]));
    return groups.map((g, i) => ({ list: g.list, label: g.label, index: i, total: groups.length, positions }));
  }, [items, groups]);
  const stack = stacks[c];

  // PDFs with more than one page open the page picker; it resolves with the chosen pages or null
  const [picking, setPicking] = useState<{ info: PdfInfo; done: (pages: number[] | null) => void } | null>(null);
  const askPages = (info: PdfInfo) =>
    new Promise<number[] | null>(resolve => setPicking({ info, done: pages => { setPicking(null); resolve(pages); } }));

  const addFiles = useEvent(async (incoming: File[]) => {
    const files = await normaliseFiles(incoming, n => show(`Opening ${n}…`, { keep: true }), n => show(cantOpen(n), { err: true }));
    const queue: { file: File; src?: PdfSrc }[] = [];
    for (const f of files) {
      if (isPdf(f)) {
        try {
          const info = await openPdf(f);
          const pages = info.numPages > 1 ? await askPages(info) : [1];
          if (!pages) { dropPdf(info.id); continue; }
          queue.push(...(await pdfPages(info, pages, (n, t) => show(`Reading ${f.name}: page ${n} of ${t}…`, { keep: true }))));
        } catch {
          show(cantOpen(f.name), { err: true });
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
        const located = !!readMeta(new Uint8Array(await f.slice(0, 512 * 1024).arrayBuffer())).gps;
        added.push({ id: ++seq, name, img, url, blob: f, src, thumb: await makeThumb(img, url), located });
      } catch {
        show(cantOpen(f.name), { err: true });
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
    if (s.fmt === 'pdf') { saveBlob(await buildPdf([stack], s), name); return show('Saved ' + name); }
    const files = await stackFiles(stack, s, name);
    if (files.length === 1) { saveBlob(files[0].blob, name); return show('Saved ' + name); }
    // Carousel slides of one stack arrive together in a ZIP
    const zipName = name.replace(/\.\w+$/, ' slides.zip');
    saveBlob(await zipFiles(files), zipName);
    show(`Saved ${zipName} with ${files.length} slides.`);
  });
  const saveAll = () => run(async () => {
    const n = groups.length, base = baseName(s.fname);
    if (s.fmt === 'pdf') {
      saveBlob(await buildPdf(stacks, s, i => show(`Building page ${i + 1} of ${n}…`, { keep: true })), base + '.pdf');
      return show(`Saved ${base}.pdf with ${n} pages.`);
    }
    const files = stacks.map((st, i) => ({ name: fileName(s.fname, s.fmt, i, labels), stack: st }));
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
      idx.map(i => stacks[i]),
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
      await copyStack(stack, s);
      show('Copied. Paste it into WhatsApp or anywhere else.');
    } catch (e) {
      show(e instanceof Error && e.message === TOO_BIG ? TOO_BIG : 'This browser blocked copying images. Use Download instead.', { err: true });
    }
  });

  // Which tool is open; dropped and pasted files go to that tool
  const page = usePage();
  const route = page.route;
  useSeo(page);
  const intake = useRef<((files: File[]) => void) | null>(null);
  // Images another tool sends to the stacker (e.g. quiz cards) arrive when it opens
  useEffect(() => {
    if (route !== 'stack' || !ready || !handoff.files.length) return;
    const got = handoff.files;
    handoff.files = [];
    addFiles(got);
  }, [route, ready]);
  const take = useEvent((files: File[]) => (route !== 'stack' && intake.current ? intake.current(files) : addFiles(files)));

  // Page-wide: drop files anywhere, paste anywhere, ← / → to step through stacks
  const onPaste = useEvent((e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    const files = filesFromPaste(e.clipboardData, isPdf);
    if (files.length) { e.preventDefault(); take(files); }
    else if (!(e.target as HTMLElement).closest?.('input,textarea')) show(NO_IMAGE, { err: true });
  });
  const onKey = useEvent((e: KeyboardEvent) => {
    if (route !== 'stack' || !multi || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest?.('input,select,textarea')) return;
    if (e.key === 'ArrowLeft' && c > 0) setCur(c - 1);
    else if (e.key === 'ArrowRight' && c < groups.length - 1) setCur(c + 1);
  });
  useEffect(() => {
    const over = (e: DragEvent) => { if (drag.id == null && e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (drag.id == null && e.dataTransfer?.files.length) { e.preventDefault(); take([...e.dataTransfer.files]); }
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
  }, [take, onPaste, onKey]);

  // Header and footer navigation: each link takes you to its tool and briefly highlights it
  const fileInput = useRef<HTMLInputElement>(null);
  // The guide opens by itself on a first visit (not when files were shared into the app)
  const [help, setHelp] = useState(() => {
    try { const direct = !document.referrer || new URL(document.referrer).origin === location.origin;
    return route === 'stack' && direct && !localStorage.getItem('stacker-guide-seen') && !location.search.includes('shared'); } catch { return false; }
  });
  const closeHelp = () => {
    setHelp(false);
    try { localStorage.setItem('stacker-guide-seen', '1'); } catch { /* private mode */ }
  };
  const [redacting, setRedacting] = useState<Item | null>(null);
  const { showInstall, canPrompt, installed, platform, install } = useInstall();
  const [installHelp, setInstallHelp] = useState(false);
  // Section links work from any tool: they open the stacker first
  const toStacker = (then: () => void) => { navigate('/'); setTimeout(then, 80); };
  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) { if (route !== 'stack') toStacker(() => goTo(id)); return; }
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el.classList.remove('spot');
    void el.offsetWidth; // restart the highlight animation
    el.classList.add('spot');
  };
  const nav: NavItem[] = [
    { key: 'add', label: 'Add images', hint: 'Drop, choose or paste images', run: () => goTo('add') },
    {
      key: 'pdf', label: 'PDF pages', hint: 'Import chosen pages from a PDF',
      run: () => {
        const el = fileInput.current;
        if (!el) { if (route !== 'stack') toStacker(() => nav[1].run()); return; }
        goTo('add');
        el.accept = 'application/pdf,.pdf';
        el.click();
        setTimeout(() => { el.accept = 'image/*,application/pdf,.pdf'; }, 1000);
      },
    },
    { key: 'groups', label: 'Groups', hint: 'Split into several stacks', run: () => goTo('groups') },
    { key: 'layout', label: 'Layout', hint: 'Top to bottom, side by side or a grid; join screenshots', run: () => goTo('layout') },
    { key: 'trim', label: 'Trim', hint: 'Cut the edges of every image', run: () => goTo('trim') },
    { key: 'captions', label: 'Captions', hint: 'Caption, image numbers and watermark', run: () => goTo('captions') },
    {
      key: 'blur', label: 'Blur', hint: 'Hide private details on an image',
      run: () => {
        if (isSample || !items.length) { goTo('add'); show('Add an image first, then use ◩ on its row to blur or hide parts.'); return; }
        setRedacting(list[0] ?? items[0]);
      },
    },
    {
      key: 'carousel', label: 'Carousel', hint: 'Cut stacks into Instagram slides',
      run: () => { update({ slice: s.slice === 'off' ? 'portrait' : s.slice }); goTo('export'); show('Carousel slicing is on: each stack is cut into 1080 × 1350 slides.'); },
    },
    {
      key: 'whatsapp', label: 'WhatsApp', hint: 'Keep stacks sharp after sending on WhatsApp',
      run: () => { update({ quality: 'whatsapp' }); goTo('export'); show('WhatsApp quality is on. Each stack now fits WhatsApp HD.'); },
    },
    { key: 'export', label: canShareFiles ? 'Share' : 'Download', hint: 'Share, download or copy your stacks', run: () => goTo('export') },
  ];
  const T = (key: string, label: string, hint: string, group: ToolLink['group']): ToolLink =>
    ({ key, label, hint, group, href: pathOf(key as Exclude<typeof route, 'info'>), active: route === key });
  const tools: ToolLink[] = [
    T('stack', 'Stacker', 'Stack images and PDF slides into tall images, grids or carousels', 'Share'),
    T('cards', 'Cards', 'Verse, quote and announcement cards, Urdu and Arabic ready', 'Share'),
    T('quiz', 'Quiz cards', 'Numbered question cards with the answers last', 'Share'),
    T('qr', 'QR codes', 'WhatsApp, WiFi and contact codes as posters, never expire', 'Share'),
    T('watermark', 'Watermark', 'Your logo or name on many photos at once', 'Share'),
    T('video', 'Video', 'Before/after reveal or slideshow as an MP4 for WhatsApp', 'Share'),
    T('fit', 'Fit to size', 'Exact KB and pixels for exam, bank and visa forms', 'Forms and documents'),
    T('scan', 'Scan', 'Phone photos of paper into a clean PDF under a size limit', 'Forms and documents'),
    T('photo', 'Passport photo', 'Frame to country rules, digital file and print sheet', 'Forms and documents'),
    T('signature', 'Signature', 'Clean signature on white or transparent', 'Forms and documents'),
    T('text', 'Copy text', 'Get the text out of photos and screenshots', 'Forms and documents'),
    T('cutout', 'Remove background', 'People and products on white, colour or transparent', 'Photos'),
    T('safe', 'Safe to share', 'See and remove hidden location and phone details', 'Photos'),
    T('convert', 'Convert', 'HEIC, WebP and AVIF to JPG or PNG', 'Photos'),
  ];
  // The button stays visible in the browser: it opens the install prompt, or the steps for this browser
  const onInstall = showInstall
    ? async () => { if ((await install()) === 'steps') setInstallHelp(true); }
    : undefined;

  const n = list.length;
  return (
    <>
    <SiteHeader tools={tools} sections={nav} showSections={route === 'stack'} onInstall={onInstall} installLabel={installed && !canPrompt ? 'Installed' : 'Install app'} onHelp={() => setHelp(true)} />
    {picking && <PagePicker info={picking.info} onDone={picking.done} />}
    {help && <Help onClose={closeHelp} />}
    {installHelp && <InstallHelp platform={platform} installed={installed} onClose={() => setInstallHelp(false)} />}
    {redacting && (
      <RedactEditor
        item={redacting}
        onCancel={() => setRedacting(null)}
        onSave={list => {
          const id = redacting.id;
          setItems(prev => prev.map(it => (it.id === id ? { ...it, redact: list.length ? list : undefined } : it)));
          setRedacting(null);
          show(list.length ? `Hid ${list.length} area${list.length > 1 ? 's' : ''} on ${redacting.name}.` : `Nothing hidden on ${redacting.name}.`);
        }}
      />
    )}
    {route === 'info' ? <InfoView page={page as InfoPage} />
      : route === 'fit' ? <FitTool key={page.path} maxKB={page.maxKB} intakeRef={intake} toast={toast} show={show} />
      : route === 'signature' ? <SignatureTool intakeRef={intake} toast={toast} show={show} />
      : route === 'safe' ? <SafeTool intakeRef={intake} toast={toast} show={show} />
      : route === 'convert' ? <ConvertTool intakeRef={intake} toast={toast} show={show} />
      : route === 'cards' ? <CardsTool toast={toast} show={show} />
      : route === 'scan' ? <ScanTool intakeRef={intake} toast={toast} show={show} />
      : route === 'photo' ? <PhotoTool intakeRef={intake} toast={toast} show={show} />
      : route === 'qr' ? <QrTool toast={toast} show={show} />
      : route === 'text' ? <TextTool intakeRef={intake} toast={toast} show={show} />
      : route === 'watermark' ? <WatermarkTool intakeRef={intake} toast={toast} show={show} />
      : route === 'cutout' ? <CutoutTool intakeRef={intake} toast={toast} show={show} />
      : route === 'video' ? <VideoTool intakeRef={intake} toast={toast} show={show} />
      : route === 'quiz' ? <QuizTool toast={toast} show={show} /> : (
    <main className="wrap">
      <div className="tool-head">
        <h1>{page.h1}</h1>
        <p>Stack images or PDF slides into tall images, split them into groups, and share them. Images stay in your browser.</p>
      </div>

      <div className="grid">
        <section className="panel" aria-label="Images and settings">
          <DropZone flash={flash} onFiles={addFiles} onPasteClick={pasteClick} inputRef={fileInput} />

          {items.length > 0 && (
            <div className="section" id="order">
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
              {items.some(it => it.located) && (
                <div className="sample">
                  {(n => (n === 1 ? '1 photo here has its' : `${n} photos here have their`))(items.filter(it => it.located).length)} location saved. Your stacked images never include it.{' '}
                  <a href={pathOf('safe')}>Clean the originals</a>
                </div>
              )}
              {isSample && <div className="sample">These two are examples. They disappear when you add your own images.</div>}
              <ImageList
                items={items}
                tags={tags}
                current={current}
                onMove={move}
                onRemove={it => removeItems(new Set([it.id]), `Removed ${it.name}.`)}
                onJump={setCur}
                onRedact={setRedacting}
              />
            </div>
          )}

          <LayoutSettings s={s} update={update} />
          <TrimSettings s={s} update={update} />
          <CaptionSettings s={s} update={update} />
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
          meta={stack}
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
    </main>
    )}
    {route !== 'info' && <AdSlot key={`ad:${page.path}`} id={page.path} />}
    <ToolGuide page={page} />
    <SiteFooter tools={tools} sections={nav} showSections={route === 'stack'} onInstall={onInstall} installLabel={installed && !canPrompt ? 'Installed' : 'Install app'} onHelp={() => setHelp(true)} />
    </>
  );
}
