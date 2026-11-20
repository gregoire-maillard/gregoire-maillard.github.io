/* /gym — offline support.
   App files: network first (so edits to plan.js show up right away), cached copy if the
   network is slow (> 2.5 s) or missing. Bump CACHE to force a clean refresh.
   Exercise videos and posters (v/…): cache first, kept in their own cache so app updates
   don't throw them away. Byte-range requests (Safari asks for video in ranges) are
   answered from the cached file. */
const CACHE = 'gym-v3';
const MEDIA = 'gym-media-v1';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'core.js', 'moves.js', 'plan.js', 'videos.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('gym-') && k !== CACHE && k !== MEDIA).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function mediaFile(url) {
  const cache = await caches.open(MEDIA);
  let res = await cache.match(url);
  if (!res) {
    res = await fetch(url);                 // whole file, no Range header
    if (res && res.ok && res.status === 200) await cache.put(url, res.clone());
  }
  return res;
}
async function mediaResponse(req) {
  const url = req.url.split('#')[0];
  const res = await mediaFile(url);
  const range = req.headers.get('range');
  if (!range || !res || !res.ok) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (/\/v\/[^/]+\/[^/]+\.(mp4|jpg)$/.test(new URL(req.url).pathname)) {
    e.respondWith(mediaResponse(req).catch(() => Response.error()));
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => {
      if (res && res.ok && res.status === 200) cache.put(req, res.clone());
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
