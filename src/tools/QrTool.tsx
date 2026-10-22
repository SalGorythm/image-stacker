import { useEffect, useMemo, useRef, useState } from 'react';
import type { ToastOptions, ToastState } from '../hooks';
import { needsCountryCode, vcardPayload, waNumber, whatsappLink, wifiPayload } from '../lib/qr';
import { POSTER_LOOKS, POSTER_SIZES, renderPoster, renderQrOnly, type PosterLook, type PosterSize } from '../lib/qrposter';
import { canShareFiles, canvasBlob, saveBlob } from '../lib/render';
import { pageH1 } from '../seo/pages';

interface Props {
  toast: ToastState | null;
  show: (msg: string, o?: ToastOptions) => void;
}

type Kind = 'whatsapp' | 'wifi' | 'contact' | 'link' | 'text';
const KINDS: [Kind, string][] = [['whatsapp', 'WhatsApp chat'], ['wifi', 'WiFi'], ['contact', 'Contact'], ['link', 'Link'], ['text', 'Text']];
const TITLES: Record<Kind, string> = {
  whatsapp: 'Message us on WhatsApp', wifi: 'Free WiFi', contact: 'Save our number', link: 'Visit our page', text: 'Scan me',
};

interface Draft {
  kind: Kind;
  phone: string; message: string;
  ssid: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean;
  name: string; cphone: string; email: string; org: string; url: string;
  link: string; text: string;
  title: string; subtitle: string; showDetails: boolean;
  size: PosterSize; look: PosterLook;
}
const KEY = 'qr-draft';
const BLANK: Draft = {
  kind: 'whatsapp', phone: '', message: '', ssid: '', security: 'WPA', hidden: false,
  name: '', cphone: '', email: '', org: '', url: '', link: '', text: '',
  title: '', subtitle: '', showDetails: true, size: 'status', look: 'fresh',
};

/**
 * QR kit: static QR codes (WhatsApp chat, WiFi, contact, link, text) that never expire, with no
 * account or tracking, made into a poster or Status image. The WiFi password is never saved.
 */
export function QrTool({ toast, show }: Props) {
  const [d, setD] = useState<Draft>(() => { try { return { ...BLANK, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return BLANK; } });
  const [password, setPassword] = useState('');
  const set = (patch: Partial<Draft>) => setD(x => ({ ...x, ...patch }));
  const cv = useRef<HTMLCanvasElement>(null);

  const { payload, details, problem } = useMemo(() => {
    switch (d.kind) {
      case 'whatsapp': {
        const n = waNumber(d.phone);
        if (n.length < 8) return { payload: '', details: '', problem: 'Type the WhatsApp number, with the country code.' };
        return { payload: whatsappLink(d.phone, d.message), details: d.phone.trim(), problem: needsCountryCode(d.phone) ? 'Add the country code (for example 92 for Pakistan, 91 for India) instead of the leading 0, or the link won\'t open the chat.' : '' };
      }
      case 'wifi':
        if (!d.ssid.trim()) return { payload: '', details: '', problem: 'Type the WiFi network name.' };
        return { payload: wifiPayload({ ssid: d.ssid, password, security: d.security, hidden: d.hidden }), details: `Network: ${d.ssid}${d.security !== 'nopass' && password ? `   Password: ${password}` : ''}`, problem: d.security !== 'nopass' && !password ? 'Type the WiFi password.' : '' };
      case 'contact':
        if (!d.name.trim()) return { payload: '', details: '', problem: 'Type a name for the contact.' };
        return { payload: vcardPayload({ name: d.name, phone: d.cphone, email: d.email, org: d.org, url: d.url }), details: [d.name, d.cphone].filter(s => s.trim()).join(' · '), problem: '' };
      case 'link':
        if (!d.link.trim()) return { payload: '', details: '', problem: 'Paste the link.' };
        return { payload: /^[a-z]+:/i.test(d.link.trim()) ? d.link.trim() : `https://${d.link.trim()}`, details: d.link.trim().replace(/^https?:\/\//, ''), problem: '' };
      default:
        return { payload: d.text.trim(), details: '', problem: d.text.trim() ? '' : 'Type the text.' };
    }
  }, [d, password]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
  }, [d]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (cv.current) renderPoster(cv.current, { payload, title: d.title || TITLES[d.kind], subtitle: d.subtitle, details: d.showDetails ? details : '', size: d.size, look: d.look });
    }, 120);
    return () => clearTimeout(t);
  }, [payload, details, d.title, d.subtitle, d.showDetails, d.size, d.look, d.kind]);

  const poster = async () => new File([(await canvasBlob(cv.current!, 'image/png'))!], `qr-${d.kind}-poster.png`, { type: 'image/png' });
  const qrOnly = async () => { const c = document.createElement('canvas'); renderQrOnly(c, payload); return new File([(await canvasBlob(c, 'image/png'))!], `qr-${d.kind}.png`, { type: 'image/png' }); };
  const share = async () => {
    try { await navigator.share({ files: [await poster()] }); }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) show('Sharing failed. Use Download instead.', { err: true }); }
  };
  const field = (id: keyof Draft, label: string, ph = '', type = 'text') => (
    <>
      <label htmlFor={`qr-${id}`}>{label}</label>
      <input id={`qr-${id}`} type={type} dir="auto" value={String(d[id])} placeholder={ph} onChange={e => set({ [id]: e.target.value } as Partial<Draft>)} />
    </>
  );

  return (
    <main className="wrap">
      <div className="tool-head">
        <h1>{pageH1('QR codes')}</h1>
        <p>Make a QR code for a WhatsApp chat, your WiFi, a contact or a link, as a poster or Status image. It's a static code: it works forever, with no account, no subscription and no tracking.</p>
      </div>
      <div className="grid">
        <section className="panel" aria-label="QR content and style">
          <div className="seg wrap-seg" role="radiogroup" aria-label="What the code opens">
            {KINDS.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={d.kind === k} className={d.kind === k ? 'on' : ''} onClick={() => set({ kind: k })}>{l}</button>
            ))}
          </div>
          <div className="settings">
            {d.kind === 'whatsapp' && <>{field('phone', 'Number', '+92 300 1234567', 'tel')}{field('message', 'Message', 'Optional: text ready to send')}</>}
            {d.kind === 'wifi' && (
              <>
                {field('ssid', 'Network', 'WiFi name')}
                <label htmlFor="qr-sec">Security</label>
                <select id="qr-sec" value={d.security} onChange={e => set({ security: e.target.value as Draft['security'] })}>
                  <option value="WPA">WPA / WPA2 / WPA3 (most networks)</option>
                  <option value="WEP">WEP (old)</option>
                  <option value="nopass">No password</option>
                </select>
                {d.security !== 'nopass' && (<><label htmlFor="qr-pass">Password</label><input id="qr-pass" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Not saved anywhere" /></>)}
              </>
            )}
            {d.kind === 'contact' && <>{field('name', 'Name')}{field('cphone', 'Phone', '', 'tel')}{field('email', 'Email', '', 'email')}{field('org', 'Organisation')}{field('url', 'Website')}</>}
            {d.kind === 'link' && field('link', 'Link', 'https://…', 'url')}
            {d.kind === 'text' && field('text', 'Text')}
          </div>
          {problem && <p className="hint warn-text">{problem}</p>}
          <div className="section">
            <span className="label">Poster</span>
            <div className="settings">
              <label htmlFor="qr-title">Title</label>
              <input id="qr-title" type="text" dir="auto" value={d.title} placeholder={TITLES[d.kind]} onChange={e => set({ title: e.target.value })} />
              <label htmlFor="qr-sub">Subtitle</label>
              <input id="qr-sub" type="text" dir="auto" value={d.subtitle} placeholder="Optional, e.g. opening hours" onChange={e => set({ subtitle: e.target.value })} />
              <label>Look</label>
              <div className="seg" role="radiogroup" aria-label="Look">
                {(Object.keys(POSTER_LOOKS) as PosterLook[]).map(k => (
                  <button key={k} type="button" role="radio" aria-checked={d.look === k} className={d.look === k ? 'on' : ''} onClick={() => set({ look: k })}>{POSTER_LOOKS[k].label}</button>
                ))}
              </div>
              <label>Size</label>
              <div className="seg" role="radiogroup" aria-label="Size">
                {(Object.keys(POSTER_SIZES) as PosterSize[]).map(k => (
                  <button key={k} type="button" role="radio" aria-checked={d.size === k} className={d.size === k ? 'on' : ''} onClick={() => set({ size: k })}>{POSTER_SIZES[k].label}</button>
                ))}
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={d.showDetails} onChange={e => set({ showDetails: e.target.checked })} />
              Also print the details under the code{d.kind === 'wifi' ? ' (network and password)' : ''}
            </label>
          </div>
        </section>
        <section className="panel preview" aria-label="Poster">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Poster</span>
            <span className="stat">{POSTER_SIZES[d.size].w} × {POSTER_SIZES[d.size].h} px</span>
          </div>
          <div className="stage card-stage"><canvas ref={cv} className="card-canvas" /></div>
          <div className="export">
            <button className="btn primary" disabled={!payload} onClick={async () => { const f = await poster(); saveBlob(f, f.name); }}>Download poster</button>
            <button className="btn" disabled={!payload} onClick={async () => { const f = await qrOnly(); saveBlob(f, f.name); }}>Download code only</button>
            {canShareFiles && <button className="btn" disabled={!payload} onClick={share}>Share</button>}
          </div>
          <p className="hint">Test it before printing: point your phone camera at the screen.</p>
          <div className={'toast' + (toast?.err ? ' err' : '')} role="status">
            {toast?.msg}
            {toast?.action && <button className="toast-act" onClick={toast.action.fn}>{toast.action.label}</button>}
          </div>
        </section>
      </div>
    </main>
  );
}
