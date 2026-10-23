# PhotoSize

Free image tools at [photosize.app](https://photosize.app) that run entirely in the browser: nothing is uploaded, no sign-up, no watermark.

The Stacker (home page): Stack images or PDF pages into tall images, grids or side-by-side strips, split them into groups, and download or share them as PNG, JPG, ZIP or PDF. Everything runs in the browser, and images are kept in IndexedDB between visits.

Tools (all in the browser, nothing uploaded):

- **Stacker**: stack images or PDF slides into tall images, grids or side-by-side strips; groups, trim, captions, numbering, watermark, blur with automatic detection of phone numbers and emails, screenshot joining, WhatsApp-safe sizing, Instagram carousel slicing, HD re-rendering of PDF pages.
- **Fit to size**: exact KB window and pixel size for exam, bank and visa portals, with sourced presets.
- **Scan**: phone photos of paper to clean, straightened pages and an A4 PDF under a size limit.
- **Passport photo**: guided framing to country specs, background check, digital file and 6×4 print sheet.
- **Signature**: clean ink on white or transparent, cropped.
- **Cards**, **Quiz cards**, **QR codes**, **Watermark**, **Video** (before/after or slideshow MP4), **Copy text** (OCR), **Remove background**, **Safe to share** (location and metadata), **Convert** (HEIC/WebP/AVIF).

Installable, offline after first load, Android share target. On-device engines are self-hosted and loaded only when needed: libheif (LGPL-3.0), Tesseract.js (Apache-2.0), U²-Net-p (Apache-2.0) on ONNX Runtime Web (MIT).

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (grouping, layout, file names)
npm run build      # type-check and build to dist/ (copies the OCR and ONNX runtimes into public/ first)
```

## Layout

- `src/lib/` holds the plain TypeScript logic: grouping (`groups.ts`), layout and canvas limits (`layout.ts`), PDF import and HD re-rendering (`pdf.ts`), drawing and export (`render.ts`), persistence (`storage.ts`), trimming (`trim.ts`), captions (`captions.ts`), redaction (`redact.ts`), screenshot joining (`overlap.ts`, `join.ts`), WhatsApp sizing (`whatsapp.ts`) and carousel cuts (`carousel.ts`).
- `public/sw.js` and `public/manifest.webmanifest` make it installable, offline-capable and a share target.
- `src/components/` holds the React UI.
- pdf.js, jsPDF and JSZip are loaded only when first needed.

Deployed on Vercel (`vercel.json` sets the Vite build and `dist` output).

## Domain, search and ads settings

Each tool has its own address (for example `/resize-image-in-kb`, `/compress-image-to-20kb`). The build writes a separate HTML page for each, with its own title, description, social image and structured data, plus `sitemap.xml`, `robots.txt`, `llms.txt` and, when ads are on, `ads.txt`. Page text lives in `src/seo/pages.ts` and `src/seo/info.ts`.

Set these in Vercel → Settings → Environment Variables, then redeploy:

| Variable | What it does |
| --- | --- |
| `SITE_URL` | Only to override the address. Vercel builds use `https://photosize.app`. |
| `CONTACT_EMAIL` | Shown on the Contact and Privacy pages (AdSense wants a way to reach you). |
| `ADSENSE_CLIENT` | Vercel builds use PhotoSize's publisher id (`ca-pub-5640433281391130`). Set it to an empty value to turn ads off. Adds the AdSense script, `ads.txt` and the ads section of the privacy policy. |
| `SUPPORT_URL` | Your Buy Me a Coffee (or similar) page. Adds a Support button in the footer and a Support section on About. |
| `ADSENSE_SLOT` | Optional ad unit id for the one slot between each tool and its guide. |
