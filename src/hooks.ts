import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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

export type Route = 'stack' | 'fit' | 'signature' | 'safe' | 'convert' | 'cards' | 'scan' | 'photo' | 'qr' | 'text' | 'watermark' | 'cutout' | 'video' | 'quiz';
const ROUTES: Route[] = ['fit', 'signature', 'safe', 'convert', 'cards', 'scan', 'photo', 'qr', 'text', 'watermark', 'cutout', 'video', 'quiz'];
const routeOf = (hash: string): Route => ROUTES.find(r => hash.startsWith('#/' + r)) ?? 'stack';

/** Which tool is open, from the URL hash (#/ for the stacker, #/fit, …), so links and Back work. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => routeOf(location.hash));
  useEffect(() => {
    const on = () => { setRoute(routeOf(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
