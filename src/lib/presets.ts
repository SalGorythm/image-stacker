import type { FitSpec } from './fit';

/**
 * Portal upload rules. Specs change between exam cycles and sources disagree, so each preset
 * names where it came from and when it was checked, and every value stays editable.
 */
export interface Preset {
  id: string;
  label: string;
  spec: Partial<FitSpec>;
  note: string;
  source: { label: string; url: string };
  checked: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'ssc-sign',
    label: 'SSC signature (CGL 2026)',
    spec: { minKB: 10, maxKB: 20, width: undefined, height: undefined },
    note: 'JPEG, 10–20 KB, about 4.0 × 2.0 cm. The SSC photo is now taken live in the form, so there is no photo preset.',
    source: { label: 'Physics Wallah, SSC CGL 2026', url: 'https://www.pw.live/ssc/exams/ssc-cgl-photo-and-signature-size-2026' },
    checked: 'Oct 2026',
  },
  {
    id: 'bank-photo',
    label: 'Bank exams photo (IBPS-style)',
    spec: { minKB: 20, maxKB: 50, width: 200, height: 230, shape: 'cover' },
    note: 'Photo 200 × 230 px, 20–50 KB, the common pattern in bank recruitment notices. Check your notice.',
    source: { label: 'PracticeMock, IBPS RRB 2025', url: 'https://www.practicemock.com/blog/ibps-rrb-photo-and-signature-size-2025/amp/?p=171870' },
    checked: 'Oct 2026',
  },
  {
    id: 'bank-sign',
    label: 'Bank exams signature (IBPS-style)',
    spec: { minKB: 10, maxKB: 20, width: 140, height: 60, shape: 'contain' },
    note: 'Signature 140 × 60 px, 10–20 KB. Fitted with a white border so the signature is never cut.',
    source: { label: 'Punjab & Sind Bank recruitment notice (PDF)', url: 'https://punjabandsind.bank.in/system/uploads/document/2150_2024083018282832730.pdf' },
    checked: 'Oct 2026',
  },
  {
    id: 'us-visa',
    label: 'US visa photo (DS-160)',
    spec: { maxKB: 240, width: 1200, height: 1200, shape: 'cover' },
    note: 'JPEG, 240 KB or less, square, 600–1200 px. Uses 1200 × 1200; set 600 if your photo is small.',
    source: { label: 'travel.state.gov digital image requirements', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html' },
    checked: 'Oct 2026',
  },
  {
    id: 'in-passport',
    label: 'Indian passport photo (embassy upload)',
    spec: { width: 630, height: 810, shape: 'cover', maxKB: 250, minKB: 10 },
    note: '630 × 810 px colour photo on white, unedited. The 10–250 KB range comes from third-party guides.',
    source: { label: 'Indian Embassy Doha notice, Nov 2025 (PDF)', url: 'https://audit.indianembassyqatar.gov.in/users/assets/pdf/whatsnew/Doha_30nov2025_1.pdf' },
    checked: 'Oct 2026',
  },
  {
    id: 'pk-cnic',
    label: 'Pakistan CNIC / NICOP photo',
    spec: { width: 350, height: 467, shape: 'cover' },
    note: '350 × 467 px on white. Sources disagree on the KB limit, so add the one your form shows.',
    source: { label: 'visafoto, CNIC 350 × 467 px', url: 'https://visafoto.com/pk-cnic-350x467-px-photo' },
    checked: 'Oct 2026',
  },
];
