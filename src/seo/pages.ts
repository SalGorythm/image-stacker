/**
 * Every public page: its address, what search engines and AI assistants see (title, description),
 * and the short guide shown under the tool. The build turns each into its own HTML file
 * (vite.config.ts), so pages can be found and read without running the app.
 */
import type { Route } from '../hooks';
import { infoPages, type InfoPage } from './info';
import { SITE } from './site';

export interface Faq { q: string; a: string }
export interface Page {
  path: string;
  route: Route | 'info';
  /** Browser tab and search result title (aim for under 60 characters). */
  title: string;
  /** Search result snippet (aim for 140–160 characters). */
  description: string;
  h1: string;
  /** One or two sentences that answer "what is this" directly. */
  summary: string;
  steps: string[];
  faqs: Faq[];
  /** Fit to size landing pages start with this maximum. */
  maxKB?: number;
  /** Social preview image in /og (tools have their own; others share the main one). */
  og?: string;
  /** Lower for variants of another page in the sitemap. */
  priority?: number;
}

const PRIVATE: Faq = {
  q: 'Are my photos uploaded anywhere?',
  a: 'No. Everything happens inside your browser on your own phone or computer. Your photos are never sent to a server, so nobody else can see them, and the tool keeps working without internet once the page has loaded.',
};
const FREE: Faq = {
  q: 'Is it free? Is there a watermark?',
  a: 'It is free, needs no sign-up, has no daily limit and never adds a watermark to your images.',
};

export const TOOL_PAGES: Page[] = [
  {
    path: '/', route: 'stack', og: 'stack', priority: 1,
    title: 'Combine Images Into One – Stack Photos Online, Free',
    description: 'Combine photos, screenshots and PDF slides into one long image, a grid or Instagram carousel. Free, no sign-up, no watermark, nothing uploaded.',
    h1: 'Combine images into one',
    summary: 'The Stacker joins photos, screenshots and PDF pages into one tall image, a side-by-side strip or a grid, ready to send on WhatsApp or post on Instagram. It can split many images into groups and runs entirely in your browser.',
    steps: [
      'Drop, choose or paste (Ctrl/⌘ V) your images. PDFs open as pages you can pick from.',
      'Drag to reorder. Choose top to bottom, side by side or a grid, and add captions or numbers if you like.',
      'Split into groups (for example every 5 slides) if one image would be too long.',
      'Download as JPG, PNG or PDF, copy, or share straight to WhatsApp.',
    ],
    faqs: [
      { q: 'How do I combine several photos into one image?', a: 'Add the photos, put them in order and download. They are joined top to bottom by default; you can switch to side by side or a grid. The result is one JPG or PNG.' },
      { q: 'Can I turn PDF slides into images for WhatsApp?', a: 'Yes. Add the PDF, pick the pages you want, and the stacker joins them into tall images, for example 5 slides per image, which read well on a phone.' },
      { q: 'Will WhatsApp make the combined image blurry?', a: 'Turn on WhatsApp quality before downloading. Each stack is then sized so WhatsApp HD sends it without shrinking the text.' },
      { q: 'Can I make an Instagram carousel?', a: 'Yes. Carousel slicing cuts a long stack into 1080 × 1350 slides in order.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/resize-image-in-kb', route: 'fit', og: 'fit', priority: 0.9,
    title: 'Resize Image in KB – Photo & Signature for Forms',
    description: 'Resize a photo or signature to an exact KB range and pixel size for exam, bank, passport and visa forms. Presets for SSC, IBPS, CNIC. Nothing uploaded.',
    h1: 'Resize image in KB for online forms',
    summary: 'Fit to size makes a photo or signature meet an online form\'s upload rule, for example "20 KB to 50 KB, 200 × 230 pixels", in one step. It searches for the best quality that fits, so the file is accepted the first time.',
    steps: [
      'Add your photo or signature (JPG, PNG, HEIC or WebP).',
      'Pick your form\'s preset, or type the minimum and maximum KB and the pixel size from the form\'s instructions.',
      'Check the result: each file shows its final KB and pixels and whether it passes.',
      'Download the JPG and upload it to the form.',
    ],
    faqs: [
      { q: 'How do I reduce a photo to under 50 KB without losing quality?', a: 'Type 50 as the maximum KB. The tool tries many quality levels and keeps the sharpest one under 50 KB. If even low quality is too large, it also lowers the pixel size, unless you fixed the pixels.' },
      { q: 'My form says the file is too small. How do I increase KB?', a: 'Set the minimum KB. The tool raises quality and size to reach it, and can pad the file up to the minimum if nothing else works.' },
      { q: 'Why does a portal reject a file that looks the right size?', a: 'Some portals count 1 KB as 1000 bytes and others as 1024. The tool aims inside both readings so the file passes either way.' },
      { q: 'Which forms have presets?', a: 'SSC signature, IBPS-style bank exam photo and signature, US visa (DS-160), Indian passport embassy upload and Pakistan CNIC/NICOP. Each preset links to its source. Always check your form\'s latest notice.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/scan-to-pdf', route: 'scan', og: 'scan', priority: 0.8,
    title: 'Scan Documents to PDF on Your Phone – Free, No Upload',
    description: 'Turn phone photos of papers into a clean, straight A4 PDF under a size limit. Fixes tilt and shadows. No watermark, no app to install, nothing uploaded.',
    h1: 'Scan documents to PDF',
    summary: 'Scan turns phone photos of paper documents into a clean, flat, black-and-white or colour PDF. It straightens tilted pages, removes shadows and can keep the PDF under a size limit for upload forms.',
    steps: [
      'Take or add photos of each page.',
      'Check the corners on each page; drag them if the edge was missed.',
      'Choose clean colour, black and white or grey, and A4, US Letter or as photographed.',
      'Set a size limit (5 MB down to 500 KB) if your form has one, then download the PDF.',
    ],
    faqs: [
      { q: 'How do I scan a document with my phone without an app?', a: 'Open this page in your phone\'s browser, tap to take photos of the pages and download the PDF. Nothing needs to be installed, though you can add it to your home screen.' },
      { q: 'Can I make the PDF smaller than 1 MB or 500 KB?', a: 'Yes. Choose a size limit and the tool chooses the image quality for each page so the whole PDF fits. If the pages cannot fit, it tells you.' },
      { q: 'Does it add a watermark like other scanner apps?', a: 'No. The PDF has no watermark and no branding.' },
      PRIVATE,
    ],
  },
  {
    path: '/passport-size-photo', route: 'photo', og: 'photo', priority: 0.8,
    title: 'Passport Size Photo Maker – Free, Print Sheet & Digital',
    description: 'Make a passport or visa photo in the right size for the US, UK, India or Pakistan, with a digital file and a 4×6 print sheet. Free, nothing uploaded.',
    h1: 'Passport size photo maker',
    summary: 'Passport photo crops a photo to a country\'s official size, with the head placed where the rules expect it, and gives you a digital file for online forms and a 4 × 6 inch sheet to print at any photo shop.',
    steps: [
      'Add a photo taken against a plain light wall, facing the camera.',
      'Choose the country and document (for example US visa, UK passport, Pakistan CNIC).',
      'Move and zoom so the face sits inside the guide.',
      'Download the digital photo or the print sheet.',
    ],
    faqs: [
      { q: 'What size is a passport photo in pixels?', a: 'It depends on the country: US passport and visa photos are 600 × 600 pixels (2 × 2 inches); India uses 35 × 45 mm; Pakistan CNIC uploads use 350 × 467 pixels. The tool sets the size for you.' },
      { q: 'Can I print passport photos at home or a shop?', a: 'Yes. Download the 4 × 6 inch print sheet with several photos on it and print it as a normal photo.' },
      { q: 'Can I change the background to white?', a: 'Use Remove background first, which can put you on white, then send the result to the passport photo tool.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/signature-resize', route: 'signature', og: 'signature', priority: 0.8,
    title: 'Signature Resize & Clean Up – Transparent PNG, Free',
    description: 'Turn a phone photo of your signature into clean ink on white or a transparent PNG, cropped and resized in KB for exam and bank forms. Nothing uploaded.',
    h1: 'Signature resize and clean up',
    summary: 'Signature turns a phone photo of a signature on paper into crisp ink on a white or transparent background, cropped tight, and can then resize it to a form\'s KB and pixel rule.',
    steps: [
      'Sign on plain white paper and take a photo in good light.',
      'Add the photo; the tool removes the paper and shadows and crops to the ink.',
      'Choose white or transparent background and ink colour.',
      'Download, or send it to Fit to size for a form\'s KB limit.',
    ],
    faqs: [
      { q: 'How do I make my signature a transparent PNG?', a: 'Add a photo of your signature and choose Transparent. The paper is removed and only the ink is kept, so you can place it on documents.' },
      { q: 'How do I resize a signature to 10–20 KB?', a: 'Clean it here, then press Fit to size and enter the form\'s KB range and pixels, or pick its preset.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/image-to-text', route: 'text', og: 'text', priority: 0.7,
    title: 'Image to Text – Copy Text From Photos, Free OCR',
    description: 'Copy text from a photo or screenshot in seconds. Free OCR that runs on your device, so private messages and documents stay private.',
    h1: 'Image to text',
    summary: 'Copy text reads the words in a photo or screenshot and gives you text you can copy, edit or forward. It works on your own device, so nothing is uploaded.',
    steps: [
      'Add or paste a photo or screenshot.',
      'Choose the language of the text.',
      'Wait a moment while it reads the image (the first time downloads the language).',
      'Copy the text, check it and fix anything it misread.',
    ],
    faqs: [
      { q: 'What kind of text reads best?', a: 'Clear printed text in a sharp, well-lit photo or a screenshot. Handwriting and decorative fonts are harder and may need correcting.' },
      { q: 'Does it work offline?', a: 'Yes, after a language has been used once it is kept on your device.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/remove-background', route: 'cutout', og: 'cutout', priority: 0.7,
    title: 'Remove Background From Photo – Free, Full Size, Private',
    description: 'Remove the background from photos of people and products and put them on white, a colour or transparent. Full resolution, no sign-up, nothing uploaded.',
    h1: 'Remove background from a photo',
    summary: 'Remove background cuts out the person or product in a photo and places it on white, a colour of your choice or a transparent background, at full resolution, using an AI model that runs on your device.',
    steps: [
      'Add one or many photos.',
      'Wait while the background is found (the model downloads once, about 4 MB).',
      'Choose white, a colour or transparent, and soften the edges if needed.',
      'Download, or use the result for a passport photo.',
    ],
    faqs: [
      { q: 'Is the result full resolution?', a: 'Yes. Unlike many free removers, the download is the same size as your photo.' },
      { q: 'Can I remove the background from many photos at once?', a: 'Yes. Add several and download them all as a ZIP.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/remove-photo-location', route: 'safe', og: 'safe', priority: 0.6,
    title: 'Remove Location From Photos – See & Delete EXIF Data',
    description: 'See the hidden location, date and phone details inside your photos and remove them before you share. Free EXIF remover that works on your device.',
    h1: 'Remove location and hidden details from photos',
    summary: 'Safe to share shows the hidden details stored inside photos, such as GPS location, date and phone model, and saves clean copies without them, without lowering the picture quality.',
    steps: [
      'Add photos.',
      'See which ones carry a location or other details.',
      'Download clean copies, one by one or as a ZIP.',
    ],
    faqs: [
      { q: 'Do photos show where they were taken?', a: 'Often, yes. Phone cameras usually store GPS coordinates in the photo file. Some apps remove them when sending, but email, file sharing and many websites keep them.' },
      { q: 'Does removing the details reduce quality?', a: 'No. For JPG photos only the hidden details are removed; the picture itself is not re-compressed.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/heic-to-jpg', route: 'convert', og: 'convert', priority: 0.7,
    title: 'HEIC to JPG Converter – Also WebP & AVIF, Free',
    description: 'Convert iPhone HEIC photos, WebP and AVIF images to JPG or PNG, many at once. Free, no sign-up, no limits, and nothing is uploaded.',
    h1: 'Convert HEIC, WebP and AVIF to JPG',
    summary: 'Convert changes iPhone HEIC photos and WebP or AVIF images into JPG or PNG files that open everywhere, many at a time, on your own device.',
    steps: [
      'Add HEIC, WebP, AVIF or other images.',
      'Choose JPG or PNG.',
      'Download them one by one or all together as a ZIP.',
    ],
    faqs: [
      { q: 'Why can\'t I upload my iPhone photo to a website?', a: 'iPhones save photos as HEIC, which many websites and forms don\'t accept. Converting to JPG fixes it.' },
      { q: 'Is there a limit on how many files I can convert?', a: 'No. Convert as many as your device can handle.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/quote-card-maker', route: 'cards', og: 'cards', priority: 0.7,
    title: 'Quote Card Maker – Text on Image for Status, Free',
    description: 'Make quote, poetry and announcement cards for WhatsApp Status and Instagram in a few taps. Free, no sign-up, no watermark.',
    h1: 'Quote card maker',
    summary: 'Cards turns a quote, a line of poetry, a greeting or an announcement into a clean image for WhatsApp Status or Instagram.',
    steps: [
      'Type or paste your text, and a second line such as a translation or source if you want one.',
      'Pick a style and a size: WhatsApp Status, 4:5 post or square.',
      'Download or share the card.',
    ],
    faqs: [
      { q: 'Can I use my group or business name?', a: 'Yes. Put it in the footer and it appears small at the bottom of every card.' },
      { q: 'What sizes can I make?', a: 'WhatsApp Status (1080 × 1920), a 4:5 post (1080 × 1350) and square (1080 × 1080).' },
      FREE,
    ],
  },
  {
    path: '/quiz-cards', route: 'quiz', og: 'quiz', priority: 0.6,
    title: 'Quiz Cards Maker – Questions as Images for WhatsApp',
    description: 'Paste questions and answers once and get numbered quiz cards to post in a WhatsApp group, with the answers at the end. Free, no watermark.',
    h1: 'Quiz cards for WhatsApp groups',
    summary: 'Quiz cards turns a list of questions and answers into numbered images to post one by one in a class or study group, with the answers together at the end, after each question or on the same card.',
    steps: [
      'Paste your questions, with Q: and A: (or سوال / جواب) before each.',
      'Choose where the answers go, a style and a size.',
      'Download all cards as a ZIP, numbered in posting order, or share them.',
    ],
    faqs: [
      { q: 'How do I write the questions?', a: 'Put Q: before each question and A: before its answer, or put each question on its own line with the answer below and a blank line between them.' },
      { q: 'Can I put the answer on the same card?', a: 'Yes. Choose whether answers come all together at the end, after each question or on the same card.' },
      FREE,
    ],
  },
  {
    path: '/whatsapp-qr-code', route: 'qr', og: 'qr', priority: 0.7,
    title: 'WhatsApp QR Code Generator – Free, Never Expires',
    description: 'Make a QR code that opens a WhatsApp chat, joins WiFi or saves a contact, as a printable poster. Free forever, no sign-up, codes never expire.',
    h1: 'WhatsApp QR code generator',
    summary: 'QR codes makes codes that open a WhatsApp chat with a ready message, join a WiFi network, save a contact or open a link, and lays them out as a printable poster. The codes are static, so they never stop working.',
    steps: [
      'Choose WhatsApp chat, WiFi, contact, link or text and fill in the details.',
      'Add a heading for the poster if you like.',
      'Download the code or the poster and print it.',
    ],
    faqs: [
      { q: 'Will my QR code stop working?', a: 'No. Many free generators make "dynamic" codes that stop working after a trial. These codes hold the details directly, so they work forever.' },
      { q: 'How do I make a QR code for my WhatsApp number?', a: 'Choose WhatsApp, type your number with the country code and an optional first message, and download.' },
      FREE,
    ],
  },
  {
    path: '/add-watermark-to-photos', route: 'watermark', og: 'watermark', priority: 0.6,
    title: 'Add Watermark to Photos in Bulk – Logo or Text, Free',
    description: 'Put your logo or name on many photos at once, in a corner, the centre or tiled. Photos keep full size and format. Nothing is uploaded.',
    h1: 'Add a watermark to many photos at once',
    summary: 'Watermark places your logo, your name or both on many photos in one go, in the same spot on each, while keeping the photos at full size and in their original format.',
    steps: [
      'Add your photos and your logo (it is remembered for next time) and/or type your text.',
      'Choose a corner, the centre or a tiled pattern, the size and the opacity.',
      'Download all photos as a ZIP.',
    ],
    faqs: [
      { q: 'Does it reduce photo quality?', a: 'No. Photos keep their size and format; only the watermark is added.' },
      { q: 'Is my logo saved for next time?', a: 'Yes, in this browser only, so you don\'t have to add it again.' },
      PRIVATE, FREE,
    ],
  },
  {
    path: '/photos-to-video', route: 'video', og: 'video', priority: 0.6,
    title: 'Photos to Video – Slideshow & Before/After MP4, Free',
    description: 'Turn photos into an MP4 slideshow or a before/after reveal video for WhatsApp Status and chats. Free, no watermark, nothing uploaded.',
    h1: 'Turn photos into a video',
    summary: 'Video makes an MP4 from your photos: a slideshow with gentle movement, or a before/after wipe that reveals a change. The video is made on your device and plays on WhatsApp and every phone.',
    steps: [
      'Choose slideshow or before/after.',
      'Add your photos and pick the size: Status 9:16, square or wide 16:9.',
      'Make the video and download or share it.',
    ],
    faqs: [
      { q: 'Will the video play on WhatsApp?', a: 'Yes. It is an H.264 MP4, the format WhatsApp and phones play. Browsers without a video encoder record a video instead, which may be WebM.' },
      FREE, PRIVATE,
    ],
  },
];

/** Search phrases people type with a size in KB. Each opens Fit to size with that maximum set. */
const KB = [10, 20, 30, 50, 100, 200, 500];
export const KB_PAGES: Page[] = KB.map(kb => ({
  path: `/compress-image-to-${kb}kb`, route: 'fit', og: 'fit', maxKB: kb, priority: 0.6,
  title: `Compress Image to ${kb} KB – Online, Free, No Upload`,
  description: `Compress a photo or signature to under ${kb} KB for online forms, keeping it as sharp as possible. Set exact pixels too. Free, nothing uploaded.`,
  h1: `Compress image to ${kb} KB`,
  summary: `This page reduces a photo or signature to ${kb} KB or less, choosing the highest quality that fits, so it is accepted by forms with a ${kb} KB limit.`,
  steps: [
    'Add your photo or signature (JPG, PNG, HEIC or WebP).',
    `The maximum is already set to ${kb} KB. Add a minimum or exact pixels if your form asks for them.`,
    'Download the JPG; its final size is shown before you download.',
  ],
  faqs: [
    { q: `How do I reduce a photo to ${kb} KB?`, a: `Add it here. The tool tries quality levels from high to low and keeps the best one at or under ${kb} KB. If that isn't enough, it also lowers the pixel size, unless you fixed it.` },
    { q: 'Why does the uploaded file still show as too large?', a: 'Some portals count 1 KB as 1024 bytes. The tool stays under the stricter reading so the file passes either way.' },
    PRIVATE, FREE,
  ],
}));

export const PAGES: Page[] = [...TOOL_PAGES, ...KB_PAGES];

/** The page at an address, including About, Privacy and Contact; undefined when there is none. */
export function pageFor(path: string): Page | InfoPage | undefined {
  const at = path.replace(/\/+$/, '') || '/';
  return [...PAGES, ...infoPages(SITE)].find(p => p.path === at);
}
export const pathOf = (route: Exclude<Route, 'info'>) => TOOL_PAGES.find(p => p.route === route)!.path;

/** The open page's heading, for tool pages whose own name is shorter (e.g. "Fit to size"). */
export const pageH1 = (fallback: string) => pageFor(location.pathname)?.h1 ?? fallback;
