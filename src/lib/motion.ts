/** Smooth start and stop. */
export const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Before/after wipe, one loop of `dur` seconds: hold on before, sweep to after, hold, sweep back.
 * Returns how far the "after" image is revealed (0 = all before, 1 = all after).
 */
export function wipeAt(t: number, dur: number) {
  const p = ((t % dur) + dur) % dur / dur;
  if (p < 0.12) return 0;
  if (p < 0.42) return ease((p - 0.12) / 0.3);
  if (p < 0.58) return 1;
  if (p < 0.88) return 1 - ease((p - 0.58) / 0.3);
  return 0;
}

/**
 * Slideshow: which photo shows at time t, and during a crossfade the next one and how far along.
 * Each photo holds `hold` seconds and fades into the next over `fade` seconds; the last one doesn't fade.
 */
export function slideAt(t: number, n: number, hold: number, fade: number) {
  const step = hold + fade;
  const i = Math.min(n - 1, Math.max(0, Math.floor(t / step)));
  const into = t - i * step;
  if (i < n - 1 && into > hold) return { i, next: i + 1, mix: ease((into - hold) / fade), local: into };
  return { i, next: i, mix: 0, local: into };
}

export const slideshowLength = (n: number, hold: number, fade: number) => n * hold + (n - 1) * fade;
