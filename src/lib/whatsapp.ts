import { CANVAS_LIMITS, layout, type LayoutOptions, type Sized } from './layout';
import { WHATSAPP_BOX } from './types';

/** Narrower than this and slide text gets hard to read on a phone. */
export const MIN_READABLE = 1080;

export interface Advice {
  /** Width the stack will have once it fits WhatsApp's HD limit. */
  width: number;
  readable: boolean;
  /** Largest number of these images per stack that still arrives readable. */
  maxPerStack: number;
}

/**
 * A stack fitted into WhatsApp's 4096 × 2692 HD limit gets narrower the taller it is.
 * It counts as readable when it keeps at least MIN_READABLE px of width, or its full
 * width when the images are smaller than that to begin with.
 */
export function whatsappAdvice<T>(
  list: T[],
  size: (it: T) => Sized,
  base: Pick<LayoutOptions, 'gap' | 'width' | 'q' | 'head' | 'foot'>,
): Advice | null {
  const opts = { ...base, ...CANVAS_LIMITS };
  const ok = (sub: T[]) => {
    const fitted = layout(sub, size, { ...opts, box: WHATSAPP_BOX })!;
    const free = layout(sub, size, opts)!;
    return { fitted, readable: fitted.width >= Math.min(MIN_READABLE, free.width) };
  };
  if (!list.length) return null;
  const all = ok(list);
  let k = list.length;
  if (!all.readable) while (k > 1 && !ok(list.slice(0, k)).readable) k--;
  return { width: all.fitted.width, readable: all.readable, maxPerStack: k };
}
