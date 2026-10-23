/** About, privacy and contact pages. What they say depends on the site settings (ads on or off, contact). */
import type { Page } from './pages';

export interface SiteConfig {
  /** Public address without a trailing slash, e.g. https://photosize.app */
  url: string;
  name: string;
  /** Google AdSense publisher id (ca-pub-…); empty while ads are off. */
  adsClient: string;
  /** AdSense ad unit for the slot under each tool; empty to rely on Auto ads only. */
  adsSlot: string;
  contactEmail: string;
  /** A Buy Me a Coffee (or similar) page; the support links appear only when set. */
  supportUrl: string;
}

export interface Section { h: string; p: string[]; links?: { label: string; url: string }[] }
export interface InfoPage extends Page { sections: Section[] }

const UPDATED = 'October 2026';

export function infoPages(c: SiteConfig): InfoPage[] {
  const ads = !!c.adsClient;
  const contact = c.contactEmail
    ? `Email ${c.contactEmail}. We read every message and usually reply within a few days.`
    : 'Contact details will appear here soon.';
  const base = { route: 'info' as const, steps: [], faqs: [], priority: 0.3 };
  return [
    {
      ...base, path: '/about',
      title: `About ${c.name}`,
      description: `${c.name} is a set of free image tools that run in your browser: combine, resize in KB, scan, passport photos, signatures and more. Nothing is uploaded.`,
      h1: `About ${c.name}`,
      summary: `${c.name} is a free set of image tools for everyday jobs: sending photos and notes on WhatsApp, posting on Instagram and uploading photos, signatures and documents to online forms.`,
      sections: [
        { h: 'Why it exists', p: [
          'Most free image websites upload your photos to their servers, add a watermark, limit how many files you can use or ask you to sign up just as you are about to download. For passport photos, ID cards, signatures and private messages, uploading is a real risk.',
          `${c.name} does the work inside your own browser instead. Your photos never leave your device, there is nothing to sign up for, no watermark and no limit.`,
        ] },
        { h: 'Who it is for', p: [
          'Students and job applicants uploading photos and signatures to exam, bank, passport and visa portals; teachers and study groups sharing notes, slides and quizzes on WhatsApp; small businesses making QR posters, watermarked product photos and before/after videos; and families who want to share photos without their location.',
        ] },
        { h: 'How it works', p: [
          'Everything uses the browser\'s own image tools (canvas), with open-source engines for the harder jobs: libheif to open iPhone photos, Tesseract.js to read text and U²-Net with ONNX Runtime to remove backgrounds. They load only when a tool needs them and are kept on your device for offline use.',
          'You can install it as an app on your phone or computer, and it keeps working without internet.',
        ] },
        ...(c.supportUrl ? [{ h: 'Support', p: [
          `${c.name} is free and stays free. If it saved you time, you can support its upkeep and new tools with a small contribution.`,
        ], links: [{ label: 'Support PhotoSize', url: c.supportUrl }] }] : []),
      ],
    },
    {
      ...base, path: '/privacy',
      title: `Privacy policy – ${c.name}`,
      description: `How ${c.name} handles your data: your photos are processed on your device and never uploaded.${ads ? ' Ads are served by Google AdSense.' : ''}`,
      h1: 'Privacy policy',
      summary: `Last updated ${UPDATED}. In short: the images and text you use in the tools stay on your device and are never sent to us or anyone else.`,
      sections: [
        { h: 'Your images and text', p: [
          'All tools work inside your browser. Photos, PDFs, signatures, documents and the text you type are processed on your device and are never uploaded to our servers or any other server. We cannot see them.',
          'To survive a page reload, the Stacker keeps the images you add in your browser\'s own storage (IndexedDB) until you remove them. Some tools remember settings, such as your last preset, card text or watermark logo, in local storage. Passport photos, ID photos and signatures in Fit to size are kept only in memory and are gone when you close the page. You can clear all of this at any time by clearing this site\'s data in your browser.',
        ] },
        { h: 'Downloads of on-device engines', p: [
          'Some tools download an engine the first time you use them (for example the text reader or the background remover). These files come from this website and are stored by your browser so the tool works offline. Nothing about your images is sent when they download.',
        ] },
        { h: 'Hosting', p: [
          'The website is hosted on Vercel. Like any web host, it receives standard request information such as your IP address and browser type when pages and files are loaded, for security and to deliver the site. We do not use this to identify you.',
        ] },
        ads
          ? { h: 'Advertising and cookies', p: [
            'This site shows ads served by Google AdSense. Google and its partners use cookies and similar technology to show ads based on your visits to this and other websites, and to measure ads. Ads never receive your images or anything you type into the tools.',
            'Visitors in the European Economic Area, the UK and Switzerland are asked for consent before personalised ads are shown. You can change your choice at any time from the privacy link on the consent message.',
            'You can opt out of personalised advertising in Google\'s Ad Settings, and learn how Google uses information from sites that use its services. You can also opt out of some third-party vendors\' use of cookies at aboutads.info.',
          ], links: [
            { label: 'Google Ad Settings', url: 'https://adssettings.google.com' },
            { label: 'How Google uses information from sites that use its services', url: 'https://policies.google.com/technologies/partner-sites' },
            { label: 'Google advertising cookies', url: 'https://policies.google.com/technologies/ads' },
            { label: 'aboutads.info opt-out', url: 'https://www.aboutads.info/choices' },
          ] }
          : { h: 'Cookies', p: ['This site does not use advertising or tracking cookies.'] },
        { h: 'Children', p: ['The site is a general-audience tool and is not directed at children under 13. It does not knowingly collect personal information from anyone.'] },
        { h: 'Changes and contact', p: [
          'If this policy changes, the date at the top will change too.',
          contact,
        ] },
      ],
    },
    {
      ...base, path: '/contact',
      title: `Contact – ${c.name}`,
      description: `Get in touch about ${c.name}: questions, problems, form presets to add or ideas for new tools.`,
      h1: 'Contact',
      summary: contact,
      sections: [
        { h: 'Helpful things to include', p: [
          'Which tool you were using, your phone or computer and browser, and what you expected to happen. Please don\'t send private photos; describe the problem instead.',
          'If a form preset is out of date, include a link to the form\'s latest official notice and we\'ll update it.',
        ] },
      ],
    },
  ];
}
