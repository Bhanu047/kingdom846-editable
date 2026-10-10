// Kingdom 791 War Room service worker.
// Makes the app installable and quick to open. It never caches /api: the
// roster, logins and sessions always come live from the server.
const CACHE = 'k791-shell-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  // Pages: network first so a new release shows at once; cached shell offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return res }).catch(() => caches.match('/')))
    return
  }
  // Hashed build assets and artwork never change under the same URL.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/art/') || /\.(png|webp|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) } return res })))
  }
})
