# Image Stacker

Stack images or PDF pages vertically, split them into groups, and download them as PNG, JPG, ZIP or PDF. Everything runs in the browser, and images are kept in IndexedDB between visits.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (grouping, layout, file names)
npm run build      # type-check and build to dist/
```

## Layout

- `src/lib/` holds the plain TypeScript logic: grouping (`groups.ts`), stack layout and canvas limits (`layout.ts`), PDF import and HD re-rendering (`pdf.ts`), drawing and export (`render.ts`), and persistence (`storage.ts`).
- `src/components/` holds the React UI.
- pdf.js, jsPDF and JSZip are loaded only when first needed.

Deployed on Vercel (`vercel.json` sets the Vite build and `dist` output).
