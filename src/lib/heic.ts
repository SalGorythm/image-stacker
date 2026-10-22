import { loadImg } from './files';

export const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

/** Images by type, or by extension when the system gives no type (Windows often does that for HEIC). */
export const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(heic|heif|avif|webp|jpe?g|png|gif|bmp)$/i.test(f.name);

const toJpeg = async (c: HTMLCanvasElement, name: string) => {
  const b = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.95));
  if (!b) throw new Error('encode');
  return new File([b], name.replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' });
};

/**
 * Turns an iPhone HEIC photo into a JPG the rest of the app (and every portal) can use.
 * Safari opens HEIC itself; elsewhere the libheif decoder (LGPL-3.0, loaded only now) does it.
 * The JPG carries no hidden data, so location and camera details are dropped too.
 */
export async function heicToJpeg(f: File): Promise<File> {
  const url = URL.createObjectURL(f);
  try {
    const img = await loadImg(url);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    return await toJpeg(c, f.name);
  } catch { /* this browser can't open HEIC: decode it ourselves */ }
  finally { URL.revokeObjectURL(url); }

  const { default: factory } = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
  const libheif = factory();
  const images = new libheif.HeifDecoder().decode(new Uint8Array(await f.arrayBuffer()));
  if (!images.length) throw new Error('Not a readable HEIC file');
  const image = images[0];
  const w = image.get_width(), h = image.get_height();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  const data = x.createImageData(w, h);
  await new Promise<void>((res, rej) => image.display(data, (d: ImageData | null) => (d ? res() : rej(new Error('HEIC decoding failed')))));
  x.putImageData(data, 0, 0);
  for (const im of images) im.free?.();
  return toJpeg(c, f.name);
}

/**
 * Prepares dropped or chosen files for any tool: HEIC becomes JPG (others pass through).
 * `progress` reports each HEIC being opened, since big iPhone photos take a moment.
 */
export async function normaliseFiles(files: File[], progress?: (name: string) => void, failed?: (name: string) => void) {
  const out: File[] = [];
  for (const f of files) {
    if (!isHeic(f)) { out.push(f); continue; }
    progress?.(f.name);
    try { out.push(await heicToJpeg(f)); } catch { failed?.(f.name); }
  }
  return out;
}
