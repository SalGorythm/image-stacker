# Everyday user pain with image size, format and metadata utilities in the browser

Research date: 2026-10-22. Search engine is US-only and returned almost no Reddit/Quora threads directly, so complaint evidence comes mostly from tool sites, help forums, news and official specs. Treat vendor/tool-site claims as secondary.

## 1. What do people search for and struggle with (exact-KB/pixel targets, HEIC, WebP, location stripping)?

### Takeaway
The clearest everyday pain is hitting a portal's exact KB and pixel window (for example "signature 10–20 KB", "photo 20–50 KB", "US visa ≤240 KB, 600–1200 px square"). Portals reject files for wrong KB, wrong pixels, wrong format or blur, and users confuse those causes. HEIC rejection and WebP downloads that won't open are well documented secondary pains.

### Cited Findings
**Exact-KB/pixel portal specs (demand evidence)**
- SSC CGL 2026: the photo is now **captured live** in the application module (pre-existing photos are "strictly not allowed"), but the **signature must be uploaded as JPEG, 10–20 KB, about 4.0 × 2.0 cm**. Wrong format or a size outside 10–20 KB is a stated rejection reason, and "blurred or miniature signatures" are "summarily rejected." — [Physics Wallah, SSC CGL 2026 photo/signature size](https://www.pw.live/ssc/exams/ssc-cgl-photo-and-signature-size-2026)
- Older SSC guidance: photo 20–50 KB, signature 10–20 KB (2020-era Q&A). Commonly repeated pixel sizes are photo 200×230 and signature 140×60, but a 2026 guide lists 275×354 and 236×79, so specs conflict and change by year. — [Careers360 (2020)](https://www.careers360.com/question-what-documents-do-i-have-to-upload-while-filling-the-ssc-selection-post-application-form); [onlineresult.in SSC preset](https://www.onlineresult.in/tools/exam-photo-resizer?preset=ssc)
- Bank recruitment notices use the same pattern of a KB window plus a pixel size. — [Punjab & Sind Bank recruitment PDF (2024)](https://punjabandsind.bank.in/system/uploads/document/2150_2024083018282832730.pdf); [PracticeMock IBPS RRB 2025](https://www.practicemock.com/blog/ibps-rrb-photo-and-signature-size-2025/amp/?p=171870)
- US visa (DS-160): JPEG only, **≤240 KB**, square, **minimum 600×600 and maximum 1200×1200 px**, 24-bit sRGB colour, compression ratio ≤20:1. State notes the image "may need to be compressed" to fit. The official State Department tool only crops ("intended for photo cropping only") and does not compress to a KB target. — [travel.state.gov Digital Image Requirements](https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html.)

**Rejection causes and user confusion**
- Typical rejection causes: KB too high, wrong pixel dimensions, not JPG, blurry, signature has too much blank space, unacceptable background. — [signatureresize.in upload errors](https://signatureresize.in/signature-upload-errors-and-fixes); [photocopywala.in](https://photocopywala.in/tools/photo-signature-resizer/)
- Users mix up pixel errors ("must be at least 300px") with KB errors. A guide explains that changing JPG quality won't fix a pixel error, that files can be "too heavy *or too light*" (portals also enforce a **minimum** KB), and that enlarging a small file makes strokes soft. A 200×230 JPEG at decent quality is usually 15–35 KB. — [ilovexams upload error messages explained](https://ilovexams.in/resizer/guides/upload-error-messages-explained/)
- Signature advice that recurs: black pen on white paper, daylight, crop tightly before resizing. — [pythonware exam image-size guide](https://www.pythonware.com/guides-image-size-for-exam-forms)
- KB ambiguity: some tools treat 20 KB as 20,000 bytes rather than 20,480, and aim about 3% under the limit so the file passes either way. — [pythonware compress to 20kb](https://www.pythonware.com/compress-image-to-20kb)

**HEIC**
- May 2020: US AP exam takers' submissions failed because the College Board portal couldn't handle iPhone HEIC photos. Affected students were told to retake, and the College Board's fix was "change your iPhone camera to Most Compatible (JPG)." — [iDrop News, May 21, 2020](https://www.idropnews.com/news/why-iphones-suddenly-caused-students-to-fail-ap-tests/136323); [TidBITS 2020](https://tidbits.com/2020/05/21/take-a-heic-make-sure-ap-and-other-test-uploads-work-from-your-iphone-and-ipad/); [Wccftech](https://wccftech.com/students-fail-ap-tests-because-website-cannot-handle-heic-images-from-iphone/amp/)
- HEIC attachments that worked from desktop failed from iPhone on a website contact form (developer forum). — [Kirby forum](https://forum.getkirby.com/t/contact-form-image-attachment-heic-transmits-from-desktop-fails-on-iphone/26740)
- Platform feature requests to accept HEIC show the problem still exists (Discourse, Ghost), and some SaaS added HEIC support only in 2025. — [Discourse Meta](https://meta.discourse.org/t/support-for-heic-images/144326?tl=en); [Ghost forum](https://forum.ghost.org/t/heic-image-support/51994); [CartonCloud Jan 2025](https://cartoncloud.atlassian.net/wiki/spaces/KB2/blog/2025/01/15/581926928/Photos+on+Purchase+Orders+now+supports+HEIC+image+uploads+via+the+webapp.)

**WebP**
- Microsoft Q&A: images downloaded with Chrome save as .webp and the Photos app won't open them. The workaround is to open in Paint and Save As JPG. — [Microsoft Learn Q&A](https://learn.microsoft.com/en-us/answers/a/6473151)
- AskWoody users report WebP showing up more often, with older editors (old PaintShop Pro, Photoscape) unable to open it and IrfanView needing a plug-in. — [AskWoody forum](https://www.askwoody.com/forums/topic/seeing-the-webp-picture-file-used-more-often)
- Paint.NET forum: "won't open this image, says it has errors" thread about WebP. — [getpaint.net forum](https://forums.getpaint.net/topic/31701-paintnet-wont-open-this-image-says-it-has-errors/)

**Location/EXIF**
- Apple: you can remove location only per share (Share → Options → Location off). The setting is **not remembered**, and there is no global toggle, which frustrates users on Apple's forum. — [Apple iPhone guide](https://support.apple.com/en-om/guide/iphone/iphf28f17237/ios); [Apple Community thread](https://discussions.apple.com/thread/256092610); [Intego](https://www.intego.com/mac-security-blog/how-to-remove-gps-location-data-from-photos-on-iphone-or-mac/amp/)

### Inferences
- Demand clusters around three jobs. (a) **Fit a spec**: a KB min/max window, exact pixel dimensions, JPG, sometimes DPI. (b) **Make it open**: HEIC/WebP/AVIF to JPG. (c) **Make it safe to share**: strip GPS.
- A good tool should take the spec as input ("min 10 KB, max 20 KB, 140×60, JPG") and solve for it, not ask users to tune a quality slider. Presets per exam are useful but go stale (SSC's photo spec changed in 2026), so editable presets with a "last verified" date beat hardcoded ones.
- The "too light" (minimum KB) case is under-served. Most compressors only shrink files, but signatures at 140×60 can fall below 10 KB and need quality raised or the size padded.

### Gaps
- No direct Reddit/Quora thread text was retrieved, because the search engine returned tool sites instead. Complaint wording is from help forums and tool guides.
- No current official UPSC/NEET/passport-India spec documents were fetched in this pass.

## 2. Which tools dominate and what do they get wrong?

### Takeaway
General compressors (TinyPNG, iLoveIMG, Squoosh) don't offer an "exact KB window + exact pixels" mode. A long tail of near-identical, ad-heavy "compress image to 20kb" sites fills that gap, many of them uploading to servers. Single-purpose Indian exam resizer sites are now a crowded niche, and some already market "in-browser, no upload."

### Cited Findings
- TinyPNG free web tier: up to 20 images per session, 5 MB per image. Paid Web Pro/Ultra raise this to 75/150 MB. Reviewers call the 5 MB cap restrictive for camera photos. There is no exact-KB target. — [Toolradar TinyPNG](https://toolradar.com/tools/tinypng); [OMR reviews](https://omr.com/en/reviews/product/tinypng/all)
- iLoveIMG: no reliable data was found on its web free-tier limits. Its WordPress plugin gives 2,500 free credits a month. — [WordPress.org iLoveIMG](https://wordpress.org/plugins/iloveimg/)
- Squoosh: Google archived/unmaintained its CLI and lib "because of team departures and staffing limits." The squoosh.app web app is "continued to be supported," but the main repo's activity is unclear. Squoosh handles one image at a time and has no KB target. — [@squoosh/lib README](https://cdn.jsdelivr.net/npm/@squoosh/lib@0.5.3/README.md); [npm @squoosh/cli](https://npmjs.com/package/@squoosh/cli); [frostoven fork, last push Dec 2024](https://awesome.ecosyste.ms/projects/github.com%2Ffrostoven%2FSquoosh-with-CLI)
- At least 10 sites run dedicated "compress image to 20KB" landing pages (SmallSEOTools, Duplichecker, 11zon, Pi7, SearchEngineReports, HiCompress, imgcompressors, shrinksnaps, imageonline…), plus sibling 30/50/100/200 KB pages. This is an SEO-farm pattern. — [SmallSEOTools](https://smallseotools.com/compress-image-to-20kb/); [Duplichecker](https://www.duplichecker.com/compress-image-to-20kb.php); [11zon](https://imagecompressor.11zon.com/en/image-compressor/compress-image-to-20kb-online); [Pi7](https://image.pi7.org/compress-image-to-20kb); [HiCompress](https://hicompress.com/compress-image/compress-image-to-20kb); [imageonline](https://imageonline.io/compress-image-to-20kb/)
- Indian exam-specific resizers proliferate: sizetokb.in, examphotoresize.in, photoresizer.in, myexamphoto.in, signatureresize.in, photocopywala.in, onlineresult.in, ilovexams.in, imresizer.com. — [sizetokb.in](https://sizetokb.in/); [examphotoresize.in](https://examphotoresize.in/); [photoresizer.in](https://www.photoresizer.in/signature-resize-10kb-to-20kb); [myexamphoto.in](https://myexamphoto.in/signature-resizer); [imresizer](https://imresizer.com/resize-image-to-30kb)
- Some competitors already claim client-side processing with no upload, signup or watermark (for example pythonware; HEIC converters using libheif-WASM). — [pythonware](https://www.pythonware.com/compress-image-to-20kb); [how2shout HEIC local conversion](https://www.how2shout.com/?p=87789)
- Mobile apps: "Image Size – Photo Resizer" (Codenia) has a claimed 5M+ users (secondary site). Ad-supported resizers gate "Pro" features behind 15–30 s ads. — [tamindir](https://www.tamindir.com/indir/image-size-photo-resizer/amp/); [technipages](https://www.technipages.com/5-free-android-apps-to-resize-pictures); [AppBrain "Image Resizer in KB"](https://www.appbrain.com/app/image-resizer-in-kb/com.image.resizer.resize.photo)

### Inferences
- The differentiator isn't "can compress." It is: (1) solve for a min/max KB window *and* exact pixels in one step, (2) private and offline with no ads, (3) batch, (4) phone-first, (5) also handles HEIC input and strips GPS. No single tool found does all of these together, but individual claims of "client-side, no upload" already exist, so privacy alone isn't a moat.
- SEO competition for "compress to 20kb" queries is intense. Discovery would likely need to come from WhatsApp sharing or teacher/coaching-centre word of mouth rather than search.

### Gaps
- No first-hand app-store review text or Play Store download badges were verified. Ad and watermark complaints are inferred from app descriptions, not reviews.
- iLoveIMG, Convertio and CloudConvert free-tier limits weren't verified in this pass.

## 3. Evidence of demand volume

### Takeaway
No keyword-tool numbers were obtainable. Demand is evidenced indirectly by the dozens of single-purpose "N KB" sites, many exam-specific resizer domains, millions of mobile-app users, and official portals that mandate KB/pixel windows for millions of applicants.

### Cited Findings
- Many tools compete on the exact phrase "compress image to 20kb" and sibling sizes. — [search results incl. SmallSEOTools, shrinksnaps](https://shrinksnaps.com/compress-image-to-20kb)
- A resizer app claims 5M+ users (secondary source). — [tamindir](https://www.tamindir.com/indir/image-size-photo-resizer/amp/)
- browser-image-compression npm package: about 325k weekly downloads (Snyk, possibly dated), showing developer demand for client-side compression. — [Snyk advisor](https://dev.snyk.io/advisor/npm-package/browser-image-compression)

### Inferences
- Applicant volume for SSC/bank/state exams (millions per cycle) multiplied by mandatory signature/photo uploads implies very large recurring seasonal demand. Applicant counts weren't sourced here.

### Gaps
- No Google Trends, Keyword Planner, Ahrefs or Semrush volumes. A keyword-tool check is needed for real numbers.

## 4. What can be done fully client-side? Browser limits?

### Takeaway
Resize, JPEG/WebP/PNG encode, KB targeting, EXIF stripping and batch are all feasible with canvas plus small libraries. HEIC decode needs a WASM decoder (libheif) on Chrome, Edge, Firefox and Android, because only Safari 17+ decodes HEIC natively.

### Cited Findings
- caniuse: HEIF/HEIC is supported in Safari 17.0+ and unsupported in Chrome (all versions through 155), Chrome Android and Edge. — [caniuse HEIF](https://caniuse.com/heif)
- heic2any-style libraries note that createImageBitmap/canvas fail on HEIC in Chrome, Firefox and Edge, and Safari 17+ decodes via the OS codec. — [heic2any README](https://cdn.jsdelivr.net/npm/alexcorvi-heic2any@0.0.3/readme.md)
- createImageBitmap is broadly supported (Chrome 59+, Safari 17+). — [caniuse createImageBitmap](https://caniuse.com/createimagebitmap)
- HEIC can be decoded in-browser with libheif compiled to WebAssembly, so photos never leave the device. — [how2shout](https://www.how2shout.com/?p=87789)
- browser-image-compression exposes a `maxSizeMB` target, but only as an upper bound. — [npm browser-image-compression](https://www.npmjs.com/package/browser-image-compression)
- Squoosh's codecs (MozJPEG, OxiPNG, AVIF, WebP as WASM) run client-side in squoosh.app. The packaged lib is unmaintained, so reuse means vendoring. — [@squoosh/lib README](https://cdn.jsdelivr.net/npm/@squoosh/lib@0.5.3/README.md)
- Workflow that fits portals: resize to the required pixels first, then step JPEG quality to land in the KB window. — [ilovexams guide](https://ilovexams.in/resizer/guides/upload-error-messages-explained/)

### Inferences (feasibility / effort; based on general browser knowledge, not separately sourced)
- **KB window solver** (low effort, about 1–2 days): binary-search `canvas.toBlob('image/jpeg', q)` over q in about 6–8 iterations. If the result is still over the maximum at a low q, step the pixel dimensions down (unless they're fixed). If it's under the minimum at q=1.0, raise the dimensions (unless fixed) or pad with a JPEG COM segment. Padding meets the byte rule but is a hack, so flag it. Aim about 2–3% under the max to absorb KB=1000 vs 1024 ambiguity.
- **EXIF/GPS strip** (very low effort): re-encoding via canvas drops EXIF by default. For "keep quality, just strip," parse and remove APP1 segments from the JPEG bytes losslessly. Orientation must be applied before stripping, or photos rotate wrongly.
- **HEIC input** (medium effort): lazy-load libheif-js WASM (about 1–2 MB) only when a .heic arrives. Use native decode on Safari.
- **WebP/AVIF to JPG** (very low): Chrome, Firefox and Safari decode WebP and AVIF natively, so canvas re-encode works.
- **Batch rename/resize plus zip** (low): client-side zip (for example via fflate/JSZip). On iOS, multi-file download is awkward, so prefer zip or the Web Share API.
- **Signature cleanup** (medium): threshold or whiten the background, auto-crop to ink bounds. This addresses "too much blank space" and "blurry" rejections.
- MozJPEG via WASM gives roughly 5–10% smaller files than browser JPEG at equal quality, which matters most for 10–20 KB signatures. It's optional (medium effort).

### Gaps
- Exact libheif-js bundle size and decode speed on low-end Android weren't measured or sourced.
- JPEG XL status wasn't checked.

## 5. Privacy angle: worry about uploading ID photos/signatures; when does location leak?

### Takeaway
Location leaks when the original file travels unchanged: WhatsApp/Telegram "send as document/file," email attachments not started from Photos with location toggled off, and direct uploads. Standard WhatsApp, Telegram and Signal photo sends strip GPS. No direct evidence was found of users complaining about converter sites retaining ID photos, though the general Aadhaar-leak context makes the "no upload" message resonate in India.

### Cited Findings
- WhatsApp standard photo send strips GPS (and resizes to about 1600 px). **HD mode is unreliable**, with GPS sometimes surviving. **Send-as-document preserves all metadata.** Telegram photo strips, Telegram file preserves. Signal photo strips, Signal file may preserve. Source is a vendor blog citing third-party testers (MetaClean, PrivacyStrip), last reviewed 2026-04-28, with no official WhatsApp statement, so medium confidence. — [fast.io WhatsApp/Telegram/Signal metadata](https://www.fast.io/resources/whatsapp-telegram-signal-photo-metadata-preservation.md); [fast.io platform list](https://fast.io/resources/social-media-photo-metadata-platforms-strip/)
- People often choose "document" mode in WhatsApp precisely to avoid quality loss, which is exactly the path that leaks GPS. — [fast.io](https://www.fast.io/resources/whatsapp-telegram-signal-photo-metadata-preservation.md)
- Human-rights evidence guidance notes that apps' compression strips metadata, and file mode is needed to preserve it. This is the inverse use case (2020). — [Citizen Evidence Lab](https://citizenevidence.org/2020/04/20/sending-encrypted-photos-while-preserving-metadata/)
- On iPhone, location can be removed only when sharing from Photos via Options, and the choice must be repeated each time. — [Apple guide](https://support.apple.com/en-om/guide/iphone/iphf28f17237/ios); [Apple Community](https://discussions.apple.com/thread/256092610)
- An explainer on what EXIF/GPS leaks. — [Flavio Copes](https://flaviocopes.com/exif-metadata-privacy/)
- Background on Indian ID-data sensitivity: Aadhaar data reportedly sold for Rs 500 / $8 (2018). Mozilla flagged the lack of a data protection law (2018; dated, and the DPDP Act 2023 now exists). — [Inc42 2018](https://inc42.com/buzz/aadhaar-data-billion/); [Mozilla 2018](https://blog.mozilla.org/netpolicy/2018/01/04/mozilla-statement-breach-aadhaar-data/); [The Quint](https://www.thequint.com/news/india/uidai-denies-aadhaar-data-leak-misinforms-public)
- Converter guides themselves warn that online converters mean "uploading the image, so weigh that for private photos." — [pngtojpg.it.com WebP guide](https://pngtojpg.it.com/blog/webp-converter-guide/)

### Inferences
- A "safe to share" toggle (strip GPS and device info, keep orientation) plus a visible "this photo contains location: [area]" warning would make the invisible risk visible. That matters most for families sending kids' photos as documents to keep quality.
- A "no upload" claim should be verifiable: it works offline (PWA), and the network tab stays quiet. Competitors already claim it, so proof matters.

### Gaps
- No survey data on how many users worry about uploading ID photos or signatures to converter sites.
- Email (Gmail/Outlook) attachment EXIF handling and iMessage behaviour weren't confirmed by a primary source.
- No primary WhatsApp documentation on EXIF handling exists. Behaviour may differ across Android and iOS versions.
