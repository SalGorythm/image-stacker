import { useEffect, useRef } from 'react';
import type { InfoPage } from './info';
import type { Page } from './pages';
import { SITE } from './site';

function setTag(selector: string, make: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = make(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

/** Keeps the tab title, description and canonical address in step with the page that's open. */
export function useSeo(page: Page) {
  useEffect(() => {
    document.title = page.title;
    setTag('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', page.description);
    if (SITE.url) setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', SITE.url + page.path);
  }, [page]);
}

/** How to use the tool and common questions, under the tool. Also what search engines read. */
export function ToolGuide({ page }: { page: Page }) {
  if (!page.steps.length && !page.faqs.length) return null;
  return (
    <section className="wrap guide" aria-label="Guide">
      <div className="guide-col">
        <h2>How to use it</h2>
        <p>{page.summary}</p>
        <ol>{page.steps.map(s => <li key={s}>{s}</li>)}</ol>
      </div>
      <div className="guide-col">
        <h2>Questions</h2>
        {page.faqs.map(f => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** About, Privacy and Contact. */
export function InfoView({ page }: { page: InfoPage }) {
  return (
    <main className="wrap info">
      <div className="tool-head">
        <h1>{page.h1}</h1>
        <p>{page.summary}</p>
      </div>
      {page.sections.map(s => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map(t => <p key={t}>{t}</p>)}
          {s.links && <ul>{s.links.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></li>)}</ul>}
        </section>
      ))}
    </main>
  );
}

declare global { interface Window { adsbygoogle?: unknown[] } }

/** One ad unit between the tool and its guide, only when AdSense is set up (ADSENSE_CLIENT and ADSENSE_SLOT). */
export function AdSlot({ id }: { id: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (!SITE.adsClient || !SITE.adsSlot || done.current) return;
    done.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked or not loaded */ }
  }, []);
  if (!SITE.adsClient || !SITE.adsSlot) return null;
  return (
    <div className="wrap ad" aria-label="Advertisement">
      <ins key={id} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={SITE.adsClient} data-ad-slot={SITE.adsSlot} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
