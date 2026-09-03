/* Kingdom 846 — service worker.
 *
 * Two jobs: make the installed app open instantly, and let it open at all when
 * the phone has no signal. Everything here is deliberately conservative — a
 * portal that shows a stale roster is worse than one that shows a spinner, so
 * anything that can change (the API, the document itself) goes to the network
 * first and only falls back to cache when the network genuinely fails.
 *
 * Bump CACHE_VERSION on any change to this file's caching rules; the activate
 * handler deletes every cache that doesn't match, so old entries never linger.
 */
const CACHE_VERSION = 'v3'
const SHELL_CACHE = `k846-shell-${CACHE_VERSION}`
const ASSET_CACHE = `k846-assets-${CACHE_VERSION}`
const FONT_CACHE = `k846-fonts-${CACHE_VERSION}`
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, FONT_CACHE])

// Enough to paint the shell offline. Deliberately small: the hashed build
// assets are cached on first use instead, so a failed precache of one stale
// filename can never block the whole install.
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/app-icons/icon-192.png']

// Runtime-cacheable file types. index.html is excluded on purpose — it is
// served no-store so the versioned ?v= script URLs inside it stay honest.
const ASSET_RE = /\.(?:js|css|png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|wav|mp3|ogg|json)$/i

// Media never changes meaning under a fixed URL, so it is always safe to serve
// from cache first.
const MEDIA_RE = /\.(?:png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|wav|mp3|ogg)$/i

/**
 * Whether a URL's content is pinned by its own name. Vite's build assets carry
 * a content hash, and the scripts in index.html carry an explicit ?v= — either
 * way a change to the file changes the URL, so the cached copy can never be
 * wrong. The hand-written scripts in public/ have neither, so they must be
 * revalidated rather than trusted; a stale one silently breaks a Battle Lab
 * import while looking perfectly healthy.
 */
function isVersioned(url) {
  return url.pathname.startsWith('/assets/') || url.searchParams.has('v')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll is all-or-nothing; add each individually so one 404 during a
      // deploy does not abort the install and leave the app uninstallable.
      .then((cache) => Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// The page asks for the update as soon as one is waiting, rather than making
// the user close every tab before a new version can take over.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    if (fallbackUrl) {
      const shell = await cache.match(fallbackUrl)
      if (shell) return shell
    }
    throw err
  }
}

// Serve from cache immediately, refresh in the background. Right for hashed
// build assets and fonts, which are either immutable or change rarely.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      // Opaque cross-origin responses report status 0; they are still worth
      // keeping for fonts, which is the only cross-origin case we cache.
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  if (cached) return cached
  const response = await network
  if (response) return response
  throw new Error(`offline and uncached: ${request.url}`)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try { url = new URL(request.url) } catch { return }

  // Never cache the API. Rosters, applications, king status and every
  // authenticated response go straight to the network, always.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return

  // Nor the worker itself — a cached service worker cannot be replaced.
  if (url.origin === self.location.origin && url.pathname === '/sw.js') return

  // Google Fonts: the stylesheet can change, the font files never do.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
    return
  }

  if (url.origin !== self.location.origin) return

  // Navigations: network first so a deploy is picked up immediately, with the
  // cached shell as the offline answer. Hash routing means every in-app route
  // resolves to the same document, so one cached shell covers the whole site.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/index.html'))
    return
  }

  if (!ASSET_RE.test(url.pathname)) return

  if (MEDIA_RE.test(url.pathname) || isVersioned(url)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE))
  } else {
    // Unversioned code: always ask the network, fall back to cache only when
    // there is no network to ask. Offline still works; a deploy is never stale.
    event.respondWith(networkFirst(request, ASSET_CACHE))
  }
})

/* ---- Event reminders ------------------------------------------------------
   The service worker is the only part of the app that is running when the app
   is not: a closed tab cannot set a timer, so the server pushes and this
   receives. Everything below runs with no page open at all.
   ------------------------------------------------------------------------- */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch {}
  const title = data.title || 'Kingdom 846'

  // A notification is the only part of this app most members will see on a busy
  // evening, so it gets the same treatment as a page: the event's own artwork,
  // a way to act on it without hunting for the right screen, and an urgency
  // that rises as the clock runs down.
  //
  // Everything below degrades rather than breaks. Android and desktop Chrome
  // show the image and the buttons; iOS shows the title, body and icon and
  // quietly ignores the rest, which is why the body alone still has to say
  // everything that matters.
  const options = {
    body: data.body || '',
    icon: '/app-icons/icon-192.png',
    badge: '/app-icons/icon-192.png',
    // The tag collapses a 10-minute and a 5-minute reminder for the same event
    // onto one notification rather than stacking two in the shade; renotify
    // makes the second one still buzz.
    tag: data.tag || 'k846',
    renotify: true,
    data: { url: data.url || '/#/events' },
    // A short double tap for a heads-up, a longer insistent pattern when the
    // thing is about to start.
    vibrate: data.urgent ? [120, 60, 120, 60, 240] : [90, 45, 90],
    // The last call stays on screen until it is dealt with; the earlier one
    // does not need to be dismissed by hand.
    requireInteraction: !!data.urgent,
    timestamp: Date.now(),
  }
  if (data.image) options.image = data.image
  if (Array.isArray(data.actions) && data.actions.length) options.actions = data.actions.slice(0, 2)

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // A dismiss button closes and goes no further; any other action carries its
  // own destination, so "See the schedule" and a tap on the body itself can
  // land in different places.
  if (event.action === 'dismiss') return
  const actions = event.notification.data?.actionUrls || {}
  const target = (event.action && actions[event.action]) || event.notification.data?.url || '/#/events'
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Focus the app if it is already open somewhere rather than opening a
    // second copy of it, which on a phone means two of the same app in the
    // switcher.
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        await client.focus()
        if ('navigate' in client) await client.navigate(target).catch(() => {})
        return
      }
    }
    await self.clients.openWindow(target)
  })())
})
