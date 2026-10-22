import { describe, expect, it } from 'vitest';
import { needsCountryCode, qrMatrix, vcardPayload, waNumber, whatsappLink, wifiPayload } from './qr';

describe('WhatsApp links', () => {
  it('cleans numbers', () => {
    expect(waNumber('+92 300-123 4567')).toBe('923001234567');
    expect(waNumber('0091 98765 43210')).toBe('919876543210');
  });
  it('adds the message, encoded', () =>
    expect(whatsappLink('+92 300 1234567', 'السلام علیکم, quiz?')).toBe(`https://wa.me/923001234567?text=${encodeURIComponent('السلام علیکم, quiz?')}`));
  it('spots local numbers without a country code', () => {
    expect(needsCountryCode('0300 1234567')).toBe(true);
    expect(needsCountryCode('00923001234567')).toBe(false);
    expect(needsCountryCode('+923001234567')).toBe(false);
  });
});

describe('WiFi', () => {
  it('escapes special characters', () =>
    expect(wifiPayload({ ssid: 'Cafe;Guest', password: 'p:a"ss', security: 'WPA', hidden: false })).toBe('WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\"ss;;'));
  it('leaves out the password for open networks', () =>
    expect(wifiPayload({ ssid: 'Open', password: 'x', security: 'nopass', hidden: true })).toBe('WIFI:T:nopass;S:Open;H:true;;'));
});

describe('vCard', () => {
  it('includes only filled fields', () => {
    const v = vcardPayload({ name: 'Ali, Khan', phone: '+92 300 1234567', email: '', org: 'Quiz Circle', url: '' });
    expect(v).toContain('FN:Ali\\, Khan');
    expect(v).toContain('ORG:Quiz Circle');
    expect(v).not.toContain('EMAIL');
  });
});

describe('qrMatrix', () => {
  it('encodes Urdu text and has finder squares in the corners', () => {
    const m = qrMatrix(whatsappLink('923001234567', 'کل کوئز ہے'));
    expect(m.size).toBeGreaterThanOrEqual(25);
    expect(m.dark(0, 0) && m.dark(0, m.size - 1) && m.dark(m.size - 1, 0)).toBe(true);
  });
});
