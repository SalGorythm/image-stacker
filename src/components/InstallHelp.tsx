import { useEffect, useRef } from 'react';
import type { InstallPlatform } from '../hooks';

const STEPS: Record<InstallPlatform, { title: string; steps: string[] }> = {
  ios: { title: 'On iPhone or iPad', steps: ['Tap the Share button (the square with an arrow) in Safari.', 'Scroll and tap Add to Home Screen.', 'Tap Add. Image Stacker now opens from your home screen like an app.'] },
  android: { title: 'On Android', steps: ['Tap the ⋮ menu in Chrome.', 'Tap Install app (or Add to Home screen).', 'Confirm. Image Stacker appears with your other apps, and files can be shared into it.'] },
  'mac-safari': { title: 'In Safari on a Mac', steps: ['Open the File menu (or the Share button).', 'Choose Add to Dock.', 'Click Add. Image Stacker opens from the Dock like an app.'] },
  chromium: { title: 'In Chrome or Edge', steps: ['Click the install icon at the right end of the address bar (a screen with a down arrow).', 'Or open the ⋮ menu → Cast, save and share → Install page as app (Edge: Apps → Install this site as an app).', 'Click Install. Image Stacker opens in its own window and from your apps.'] },
  firefox: { title: 'In Firefox', steps: ['Firefox on computers can’t install web apps.', 'Open this page in Chrome, Edge or Safari and use Install app there.', 'Firefox on Android: ⋮ menu → Add to Home screen.'] },
  other: { title: 'In your browser', steps: ['Look for Install or Add to Home Screen in the browser menu.', 'Chrome, Edge and Safari support installing Image Stacker.'] },
};

interface Props { platform: InstallPlatform; installed: boolean; onClose: () => void }

/** How to install, when the browser doesn't offer a prompt the app can open itself. */
export function InstallHelp({ platform, installed, onClose }: Props) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  const s = STEPS[platform];
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="inst-title" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="picker help">
        <div className="picker-head">
          <strong id="inst-title">{installed ? 'Image Stacker is installed' : 'Install Image Stacker'}</strong>
          <span className="stat">Free · no app store · works offline</span>
        </div>
        {installed ? (
          <p>It's already installed on this device. Open it from your Dock, Start menu, home screen or apps list. If you removed it, follow the steps below to add it again.</p>
        ) : (
          <p>Installing puts Image Stacker on your device like an app: its own window, quick to open, and it works without internet.</p>
        )}
        <span className="label">{s.title}</span>
        <ol className="steps">{s.steps.map(t => <li key={t}><span>{t}</span></li>)}</ol>
        <div className="row picker-foot"><button ref={ok} className="btn primary" onClick={onClose}>Got it</button></div>
      </div>
    </div>
  );
}
