import { useEffect, useRef, useState } from 'react';

export interface NavItem {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

export interface ToolLink {
  key: string;
  label: string;
  hint: string;
  group: 'Share' | 'Forms and documents' | 'Photos';
  href: string;
  active: boolean;
}

interface Props {
  tools: ToolLink[];
  /** The stacker's own sections, shown under the header while the stacker is open. */
  sections: NavItem[];
  showSections: boolean;
  /** Present in the browser (hidden inside the installed app). */
  onInstall?: () => void;
  installLabel: string;
  onHelp: () => void;
}

const GROUPS: ToolLink['group'][] = ['Share', 'Forms and documents', 'Photos'];
/** Tools linked straight from the header, most used first; narrower screens show fewer (see CSS). */
const FEATURED = ['stack', 'fit', 'scan', 'photo', 'cards'];

/** Three stacked cards, the app's mark. */
function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <rect x="8.5" y="7" width="15" height="4.5" rx="1.2" fill="var(--accent-fg)" />
      <rect x="8.5" y="13.75" width="15" height="4.5" rx="1.2" fill="var(--accent-fg)" />
      <rect x="8.5" y="20.5" width="15" height="4.5" rx="1.2" fill="var(--accent-fg)" />
    </svg>
  );
}

function Sections({ items }: { items: NavItem[] }) {
  return (
    <>
      {items.map(n => (
        <button key={n.key} className="nav-link" title={n.hint} onClick={n.run}>{n.label}</button>
      ))}
    </>
  );
}

/** All tools in one menu, grouped, each with what it does. Closes on choice, Escape or a click outside. */
function ToolsMenu({ tools }: { tools: ToolLink[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('routechange', close);
    window.addEventListener('popstate', close);
    return () => { window.removeEventListener('routechange', close); window.removeEventListener('popstate', close); };
  }, []);
  // When the open tool isn't one of the header links, the menu button shows its name
  const current = tools.find(t => t.active && !FEATURED.includes(t.key));
  return (
    <div className="tools-menu" ref={box}>
      <button className={'tool-link' + (current ? ' on' : '')} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(o => !o)}>
        {current ? current.label : 'All tools'} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="tools-panel" role="menu">
          {GROUPS.map(g => (
            <div key={g} className="tools-group">
              <span className="label">{g}</span>
              {tools.filter(t => t.group === g).map(t => (
                <a key={t.key} role="menuitem" href={t.href} className={'tools-item' + (t.active ? ' on' : '')} onClick={() => setOpen(false)}>
                  <strong>{t.label}</strong>
                  <span>{t.hint}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader({ tools, sections, showSections, onInstall, installLabel, onHelp }: Props) {
  const featured = FEATURED.map(k => tools.find(t => t.key === k)).filter((t): t is ToolLink => !!t);
  return (
    <header className="site-head">
      <div className="site-head-in">
        <a className="brand" href="/" aria-label="PhotoSize home">
          <Mark />
          <span>PhotoSize</span>
        </a>
        <nav className="tools" aria-label="Tools">
          {featured.map((t, i) => (
            <a key={t.key} href={t.href} data-rank={i} className={'tool-link feat' + (t.active ? ' on' : '')} aria-current={t.active ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
          <ToolsMenu tools={tools} />
        </nav>
        <div className="head-actions">
          <button className="btn sm" onClick={onHelp}>How it works</button>
          {onInstall && <button className="btn sm primary" onClick={onInstall}>{installLabel}</button>}
        </div>
      </div>
      {showSections && (
        <div className="site-sub">
          <nav className="nav" aria-label="Stacker sections">
            <Sections items={sections} />
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter({ tools, sections, onInstall, installLabel, onHelp }: Props) {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <div className="foot-about">
          <span className="brand"><Mark /><span>PhotoSize</span></span>
          <p>Free image tools for sharing on WhatsApp and Instagram and for filling in forms: stack, fit, scan, sign, caption and clean up photos.</p>
          <ul className="foot-badges" aria-label="Promises">
            <li>Nothing is uploaded</li>
            <li>No sign-up</li>
            <li>No watermark</li>
            <li>Works offline</li>
          </ul>
          <div className="row">
            {onInstall && <button className="btn sm primary" onClick={onInstall}>{installLabel}</button>}
            <button className="btn sm" onClick={onHelp}>How it works</button>
          </div>
        </div>
        {GROUPS.map(g => (
          <nav key={g} className="foot-nav" aria-label={g}>
            <span className="label">{g}</span>
            {tools.filter(t => t.group === g).map(t => <a key={t.key} className={'nav-link' + (t.active ? ' on' : '')} href={t.href}>{t.label}</a>)}
          </nav>
        ))}
        <nav className="foot-nav" aria-label="Stacker sections">
          <span className="label">In the Stacker</span>
          <Sections items={sections} />
        </nav>
      </div>
      <div className="foot-bottom">
        <div className="foot-bottom-in">
          <span className="foot-legal">
            © 2026 PhotoSize · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/contact">Contact</a>
          </span>
          <span className="foot-credits">
            Runs on this device with <a href="https://github.com/strukturag/libheif" target="_blank" rel="noreferrer">libheif</a> (LGPL-3.0),{' '}
            <a href="https://github.com/naptha/tesseract.js" target="_blank" rel="noreferrer">Tesseract.js</a> (Apache-2.0),{' '}
            <a href="https://github.com/xuebinqin/U-2-Net" target="_blank" rel="noreferrer">U²-Net</a> (Apache-2.0) and{' '}
            <a href="https://onnxruntime.ai" target="_blank" rel="noreferrer">ONNX Runtime</a> (MIT), each loaded only when needed.
          </span>
        </div>
      </div>
    </footer>
  );
}
