import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { SiteConfig } from './src/seo/info';
import { allPages, headTags, llmsTxt, robots, sitemap, staticBody } from './src/seo/render';

/**
 * Site settings come from environment variables (Vercel → Settings → Environment Variables, or .env):
 *   SITE_URL        overrides the address (defaults to https://photosize.app on Vercel)
 *   ADSENSE_CLIENT  ca-pub-… once AdSense gives you one; ads stay off without it
 *   ADSENSE_SLOT    an ad unit id for the slot under each tool (optional)
 *   CONTACT_EMAIL   shown on the contact and privacy pages
 */
function siteConfig(mode: string): SiteConfig {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  // Every Vercel build (previews too) points search engines at the real domain
  const url = (env.SITE_URL || (env.VERCEL ? 'https://photosize.app' : 'http://localhost:4173')).replace(/\/+$/, '');
  return { url, name: 'PhotoSize', adsClient: env.ADSENSE_CLIENT || '', adsSlot: env.ADSENSE_SLOT || '', contactEmail: env.CONTACT_EMAIL || '' };
}

/** Writes one HTML file per page plus sitemap.xml, robots.txt, llms.txt and ads.txt after the build. */
function seoPages(site: SiteConfig): Plugin {
  let outDir = 'dist';
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf8');
      const strip = template.replace(/<title>.*?<\/title>\n?/, '').replace(/<meta name="description"[^>]*>\n?/, '');
      const page = (p: Parameters<typeof headTags>[0]) =>
        strip.replace('</head>', headTags(p, site) + '\n</head>').replace('<div id="root"></div>', `<div id="root">${staticBody(p, site)}</div>`);
      const pages = allPages(site);
      for (const p of pages) writeFileSync(join(outDir, p.path === '/' ? 'index.html' : p.path.slice(1) + '.html'), page(p));
      // Unknown addresses: the home page's app with a "not found" title (Vercel serves it with status 404)
      const home = pages[0];
      writeFileSync(join(outDir, '404.html'), page({ ...home, title: `Page not found – ${site.name}`, h1: 'Page not found', summary: 'That page doesn\'t exist. Pick a tool below.', steps: [], faqs: [] }).replace('<meta name="robots" content="index,follow,max-image-preview:large">', '<meta name="robots" content="noindex">'));
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap(site, new Date().toISOString().slice(0, 10)));
      writeFileSync(join(outDir, 'robots.txt'), robots(site));
      writeFileSync(join(outDir, 'llms.txt'), llmsTxt(site));
      writeFileSync(join(outDir, 'llms-full.txt'), llmsTxt(site, true));
      if (site.adsClient) writeFileSync(join(outDir, 'ads.txt'), `google.com, ${site.adsClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
      console.log(`seo-pages: ${pages.length} pages for ${site.url}${site.adsClient ? ', ads on' : ''}`);
    },
    // `vite preview` serves /about from about.html, as Vercel does with cleanUrls
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '/').split('?')[0];
        if (path !== '/' && !path.includes('.') && existsSync(join(outDir, path.slice(1) + '.html'))) req.url = path + '.html' + (req.url!.slice(path.length));
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const site = siteConfig(mode);
  return {
    plugins: [react(), seoPages(site)],
    define: { __SITE__: JSON.stringify(site) },
    test: { environment: 'node' },
  };
});
