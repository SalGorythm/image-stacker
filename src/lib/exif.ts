/** What a photo file says about itself, beyond the picture. */
export interface PhotoMeta {
  gps?: { lat: number; lon: number };
  device?: string;
  taken?: string;
  /** EXIF orientation 1–8 (1 = upright). */
  orientation?: number;
  /** Other hidden data found: XMP, IPTC, comments, PNG text. */
  extras: string[];
}

/** Reads an EXIF (TIFF) block: device, date, orientation and GPS position. */
export function readTiff(b: Uint8Array, start: number, meta: PhotoMeta) {
  const le = b[start] === 0x49;
  const u16 = (o: number) => (le ? b[start + o] | (b[start + o + 1] << 8) : (b[start + o] << 8) | b[start + o + 1]);
  const u32 = (o: number) => (le ? (b[start + o] | (b[start + o + 1] << 8) | (b[start + o + 2] << 16)) + b[start + o + 3] * 2 ** 24 : b[start + o] * 2 ** 24 + ((b[start + o + 1] << 16) | (b[start + o + 2] << 8) | b[start + o + 3]));
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(start + o, start + o + n)).replace(/\0+$/, '').trim();
  type Entry = { tag: number; type: number; count: number; at: number };
  const ifd = (o: number): Entry[] => {
    if (o <= 0 || start + o + 2 > b.length) return [];
    const n = u16(o), out: Entry[] = [];
    for (let i = 0; i < n && start + o + 2 + i * 12 + 12 <= b.length; i++) {
      const e = o + 2 + i * 12, type = u16(e + 2), count = u32(e + 4);
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 1;
      out.push({ tag: u16(e), type, count, at: size * count > 4 ? u32(e + 8) : e + 8 });
    }
    return out;
  };
  const rational = (at: number, i: number) => { const d = u32(at + i * 8 + 4); return d ? u32(at + i * 8) / d : 0; };
  const find = (list: Entry[], tag: number) => list.find(e => e.tag === tag);

  const ifd0 = ifd(u32(4));
  const make = find(ifd0, 0x010f), model = find(ifd0, 0x0110), orient = find(ifd0, 0x0112);
  const dev = [make && ascii(make.at, make.count), model && ascii(model.at, model.count)].filter(Boolean).join(' ');
  if (dev) meta.device = dev;
  if (orient) meta.orientation = u16(orient.at);
  const exifPtr = find(ifd0, 0x8769);
  if (exifPtr) {
    const dt = find(ifd(u32(exifPtr.at)), 0x9003);
    if (dt) meta.taken = ascii(dt.at, dt.count);
  }
  const gpsPtr = find(ifd0, 0x8825);
  if (gpsPtr) {
    const g = ifd(u32(gpsPtr.at));
    const latRef = find(g, 1), lat = find(g, 2), lonRef = find(g, 3), lon = find(g, 4);
    if (lat && lon && lat.count >= 3 && lon.count >= 3) {
      const deg = (e: Entry) => rational(e.at, 0) + rational(e.at, 1) / 60 + rational(e.at, 2) / 3600;
      let la = deg(lat), lo = deg(lon);
      if (latRef && String.fromCharCode(b[start + latRef.at]) === 'S') la = -la;
      if (lonRef && String.fromCharCode(b[start + lonRef.at]) === 'W') lo = -lo;
      if (la || lo) meta.gps = { lat: la, lon: lo };
    }
  }
}

const isJpeg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = (b: Uint8Array) => PNG_SIG.every((v, i) => b[i] === v);
const startsWith = (b: Uint8Array, at: number, s: string) => [...s].every((c, i) => b[at + i] === c.charCodeAt(0));

/** Walks JPEG segments up to the image data, calling back for each marker. */
function jpegSegments(b: Uint8Array, fn: (marker: number, at: number, len: number) => void) {
  let o = 2;
  while (o + 4 <= b.length && b[o] === 0xff) {
    const marker = b[o + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { o += 2; continue; }
    const len = (b[o + 2] << 8) | b[o + 3];
    fn(marker, o, len);
    if (marker === 0xda) return o; // start of scan: image data follows
    o += 2 + len;
  }
  return o;
}

export function readMeta(b: Uint8Array): PhotoMeta {
  const meta: PhotoMeta = { extras: [] };
  try {
    if (isJpeg(b)) {
      jpegSegments(b, (m, at) => {
        if (m === 0xe1 && startsWith(b, at + 4, 'Exif\0\0')) readTiff(b, at + 10, meta);
        else if (m === 0xe1 && startsWith(b, at + 4, 'http://ns.adobe.com/xap')) meta.extras.push('XMP');
        else if (m === 0xed) meta.extras.push('IPTC');
        else if (m === 0xfe) meta.extras.push('comment');
      });
    } else if (isPng(b)) {
      let o = 8;
      while (o + 12 <= b.length) {
        const len = ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
        const type = String.fromCharCode(...b.subarray(o + 4, o + 8));
        if (type === 'eXIf') readTiff(b, o + 8, meta);
        else if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') meta.extras.push('text');
        o += 12 + len;
      }
    }
  } catch { /* damaged metadata: report what was read */ }
  meta.extras = [...new Set(meta.extras)];
  return meta;
}

/** A minimal EXIF block holding only the orientation, so a stripped photo still shows upright. */
function orientationExif(o: number) {
  const tiff = [0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0, 0, 0, 0, 0, 0, 0];
  const body = [...'Exif'].map(c => c.charCodeAt(0)).concat([0, 0], tiff);
  const len = body.length + 2;
  return Uint8Array.from([0xff, 0xe1, len >> 8, len & 0xff, ...body]);
}

/**
 * Removes location, camera, date and other hidden data without re-compressing the picture.
 * JPEG keeps its colour profile (APP2) and Adobe colour marker (APP14), plus orientation;
 * PNG drops text and EXIF chunks. Other formats come back unchanged (null).
 */
export function stripMeta(b: Uint8Array, orientation = 1): Uint8Array<ArrayBuffer> | null {
  if (isJpeg(b)) {
    const keep: Uint8Array[] = [b.subarray(0, 2)];
    let sawApp0 = false, added = false;
    const addOrientation = () => { if (!added && orientation > 1 && orientation <= 8) { keep.push(orientationExif(orientation)); added = true; } };
    const sos = jpegSegments(b, (m, at, len) => {
      // Drop EXIF/XMP, IPTC, comments, maker blocks, and APP2 unless it is the colour profile
      // (iPhone APP2 "MPF" points at extra embedded images that can carry their own location)
      const drop = m === 0xe1 || m === 0xfe || (m >= 0xe3 && m <= 0xed) || (m === 0xe2 && !startsWith(b, at + 4, 'ICC_PROFILE'));
      if (m === 0xe0) sawApp0 = true;
      if (!drop) {
        if (sawApp0 && m !== 0xe0) addOrientation();
        else if (!sawApp0) addOrientation();
        keep.push(b.subarray(at, at + 2 + len));
      }
    });
    addOrientation();
    // The scan header was pushed by the callback; copy the image data up to the end marker and
    // drop anything appended after it (embedded preview or depth images with their own metadata)
    const data = sos + 2 + ((b[sos + 2] << 8) | b[sos + 3]);
    let end = b.length;
    for (let i = data; i < b.length - 1; i++) if (b[i] === 0xff && b[i + 1] === 0xd9) { end = i + 2; break; }
    keep.push(b.subarray(data, end));
    const out = new Uint8Array(keep.reduce((t, k) => t + k.length, 0));
    let o = 0;
    for (const k of keep) { out.set(k, o); o += k.length; }
    return out;
  }
  if (isPng(b)) {
    const parts: Uint8Array[] = [b.subarray(0, 8)];
    let o = 8;
    while (o + 12 <= b.length) {
      const len = ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
      const type = String.fromCharCode(...b.subarray(o + 4, o + 8));
      if (!['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME'].includes(type)) parts.push(b.subarray(o, o + 12 + len));
      o += 12 + len;
    }
    const out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0));
    let p = 0;
    for (const part of parts) { out.set(part, p); p += part.length; }
    return out;
  }
  return null;
}
