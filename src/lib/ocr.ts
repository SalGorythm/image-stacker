import type { Worker } from 'tesseract.js';

/** Languages the app ships data for. Urdu (Nastaliq) is weak with this engine; the tool says so. */
export type OcrLang = 'eng' | 'ara' | 'urd' | 'hin';

export interface OcrWord { text: string; confidence: number; box: { x: number; y: number; w: number; h: number }; line: number }
export interface OcrResult { text: string; words: OcrWord[]; confidence: number }

const workers = new Map<string, Promise<Worker>>();

/**
 * A text-recognition worker for these languages, created once. Engine and language data come from
 * this site (/ocr), never a CDN, so it also works offline once loaded.
 */
function worker(langs: OcrLang[], progress?: (p: number) => void) {
  const key = langs.slice().sort().join('+');
  let w = workers.get(key);
  if (!w) {
    w = import('tesseract.js').then(({ createWorker }) =>
      createWorker(langs, 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/',
        langPath: '/ocr',
        gzip: true,
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: m => { if (m.status === 'recognizing text') progress?.(m.progress); },
      }));
    w.catch(() => workers.delete(key));
    workers.set(key, w);
  }
  return w;
}

/** Reads the text in an image, with each word's box (in the image's pixels) for redaction. */
export async function readText(image: HTMLCanvasElement | HTMLImageElement, langs: OcrLang[] = ['eng'], progress?: (p: number) => void): Promise<OcrResult> {
  const w = await worker(langs, progress);
  // The reader does best on large text with a margin: enlarge small images and add a white border
  const W = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const H = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const k = Math.min(3, Math.max(1, 2000 / Math.max(W, H))), pad = Math.round(40 * k);
  const c = document.createElement('canvas');
  c.width = Math.round(W * k) + 2 * pad; c.height = Math.round(H * k) + 2 * pad;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingQuality = 'high';
  x.drawImage(image, pad, pad, W * k, H * k);
  const { data } = await w.recognize(c, {}, { text: true, blocks: true });
  c.width = c.height = 0;
  // Word boxes back in the original image's pixels
  const back = (b: { x0: number; y0: number; x1: number; y1: number }) => ({ x: (b.x0 - pad) / k, y: (b.y0 - pad) / k, w: (b.x1 - b.x0) / k, h: (b.y1 - b.y0) / k });
  const words: OcrWord[] = [];
  let line = 0;
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs)
      for (const l of p.lines) {
        for (const wd of l.words)
          words.push({ text: wd.text, confidence: wd.confidence, line, box: back(wd.bbox) });
        line++;
      }
  return { text: data.text, words, confidence: data.confidence };
}
