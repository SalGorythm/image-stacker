# On-device AI image tools for everyday users: user pain and in-browser feasibility (researched Oct 2026)

## What do users complain about in existing hosted tools (remove.bg, PhotoRoom, Canva, Picsart, Remini/upscalers)?

### Takeaway
The free tiers are deliberately limited. remove.bg's free output is capped at 0.25 MP, Canva's remover requires Pro, and Remini's free exports carry limits and watermarks. The loudest complaints are about billing: users charged after cancelling trials, weekly subscriptions and support that is hard to reach. Watermarks and paywalls that appear only at the download step are a repeated frustration. Most of this evidence comes from user-review aggregators and is anecdotal. I found no Reddit threads directly through search.

### Cited Findings
- remove.bg's free tier covers only low-resolution images (up to 0.25 megapixels) processed on the website for personal use. Higher resolutions (up to 50 MP) and commercial use need a subscription or pay-as-you-go credits — [remove.bg help](https://remove.bg/help/a/is-remove-bg-free-)
- An AlternativeTo user says remove.bg gives the full-quality image only once, after which only previews are available. This is a single user's opinion — [AlternativeTo](https://alternativeto.net/software/remove-bg/about)
- Canva's Remove Background button is visible on the free plan but locked behind Pro. Sources disagree about the trial: one says a single free use, another a 30-day Pro trial. Pro is cited at $12.99/month or $119.99/year (third-party blogs that promote competing tools) — [cutout.pro](https://www.cutout.pro/remove-background/background-remover-canva); [VanceAI](https://vanceai.com/posts/canva-background-remover-and-its-best-alternative/)
- A remove.bg comparison page says Picsart requires a subscription for high-resolution downloads after limited free use. The page is from a competitor and I could not verify Picsart's watermark rules — [remove.bg Picsart vs Canva](https://remove.bg/b/picsart-vs-canva)
- PhotoRoom reviewers report being charged after cancelling free trials, difficulty cancelling and refunds refused. One user cancelled during the trial and was still charged about $65. Others describe support handled only by AI bots — [eesel.ai review roundup](https://www.eesel.ai/blog/photoroom-reviews); [Sikayetvar](https://www.sikayetvar.com/en/photoroom-us/i-face-wrong-subscription-charge-from-photoroom-despite-canceling-trial); [Trustpilot](https://au.trustpilot.com/review/www.photoroom.com?page=5)
- A PhotoRoom user complains that watermarks were added after subscribing. Google Play review summaries include users calling it a "scam with a free trial and watermark" — [Sikayetvar](https://www.sikayetvar.com/en/photoroom-us/photoroom-added-watermarks-after-subscription-how-can-i-remove-them-without-paying-more-q-21212); [Kimola (preview of a paid report)](https://kimola.com/reports/dive-deep-into-photoroom-ai-reviews-a-comprehensive-analysis-google-play-en-us-140722)
- Remini (photo enhancer and unblur) is described as restrictive on the free tier, with daily limits and watermarked exports. Billing complaints include charges after trial cancellation and repeated weekly billing. Third-party sources cite about $6.99/week (Personal) and $9.99/week (Business). Reviewers also mention unskippable ads to open, enhance and save. Face output is called impressive but sometimes "plastic" — [unstar.app 2026 review](https://unstar.app/blog/is-remini-legit-safe-photo-enhancer-app-reviews-2026); [Kimola Remini](https://kimola.com/reports/unveil-insights-remini-ai-photo-enhancer-user-feedback-report-app-store-us-145126); [stork.ai](https://www.stork.ai/en/remini)
- Many "free" background tools show the result as a preview, then hit you with a paywall or force you to create an account when you try to download — [Hongkiat](https://www.hongkiat.com/blog/wp-json/wp/v2/posts/73338)

### Inferences
- The pain is about the business model more than the AI quality. Users like the output (PhotoRoom's background removal is called "quick and usually spot-on" in the [eesel roundup](https://www.eesel.ai/blog/photoroom-reviews)), but resent resolution caps, watermarks, signups and subscription traps. A free on-device tool with no account and full-resolution export targets exactly these complaints.
- Free output at 0.25 MP (about 600×400) is too small for marketplace product photos. That makes full-resolution export the clearest point of difference for small sellers.

### Gaps
- No Reddit, Quora or Etsy-forum threads came up in search. The demand evidence from communities is therefore thin, and the report writer should not claim specific Reddit quotes.
- I could not verify Pixelcut's, Let's Enhance's or the waifu2x sites' current free-tier terms. Their pages were inconsistent or did not come up.
- I found no complaints specific to passport photos or profile pictures.

## Which open models and libraries can run in the browser, at what download size and speed, and under which licences?

### Takeaway
Every one of the four features can run in the browser today. Licences are the main trap. The best-known background models (BRIA RMBG-1.4 and 2.0) are **non-commercial**, and IMG.LY's popular library is **AGPL-3.0**. Permissive options exist: BiRefNet (MIT, but large), MODNet (portraits), Real-ESRGAN (BSD-3), Swin2SR, LaMa (Apache-2.0), MI-GAN (MIT code, weights licence unverified), MediaPipe BlazeFace and Tesseract. Published speed numbers for mid-range Android are almost absent.

### Cited Findings
**Background removal**
- **BRIA RMBG-1.4**: 44.1M parameters, supported by Transformers.js (`image-segmentation` pipeline). The licence is "bria-rmbg-1.4": source-available for **non-commercial use only**, and commercial use requires an agreement with BRIA — [HF model card](https://huggingface.co/briaai/RMBG-1.4)
- **BRIA RMBG-2.0**: about 0.2B parameters, built on BiRefNet. The licence is **CC BY-NC 4.0 (non-commercial)** and commercial use needs a BRIA agreement. It is supported by Transformers.js and has quantized ONNX variants — [HF model card](https://huggingface.co/briaai/RMBG-2.0)
- **@imgly/background-removal (background-removal-js)** is licensed **AGPL-3.0**, with other licensing available through support@img.ly. Using it in a closed-source PWA would trigger AGPL obligations. The README does not give model sizes or WebGPU details — [GitHub](https://github.com/imgly/background-removal-js)
- **BiRefNet**: ONNX re-hosts list it as MIT. One third-party review says the upstream README does not state a licence explicitly, so check before commercial use. Stock ONNX exports of BiRefNet_lite throw out-of-memory errors in ONNX Runtime Web on both the WASM and WebGPU backends. A custom re-export (GridSample in place of deformable convolution, fixed 1024×1024 input) runs on both. The full matting variant is about 900 MB — [birefnet-lite-onnx](https://huggingface.co/CoderViking/birefnet-lite-onnx); [birefnet-lite-webgpu (fp16)](https://huggingface.co/runes/birefnet-lite-webgpu); [birefnet-hr-matting-onnx](https://huggingface.co/PinkPixel/birefnet-hr-matting-onnx); [SourcePulse](https://www.sourcepulse.org/projects/1187396)
- **MODNet** ("tiny portrait background removal model") runs in the Transformers.js remove-background-webgpu demo. A Transformers.js video demo reported about 20 fps with WebGPU on the author's machine (fp32, because fp16 was broken at the time) — [HF Space](https://huggingface.co/spaces/Rene78/remove-background-webgpu/blob/main/README.md); [search summary of Transformers.js discussion](https://app.semanticdiff.com/gh/huggingface/transformers.js/pull/545/overview)
- **BEN2** has a Transformers.js-compatible fp16 ONNX mirror. No size was given — [HF](https://huggingface.co/kittypdf/BEN2-transformersjs)
- Open-source client-side tools already exist. **BG0** downloads a BiRefNet ONNX model matched to the hardware, caches it, and uses WebGPU with a WASM fallback. A Show HN tool ("I Hate Background") reports **about 12 s per removal on mid-range hardware** and got only 1 point on HN. All privacy claims here are self-reported — [BG0 wiki](https://github.com/opencoredev/bg0/wiki); [Show HN](https://hn.svelte.dev/item/45940793)

**Upscaling and enhancement**
- **UpscalerJS** is MIT-licensed and runs in the browser and Node on TensorFlow.js. Its default model is a copy of the 2x esrgan-slim model (MIT) — [yarn @upscalerjs/default-model](https://classic.yarnpkg.com/en/package/@upscalerjs/default-model); [esrgan-slim](https://classic.yarnpkg.com/en/package/@upscalerjs/esrgan-slim)
- **Real-ESRGAN** official weights are **BSD-3-Clause**, so commercial use is OK. x4plus has 16.7M parameters and is about 64–67 MB. A small general model has 1.2M parameters and is 4.6 MB. Community models such as **4x-UltraSharp are CC-BY-NC-SA-4.0 (non-commercial)** — [HF tinier-upscale-models](https://huggingface.co/jonathanst29/tinier-upscale-models); [HF real-esrgan-models](https://huggingface.co/wkrettek/real-esrgan-models); [HF AI_upscalers](https://huggingface.co/easygoing0114/AI_upscalers)
- **Swin2SR** has Transformers.js ports (x2/x4 classical, x4 "compressed" for JPEG-damaged input, and real-world BSRGAN) through the `image-to-image` pipeline, with fp32, fp16, q8 and q4 dtypes. No file sizes were confirmed. One third-party page claims about 60 MB, unsourced — [Xenova swin2SR-compressed-sr-x4-48](https://huggingface.co/Xenova/swin2SR-compressed-sr-x4-48); [Xenova x2](https://huggingface.co/Xenova/swin2SR-classical-sr-x2-64); [teamzlab (unverified)](https://tool.teamzlab.com/image/ai-image-upscaler/)

**Face, text and PII detection for automatic blurring**
- **MediaPipe Face Detector** offers BlazeFace short-range, full-range and sparse full-range models (128×128 input, float16). Latency is 2.94 ms on CPU and 7.41 ms on GPU (short-range, Pixel 6), and a Web guide exists. The page gives no file sizes or model licence. Its code samples are Apache 2.0 — [Google AI Edge docs](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector)
- **Tesseract.js** fetches `*.traineddata` per language (4.0.0_best_int by default) and caches it locally. The `@tesseract.js-data/eng` package shows an MIT licence. A different engine, tesseract-wasm, reports about 2.1 MB for the library plus English data (Brotli) — [naptha/tessdata](https://github.com/naptha/tessdata); [jsDelivr eng](https://www.jsdelivr.com/package/npm/@tesseract.js-data/eng); [tesseract-wasm](https://www.npmjs.com/package/tesseract-wasm)

**Object and blemish removal (inpainting)**
- **MI-GAN** (Picsart AI Research): the code is MIT and the weights fall under a separate LICENSE-WEIGHTS file whose terms I could not read. It is "one order of magnitude smaller and faster" than SOTA. A full-pipeline ONNX export (uint8 image plus mask, any resolution) is on HF. No mobile timings are published — [GitHub](https://github.com/Picsart-AI-Research/MI-GAN)
- MI-GAN is said to be 7× smaller than LaMa — [pub.dev seika](https://pub.dev/packages/seika)
- **inpaint-web** is open source and uses WebGPU plus WASM in the browser with MI-GAN. Its licence is not stated and it is reportedly inactive — [GitHub](https://github.com/vicbravo-zz/inpaint-web); [SourcePulse](https://www.sourcepulse.org/projects/1919610)
- **LaMa** ONNX (512×512) is Apache-2.0 — [HF sapienkit/LaMa-ONNX](https://huggingface.co/sapienkit/LaMa-ONNX)
- MI-GAN has been run in the browser with ONNX Runtime Web, WebGPU and Web Workers for video watermark removal — [DEV](https://dev.to/martindelophy/removing-video-watermarks-entirely-in-the-browser-with-mi-gan-onnx-runtime-web-and-webgpu-1jdi)

### Inferences
- Choices that are safe for a commercial or closed PWA: MODNet or a BiRefNet-lite re-export for background removal (check the upstream licence), Real-ESRGAN small or general and Swin2SR for upscaling (check the Swin2SR weight licence), MediaPipe BlazeFace for faces, Tesseract.js for text, and LaMa (Apache-2.0) for inpainting. Use MI-GAN only after reading LICENSE-WEIGHTS. Avoid RMBG-1.4/2.0, IMG.LY (unless the app is AGPL) and community NC upscalers.
- Automatic blurring of screenshots is the cheapest feature. BlazeFace and Tesseract each need only a few MB at most and run fast. The app already has blur and pixelate tools (repo commit 26afdde), so detection would only need to feed boxes into the existing redaction layer.
- Speed differs widely: face detection takes milliseconds, while background removal at 1024² took about 12 s on mid-range hardware in one self-report. Upscaling a 4x model on a phone will likely need tiling and progress UI. This is inferred, not measured.

### Gaps
- I found no benchmark of any of these models on a named mid-range Android phone (for example Snapdragon 6/7-series) in the browser.
- No confirmed file sizes for IMG.LY's isnet variants, MODNet ONNX, Swin2SR quantized ONNX, MediaPipe BlazeFace .tflite or Tesseract.js eng traineddata.
- The licence of the MediaPipe BlazeFace model card and MI-GAN's LICENSE-WEIGHTS terms were not verified.
- I did not research face restoration models (GFPGAN/CodeFormer) for old family photos. CodeFormer is widely reported as non-commercial (S-Lab licence), but that was not verified here.

## Demand signals: search interest and community threads

### Takeaway
The supply side is full of "free, no signup, no watermark, runs in your browser" background removers (Product Hunt, Peerlist, Show HN). This suggests founders see demand, but it also means the niche is crowded. I could not obtain quantitative search-volume data or Reddit threads.

### Cited Findings
- Several Product Hunt launches explicitly market "no signup, no watermark, no credits, runs in browser": RemoveBgNow, BG Remove AI and CutOut (CutOut had 6 upvotes) — [PH RemoveBgNow](https://www.producthunt.com/posts/1223028); [PH BG Remove AI](https://www.producthunt.com/products/bg-remove-ai); [hunted.space CutOut](https://www.hunted.space/product/cutout-free-background-remover)
- More client-side background tools: nobg (works offline after first visit), Clipo, Pixmunk, and a Transformers.js tool on the HF forum — [Peerlist nobg](https://peerlist.io/jayantmehra02/project/nobg); [HF forum](https://discuss.huggingface.co/t/built-a-privacy-first-background-removal-tool-running-entirely-in-the-browser-with-transformers-js); [hunted.space Pixmunk](https://www.hunted.space/product/pixmunk)
- TopAI.tools has a dedicated category for "No Signup Background Remover" — [topai.tools](https://topai.tools/s/no-signup-background-remover)

### Inferences
- A standalone browser background remover is commoditised, and low upvotes such as CutOut's 6 suggest weak differentiation on its own. The opportunity is more likely in bundling it into an existing workflow (stacking, carousels, redaction) than in a single-purpose tool.

### Gaps
- No Google Trends or keyword-volume data was retrieved for "remove background free no signup", "unblur photo free", "enhance old photo free" or "blur faces in photo online".
- No Reddit or Quora threads were surfaced by search, despite targeted queries.

## Privacy and safety concerns (family and children photos; is on-device valued?)

### Takeaway
Many small apps now put "processed locally, never uploaded" in their privacy policies and App Store listings. Privacy-first launches lead with the same message. This shows sellers believe users value it. I found no direct survey or quantitative evidence of user preference.

### Cited Findings
- One background remover's policy says the App processes photos locally on your device and photos are never uploaded. Another policy says images are processed on-device unless a feature clearly states otherwise — [imgprivacy policy](https://sites.google.com/view/imgprivacy); [Notion policy](https://chisel-hawthorn-89d.notion.site/Privacy-Policy-BACKGROUND-REMOVER-Remove-BG-326ab807cbbd80eb9d3afd53a090856d)
- Some App Store photo-editor listings declare identifiers used for cross-app tracking — [App Store listing](https://apps.apple.com/us/app/viral-ai-photo-editor/id6737092798)
- A Show HN post pitches itself as "the alternative to remove.bg that is privacy and AI-first", and BG0 advertises "without uploading the source image" — [Show HN](https://hn.svelte.dev/item/45940793); [BG0](https://github.com/opencoredev/bg0/wiki)
- The privacy claims of these tools are self-reported and unverified. Users would need the network tab to confirm them — [same Show HN / BG0 sources]

### Inferences
- An app that already runs fully client-side can state "nothing leaves your device" credibly and verifiably. This matters most for redacting screenshots (phone numbers, names) and for children's or family photos.

### Gaps
- No survey data on parents' reluctance to upload children's photos to AI editors.
- I did not retrieve remove.bg's or PhotoRoom's own retention or training policies.

## Effort and pitfalls for adding these to a React PWA

### Takeaway
WebGPU now ships by default on Chrome for Android (121+, Android 12+, Qualcomm/ARM GPUs) and on iOS/iPadOS 26 Safari, with WASM as a fallback elsewhere. The real risks are first-load model size, silent tab kills on iOS when memory runs out, GPU memory leaks in single-page apps, and broken ONNX exports. Each feature is roughly days to a couple of weeks of work, depending on the model.

### Cited Findings
- WebGPU support as of Nov 25, 2025: Chrome for Android 121+ on Android 12+ with Qualcomm/ARM GPUs. Safari on iOS 26, iPadOS 26 and macOS Tahoe 26. Firefox on Windows 141+ and ARM Macs 145+. Firefox on Android and Linux is still in progress — [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- A SitePoint comparison table still lists Safari WebGPU as "experimental", which conflicts with the above. That table is probably outdated — [SitePoint](https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/)
- iOS 26 WebGPU has a reported crash (iPhone 15 Pro/16 Pro Max, iOS 26.0–26.1) tied to resource tracking in the Metal backend. It is a graphics workload, not ML — [WebKit bug 302711](https://bugs.webkit.org/show_bug.cgi?id=302711)
- When iOS Safari runs out of memory, no explicit OOM error reaches JS. The tab is simply killed and reloaded — [WebKit bug 300782](https://bugs.webkit.org/show_bug.cgi?id=300782)
- GPUBuffer and GPUTexture memory is not garbage-collected. After a few SPA route changes, about 1 GiB can stay pinned until the tab crashes, so models must be disposed explicitly — [SitePoint profiling](https://www.sitepoint.com/profiling-webgpu-memory-local-ai/)
- Transformers.js falls back to WASM on the CPU when WebGPU is missing. Smaller dtypes (q4f16, q8) reduce weight memory, which matters most on iPhones — [SitePoint](https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/)
- Stock BiRefNet-lite ONNX runs out of memory in ORT Web. The fp16 WebGPU build needs the JSEP build of onnxruntime-web — [CoderViking](https://huggingface.co/CoderViking/birefnet-lite-onnx); [runes](https://huggingface.co/runes/birefnet-lite-webgpu)
- Tesseract.js uses one package per language because bundling everything "would lead to an enormous download". Data is cached locally after the first fetch — [naptha/tessdata](https://github.com/naptha/tessdata)
- Running inference in Web Workers keeps the UI responsive (MI-GAN example) — [DEV](https://dev.to/martindelophy/removing-video-watermarks-entirely-in-the-browser-with-mi-gan-onnx-runtime-web-and-webgpu-1jdi)

### Inferences
- Rough effort, inferred from library maturity and not measured:
  - **Face/text auto-blur:** small effort (about 2–5 days). Use MediaPipe Tasks Vision for faces and Tesseract.js word boxes plus regexes for phone numbers and emails, fed into the existing blur boxes.
  - **Background removal:** medium effort (about 1–2 weeks). Use the Transformers.js pipeline with a permissively licensed model, a worker, a progress bar, cache Storage, and a white or colour background fill for passport and product shots.
  - **Upscaling:** medium effort. Use Real-ESRGAN small or Swin2SR with tiling to avoid OOM on phones, and expect seconds to tens of seconds.
  - **Inpainting:** medium to high effort. Use a LaMa or MI-GAN ONNX pipeline plus a mask brush UI.
- Load models lazily, only when a tool is opened, so the base PWA stays light. Show the download size before the first run, cache models in Cache Storage or OPFS, and cap input resolution on iOS.

### Gaps
- No measured first-run latency or peak memory figures for these models on iPhone Safari or mid-range Android.
- I did not confirm current Firefox Android WebGPU status for late 2026, or the share of Android devices that meet the Android 12+ and Qualcomm/ARM GPU requirement.
