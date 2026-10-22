import type { InferenceSession } from 'onnxruntime-web';

/** The model sees a 320 × 320 copy (U²-Net-p, Apache-2.0, 4.6 MB). */
const SIZE = 320;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

/**
 * Turns the model's raw output into a 0–1 mask: stretched to its full range, then sharpened around
 * the middle so the subject is solid and the background clear, with soft edges kept. `edge`
 * (−1…1) moves the cut: higher keeps more of the subject, lower trims more away.
 */
export function shapeMask(raw: Float32Array, edge = 0): Float32Array {
  let lo = Infinity, hi = -Infinity;
  for (const v of raw) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1, mid = 0.5 - edge * 0.3, k = 6;
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = (raw[i] - lo) / span;
    out[i] = 1 / (1 + Math.exp(-k * 2 * (v - mid)));
  }
  return out;
}

let sessionP: Promise<InferenceSession> | null = null;
function session() {
  return (sessionP ??= (async () => {
    const ort = await import('onnxruntime-web/wasm');
    // Engine files come from this site (/ort), never a CDN
    ort.env.wasm.wasmPaths = '/ort/';
    ort.env.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    return ort.InferenceSession.create('/models/u2netp.onnx', { executionProviders: ['wasm'] });
  })().catch(e => { sessionP = null; throw e; }));
}

/** The subject mask for an image, at the model's 320 × 320 size (raw scores). */
export async function subjectMask(img: HTMLImageElement | HTMLCanvasElement): Promise<Float32Array> {
  const s = await session();
  const ort = await import('onnxruntime-web/wasm');
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0, SIZE, SIZE);
  const px = x.getImageData(0, 0, SIZE, SIZE).data;
  let max = 1;
  for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2]);
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++)
    for (let ch = 0; ch < 3; ch++) input[ch * SIZE * SIZE + i] = (px[i * 4 + ch] / max - MEAN[ch]) / STD[ch];
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
  return out[s.outputNames[0]].data as Float32Array;
}

export type Backdrop = { kind: 'transparent' } | { kind: 'colour'; colour: string };

/**
 * The cut-out at full size: the mask is scaled up smoothly and becomes the image's transparency,
 * optionally over a solid colour (white for ID photos and product shots).
 */
export function composite(img: HTMLImageElement | HTMLCanvasElement, mask: Float32Array, back: Backdrop) {
  const W = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const H = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const m = document.createElement('canvas');
  m.width = SIZE; m.height = SIZE;
  const mx = m.getContext('2d')!;
  const md = mx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) md.data.set([0, 0, 0, Math.round(mask[i] * 255)], i * 4);
  mx.putImageData(md, 0, 0);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.imageSmoothingQuality = 'high';
  x.drawImage(m, 0, 0, W, H);
  x.globalCompositeOperation = 'source-in';
  x.drawImage(img, 0, 0);
  if (back.kind === 'colour') {
    x.globalCompositeOperation = 'destination-over';
    x.fillStyle = back.colour;
    x.fillRect(0, 0, W, H);
  }
  x.globalCompositeOperation = 'source-over';
  return c;
}
