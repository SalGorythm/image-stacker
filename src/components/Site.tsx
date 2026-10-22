export interface NavItem {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

interface Props {
  nav: NavItem[];
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

function Links({ nav }: { nav: NavItem[] }) {
  return (
    <>
      {nav.map(n => (
        <button key={n.key} className="nav-link" title={n.hint} onClick={n.run}>{n.label}</button>
      ))}
    </>
  );
}

export function SiteHeader({ nav, onInstall, onHelp }: Props) {
  return (
    <header className="site-head">
      <div className="site-head-in">
        <a className="brand" href="/" aria-label="Image Stacker home">
          <Mark />
          <span>Image Stacker</span>
        </a>
        <nav className="nav" aria-label="Tools">
          <Links nav={nav} />
        </nav>
        <div className="head-actions">
          <button className="btn sm" onClick={onHelp}>How it works</button>
          {onInstall && <button className="btn sm primary" onClick={onInstall}>Install app</button>}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ nav, onInstall, onHelp }: Props) {
  return (
    <footer className="site-foot">
      <div className="site-foot-in">
        <div className="foot-about">
          <span className="brand"><Mark /><span>Image Stacker</span></span>
          <p>Stack images and PDF slides into tall images, split them into groups, trim them and share them. Everything runs in your browser. Nothing is uploaded.</p>
        </div>
        <nav className="foot-nav" aria-label="Tools">
          <span className="label">Tools</span>
          <Links nav={nav} />
        </nav>
        <div className="foot-nav">
          <span className="label">App</span>
          <button className="nav-link" onClick={onHelp}>How it works</button>
          {onInstall && <button className="nav-link" onClick={onInstall}>Install app</button>}
          <span className="foot-note">Works offline once it has loaded.</span>
        </div>
      </div>
    </footer>
  );
}
