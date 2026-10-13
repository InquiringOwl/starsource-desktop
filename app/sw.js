/* StarSource service worker (web / installed PWA only; the desktop and native apps don't register it).
   Precaches the whole app for offline use; the city list is cached the first time it is used.
   A new version installs in the background and waits; the page offers "Reload to update" (Settings → Updates). */
const VERSION = "0.1.0-6d8b0113";
const CACHE = "starsource-" + VERSION;
const FILES = ["./","engine/swisseph.wasm","ephe/seas_18.se1","ephe/sefstars.txt","ephe/semo_18.se1","ephe/sepl_18.se1","fonts/fonts.css","fonts/ibm-plex-mono-latin-400-normal.woff2","fonts/ibm-plex-mono-latin-500-normal.woff2","fonts/ibm-plex-mono-latin-600-normal.woff2","fonts/ibm-plex-mono-latin-ext-400-normal.woff2","fonts/ibm-plex-mono-latin-ext-500-normal.woff2","fonts/ibm-plex-mono-latin-ext-600-normal.woff2","fonts/ibm-plex-sans-greek-400-normal.woff2","fonts/ibm-plex-sans-greek-500-normal.woff2","fonts/ibm-plex-sans-greek-600-normal.woff2","fonts/ibm-plex-sans-latin-400-normal.woff2","fonts/ibm-plex-sans-latin-500-normal.woff2","fonts/ibm-plex-sans-latin-600-normal.woff2","fonts/ibm-plex-sans-latin-ext-400-normal.woff2","fonts/ibm-plex-sans-latin-ext-500-normal.woff2","fonts/ibm-plex-sans-latin-ext-600-normal.woff2","fonts/noto-sans-symbols-2-symbols-400-normal.woff2","fonts/noto-sans-symbols-alchemy-400.woff2","fonts/noto-sans-symbols-symbols-400-normal.woff2","fonts/saira-semi-condensed-latin-400-normal.woff2","fonts/saira-semi-condensed-latin-500-normal.woff2","fonts/saira-semi-condensed-latin-600-normal.woff2","fonts/saira-semi-condensed-latin-ext-400-normal.woff2","fonts/saira-semi-condensed-latin-ext-500-normal.woff2","fonts/saira-semi-condensed-latin-ext-600-normal.woff2","fonts/stix-two-text-greek-400-italic.woff2","fonts/stix-two-text-greek-400-normal.woff2","fonts/stix-two-text-greek-600-italic.woff2","fonts/stix-two-text-greek-600-normal.woff2","fonts/stix-two-text-latin-400-italic.woff2","fonts/stix-two-text-latin-400-normal.woff2","fonts/stix-two-text-latin-600-italic.woff2","fonts/stix-two-text-latin-600-normal.woff2","fonts/stix-two-text-latin-ext-400-italic.woff2","fonts/stix-two-text-latin-ext-400-normal.woff2","fonts/stix-two-text-latin-ext-600-italic.woff2","fonts/stix-two-text-latin-ext-600-normal.woff2","icon-180.png","icon-192.png","icon-512.png","icon-maskable-512.png","index.html","manifest.webmanifest"];
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
