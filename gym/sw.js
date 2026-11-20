/* /gym — offline support. Network first (so edits to plan.js show up right away),
   cached copy if the network is slow (> 2.5 s) or missing. Bump CACHE to force a clean refresh. */
const CACHE = 'gym-v2';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'core.js', 'moves.js', 'plan.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('gym-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(r => setTimeout(r, 2500));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch (err) { /* offline */ }
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return network.catch(() => (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
  })());
});
