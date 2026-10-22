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

const GROUPS: ToolLink['group'][] = ['Share', 'Forms and documents', 'Photos'];

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
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);
  const current = tools.find(t => t.active && t.key !== 'stack');
  return (
    <div className="tools-menu" ref={box}>
      <button className={'tool-link' + (current ? ' on' : '')} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(o => !o)}>
        {current ? current.label : 'Tools'} <span aria-hidden="true">▾</span>
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

interface Props {
  tools: ToolLink[];
  /** The stacker's own sections, shown under the header while the stacker is open. */
  sections: NavItem[];
  showSections: boolean;
  /** Shown when the browser can install the app (or on iPhone, where it explains how). */
  onInstall?: () => void;
  onHelp: () => void;
}

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

export function SiteHeader({ tools, sections, showSections, onInstall, onHelp }: Props) {
  return (
    <header className="site-head">
      <div className="site-head-in">
        <a className="brand" href="#/" aria-label="Image Stacker home">
          <Mark />
          <span>Image Stacker</span>
        </a>
        <nav className="tools" aria-label="Tools">
          <a href="#/" className={'tool-link' + (tools[0]?.active ? ' on' : '')} aria-current={tools[0]?.active ? 'page' : undefined}>Stacker</a>
          <ToolsMenu tools={tools} />
        </nav>
        <div className="head-actions">
          <button className="btn sm" onClick={onHelp}>How it works</button>
          {onInstall && <button className="btn sm primary" onClick={onInstall}>Install app</button>}
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

export function SiteFooter({ tools, sections, onInstall, onHelp }: Props) {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <div className="foot-about">
          <span className="brand"><Mark /><span>Image Stacker</span></span>
          <p>Stack images and PDF slides, fit photos and signatures to form limits, trim, caption and share. Everything runs in your browser. Nothing is uploaded.</p>
        </div>
        <nav className="foot-nav" aria-label="Tools">
          <span className="label">Tools</span>
          {tools.map(t => <a key={t.key} className="nav-link" href={t.href}>{t.label}</a>)}
          <button className="nav-link" onClick={onHelp}>How it works</button>
          {onInstall && <button className="nav-link" onClick={onInstall}>Install app</button>}
          <span className="foot-note">Works offline once it has loaded.</span>
          <span className="foot-note">
            Opens iPhone HEIC photos with <a href="https://github.com/strukturag/libheif" target="_blank" rel="noreferrer">libheif</a> (LGPL-3.0), reads text with{' '}
            <a href="https://github.com/naptha/tesseract.js" target="_blank" rel="noreferrer">Tesseract.js</a> (Apache-2.0) and removes backgrounds with{' '}
            <a href="https://github.com/xuebinqin/U-2-Net" target="_blank" rel="noreferrer">U²-Net</a> (Apache-2.0) on{' '}
            <a href="https://onnxruntime.ai" target="_blank" rel="noreferrer">ONNX Runtime</a> (MIT), each loaded only when needed.
          </span>
        </nav>
        <nav className="foot-nav" aria-label="Stacker sections">
          <span className="label">Stacker</span>
          <Sections items={sections} />
        </nav>
      </div>
    </footer>
  );
}
