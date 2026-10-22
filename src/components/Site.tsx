export interface NavItem {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

export interface ToolLink {
  key: string;
  label: string;
  href: string;
  active: boolean;
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
          {tools.map(t => (
            <a key={t.key} href={t.href} className={'tool-link' + (t.active ? ' on' : '')} aria-current={t.active ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
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
            Opens iPhone HEIC photos with <a href="https://github.com/strukturag/libheif" target="_blank" rel="noreferrer">libheif</a> (LGPL-3.0), loaded only when needed.
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
