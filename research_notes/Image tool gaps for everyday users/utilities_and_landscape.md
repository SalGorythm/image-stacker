# Small image utilities and the free, private, in-browser image tool landscape (as of Oct 2026)

Note on sources: much of the material in this space is vendor or competitor marketing, especially QR blogs and "privacy-first" tool sites. These are flagged where used. Trustpilot and app-store reviews are unverified individual accounts.

## 1. QR code generators: documented complaints and what users want

### Takeaway
The dominant complaint is a bait-and-switch. "Free" generators steer users to dynamic (redirect) codes, then deactivate them after a 10–14-day trial, or when a subscription lapses, after the codes are already printed. The fix users want is a static, no-signup, no-expiry code, with WiFi, WhatsApp and logo options as common asks. Many single-purpose sites now market exactly "no signup, no expiry, no watermark", so the niche is crowded. That pitch is table stakes, not a differentiator.

### Cited Findings
- QRCG (qr-code-generator.com, now "QRCG by Bitly") has a Trustpilot TrustScore of 1.3/5 across 9,335 reviews. Recent complaints (Sep–Oct 2026) include "Offers free forever then the link below it goes straight to the paid version", "make any QR codes you have completely inoperable if you dont keep their plus plan", "$18.99 monthly subscription rate but then charge you for the entire year", and "The support chat is an AI bot and there is no support email". Trustpilot notes the company has not replied to negative reviews. — [Trustpilot QRCG](https://www.trustpilot.com/review/www.qr-code-generator.com)
- A Trustpilot reviewer said a code that expired after 14 days ruined 10,000 printed fliers. A qr-code.ai reviewer described codes "deactivated after a 10-day trial I wasn't clearly warned about". — [Good Men Project (summarising Trustpilot)](https://goodmenproject.com/business-ethics-2/they-printed-10000-flyers-then-their-qr-codes-went-dark/); [Trustpilot qr-code.ai](https://jp.trustpilot.com/review/qr-code.ai)
- Capterra reviews of QR Code Generator Pro: "Two weeks later they deactivated it so it doesn't work and want $25 a month to keep it active." — [Capterra](https://www.capterra.com/p/177261/QR-Code-Generator-Pro/reviews/)
- Vendors document the behaviour themselves. Egoditor/QR Code Generator says dynamic codes made during the 14-day trial "are deactivated at the end of the free trial". QRFY says trial dynamic codes are "deactivated and linked to a service page". (Reported via the same search summary. The original support pages were not fetched directly.) — [Qrcake explainer](https://qrcake.com/blog/qr-code-stopped-working); [QR Nova deep-dive (competitor)](https://qrcodenova.com/en/blog/qr-code-subscription-scam)
- SmartCustomer aggregate ratings: qr-code-generator.com 2.2/5 (349 reviews), qrcodecreator.com 1.8/5 (38 reviews). Other sites with similar complaints include Get-QR, qrty.mobi, qrzilla.mobi and QRCode Monkey. One qrcodecreator reviewer claims to be organising litigation and contacting Irish authorities (unverified). — [SmartCustomer qr-code-generator](https://www.smartcustomer.com/reviews/qr-code-generator.com); [SmartCustomer qrcodecreator](https://www.smartcustomer.com/reviews/qrcodecreator.com); [Trustpilot Get-QR](https://www.trustpilot.com/review/get-qr.com)
- Restaurants: a lapsed trial typically sends scanners to a 404 or an upgrade page instead of the menu. Separately, some restaurants reintroduced paper menus after customers complained about QR menus (2024). — [Tabres (vendor)](https://tabres.com/en/articles/why-your-qr-code-menu-stopped-working); [PYMNTS 2024](https://www.pymnts.com/restaurant-technology/2024/restaurants-reintroduce-paper-menus-amid-customer-complaints-about-qr-codes/)
- An Indie Hackers founder framed the core pain: when you stop paying, the code stops working rather than degrading gracefully, and it is printed on things that are expensive to replace. — [Indie Hackers](https://www.indiehackers.com/post/no-monthly-fee-for-qr-codes-dynamic-hosted-pages-that-are-stuck-to-a-wall-for-years-hyK0emMYwPvTc7gblo7l)
- The pattern appears in partner-content consumer press: "Your QR Code Stops Working the Moment You Stop Paying". — [North Penn Now](https://northpennnow.com/news-from-our-partners/your-qr-code-stops-working-the-moment-you-stop-paying/)
- What users want, as marketed by the counter-wave of sites: OpenQR ("no sign-up, no expiry, no watermark"; URL, WiFi and contact codes; PNG and SVG), FreeQR (WhatsApp and WiFi types, no account), QubiQR (WiFi and WhatsApp, no account) and QRTRAC (permanent static). — [OpenQR](https://openqr.tech/); [FreeQR](https://www.freeqr.world/); [QubiQR](https://www.qubiqr.com/en); [QRTRAC](https://qrtrac.com/free-qr-code-generator/); [CodexQR](https://codexqr.com/free-qr-code-generator)
- Reddit-derived roundups recommend static codes for WiFi and contact cards, and note that Chrome and Edge can make a QR for any page natively. Sources conflict on whether QRCode Monkey requires signup or expires codes. — [Pageloot (vendor)](https://pageloot.com/compare/best-qr-code-generator-reddit/); [Medium roundup](https://medium.com/@samkostabi/the-best-qr-code-generator-according-to-reddit-2026-2c053983aea9)
- WhatsApp click-to-chat QR: the format is `https://wa.me/<number>` (no +, zeros, dashes or parentheses), with an optional `?text=` prefilled message. It opens a chat on scan. Many B2B WhatsApp vendors offer free generators as lead magnets (Wati, MSG91, Konvo, Chatwerk). imbee's generator runs in the browser and stores nothing. wa.me has no analytics of its own. — [Saysimple](https://helpcenter.saysimple.com/whatsapp-management/whatsapp-click-to-chat); [Wati](https://www.wati.io/en/free-whatsapp-qr-code-generator/); [imbee](https://www.imbee.io/whatsapp-link-generator); [MSG91](https://msg91.com/in/free-whatsapp-link-generator)
- Volume indicator: one 2026 blog cites 110K average monthly Google searches for "free QR code generator" (Keyword Planner, secondhand). — [txtimpact](https://www.txtimpact.com/blog/best-free-qr-code-generator)

### Inferences
- A static QR maker inside a client-side PWA naturally avoids the core complaint: nothing to expire and no server to hold codes hostage. Messaging like "this code is the link itself; it can never be switched off" speaks directly to the documented pain.
- The highest-value variants for a WhatsApp-focused audience are a wa.me click-to-chat QR (with prefilled message), a WiFi QR, a vCard QR and a logo in the centre. Exporting a shareable image (QR plus caption, e.g. "Scan to chat with us") sized for WhatsApp Status or flyers ties into existing stacking and caption features.
- Since "no signup, no expiry" is already claimed by many sites, differentiation should come from integration (QR plus poster/caption/stack, sent to WhatsApp) rather than the claim itself.

### Gaps
- No FTC, BBB or EU regulator action on QR subscription traps was found. Only reviews and claims of planned litigation.
- No direct Reddit threads were fetched. Reddit evidence is via secondhand roundups.
- No verified Ahrefs/Semrush volume for "qr code generator" (head term).

## 2. Other small utilities: favicon, palette, comparison, GIF, grid splitting

### Takeaway
Pain is lighter than for QR. The dominant tools (ezgif, RealFaviconGenerator) are free and watermark-free, but they upload files (ezgif deletes after an hour). Mobile grid-splitter apps are where watermark and ad complaints concentrate. Palette extraction and before/after comparison are served by many small, often privacy-claiming tools, which means low barriers but also little lock-in.

### Cited Findings
- Griddy (iOS Instagram grid splitter): reviews complain about the free-version watermark and paying to remove it, and that the ad close "x" is "so far up in the corner that it can't be tapped on iPhones X and up" (reviews from 2017–2021, so older). — [App Store Griddy](https://apps.apple.com/us/app/griddy-split-photo-grid-posts/id1114106704); [JustUseApp Griddy reviews](https://justuseapp.com/en/app/1114106704/griddy-split-pic-in-grids/reviews)
- A blog test of grid apps found "a giant watermark unless paid" and "a 30-second unskippable ad just to export" (anecdotal). GridSplit (web) adds a small watermark to exports. Many web splitters (Post Bridge, SplitX, 9grid, Pixoate, imagexyz) advertise no watermark and in-browser processing. — [Toolknit blog](https://toolknit.com/blog/splitting-photos-into-grids-for-instagram.html); [GridSplit](https://gridsplit.app/); [SplitX](https://www.getsplitx.com/); [Post Bridge](https://www.post-bridge.com/tools/instagram-grid-maker); [Pixoate](https://pixoate.com/instagram-grid-split)
- ezgif: "no watermarks, no signup, no conversion limits", but it is server-side. Uploaded files are deleted after 1 hour. Reported limits include 60 s at 5 fps, lower at higher frame rates. — [ezgif maker](https://ezgif.com/maker); [ezgif overlay](https://ezgif.com/overlay); [SourceForge ezgif](https://sourceforge.net/software/product/Ez-GIF-Maker/)
- RealFaviconGenerator is the de facto favicon tool. It generates platform icons plus HTML markup and a checker, and is actively maintained with CLI/Gulp/Grunt integrations. No ad or watermark complaints were found. Its audience is web developers, not everyday users. — [RealFaviconGenerator](https://realfavicongenerator.net/); [GitHub](https://github.com/realfavicongenerator)
- Palette extraction: several Chrome extensions claim on-device processing and no data collection (DuckColor, Color Palette Generator), while some iOS apps (e.g. Colors Extractor) declare tracking identifiers and location in privacy labels. — [Chrome Web Store](https://chromewebstore.google.com/detail/lihkmemikhghelkjlapbofmlipibcbdh); [Chrome Web Store 2](https://chromewebstore.google.com/detail/manademglgenlgbhakknkcknkkclggln); [App Store Colors Extractor](https://apps.apple.com/us/app/-/id6443813150)
- Before/after comparison: imgi (free, offline in-browser mode, $4/mo paid tier), imageonline.io Image Compare (no registration), and Instant Before And After on Product Hunt (claims no signup, no watermark, local processing). Shopify and Wix apps serve merchants. — [imgi via AlternativeTo](https://alternativeto.net/software/imgi-co/about/); [imageonline Image Compare](https://imageonline.io/image-compare/); [Product Hunt Instant Before And After](https://www.producthunt.com/products/instant-before-and-after/makers); [Shopify app](https://apps.shopify.com/before-and-after-slider?locale=cs)

### Inferences
- For WhatsApp users, a before/after output that is a single shareable image or short GIF/MP4 (WhatsApp cannot display an interactive slider) is more useful than a web slider. The existing side-by-side stacking already covers half of this. A "wipe" animation export would be the novel part.
- GIF-from-images is well served by ezgif on desktop but is upload-based and desktop-oriented. A mobile, local version that outputs WhatsApp-friendly MP4 or GIF (WhatsApp converts GIFs to video internally, which is unverified here) could fill a mobile gap.
- Favicon/app-icon generation is a developer niche with a strong incumbent. Low priority for everyday WhatsApp users.

### Gaps
- No quantified search volumes found for palette, comparison, GIF-maker or grid-splitter keywords.
- No current (2025–26) review data for grid-splitter apps. The Griddy complaints are old.

## 3. All-in-one sites: usage, monetisation and complaints

### Takeaway
Traffic leaders are iLoveIMG (tens of millions of visits a month) and Photopea (~13–17M), followed by Pixlr, TinyWow and 123apps. Monetisation is overwhelmingly ads plus a premium tier that removes ads, limits or CAPTCHAs. Hard usage caps are the most resented: Pixlr allows 3 saves a day, and TinyWow's reported cap is disputed. Others are subscription and billing traps, CAPTCHAs, slow downloads, and uploading files to servers.

### Cited Findings
- iLoveIMG: about 50.14M visits in Sep 2026 (+14.5% vs Aug) per Semrush. Similarweb shows it ahead of Photopea in Aug 2026, and a Similarweb competitor table lists 27.2M (period unclear). The methods differ, so the figures are not directly comparable. — [Semrush iLoveIMG](https://www.semrush.com/website/iloveimg.com/overview/); [Similarweb photopea vs iloveimg](https://www.similarweb.com/website/photopea.com/vs/iloveimg.com/); [Similarweb tinyjpg competitors](https://www.similarweb.com/website/tinyjpg.com/competitors/)
- iLoveIMG's privacy claims are marketing-level ("100% security"). Its WP plugin readme says files are encrypted and auto-deleted after processing. Files are uploaded to its servers. — [iLoveIMG legal](https://www.iloveimg.com/help/legal); [iLoveIMG readme](https://cdn.jsdelivr.net/wp/iloveimg/trunk/readme.md)
- Photopea: ~16.6M visits (Sep 2025, Similarweb). It is run by one developer and in 2021 made ~$100K/month, ~90% from ads, with the rest from premium and licensing. Growth was famously kicked off by a Reddit AMA. — [Similarweb Photopea](https://www.similarweb.com/website/photopea.com/); [Failory interview 2021](https://failory.com/interview/photopea); [Genbeta](https://www.genbeta.com/web/photopea-clon-photoshop-gratis-online-que-ha-generado-millon-dolares-12-meses-asi-ha-conseguido); [Indie Hackers on Reddit AMA](https://www.indiehackers.com/post/how-reddit-ama-earned-photopea-12m-monthly-users-7c66c1d9ad)
- Squoosh (Google, fully client-side): ~1.92M monthly visits per HypeStat/Similarweb (date unclear). — [HypeStat](https://hypestat.com/info/squoosh.app)
- TinyWow: one ad per page is its stated monetisation, plus a premium tier ($5.99/mo in one listing) that removes ads and CAPTCHAs and speeds processing. An older founder post put revenue at ~3/4 ads and 1/4 subscriptions. Uploaded files are deleted 1 hour after processing. Third-party analytics and ad personalisation are used, with opt-out. A competitor claims a 5-tasks-a-day cap since 2023 (unverified). — [TinyWow your-data](https://tinywow.com/your-data); [BGR](https://www.bgr.com/tech/tinywow-this-free-file-converter-website-has-completely-changed-the-way-i-work/); [LinkedIn (older)](https://www.linkedin.com/posts/evangower_tinywow-activity-6959968613432754176-JqkQ); [PDFWix (competitor)](https://www.pdfwix.com/alternatives/tinywow); [ToS;DR](https://edit.tosdr.org/documents/15583)
- TinyWow Trustpilot complaints: a paid Unlimited plan never activated, slow downloads, and Cloudflare CAPTCHAs. — [Trustpilot TinyWow](https://de.trustpilot.com/review/tinywow.com)
- Pixlr: the free account is limited to 3 saves a day (Pixlr's own reply to a review, May 2025, quoted secondhand). Trustpilot complaints are dominated by billing and auto-renewal. Free users see full-screen ads. A Reddit user: "In the time post save limit, I have used Pixlr maybe a dozen times". — [Atlas Cloud blog](https://www.atlascloud.ai/blog/tips/pixlr-alternative); [checkthat.ai Pixlr reviews](https://checkthat.ai/brands/pixlr/reviews); [leaveit2ai](https://leaveit2ai.com/ai-tools/image/pixlr); [Similarweb Pixlr](https://www.similarweb.com/website/pixlr.com/)
- Server-upload converters (CloudConvert, Convertio, Zamzar, iLovePDF) are now explicitly targeted by privacy-comparison pages from local-processing rivals. — [ConvertSafe privacy comparison (competitor)](https://convertsafe.app/privacy-comparison)

### Inferences
- The recurring dislike set is caps, billing traps, CAPTCHAs/ads, uploads and desktop-centric UIs. A local PWA with no caps (local compute costs the operator nothing per use) can credibly promise "no daily limits, ever", which server-based rivals cannot afford to offer.
- None of the leaders is built around WhatsApp as the destination (size limits, Status 9:16, sticker or document send, share sheet). That is the clearest positioning gap.

### Gaps
- Canva free-plan complaints, BeFunky, Bulk Resize Photos and 123apps monetisation were not researched in this pass (search returned nothing usable for them).
- No consistent same-month traffic comparison across all suites.

## 4. Does "runs locally, nothing uploaded" build trust? And how do these tools get discovered?

### Takeaway
"Client-side, no upload" resonates with technical audiences: the 2022 Webutils Show HN got 188 points and 103 comments. HN commenters are sceptical that it can be verified, however, and the "privacy-first, no upload" image toolkit category is now saturated with near-identical sites (dozens of 20–100-tool suites, plus directories of them). Most new launches get little traction (e.g. a 2025 Show HN with 1 point). Discovery works through SEO single-purpose pages, Reddit/HN community moments, and strong open-source brands (VERT). The claim alone does not drive adoption.

### Cited Findings
- Webutils Show HN ("Bulk convert images online without sending to server", Jan 2022): 188 points, 103 comments. Trust concerns: "one can never be sure that the image actually stays within the browser"; a site "can serve different code on each visit"; "You cannot have privacy with web apps. At all. Ever." Counterpoint: desktop apps can phone home too. Commenters asked for PWA/offline support, which the author added. Squoosh was praised as "freaking awesome". — [HN 30045901](https://news.ycombinator.com/item?id=30045901)
- OnlyJPG and ImageConverter.dev Show HNs (2025): commenters asked how users can verify the no-upload claim. In one case the author admitted the privacy policy was a template. The suggested verification is to load the page, go offline and see if it still works. — [HN OnlyJPG](https://news.ycombinator.com/item?id=45615454); [HN ImageConverter](https://news.ycombinator.com/item?id=45693904)
- "Show HN: Free client-side image compressor (privacy-first, no uploads)" (ToolboxNest, ~late 2025): 1 point and no outside comments, which shows how saturated the category is. — [HN 46042122](https://news.ycombinator.com/item?id=46042122)
- VERT (open-source, WebAssembly ImageMagick/FFmpeg/Pandoc, AGPL) does images, docs and audio locally but sends video to its servers. It uses no cookies, with self-hosted Plausible. A third party claims it hit #1 on HN in Dec 2025 with 14K+ GitHub stars (unverified; another blog says 7.1K stars). — [VERT privacy](https://vert.sh/privacy/); [ConvertSafe](https://convertsafe.app/privacy-comparison); [ricardorosero.com](https://ricardorosero.com/posts/vert-the-free-local-file-converter/)
- Category saturation: privacyfirst.tools (85+ tools), Privacy Pix Tools (58), BrowserStay (100+), browserbasedtools.com, Resizely, and the NoUploadTools directory. PixPipe (23 tools, Canvas/WASM/ONNX, no backend), Devool-pro, Lumli, Imglio and Pixoate launched on IH and PH. Commenters praised no-upload for sensitive client photos and asked for batch processing. — [privacyfirst.tools](https://privacyfirst.tools/); [Privacy Pix Tools](https://www.privacypixtools.com/); [BrowserStay](https://browserstay.com/); [NoUploadTools directory](https://nouploadtools.com/directory?cat=security-privacy); [IH PixPipe](https://www.indiehackers.com/post/i-built-a-free-browser-based-image-video-toolkit-with-23-tools-everything-runs-client-side-nothing-gets-uploaded-fc01d918d3); [Hunted Devool-pro](https://hunted.space/product/devool-pro); [PH Lumli](https://www.producthunt.com/products/lumli/makers)
- Product Hunt reception data is thin. ToolHover (privacy-first general toolkit) ranked #107 of 400+ on its launch day. Resizely self-reports "4.9/5 from 1,200+ Product Hunt reviews". — [DEV ToolHover](https://dev.to/quantumregex/building-toolhover-a-privacy-first-toolkit-that-ranked-107-on-product-hunt-3p8c); [Resizely](https://resizely.io/)
- Discovery: free tools are a known SEO acquisition channel (e.g. Canva's design tool pages cited at 31M+ visits/month). Photopea's breakout came from a Reddit AMA. WhatsApp-vendor QR generators exist as SEO lead magnets in many localised URL variants (msg91 /in, /ae, /ph, /es). — [Indie Hackers free-tool SEO](https://www.indiehackers.com/post/why-you-need-free-tool-marketing-for-seo-96483befea); [Indie Hackers Photopea AMA](https://www.indiehackers.com/post/how-reddit-ama-earned-photopea-12m-monthly-users-7c66c1d9ad); [MSG91 AE](https://msg91.com/ae/free-whatsapp-link-generator)

### Inferences
- For a suite added to Image Stacker, "nothing uploaded" should be a supporting proof point, not the headline. Make it verifiable: a "works offline, try airplane mode" badge (the PWA already caches) answers the top HN objection directly. Open-sourcing helps further, as VERT's reception suggests.
- Each utility should have its own crawlable landing route (e.g. /qr/whatsapp, /grid/instagram, /before-after) to capture single-purpose search intent, while the in-app hand-off between tools (QR to poster to WhatsApp) provides retention that single-purpose sites lack.
- Every exported image is a distribution vector in WhatsApp groups, but watermarks are hated (see Griddy). An optional, tasteful "made with" mark, or a share link in the share-sheet text rather than on the image, is the safer approach. This is an inference. No data on WhatsApp word-of-mouth for image tools was found.

### Gaps
- No direct evidence on WhatsApp-group word-of-mouth as a discovery channel for image tools.
- No Product Hunt upvote numbers for privacy-first image suites. The HN thread for VERT was not fetched.

## 5. What is missing from the market for these users

### Takeaway
Nearly every individual utility exists for free somewhere, often locally. What is missing is a mobile-first, offline-capable suite whose outputs are designed for WhatsApp (chat, Status, groups, catalog), with no caps, no account and no watermark, that chains tools together rather than living as isolated pages.

### Cited Findings
- Incumbent suites are desktop- and server-oriented, with caps and ads (Pixlr 3 saves a day, TinyWow ads, CAPTCHAs and premium, ezgif server uploads). — [Atlas Cloud](https://www.atlascloud.ai/blog/tips/pixlr-alternative); [TinyWow](https://tinywow.com/your-data); [ezgif](https://ezgif.com/overlay)
- WhatsApp QR generators are almost all B2B lead magnets for WhatsApp API vendors (Wati, MSG91, Konvo, Chatwerk), not consumer tools that also make the poster or Status image around the code. — [Wati](https://www.wati.io/en/free-whatsapp-qr-code-generator/); [Konvo](https://konvoai.com/whatsapp-link-generator); [Chatwerk](https://chatwerk.de/en/whatsapp-qrcode-generator/)
- Before/after tools output interactive sliders for websites (Shopify, Wix, imgi), not formats that play inside WhatsApp. — [Wix app](https://www.wix.com/app-market/before-after-photo-slider-globalentryfast); [imgi](https://alternativeto.net/software/imgi-co/about/)

### Inferences (gap candidates for Image Stacker)
- **WhatsApp QR kit:** a static wa.me QR with a prefilled message, plus WiFi, vCard, UPI/payment link (region-dependent) and logo in the centre, exported as a print-ready flyer or Status image with caption. The selling point is that it never expires.
- **Before/after for chat:** a stacked side-by-side (already possible) plus an animated wipe exported as MP4 or GIF that plays in WhatsApp.
- **GIF/short video from photos** locally on mobile, sized under WhatsApp limits.
- **Palette from photo** as a shareable swatch card (useful to tailors, decorators and small sellers sending colour references over WhatsApp). This is a speculative use case; no direct evidence was found.
- **Grid/carousel splitter** already exists in the app. It could be marketed against watermark-and-ad apps like Griddy.
- **Trust UX:** an offline badge and a "your photos never leave this phone" explanation, which answers verification scepticism.

### Gaps
- No user research found on how WhatsApp-centric small businesses (e.g. in India, Brazil, Indonesia, Pakistan) currently make QR posters or before/after images. This is the most important unanswered question for prioritisation.
- No demand quantification (search volume) for the WhatsApp-specific variants.
