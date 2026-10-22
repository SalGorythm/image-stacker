// Service worker: makes the app installable, works offline after the first visit,
// and receives files shared into the installed app (Android share sheet).
const APP = 'app-v1';
const SHARED = 'shared-files';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== APP && k !== SHARED) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Files shared into the app: park them in a cache, then open the app to pick them up
  if (e.request.method === 'POST' && url.pathname === '/share-target') {
    e.respondWith((async () => {
      const form = await e.request.formData();
      const cache = await caches.open(SHARED);
      let n = 0;
      for (const f of form.getAll('files')) {
        if (!(f instanceof File)) continue;
        await cache.put(`/shared/${Date.now()}-${n++}`, new Response(f, {
          headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name) },
        }));
      }
      return Response.redirect('/?shared=' + n, 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;

  // Hashed build assets never change: cache first. Pages: network first, cached copy offline.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.open(APP).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }));
  } else if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(APP);
      try {
        const res = await fetch(e.request);
        if (res.ok) c.put('/', res.clone());
        return res;
      } catch {
        return (await c.match('/')) || Response.error();
      }
    })());
  }
});
