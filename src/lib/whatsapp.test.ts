import { describe, expect, it } from 'vitest';
import { layout, type Sized } from './layout';
import { WHATSAPP_BOX } from './types';
import { whatsappAdvice } from './whatsapp';

const id = (s: Sized) => s;
const slide: Sized = { w: 1600, h: 900, vector: true };
const shot: Sized = { w: 1170, h: 2532, vector: false }; // phone screenshot
const big = { maxSide: 32000, maxArea: 120e6 };

describe('WhatsApp box', () => {
  it('fits a tall stack inside 4096 on the long side without going over', () => {
    const L = layout(Array(4).fill(slide), id, { gap: 18, width: 'widest', q: 2692, ...big, box: WHATSAPP_BOX })!;
    expect(L.height).toBeLessThanOrEqual(4096);
    expect(L.width).toBeLessThanOrEqual(2692);
    expect(L.boxed).toBe(true);
    expect(L.reduced).toBe(false);
  });

  it('caps the short side at 2692 for a short stack', () => {
    const L = layout([slide], id, { gap: 0, width: 'widest', q: 2692, ...big, box: WHATSAPP_BOX })!;
    expect(L.width).toBe(2692);
    expect(L.height).toBe(1514);
  });
});

describe('whatsappAdvice', () => {
  it('says 4 slides are readable', () => {
    const a = whatsappAdvice(Array(4).fill(slide), id, 18, 'widest', 2692)!;
    expect(a.readable).toBe(true);
  });

  it('flags 10 slides and suggests the largest readable stack', () => {
    const a = whatsappAdvice(Array(10).fill(slide), id, 18, 'widest', 2692)!;
    expect(a.readable).toBe(false);
    expect(a.width).toBeLessThan(1080);
    expect(a.maxPerStack).toBe(6);
    expect(whatsappAdvice(Array(6).fill(slide), id, 18, 'widest', 2692)!.readable).toBe(true);
    expect(whatsappAdvice(Array(7).fill(slide), id, 18, 'widest', 2692)!.readable).toBe(false);
  });

  it('judges small images against their own width', () => {
    const a = whatsappAdvice([{ w: 600, h: 400, vector: false }], id, 0, 'widest', 2692)!;
    expect(a.readable).toBe(true);
  });

  it('suggests one screenshot per image when two are already too tall', () => {
    const a = whatsappAdvice([shot, shot], id, 0, 'widest', 2692)!;
    expect(a.readable).toBe(false);
    expect(a.maxPerStack).toBe(1);
  });
});
