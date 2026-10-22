import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfSrc } from './types';

/** Imported PDFs: id → original file. Pages reference these so HD exports can re-render them. */
export const docs = new Map<string, { name: string; blob: Blob }>();

/** Width PDF pages are stored at for the list and preview. */
export const PREVIEW_W = 1600;

// pdf.js is only downloaded when a PDF first arrives
let libP: Promise<typeof import('pdfjs-dist')> | null = null;
function pdfjs() {
  return (libP ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
    .then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })
    .catch(e => { libP = null; throw e; }));
}

const docCache = new Map<string, Promise<PDFDocumentProxy>>();
function openDoc(id: string) {
  let p = docCache.get(id);
  if (!p) {
    p = (async () => {
      const lib = await pdfjs();
      const d = docs.get(id);
      if (!d) throw new Error('PDF source missing');
      return lib.getDocument({ data: new Uint8Array(await d.blob.arrayBuffer()) }).promise;
    })();
    p.catch(() => docCache.delete(id));
    docCache.set(id, p);
  }
  return p;
}

export async function renderPage(src: PdfSrc, width: number): Promise<HTMLCanvasElement> {
  const doc = await openDoc(src.doc);
  const page = await doc.getPage(src.page);
  const vp = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
  const c = document.createElement('canvas');
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  await page.render({ canvas: c, viewport: vp, background: '#ffffff' }).promise;
  page.cleanup();
  return c;
}

export const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
export const isDeck = (f: File) => /\.(pptx?|key|odp)$/i.test(f.name);

export interface PdfInfo {
  id: string;
  name: string;
  numPages: number;
}

/** Opens a PDF and registers it, without rendering anything yet. */
export async function openPdf(f: File): Promise<PdfInfo> {
  const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  docs.set(id, { name: f.name, blob: f });
  try {
    const doc = await openDoc(id);
    return { id, name: f.name, numPages: doc.numPages };
  } catch (e) {
    docs.delete(id);
    throw e;
  }
}

/** Forgets a PDF that was opened but not imported. */
export function dropPdf(id: string) {
  docCache.get(id)?.then(d => d.loadingTask.destroy()).catch(() => {});
  docCache.delete(id);
  docs.delete(id);
}

/** A small JPEG of one page for the page picker. */
export async function thumbnail(id: string, page: number, width = 200) {
  const c = await renderPage({ doc: id, page }, width);
  const url = c.toDataURL('image/jpeg', 0.8);
  c.width = c.height = 0;
  return url;
}

/** Turns the chosen pages into PNG files at preview size, each keeping a link back to the PDF. */
export async function pdfPages(info: PdfInfo, pages: number[], progress: (i: number, total: number) => void) {
  const base = info.name.replace(/\.pdf$/i, '');
  const pad = String(info.numPages).length;
  const out: { file: File; src: PdfSrc }[] = [];
  for (let i = 0; i < pages.length; i++) {
    const n = pages[i];
    progress(i + 1, pages.length);
    const c = await renderPage({ doc: info.id, page: n }, PREVIEW_W);
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'));
    c.width = c.height = 0;
    if (!blob) continue;
    out.push({
      file: new File([blob], `${base} - ${String(n).padStart(pad, '0')}.png`, { type: 'image/png' }),
      src: { doc: info.id, page: n },
    });
  }
  return out;
}
