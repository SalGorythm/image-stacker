/**
 * ID and passport photo rules. Heights are fractions of the photo's height, measured from the top.
 * Sources disagree and rules change, so every spec names where it came from and when.
 */
export interface IdSpec {
  id: string;
  label: string;
  /** Digital size in pixels. */
  px: { w: number; h: number };
  /** Printed size in mm, for the print sheet. */
  mm: { w: number; h: number };
  /** Head height, chin to crown, as a fraction of the photo height: [min, max]. */
  head: [number, number];
  /** Where the top of the head should sit, from the top. */
  crown: number;
  kb?: { min?: number; max?: number };
  background: string;
  source: { label: string; url: string };
  checked: string;
}

export const ID_SPECS: IdSpec[] = [
  {
    id: 'us', label: 'US passport (2 × 2 in)', px: { w: 600, h: 600 }, mm: { w: 50.8, h: 50.8 },
    head: [0.5, 0.69], crown: 0.1, kb: { min: 54, max: 10240 }, background: 'White or off-white',
    source: { label: 'photogov, US passport photo requirements', url: 'https://photogov.net/knowledge/requirements/us-passport-photo-requirements/' }, checked: 'Oct 2026',
  },
  {
    id: 'us-visa', label: 'US visa / DV lottery (2 × 2 in, ≤240 KB)', px: { w: 600, h: 600 }, mm: { w: 50.8, h: 50.8 },
    head: [0.5, 0.69], crown: 0.1, kb: { max: 240 }, background: 'White or off-white',
    source: { label: 'travel.state.gov digital image requirements', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html' }, checked: 'Oct 2026',
  },
  {
    id: 'uk', label: 'UK passport (digital)', px: { w: 600, h: 750 }, mm: { w: 35, h: 45 },
    head: [0.64, 0.76], crown: 0.1, kb: { min: 50, max: 10240 }, background: 'Plain and light-coloured',
    source: { label: 'GOV.UK, photos for passports', url: 'https://www.gov.uk/photos-for-passports' }, checked: 'Oct 2026',
  },
  {
    id: 'in', label: 'India passport (35 × 45 mm)', px: { w: 630, h: 810 }, mm: { w: 35, h: 45 },
    head: [0.7, 0.8], crown: 0.08, kb: { min: 10, max: 250 }, background: 'White',
    source: { label: 'Indian Embassy Doha notice, Nov 2025 (PDF)', url: 'https://audit.indianembassyqatar.gov.in/users/assets/pdf/whatsnew/Doha_30nov2025_1.pdf' }, checked: 'Oct 2026',
  },
  {
    id: 'pk', label: 'Pakistan passport (35 × 45 mm)', px: { w: 413, h: 531 }, mm: { w: 35, h: 45 },
    head: [0.64, 0.76], crown: 0.1, background: 'White',
    source: { label: 'Wego, Pakistan passport photo size', url: 'https://blog.wego.com/pakistan-passport-photo-size/' }, checked: 'Oct 2026',
  },
  {
    id: 'pk-cnic', label: 'Pakistan CNIC / NICOP', px: { w: 350, h: 467 }, mm: { w: 35, h: 45 },
    head: [0.64, 0.76], crown: 0.1, background: 'White',
    source: { label: 'visafoto, CNIC 350 × 467 px', url: 'https://visafoto.com/pk-cnic-350x467-px-photo' }, checked: 'Oct 2026',
  },
];

/** How the photo sits in the frame: output pixels per source pixel, the source point at the centre, and a tilt. */
export interface View { zoom: number; cx: number; cy: number; rot: number }

export const headMid = (s: IdSpec) => (s.head[0] + s.head[1]) / 2;

/** Guide lines in output pixels: where the crown and chin go, and the allowed chin band. */
export function guides(s: IdSpec) {
  const H = s.px.h;
  return {
    crown: s.crown * H,
    chin: (s.crown + headMid(s)) * H,
    chinMin: (s.crown + s.head[0]) * H,
    chinMax: (s.crown + s.head[1]) * H,
  };
}

/** Fills the frame with the photo, centred (the starting point before adjusting). */
export function coverView(srcW: number, srcH: number, s: IdSpec): View {
  return { zoom: Math.max(s.px.w / srcW, s.px.h / srcH), cx: srcW / 2, cy: srcH / 2, rot: 0 };
}

/**
 * Places a detected face to the spec. Face detectors box roughly brows to chin; the crown is
 * estimated at 45% of the box height above it, so the whole head is about 1.45 box heights.
 */
export function placeFace(face: { x: number; y: number; width: number; height: number }, s: IdSpec): View {
  const head = face.height * 1.45;
  const zoom = (headMid(s) * s.px.h) / head;
  const crownSrc = face.y + face.height - head;
  return { zoom, cx: face.x + face.width / 2, cy: crownSrc - (s.crown * s.px.h - s.px.h / 2) / zoom, rot: 0 };
}

/**
 * Is the background plain and light? Looks only where nothing but background belongs: above the
 * crown line, and the outer edges beside the head. Checks brightness, evenness and colour.
 */
export function backgroundCheck(px: Uint8ClampedArray, w: number, h: number, crown = 0.1) {
  let n = 0, sum = 0, sum2 = 0, sat = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const band = y < h * crown * 0.85 || ((x < w * 0.06 || x > w * 0.94) && y < h * (crown + 0.3));
      if (!band) continue;
      const i = (y * w + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      sum += l; sum2 += l * l; sat += mx ? (mx - mn) / mx : 0; n++;
    }
  const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean)), saturation = sat / n;
  const issues: string[] = [];
  if (mean < 185) issues.push('too dark');
  if (std > 28) issues.push('not plain, or the head is above the top line');
  if (saturation > 0.18) issues.push('coloured');
  return { ok: !issues.length, issues, mean: Math.round(mean) };
}

/**
 * Copies of the photo on a 6 × 4 inch print (300 dpi), as many as fit, centred. A 3 mm gap makes
 * cutting easy; when butting the photos together fits more copies (2 × 2 in: 6 instead of 2), that wins.
 */
export function printSheet(s: IdSpec, dpi = 300) {
  const sheet = { w: 6 * dpi, h: 4 * dpi };
  const pw = Math.round((s.mm.w / 25.4) * dpi), ph = Math.round((s.mm.h / 25.4) * dpi);
  const layout = (gap: number) => {
    const cols = Math.max(1, Math.floor((sheet.w + gap) / (pw + gap))), rows = Math.max(1, Math.floor((sheet.h + gap) / (ph + gap)));
    const x0 = Math.round((sheet.w - (cols * pw + (cols - 1) * gap)) / 2), y0 = Math.round((sheet.h - (rows * ph + (rows - 1) * gap)) / 2);
    const slots: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ x: x0 + c * (pw + gap), y: y0 + r * (ph + gap) });
    return slots;
  };
  const spaced = layout(Math.round((3 / 25.4) * dpi)), tight = layout(0);
  return { sheet, photo: { w: pw, h: ph }, slots: tight.length > spaced.length ? tight : spaced };
}
