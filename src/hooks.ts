import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PAGES, pageFor, pathOf, type Page } from './seo/pages';

/** Stable function identity that always calls the latest closure (for global listeners). */
export function useEvent<A extends unknown[], R>(fn: (...a: A) => R) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...a: A) => ref.current(...a), []);
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Where the app is running, for install instructions when the browser gives no prompt. */
export type InstallPlatform = 'ios' | 'android' | 'mac-safari' | 'firefox' | 'chromium' | 'other';

function platform(): InstallPlatform {
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return /Firefox/.test(ua) ? 'firefox' : 'android';
  if (/Firefox/.test(ua)) return 'firefox';
  if (/Edg\/|Chrome\//.test(ua)) return 'chromium';
  if (/Safari\//.test(ua) && /Macintosh/.test(ua)) return 'mac-safari';
  return 'other';
}

/**
 * Install support. Chrome, Edge and Android offer a prompt the app can open; Safari, iPhone and
 * Firefox don't, and Chrome stops offering it once the app is installed. The button stays, and
 * without a prompt it explains the steps for this browser (or says the app is already installed).
 */
export function useInstall() {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const [installed, setInstalled] = useState(() => { try { return localStorage.getItem('app-installed') === '1'; } catch { return false; } });
  useEffect(() => {
    const offer = (e: Event) => { e.preventDefault(); setEvt(e as InstallPromptEvent); setInstalled(false); };
    const done = () => { setInstalled(true); setEvt(null); try { localStorage.setItem('app-installed', '1'); } catch { /* ignore */ } };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  /** Opens the browser's prompt when there is one; otherwise tells the caller to show the steps. */
  const install = async (): Promise<'prompted' | 'steps'> => {
    if (!evt) return 'steps';
    try { await evt.prompt(); } catch { return 'steps'; }
    if ((await evt.userChoice).outcome === 'accepted') { setInstalled(true); try { localStorage.setItem('app-installed', '1'); } catch { /* ignore */ } }
    setEvt(null);
    return 'prompted';
  };
  // Inside the installed app the button has nothing to do, so it hides there
  return { showInstall: !standalone, canPrompt: !!evt, installed: installed && !evt, platform: platform(), install };
}

export interface ToastAction { label: string; fn: () => void }
export interface ToastState { msg: string; err?: boolean; action?: ToastAction }
export interface ToastOptions { err?: boolean; keep?: boolean; action?: ToastAction }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((msg: string, o: ToastOptions = {}) => {
    clearTimeout(timer.current);
    setToast({ msg, err: o.err, action: o.action });
    if (!o.keep) timer.current = window.setTimeout(() => setToast(null), o.action ? 8000 : 4000);
  }, []);
  const hide = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);
  return { toast, show, hide };
}

export type Route = 'stack' | 'fit' | 'signature' | 'safe' | 'convert' | 'cards' | 'scan' | 'photo' | 'qr' | 'text' | 'watermark' | 'cutout' | 'video' | 'quiz' | 'info';
const LEGACY: Exclude<Route, 'info'>[] = ['fit', 'signature', 'safe', 'convert', 'cards', 'scan', 'photo', 'qr', 'text', 'watermark', 'cutout', 'video', 'quiz'];

/** Opens a page of the site without reloading (links inside the app call this too). */
export function navigate(path: string) {
  if (path === location.pathname) return;
  history.pushState(null, '', path);
  window.dispatchEvent(new Event('routechange'));
}

/**
 * Which page is open, from the address (/, /resize-image-in-kb, /about, …), so links, Back and
 * search results all work. Old #/fit style links from before are moved to their new address.
 */
export function usePage() {
  const read = () => pageFor(location.pathname) ?? PAGES[0];
  const [page, setPage] = useState<Page>(() => {
    const old = LEGACY.find(r => location.hash.startsWith('#/' + r));
    if (old || location.hash === '#/') history.replaceState(null, '', (old ? pathOf(old) : '/') + location.search);
    return read();
  });
  useEffect(() => {
    const on = () => { setPage(read()); window.scrollTo(0, 0); };
    // Plain links to our own pages open in place instead of reloading the app
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a');
      if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin || !pageFor(a.pathname)) return;
      e.preventDefault();
      navigate(a.pathname);
    };
    window.addEventListener('popstate', on);
    window.addEventListener('routechange', on);
    document.addEventListener('click', click);
    return () => {
      window.removeEventListener('popstate', on);
      window.removeEventListener('routechange', on);
      document.removeEventListener('click', click);
    };
  }, []);
  return page;
}
