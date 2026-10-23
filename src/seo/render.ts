/**
 * Build-time HTML for each page (used by vite.config.ts): the <head> tags search engines and link
 * previews read, and a plain version of the page inside #root for crawlers and AI assistants that
 * don't run JavaScript. The app replaces that plain version as soon as it starts.
 */
import { infoPages, type InfoPage, type SiteConfig } from './info';
import { PAGES, TOOL_PAGES, KB_PAGES, type Page } from './pages';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');

export const allPages = (c: SiteConfig): (Page | InfoPage)[] => [...PAGES, ...infoPages(c)];
const isInfo = (p: Page): p is InfoPage => 'sections' in p;

function structuredData(p: Page, c: SiteConfig) {
  const url = c.url + p.path;
  const graph: object[] = [];
  if (p.path === '/') {
    graph.push({ '@type': 'WebSite', '@id': c.url + '/#website', name: c.name, url: c.url + '/', inLanguage: 'en' });
  }
  if (p.route !== 'info') {
    graph.push({
      '@type': 'WebApplication',
      name: p.path === '/' ? c.name : `${p.h1} – ${c.name}`,
      url,
      description: p.summary,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any (runs in a web browser: Android, iPhone, Windows, Mac)',
      browserRequirements: 'Requires JavaScript and a modern browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      ...(p.path === '/' ? { featureList: TOOL_PAGES.map(t => t.h1) } : {}),
    });
  }
  if (p.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: p.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  if (p.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: c.name, item: c.url + '/' },
        { '@type': 'ListItem', position: 2, name: p.h1, item: url },
      ],
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Tags for <head>: replaces the template's title and description and adds the rest. */
export function headTags(p: Page, c: SiteConfig) {
  const url = c.url + (p.path === '/' ? '/' : p.path);
  const img = `${c.url}/og/${p.og ?? 'stack'}.png`;
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(c.name)}">`,
    `<meta property="og:title" content="${esc(p.title)}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${json(structuredData(p, c))}</script>`,
    ...(c.adsClient ? [
      `<meta name="google-adsense-account" content="${esc(c.adsClient)}">`,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(c.adsClient)}" crossorigin="anonymous"></script>`,
    ] : []),
  ].join('\n');
}

const link = (p: Page) => `<a href="${p.path}">${esc(p.h1)}</a>`;

/** The page as plain HTML: name, what it does, how to use it, questions, and links to every tool. */
export function staticBody(p: Page, c: SiteConfig) {
  const info = infoPages(c);
  const main = isInfo(p)
    ? `<p>${esc(p.summary)}</p>` + p.sections.map(s =>
      `<h2>${esc(s.h)}</h2>${s.p.map(t => `<p>${esc(t)}</p>`).join('')}` +
      (s.links ? `<ul>${s.links.map(l => `<li><a href="${l.url}" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>` : '')).join('')
    : `<p>${esc(p.summary)}</p>` +
      `<h2>How to use it</h2><ol>${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` +
      `<h2>Questions</h2>${p.faqs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}`;
  return `<div class="seo-static">
<header><a href="/">${esc(c.name)}</a></header>
<main><h1>${esc(p.h1)}</h1>${main}<noscript><p><strong>This tool needs JavaScript turned on.</strong></p></noscript></main>
<nav aria-label="Tools"><h2>Tools</h2><ul>${TOOL_PAGES.map(t => `<li>${link(t)}</li>`).join('')}</ul>
<h2>Compress to a size</h2><ul>${KB_PAGES.map(t => `<li>${link(t)}</li>`).join('')}</ul></nav>
<footer>${info.map(link).join(' · ')}</footer>
</div>`;
}

export function sitemap(c: SiteConfig, date: string) {
  const urls = allPages(c).map(p =>
    `<url><loc>${c.url}${p.path === '/' ? '/' : p.path}</loc><lastmod>${date}</lastmod><priority>${(p.priority ?? 0.5).toFixed(1)}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robots(c: SiteConfig) {
  // Search and AI answer engines are welcome; the on-device engines are large and not pages
  return `User-agent: *\nAllow: /\nDisallow: /ocr/\nDisallow: /ort/\nDisallow: /models/\n\nSitemap: ${c.url}/sitemap.xml\n`;
}

/** llms.txt (llmstxt.org): a plain summary AI assistants can read to describe and recommend the site. */
export function llmsTxt(c: SiteConfig, full = false) {
  const item = (p: Page) => `- [${p.h1}](${c.url}${p.path}): ${p.summary}`;
  const detail = (p: Page) => `## ${p.h1}\n\nURL: ${c.url}${p.path}\n\n${p.summary}\n\nHow to use it:\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${p.faqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}\n`;
  const intro = `# ${c.name}\n\n> Free image tools that run entirely in the browser: nothing is uploaded, no sign-up, no watermark, no limits, and they work offline once installed. Made for sharing on WhatsApp and Instagram and for uploading photos, signatures and documents to online forms.\n\n`;
  if (full) return intro + TOOL_PAGES.map(detail).join('\n') + '\n' + KB_PAGES.slice(0, 1).map(detail).join('');
  return intro +
    `## Tools\n\n${TOOL_PAGES.map(item).join('\n')}\n\n` +
    `## Compress to a size\n\n${KB_PAGES.map(p => `- [${p.h1}](${c.url}${p.path})`).join('\n')}\n\n` +
    `## About\n\n${infoPages(c).map(p => `- [${p.h1}](${c.url}${p.path})`).join('\n')}\n- [Full details of every tool](${c.url}/llms-full.txt)\n`;
}
