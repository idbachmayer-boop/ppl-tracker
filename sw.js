/* Service worker — the app shell, cached so the gym's dead spots don't cost a workout.
 *
 * This used to be registered from a `blob:` URL built in index.html. Browsers reject that (a worker
 * script must be a real same-origin URL), and the `.catch(() => {})` around it swallowed the error,
 * so the app claimed offline support for six weeks while having none: a live check on 2026-08-10
 * found zero registrations. Hence a real file, and a visible status in Settings.
 *
 * Bump CACHE_VERSION whenever the shell changes. Old caches are dropped on activate, so a stale
 * shell can never outlive a release.
 */
const CACHE_VERSION = 'v2-2026-08-10';
const CACHE = 'ppl-shell-' + CACHE_VERSION;
const SHELL = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ppl-shell-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first: an update has to be able to land. The cache is the fallback, which is what makes
   the app open with no signal. Cross-origin requests (Firebase, gstatic) bypass the worker
   entirely — letting it touch them broke sync the last time it was tried. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
