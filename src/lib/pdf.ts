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

/** Turns each page into a PNG file at preview size, keeping a link back to the PDF. */
export async function pdfPages(f: File, progress: (n: number, total: number) => void) {
  const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  docs.set(id, { name: f.name, blob: f });
  let doc: PDFDocumentProxy;
  try {
    doc = await openDoc(id);
  } catch (e) {
    docs.delete(id);
    throw e;
  }
  const base = f.name.replace(/\.pdf$/i, '');
  const pad = String(doc.numPages).length;
  const out: { file: File; src: PdfSrc }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    progress(n, doc.numPages);
    const c = await renderPage({ doc: id, page: n }, PREVIEW_W);
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'));
    c.width = c.height = 0;
    if (!blob) continue;
    out.push({
      file: new File([blob], `${base} - ${String(n).padStart(pad, '0')}.png`, { type: 'image/png' }),
      src: { doc: id, page: n },
    });
  }
  return out;
}
