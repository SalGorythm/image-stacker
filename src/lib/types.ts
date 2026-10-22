/** A page of an imported PDF, kept so HD exports can re-render it sharply. */
export interface PdfSrc {
  doc: string;
  page: number;
}

export interface Item {
  id: number;
  name: string;
  /** Object URL (or data URL for samples) used for thumbnails. */
  url: string;
  /** Decoded image used for the preview and for non-PDF exports. */
  img: HTMLImageElement | HTMLCanvasElement;
  /** Original bytes, persisted to IndexedDB. Samples have none. */
  blob?: Blob;
  src?: PdfSrc;
}

export type WidthMode = 'widest' | 'narrowest' | 'original';
export type GroupMode = 'all' | 'every' | 'ranges';
export type Tail = 'rest' | 'repeat';
export type Format = 'png' | 'jpg' | 'pdf';
export type Quality = 'hd' | '4k' | 'std';

export interface Settings {
  gap: number;
  gapColor: string;
  width: WidthMode;
  fmt: Format;
  quality: Quality;
  gmode: GroupMode;
  /** Raw text of each "Every N" box, so a box can be empty while typing. */
  sizes: string[];
  gtail: Tail;
  granges: string;
  fname: string;
}

export const DEFAULT_SETTINGS: Settings = {
  gap: 18,
  gapColor: '#ffffff',
  width: 'widest',
  fmt: 'png',
  quality: 'hd',
  gmode: 'all',
  sizes: ['4'],
  gtail: 'rest',
  granges: '',
  fname: 'stacked',
};

/** Target width for PDF pages at each quality (0 = as stored). */
export const QUALITY_WIDTH: Record<Quality, number> = { std: 0, hd: 2560, '4k': 3840 };

export const imgW = (it: Pick<Item, 'img'>) =>
  it.img instanceof HTMLImageElement ? it.img.naturalWidth : it.img.width;
export const imgH = (it: Pick<Item, 'img'>) =>
  it.img instanceof HTMLImageElement ? it.img.naturalHeight : it.img.height;
