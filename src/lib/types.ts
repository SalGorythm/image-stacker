import type { Redaction } from './redact';

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
  /** Areas hidden with blur, pixelate or a solid box. */
  redact?: Redaction[];
}

export type WidthMode = 'widest' | 'narrowest' | 'original';
export type GroupMode = 'all' | 'every' | 'ranges';
export type Tail = 'rest' | 'repeat';
export type Format = 'png' | 'jpg' | 'pdf';
export type Quality = 'hd' | '4k' | 'std' | 'whatsapp';

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
  /** Percent trimmed from each edge of every image. */
  trim: { t: number; b: number; l: number; r: number };
  /** Also remove plain margins detected on each image. */
  autoTrim: boolean;
  /** Caption text with placeholders like {range}; empty means no caption. */
  caption: string;
  captionPos: 'top' | 'bottom';
  /** Badge each image with its position in the list. */
  numbers: boolean;
  watermark: string;
  /** Join consecutive scrolling screenshots, removing what repeats. */
  joinOverlap: boolean;
  arrange: 'vertical' | 'horizontal' | 'grid';
  columns: number;
  /** Cut each stack into Instagram carousel slides. */
  slice: 'off' | 'portrait' | 'square';
  /** Cut between images rather than through them. */
  sliceWhole: boolean;
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
  trim: { t: 0, b: 0, l: 0, r: 0 },
  autoTrim: false,
  caption: '',
  captionPos: 'top',
  numbers: false,
  watermark: '',
  joinOverlap: false,
  arrange: 'vertical',
  columns: 2,
  slice: 'off',
  sliceWhole: true,
};

/** Target width for PDF pages at each quality (0 = as stored). */
export const QUALITY_WIDTH: Record<Quality, number> = { std: 0, hd: 2560, '4k': 3840, whatsapp: 2692 };

/** WhatsApp's HD photo limit: anything bigger is scaled down on send, which blurs tall stacks. */
export const WHATSAPP_BOX = { long: 4096, short: 2692 };

export const imgW = (it: Pick<Item, 'img'>) =>
  it.img instanceof HTMLImageElement ? it.img.naturalWidth : it.img.width;
export const imgH = (it: Pick<Item, 'img'>) =>
  it.img instanceof HTMLImageElement ? it.img.naturalHeight : it.img.height;
