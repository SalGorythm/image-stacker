// Copies on-device engines into public/ so the app serves them itself (no CDN, cacheable offline):
// text recognition (Tesseract.js, Apache-2.0, language data MIT) → public/ocr, and
// ONNX Runtime Web (MIT, used for background removal) → public/ort.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => join(root, 'node_modules', p);
const out = join(root, 'public', 'ocr');
mkdirSync(out, { recursive: true });

const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ...['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm'].map(n => [`tesseract.js-core/${n}.wasm.js`, `${n}.wasm.js`]),
  ...['eng', 'ara', 'urd', 'hin'].map(l => [`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`, `${l}.traineddata.gz`]),
];
for (const [from, to] of files) copyFileSync(nm(from), join(out, to));

const ort = join(root, 'public', 'ort');
mkdirSync(ort, { recursive: true });
for (const f of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) copyFileSync(nm(`onnxruntime-web/dist/${f}`), join(ort, f));
console.log(`copy-runtimes: ${files.length} files → public/ocr, 2 → public/ort`);
