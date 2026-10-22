import qrcode from 'qrcode-generator';

// The library squeezes text into single bytes by default, which garbles Urdu or Arabic; use UTF-8
qrcode.stringToBytes = (s: string) => [...new TextEncoder().encode(s)];

/** Digits for a wa.me link: no +, spaces or dashes, and 00 international prefix dropped. */
export function waNumber(phone: string) {
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  return d.replace(/\D/g, '');
}

/** A link that opens a WhatsApp chat with this number, optionally with a message typed in. */
export function whatsappLink(phone: string, text = '') {
  const n = waNumber(phone);
  return `https://wa.me/${n}${text.trim() ? `?text=${encodeURIComponent(text.trim())}` : ''}`;
}

/** Local numbers (starting with 0) need the country code for wa.me to work. */
export const needsCountryCode = (phone: string) => /^\s*0(?!0)/.test(phone);

const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

/** The WiFi QR format phones understand: joins the network when scanned. */
export function wifiPayload(o: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean }) {
  const parts = [`T:${o.security}`, `S:${wifiEscape(o.ssid)}`];
  if (o.security !== 'nopass') parts.push(`P:${wifiEscape(o.password)}`);
  if (o.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

const vEscape = (s: string) => s.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');

/** A contact card (vCard 3.0) that phones offer to save when scanned. */
export function vcardPayload(o: { name: string; phone: string; email: string; org: string; url: string }) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${vEscape(o.name.trim())}`, `N:${vEscape(o.name.trim())};;;;`];
  if (o.org.trim()) lines.push(`ORG:${vEscape(o.org.trim())}`);
  if (o.phone.trim()) lines.push(`TEL;TYPE=CELL:${o.phone.trim()}`);
  if (o.email.trim()) lines.push(`EMAIL:${o.email.trim()}`);
  if (o.url.trim()) lines.push(`URL:${o.url.trim()}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

export interface QrMatrix { size: number; dark: (r: number, c: number) => boolean }

/** Encodes text as a QR code (medium error correction: survives a little dirt or a logo-free crease). */
export function qrMatrix(text: string, ecc: 'L' | 'M' | 'Q' | 'H' = 'M'): QrMatrix {
  const q = qrcode(0, ecc);
  q.addData(text, 'Byte');
  q.make();
  return { size: q.getModuleCount(), dark: (r, c) => q.isDark(r, c) };
}

/** Draws a QR code with its quiet zone (4 modules of white), crisp at any size. */
export function drawQr(x: CanvasRenderingContext2D, m: QrMatrix, left: number, top: number, size: number, ink = '#000000') {
  const quiet = 4, cell = size / (m.size + quiet * 2);
  x.fillStyle = '#ffffff';
  x.fillRect(left, top, size, size);
  x.fillStyle = ink;
  for (let r = 0; r < m.size; r++)
    for (let c = 0; c < m.size; c++)
      if (m.dark(r, c)) {
        const X = left + (c + quiet) * cell, Y = top + (r + quiet) * cell;
        // Snap to whole pixels so neighbouring modules touch without hairline gaps
        x.fillRect(Math.floor(X), Math.floor(Y), Math.ceil(X + cell) - Math.floor(X), Math.ceil(Y + cell) - Math.floor(Y));
      }
}
