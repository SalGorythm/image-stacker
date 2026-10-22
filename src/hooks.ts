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

/**
 * Install support: Chrome/Edge/Android hand over a prompt event; iPhone and iPad need
 * the person to use Share → Add to Home Screen, so `install` returns 'ios' there.
 */
export function useInstall() {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  );
  useEffect(() => {
    const offer = (e: Event) => { e.preventDefault(); setEvt(e as InstallPromptEvent); };
    const done = () => { setInstalled(true); setEvt(null); };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const install = async (): Promise<'ios' | 'done'> => {
    if (!evt) return 'ios';
    await evt.prompt();
    if ((await evt.userChoice).outcome === 'accepted') setInstalled(true);
    setEvt(null);
    return 'done';
  };
  return { canInstall: !installed && (!!evt || ios), install };
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

export type Route = 'stack' | 'fit' | 'signature' | 'safe' | 'convert' | 'cards' | 'scan' | 'photo' | 'qr' | 'text' | 'watermark';
const ROUTES: Route[] = ['fit', 'signature', 'safe', 'convert', 'cards', 'scan', 'photo', 'qr', 'text', 'watermark'];
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
