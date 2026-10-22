import { describe, expect, it } from 'vitest';
import { maxBytes, minBytes, padJpeg, searchQuality, targetSize } from './fit';

describe('KB readings', () => {
  it('passes under either meaning of KB', () => {
    expect(maxBytes(20)).toBe(20000);
    expect(minBytes(10)).toBe(10240);
  });
});

describe('targetSize', () => {
  it('crops to fill a box, keeping the centre', () => {
    const t = targetSize(1000, 500, { width: 200, height: 200, shape: 'cover' });
    expect(t.out).toEqual({ w: 200, h: 200 });
    expect(t.src).toEqual({ x: 250, y: 0, w: 500, h: 500 });
  });
  it('fits inside a box with a border', () => {
    const t = targetSize(1000, 500, { width: 200, height: 200, shape: 'contain' });
    expect(t.dst).toEqual({ x: 0, y: 50, w: 200, h: 100 });
  });
  it('scales by one side, or keeps the size', () => {
    expect(targetSize(1000, 500, { width: 140, shape: 'cover' }).out).toEqual({ w: 140, h: 70 });
    expect(targetSize(1000, 500, { height: 60, shape: 'cover' }).out).toEqual({ w: 120, h: 60 });
    expect(targetSize(1000, 500, { shape: 'cover' }).out).toEqual({ w: 1000, h: 500 });
  });
});

describe('searchQuality', () => {
  const size = async (q: number) => Math.round(5000 + q * 40000); // grows with quality
  it('finds the highest quality under the limit', async () => {
    const r = (await searchQuality(size, 20000))!;
    expect(r.size).toBeLessThanOrEqual(20000);
    expect(r.size).toBeGreaterThan(19500);
  });
  it('takes the top quality when it already fits', async () => expect((await searchQuality(size, 100000))!.q).toBe(0.98));
  it('reports when nothing fits', async () => expect(await searchQuality(size, 4000)).toBeNull());
});

describe('padJpeg', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3, 0xff, 0xd9]);
  it('pads to the target with valid comment segments after the start marker', () => {
    const out = padJpeg(jpeg, 70000);
    expect(out.length).toBeGreaterThanOrEqual(70000);
    expect([...out.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xfe]);
    // Walk the comment segments and land exactly on the original data
    let o = 2;
    while (out[o] === 0xff && out[o + 1] === 0xfe) o += 2 + ((out[o + 2] << 8) | out[o + 3]);
    expect([...out.subarray(o)]).toEqual([...jpeg.subarray(2)]);
  });
  it('leaves big enough files and non-JPEGs alone', () => {
    expect(padJpeg(jpeg, 5)).toBe(jpeg);
    const png = new Uint8Array([0x89, 0x50]);
    expect(padJpeg(png, 100)).toBe(png);
  });
});
