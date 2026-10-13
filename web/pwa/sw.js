/* StarSource service worker (web / installed PWA only; the desktop and native apps don't register it).
   Precaches the whole app for offline use; the city list is cached the first time it is used.
   A new version installs in the background and waits; the page offers "Reload to update" (Settings → Updates). */
const VERSION = "__VERSION__";
const CACHE = "starsource-" + VERSION;
const FILES = __FILES__;
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("starsource-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "skip-waiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(e.request);
    if (r.ok && /\/data\//.test(u.pathname)) c.put(e.request, r.clone());
    return r;
  }));
});
