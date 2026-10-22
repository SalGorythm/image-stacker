// Copies the on-device text recognition engine (Tesseract.js, Apache-2.0) and language data (MIT)
// into public/ocr so the app serves them itself: no CDN, and they can be cached for offline use.
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
console.log(`copy-ocr: ${files.length} files → public/ocr`);
