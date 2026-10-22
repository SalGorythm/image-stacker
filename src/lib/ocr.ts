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
  const { data } = await w.recognize(image, {}, { text: true, blocks: true });
  const words: OcrWord[] = [];
  let line = 0;
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs)
      for (const l of p.lines) {
        for (const wd of l.words)
          words.push({ text: wd.text, confidence: wd.confidence, line, box: { x: wd.bbox.x0, y: wd.bbox.y0, w: wd.bbox.x1 - wd.bbox.x0, h: wd.bbox.y1 - wd.bbox.y0 } });
        line++;
      }
  return { text: data.text, words, confidence: data.confidence };
}
