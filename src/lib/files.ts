import type { Format } from './types';

export const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const PASTE_KEY = isMac ? '⌘V' : 'Ctrl+V';
export const NO_IMAGE = 'No image on the clipboard. Copy an image or take a screenshot first.';

/** Images (and PDFs) from a paste event: Finder/Explorer file copies first, then raw image data. */
export function filesFromPaste(dt: DataTransfer, isPdf: (f: File) => boolean): File[] {
  let files = [...dt.files].filter(f => f.type.startsWith('image/') || isPdf(f));
  if (!files.length)
    files = [...dt.items]
      .filter(i => i.kind === 'file' && i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter((f): f is File => !!f);
  return files;
}

/** Reads images via the async Clipboard API (the Paste button). Throws if access is blocked. */
export async function readClipboardImages(): Promise<File[]> {
  const files: File[] = [];
  for (const ci of await navigator.clipboard.read()) {
    const t = ci.types.find(t => t.startsWith('image/'));
    if (t) files.push(new File([await ci.getType(t)], '', { type: t }));
  }
  return files;
}

export function baseName(fname: string) {
  return fname.trim().replace(/\.(png|jpe?g|zip|pdf)$/i, '') || 'stacked';
}
export const extOf = (f: Format) => (f === 'jpg' ? 'jpg' : f === 'pdf' ? 'pdf' : 'png');

/** "stacked.png" for a single stack, "stacked-02 (5-8).png" when there are several. */
export function fileName(fname: string, fmt: Format, i: number, labels: string[]) {
  if (labels.length < 2) return `${baseName(fname)}.${extOf(fmt)}`;
  return `${baseName(fname)}-${String(i + 1).padStart(String(labels.length).length, '0')} (${labels[i]}).${extOf(fmt)}`;
}

export function makeSample(n: number) {
  const c = document.createElement('canvas');
  c.width = 1232;
  c.height = 693;
  const x = c.getContext('2d')!;
  x.fillStyle = '#e9d3a8'; x.fillRect(0, 0, 1232, 693);
  x.fillStyle = '#fafafa'; x.fillRect(50, 50, 1132, 590);
  x.strokeStyle = '#7a9a3a'; x.lineWidth = 2; x.strokeRect(62, 62, 1108, 566);
  x.textAlign = 'center';
  x.fillStyle = '#b22222'; x.font = 'bold 30px sans-serif'; x.fillText('EXAMPLE SLIDE', 616, 140);
  x.fillStyle = '#222'; x.font = 'bold 64px Georgia,serif'; x.fillText('Question ' + n, 616, 330);
  x.fillStyle = '#666'; x.font = '28px sans-serif'; x.fillText('Replace with your own images', 616, 400);
  return c;
}
