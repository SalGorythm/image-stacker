# Document-style image tools: phone scanning, image to PDF, OCR, signatures, ID/passport photos

Research date: 2026-10-22. Many of the sources are vendor blogs or commercial photo-spec sites. I've marked them where it matters. Several official government pages (travel.state.gov, NADRA, ICP) blocked fetching or didn't appear in search, so some specs come from secondary sources and need checking.

## 1. What do users complain about in the existing scanner, PDF, passport-photo and signature tools?

### Takeaway
Free tiers are designed to push people into paying. Watermarks, OCR and multi-page export are often locked, and the paywall tends to appear only after the user has finished the scan. Microsoft Lens was the main free scanner with no ads or watermark, and Microsoft has now retired it. Its replacement saves only to the cloud. The free web PDF tools (iLovePDF, Smallpdf) limit daily tasks and require uploading the file. Passport-photo apps often lock background removal and compliance checks behind payment.

### Cited Findings
**Microsoft Lens retirement (confirmed, 2026)**
- Microsoft's support page says Lens is retired on iOS and Android from 9 January 2026 and unsupported after 9 February. Scanning stopped working on 9 March 2026. — [Microsoft Support](https://support.microsoft.com/en-GB/lens/retirement-of-microsoft-lens)
- The retirement was first announced in August 2025 with a December 2025 end date, then postponed. — [BleepingComputer](https://www.bleepingcomputer.com/news/microsoft/microsoft-is-retiring-the-lens-scanner-app-for-ios-android); [Windows Report](https://windowsreport.com/microsoft-lens-removed-from-app-stores-as-final-shutdown-approaches/); [Neowin](https://www.neowin.net/amp/microsoft-lens-has-been-retired/)
- Microsoft points users to the OneDrive app's scanner. It saves scans only to OneDrive and can't save them on the device. Old scans can be viewed only while the app stays installed and signed in. — [Microsoft Support](https://support.microsoft.com/en-gb/topic/retirement-of-microsoft-lens-fc965de7-499d-4d38-aeae-f6e48271652d); [BGR](https://bgr.com/1936952/microsoft-lens-app-ios-android-being-retired/)
- Before it was retired, reviewers described Lens as free with no ads, watermark or subscription. Its weaknesses were that it pushed exports to Microsoft services and that you couldn't reorder pages after capture. — [Unstar 2026 comparison](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026) (vendor-run comparison blog that summarises 1–2 star reviews)

**CamScanner**
- In 2019 Kaspersky found a Trojan dropper in an advertising library inside the Android app, which had more than 100 million downloads. Google removed the app from Play. The developers then dropped the module. — [The Hacker News, Aug 2019](https://thehackernews.com/2019/08/android-camscanner-malware.html); [Gulf News](https://gulfnews.com/technology/scanner-app-on-android-phones-pulled-because-of-malware-1.66082512); [Tecnoblog](https://tecnoblog.net/304777/google-play-permitiu-malware-camscanner-100-milhoes-downloads/) (2019, old but still cited by users)
- In 2026, the free tier still stamps a watermark on every export, plays 15–30 second video ads between scans, and charges $4.99/month or $50/year for OCR. Exporting to Drive or Dropbox needs premium. 2026 reviews still mention the 2019 malware and object to the contacts and location permissions. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)
- A 2025 Capterra reviewer complained about a "watermark on all scans unless you pay" and about crashes under heavy use. A 2024 reviewer said the ads are frustrating. — [Capterra CamScanner reviews](https://www.capterra.com/p/210426/CamScanner/reviews/)

**Adobe Scan**
- You have to sign in before you can scan a single page. Editing, combining and fill-and-sign send users to Acrobat Pro paywalls. The install is about 200–300 MB. OCR is weaker on non-Latin scripts. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)
- Adobe's own docs say Premium raises the OCR limit from 25 to 100 pages. — [Adobe Scan developer docs](https://www.adobe.com/devnet-docs/adobescan/ios/en/subscriptions.html)
- A 2023 thread reports OCR jobs stuck on "Waiting for OCR" even on a paid plan. — [Adobe Community](https://community.adobe.com/t5/adobe-scan-discussions/adobe-scan-quot-waiting-for-ocr-quot/m-p/14235993)

**Other scanners**
- Genius Scan misses dark or low-contrast documents, such as a receipt on a dark table, and the user has to crop by hand. It can crash on documents of 30–50+ pages. OCR and cloud export are part of the paid Plus tier. SwiftScan's free tier hits its cap quickly. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)
- A common pattern across scanner apps: the user scans 12 pages, taps Save, and only then sees the paywall for OCR, watermark removal or multi-page export. Handwriting and non-Latin text are weak spots. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)

**iLovePDF / Smallpdf (web)**
- Capterra reviewers say iLovePDF's free tier limits file size and the number of batch tasks per day, and that the ads are excessive and get in the way. — [Capterra iLovePDF](https://capterra.com/p/173963/iLovePDF/reviews/)
- Smallpdf is praised for its design but criticised for its restrictive free plan. Some reviewers worry about privacy and document protection. — [Capterra Smallpdf](https://www.capterra.com/p/172606/Smallpdf/reviews/)
- iLovePDF is ISO 27001 certified and GDPR compliant, but files still pass through and are temporarily stored on its servers. This comes from a competitor's review. — [SwifDoo blog](https://www.swifdoo.com/blog/amp/is-ilovepdf-safe)
- A G2 reviewer says uploading sensitive documents to a third-party site raises privacy concerns. — [G2 iLovePDF reviews](https://g2.com/products/ilovepdf/reviews_and_filters?page=3)

**Passport-photo apps**
- An app-store review summary for one passport-photo app reports users being charged for features that didn't work and finding the essential editing tools behind a paywall. Ads are the top complaint, and about 31% of reviews are negative. — [Spark/MWM app summary](https://spark.mwm.ai/en/apps/passport-photo-id-photo-app/1294190634) (AI-generated summary)
- Comparison posts note that in several apps, background removal and compliance checks are available only in the paid version. — [PhotoAiD blog](https://photoaid.com/blog/free-passport-photo-apps/); [Passport-Photo.online blog](https://passport-photo.online/blog/free-passport-photo-tools/) (both are vendors that rank their own products, so expect bias)

**Signature tools**
- The free signature background removers are mostly tied to general AI photo-editor brands: Pixelcut, Picsart, BeautyPlus and Pokecut. They upload the signature to their servers and push their app or VIP upsells. — [Pixelcut](https://www.pixelcut.ai/hi-in/background-remover/remove-background-from-signature); [Picsart](https://picsart.com/ar/background-remover/signature/); [BeautyPlus](https://www.beautyplus.com/background-remover/remove-background-from-signature); [Pokecut](https://test-us.guangzhuiyuan.com/tools/signature-extractor)

### Inferences
- With Lens retired, there is no longer a mainstream free scanner without a watermark that saves files locally. A browser tool that does perspective correction, cleanup and PDF export with no account, watermark or upload fills exactly that gap.
- Since the main complaint is the paywall after the work is done, a tool can stand out by being clear up front that nothing is locked.
- Signature extraction doesn't need AI. Thresholding dark ink on light paper can run locally, which avoids uploading a legally meaningful image.

### Gaps
- I found no direct Reddit or Quora thread text. Search didn't surface it, so the user-voice evidence relies on aggregated reviews (Capterra, and Unstar's summary of 1–2 star reviews).
- I found no current data on the quality or limits of Google Drive's built-in scanner.
- I found no app-store review dumps specific to South Asia or the Middle East.

## 2. How good is free OCR for Arabic, Urdu (Nastaliq) and Hindi in the browser today?

### Takeaway
Tesseract, the engine behind Tesseract.js, does badly on Urdu Nastaliq and only passably on Naskh. On a 2025 benchmark it was the weakest engine tested. PP-OCRv5 offers newer Arabic-script models (which include Urdu) and Devanagari models that run in the browser through ONNX Runtime Web. LLMs such as Gemini 2.5 Pro do much better but need a server. A local tool can give people usable Arabic and Hindi printed text, but should tell them Nastaliq results may be poor.

### Cited Findings
- 2025 arXiv benchmark ("From Press to Pixels"), WER/CER results:
  - Tesseract: Naskh 0.902/0.955; Nastaliq 1.567/1.420; Urdu newspapers (UNB) 2.401/2.580. These are the worst scores in the study.
  - EasyOCR: Nastaliq 0.904/0.392.
  - Kraken: Naskh 0.249/0.069; Nastaliq 0.626/0.305.
  - Gemini-2.5-Pro: Nastaliq 0.303/0.125; UNB 0.133/0.032. This is the best result.
  - "All models perform significantly better on Naskh than on Nastaliq."
  - The authors say LLM latency is the biggest bottleneck. The paper didn't test PaddleOCR.
  — [arXiv 2505.13943](https://arxiv.org/html/2505.13943v2)
- A TrOCR fine-tune model card reports that Tesseract recovered only about 2.1% of words on its Urdu test data. This is self-reported on a small dataset. — [Hugging Face model card](https://huggingface.co/qandeelasim13/urdu-ocr-trocr-si26)
- Nastaliq is hard to recognise because it runs diagonally, has several baselines, joins letters heavily and changes letter shapes by context. Adapting Tesseract to it needed custom changes. — [CLE 2014 paper](https://www.cle.org.pk/Publication/papers/2014/AdaptingTesseract%20for%20Complex%20Scripts-%20an%20Example%20for%20Nastalique%203.10.pdf) (older)
- Tesseract.js uses the integerised "tessdata best" models by default. The "fast" models are optional. — [naptha/tessdata](https://github.com/naptha/tessdata)
- The tessdata_fast language packages are small, about 0.7–1 MB each: Arabic about 684 KiB, Hindi about 905 KiB, Urdu about 1007 KiB. These are package sizes, not exact file sizes. — [Urdu pkg](https://repo2.msvsphere-os.ru/msvsphere/9/distroscope/en/packages/t/te/tesseract-langpack-urd-0:4.1.0-5.el9_6.noarch.html); [Arabic pkg](https://repo1.msvsphere-os.ru/msvsphere/9/distroscope/en/packages/t/te/tesseract-langpack-ara-0:4.1.0-5.el9_6.noarch.html); [Hindi MSYS2](https://packages.msys2.org/packages/mingw-w64-ucrt-x86_64-tesseract-data-hin)
- PP-OCRv5 has a mobile Arabic recognizer covering Arabic, Persian, Urdu, Pashto, Kurdish, Sindhi, Balochi and English, and a Devanagari recognizer covering Hindi, Marathi and Nepali. ONNX exports exist for both. — [Hugging Face ppu-paddle-ocr-models](https://huggingface.co/snowfluke/ppu-paddle-ocr-models); [DocScanner OCR ONNX](https://huggingface.co/mxaln/docscanner-ocr)
- The ppu-paddle-ocr npm package runs PP-OCRv5 in the browser through onnxruntime-web, with optional WebGPU. ffocr picks WebGPU, then WebNN, then WebGL, then WASM. The official `paddleocr` npm package ships only English sample models. — [ppu-paddle-ocr README](https://cdn.jsdelivr.net/npm/ppu-paddle-ocr@5.1.1/README.md); [ffocr README](https://cdn.jsdelivr.net/npm/ffocr@0.1.13/README.md); [paddleocr npm](https://npmjs.com/package/paddleocr)
- A 2026 summary of scanner-app reviews says OCR is weaker on non-Latin text and handwriting in mainstream apps. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)

### Inferences
- A practical setup: use Tesseract.js for Latin, Arabic Naskh and Hindi, since the models are small and the library is mature. Offer PP-OCRv5 ONNX as a better optional engine for Arabic-script and Devanagari text. Label Urdu Nastaliq as "experimental".
- For pages that mix scripts, such as English with Urdu, you'll need to pick several languages, for example `eng+urd`. That slows processing, and right-to-left text ordering needs testing.
- Even imperfect local OCR is useful when the alternative is uploading an ID card to a server.

### Gaps
- I found no published accuracy benchmark for PP-OCRv5's Arabic or Urdu model on Nastaliq.
- I found no measured Google Lens accuracy for Urdu.
- I didn't find the exact download sizes of the PP-OCRv5 ONNX models.
- I didn't verify Tesseract.js speed on low-end Android phones.

## 3. What demand signals exist (search phrases, downloads, forum questions)?

### Takeaway
The strongest concrete demand I found is the Indian exam and government-form requirement for photos and signatures within exact KB and pixel limits. It has produced a whole category of single-purpose "resizer" sites, and applicants post confused questions about it. Scanner apps have very large install bases, for example CamScanner at 100M+ downloads in 2019. I couldn't get search-volume numbers.

### Cited Findings
- Exam notices typically require photos of 20–50 KB and signatures of 10–20 KB, with the signature at about 140×60 px. Applicants are told to change the scanner's DPI to get under the limit. — [RBI notice PDF](https://website.rbi.org.in/documents/87730/39016390/RPJECE07012019_AN1.pdf); [onlineresult.in resizer](https://www.onlineresult.in/tools/exam-photo-resizer?preset=ssc)
- A confused applicant on Careers360 asked: "my photo is 413×513 pixels and size 284kb… will my form get rejected… I am very confused". — [Careers360](https://www.careers360.com/question-are-pixels-important-for-the-photo-and-signature-in-ssc-gd-form-or-just-the-size-should-be-20kb-to-50kb-size-my-photo-is-413513-pixels-and-size-284kb-is-it-ok-or-my-form-will-get-rejected-if-i-upload-it-please-reply-and-help-me-clear-this-doubt-i-am-very-confused) (2021)
- Pixel specs disagree between third-party resizer sites. One gives the SSC photo as 200×230 px, another as 280×340 px. — [onlineresult.in](https://www.onlineresult.in/tools/exam-photo-resizer); [globaldrishti](https://globaldrishti.in/tools/photo-signature-resizer/)
- Many single-purpose resizer and exam-tool sites exist, which shows sustained demand. — [pythonware guide](https://www.pythonware.com/guides-image-size-for-exam-forms); [freetool img-master](https://freetool.odoo.com/img-master)
- CamScanner had more than 100 million Android downloads at the time of the malware incident. — [Tecnoblog](https://tecnoblog.net/304777/google-play-permitiu-malware-camscanner-100-milhoes-downloads/)
- Mainstream scanner apps are rated 4.0–4.8 in the stores. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)
- NADRA CNIC and NICOP photo tools target 350×467 px with a white background, and visafoto runs dedicated pages for it. — [visafoto](https://visafoto.com/pk-cnic-350x467-px-photo); [photogov](https://photogov.net/documents/pk-cnic-350x467-px-photo/)

### Inferences
- An "exact KB/pixel target" preset feature for SSC, UPSC, banks, NADRA, Passport Seva and similar portals answers a widespread and recurring need. Implementation is straightforward: binary-search the JPEG quality and scale.
- Keeping a list of presets is the hard part, because portals change and third-party sites disagree. Each preset should show its source and let the user override the values.

### Gaps
- I found no keyword-volume data for phrases like "scan to pdf no watermark", "urdu ocr online" or "signature png transparent". It would need a keyword tool.
- I found no recent download counts for the scanner apps.

## 4. What exactly do passport, visa and ID photos require?

### Takeaway
Requirements differ by country and often by application channel. Most specs are ICAO-style: white or light background, head filling about 70–85% of the frame, unedited. The pixel sizes and KB limits are all different. India made ICAO-compliant self-uploaded photos mandatory from December 2025, which increases demand.

### Cited Findings
- **US:** a 2×2 in (51×51 mm) print; digital photos 600×600 to 1200×1200 px; head 1 to 1⅜ in (25–35 mm); white or off-white background; no editing. The official page returned 403, so these figures come from secondary sources. — [Passport-Photo.online](https://passport-photo.online/600x600-pixels-photo-v110); [smartphone-id](https://www.smartphone-id.com/?p=1789)
- **India:** Indian embassy notices require a colour photo of 630×810 px on a white background, unaltered by software, and say ICAO-compliant upload at the applicant's level is mandatory from 1 December 2025. The 10–250 KB range is from third-party sites. — [Indian Embassy Doha notice](https://audit.indianembassyqatar.gov.in/users/assets/pdf/whatsnew/Doha_30nov2025_1.pdf); [Embassy Helsinki guidelines](https://www.indembhelsinki.gov.in/pdf/Guidelines%20for%20ICAO%20Compliant%20Photographs%20for%20Passport%20Applications.pdf); [photogov India](https://photogov.net/knowledge/requirements/indian-passport-photo-requirements/)
- **Pakistan:** passport photos are 35×45 mm on white, with the head about 29–34 mm. CNIC/NICOP uploads are 350×467 px. Upload-size claims conflict: one source says up to 5 MB, another says 60 KB. — [Wego](https://blog.wego.com/pakistan-passport-photo-size/); [Timpson](https://security.timpson.co.uk/services/passport-photos/international-passport-photo-sizes/pakistan); [visafoto CNIC](https://visafoto.com/pk-cnic-350x467-px-photo)
- **UAE:** sources disagree. Sizes given include 35×40/45 mm, 43×55 mm for visas and 40×60 mm. All agree on a white background, a photo under 6 months old, and the face filling 70–80% of the frame. The exact digital size depends on the application channel. — [photogov UAE visa](https://photogov.net/knowledge/requirements/uae-visa-photo-requirements/); [passlens](https://passlens.com/blog/uae-visa-photo-requirements-guide); [Zurich Kotak](https://www.zurichkotak.com/knowledge-center/travel-insurance/dubai-visa-photo-size)

### Inferences
- A passport-photo tool needs a spec table with a source link per preset: output size in mm or px, head-height ratio, eye-line position, background colour, and a KB range. It should also have a custom option, because official specs conflict and change.
- An "unedited" rule (US, India) clashes with background replacement. The tool should keep the face pixels untouched and only replace or brighten the background, and warn users about this.

### Gaps
- I couldn't fetch the official travel.state.gov, UK GOV.UK, NADRA or ICP pages. The UK and Saudi specs weren't researched.

## 5. Can each feature run entirely in the browser, and roughly how much work is it?

### Takeaway
Every target feature can be built client-side with mature open-source libraries. The costs are payload size (OpenCV.js is several MB, and OCR models are about 1 MB or more per language) and tuning detection on messy phone photos.

### Cited Findings
- jscanify, built on OpenCV.js, provides `highlightPaper` and `extractPaper` for finding the page and correcting perspective. Since v1.3 it handles glare and coloured paper. It needs a large OpenCV.js load done asynchronously, works best on a solid contrasting background, and leaves the UI to you. — [jscanify npm](https://npmjs.com/package/jscanify); [README 1.4.2](https://cdn.jsdelivr.net/npm/jscanify@1.4.2/README.md); [dev.to tutorial](https://dev.to/colonelparrot/how-to-make-a-mobile-document-scanner-with-just-javascript-4ihc); [Scanbot comparison](https://scanbot.io/?p=11943) (vendor)
- MediaPipe Face Landmarker (478 3D points) runs client-side through WASM from `@mediapipe/tasks-vision`. Its `.task` model can be self-hosted and loaded from a path or buffer. — [Google MediaPipe web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js); [dev.to](https://dev.to/calvin773/how-i-got-mediapipe-face-landmarker-running-in-the-browser-with-zero-build-tools-and-the-import-36b1)
- PP-OCRv5 runs in the browser through onnxruntime-web, using WebGPU, WebGL or WASM. — [ppu-paddle-ocr](https://cdn.jsdelivr.net/npm/ppu-paddle-ocr@5.1.1/README.md); [ffocr](https://cdn.jsdelivr.net/npm/ffocr@0.1.13/README.md)
- Tesseract.js language data is loaded on demand per language. — [naptha/tessdata](https://github.com/naptha/tessdata)

### Inferences (rough effort, assuming the existing image-stacker canvas and export pipeline)
- **Phone photo to clean scan:** about 3–5 days with jscanify or OpenCV.js. Covers auto corner detection, draggable corners, warp, then adaptive threshold for black-and-white, a "remove shadows" step (divide by a blurred background) and a greyscale mode. Lazy-load OpenCV.js.
- **Images to PDF with a size cap:** about 1–2 days with jsPDF or pdf-lib. Search over JPEG quality and DPI to stay under a target such as 200 KB or 1 MB, with page size A4/Letter and a fit option.
- **PDF pages to images:** about 1 day with pdf.js rendering to canvas, then reuse the existing export.
- **OCR:** about 2–3 days with Tesseract.js (eng, ara, urd, hin, with a multi-select of languages and an RTL-aware copy box). An optional PP-OCRv5 ONNX engine adds about 3–5 days.
- **Signature extraction:** about 1 day. Greyscale, Otsu or adaptive threshold, make the paper transparent, optionally recolour the ink to blue or black, auto-crop, and export PNG at exact pixel and KB targets.
- **Passport/ID photo:** about 4–6 days. Face Landmarker gives the chin and crown positions to scale and centre the head to each spec. Background replacement would need a segmentation model such as MediaPipe Selfie Segmenter (not researched here). Add spec presets, a printable 4×6 sheet tiling, and a KB target.

### Gaps
- I didn't measure the OpenCV.js build size, the MediaPipe `.task` file sizes or the segmentation model sizes.
- I didn't check how well jscanify detects pages on cluttered or low-contrast backgrounds.

## 6. Is there evidence that people avoid uploading IDs and signatures to unknown sites?

### Takeaway
The evidence is indirect but consistent. Scans of passports and IDs are sold and misused. Reviewers of the cloud PDF tools raise privacy concerns. Scanner apps have a malware history and ask for broad permissions. I found no direct survey of user behaviour.

### Cited Findings
- A Comparitech study found passport scans for sale on dark-web markets, used for account-verification scams on crypto exchanges, payment services and betting sites. It also says actual theft of scans doesn't appear prolific, and advises giving black-and-white copies. — [The Points Guy](https://thepointsguy.com/news/passport-image-stolen-fraud/); [Information Security Buzz](https://informationsecuritybuzz.com/?p=89864)
- Security commentary warns that storing passport images on third-party systems creates risks. — [Arctic Wolf](https://arcticwolf.com/blog/united-airlines-introduces-mobile-passport-scans-security-threats/)
- Dutch parliamentary answers addressed concern that passport-scanner phone apps raise the risk of identity fraud. — [privacy-web.nl](https://privacy-web.nl/en/beleid/beantwoording-kamervragen-over-het-bericht-paspoortscanner-op-mobieltje-verhoogt-kans-identiteitsfraude/)
- Users raise privacy concerns about uploading documents to Smallpdf and iLovePDF. — [Capterra Smallpdf](https://www.capterra.com/p/172606/Smallpdf/reviews/); [G2 iLovePDF](https://g2.com/products/ilovepdf/reviews_and_filters?page=3)
- CamScanner's malware history and its permission requests are still cited in reviews in 2026. — [Unstar](https://unstar.app/blog/adobe-scan-camscanner-microsoft-lens-genius-scan-swiftscan-pdf-scanner-apps-ranked-2026)

### Inferences
- The strongest pitch is "processed on your phone, never uploaded, works offline". Supporting it with a visible "no network requests" claim, or offline/PWA mode, makes it credible for IDs, CNICs, passports and signatures.

### Gaps
- I found no survey measuring how many users avoid upload-based tools for ID documents, and no region-specific (South Asia or Middle East) privacy-attitude data.
