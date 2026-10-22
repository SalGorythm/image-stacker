import { describe, expect, it } from 'vitest';
import { readMeta, stripMeta } from './exif';

const ascii = (s: string) => [...s].map(c => c.charCodeAt(0));
const u16 = (v: number) => [v >> 8, v & 255];
const u32 = (v: number) => [(v >>> 24) & 255, (v >> 16) & 255, (v >> 8) & 255, v & 255];
const seg = (marker: number, body: number[]) => [0xff, marker, ...u16(body.length + 2), ...body];

/** A big-endian EXIF block: Make "Pixel", orientation 6, GPS 51°30'0"N 0°7'30"W. */
function exifBlock() {
  // Layout (offsets from TIFF start): header 8, IFD0 at 8 (3 entries), Make text, GPS IFD, rationals
  const ifd0 = 8, make = ifd0 + 2 + 3 * 12 + 4, gps = make + 6, lat = gps + 2 + 4 * 12 + 4, lon = lat + 24;
  const entry = (tag: number, type: number, count: number, value: number[]) => [...u16(tag), ...u16(type), ...u32(count), ...value];
  const rat = (n: number, d: number) => [...u32(n), ...u32(d)];
  const tiff = [
    ...ascii('MM'), 0, 42, ...u32(ifd0),
    ...u16(3),
    ...entry(0x010f, 2, 6, u32(make)),
    ...entry(0x0112, 3, 1, [0, 6, 0, 0]),
    ...entry(0x8825, 4, 1, u32(gps)),
    ...u32(0),
    ...ascii('Pixel'), 0,
    ...u16(4),
    ...entry(1, 2, 2, [...ascii('N'), 0, 0, 0]),
    ...entry(2, 5, 3, u32(lat)),
    ...entry(3, 2, 2, [...ascii('W'), 0, 0, 0]),
    ...entry(4, 5, 3, u32(lon)),
    ...u32(0),
    ...rat(51, 1), ...rat(30, 1), ...rat(0, 1),
    ...rat(0, 1), ...rat(7, 1), ...rat(30, 1),
  ];
  return [...ascii('Exif'), 0, 0, ...tiff];
}

const scan = [0xff, 0xda, 0, 8, 1, 2, 3, 4, 5, 6, 0x11, 0x22, 0xff, 0x00, 0x33, 0xff, 0xd9];
const photo = Uint8Array.from([
  0xff, 0xd8,
  ...seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
  ...seg(0xe1, exifBlock()),
  ...seg(0xe2, [...ascii('ICC_PROFILE'), 0, 1, 1, 9, 9]),
  ...seg(0xe2, [...ascii('MPF'), 0, 7, 7]),
  ...seg(0xfe, ascii('shot on holiday')),
  ...seg(0xdb, [0, 1, 2, 3]),
  ...scan,
  ...ascii('trailing preview with GPS'),
]);

describe('readMeta', () => {
  it('reads device, orientation and GPS position', () => {
    const m = readMeta(photo);
    expect(m.device).toBe('Pixel');
    expect(m.orientation).toBe(6);
    expect(m.gps!.lat).toBeCloseTo(51.5);
    expect(m.gps!.lon).toBeCloseTo(-0.125);
    expect(m.extras).toContain('comment');
  });
});

describe('stripMeta', () => {
  const clean = stripMeta(photo, 6)!;
  const text = String.fromCharCode(...clean);
  it('removes location, device, comments and appended data', () => {
    const m = readMeta(clean);
    expect(m.gps).toBeUndefined();
    expect(m.device).toBeUndefined();
    expect(m.extras).toEqual([]);
    expect(text).not.toContain('MPF');
    expect(text).not.toContain('trailing');
  });
  it('keeps the colour profile, the orientation and the picture data byte for byte', () => {
    expect(text).toContain('ICC_PROFILE');
    expect(readMeta(clean).orientation).toBe(6);
    expect([...clean.subarray(clean.length - scan.length)]).toEqual(scan);
  });
  it('leaves other formats alone', () => expect(stripMeta(Uint8Array.from([1, 2, 3]))).toBeNull());
});
