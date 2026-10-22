# Image Stacker

Stack images or PDF pages into tall images, grids or side-by-side strips, split them into groups, and download or share them as PNG, JPG, ZIP or PDF. Everything runs in the browser, and images are kept in IndexedDB between visits.

Features: PDF page picker, groups (every N / custom ranges), trim and automatic margin removal, captions with `{range}` placeholders, image numbers, watermark, blur/pixelate/box redaction, joining overlapping screenshots, WhatsApp-safe sizing, Instagram carousel slicing, HD/4K re-rendering of PDF pages, Web Share, installable offline app with an Android share target.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (grouping, layout, file names)
npm run build      # type-check and build to dist/
```

## Layout

- `src/lib/` holds the plain TypeScript logic: grouping (`groups.ts`), layout and canvas limits (`layout.ts`), PDF import and HD re-rendering (`pdf.ts`), drawing and export (`render.ts`), persistence (`storage.ts`), trimming (`trim.ts`), captions (`captions.ts`), redaction (`redact.ts`), screenshot joining (`overlap.ts`, `join.ts`), WhatsApp sizing (`whatsapp.ts`) and carousel cuts (`carousel.ts`).
- `public/sw.js` and `public/manifest.webmanifest` make it installable, offline-capable and a share target.
- `src/components/` holds the React UI.
- pdf.js, jsPDF and JSZip are loaded only when first needed.

Deployed on Vercel (`vercel.json` sets the Vite build and `dist` output).
