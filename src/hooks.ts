import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Stable function identity that always calls the latest closure (for global listeners). */
export function useEvent<A extends unknown[], R>(fn: (...a: A) => R) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...a: A) => ref.current(...a), []);
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
