import type { SiteConfig } from './info';

declare const __SITE__: SiteConfig;
/** Site settings from the build (see vite.config.ts); tests run without them. */
export const SITE: SiteConfig = typeof __SITE__ === 'undefined'
  ? { url: '', name: 'PhotoSize', adsClient: '', adsSlot: '', contactEmail: '', supportUrl: '' }
  : __SITE__;
