/* Kingdom 846 — service worker.
 *
 * Two jobs: make the installed app open instantly, and let it open at all when
 * the phone has no signal. Live data is deliberately conservative — a portal
 * that shows a stale roster is worse than one that shows a spinner, so the API
 * is never cached and anything that can change goes to the network first.
 *
 * The document itself is the exception, and it took a bug report to get there:
 * see shellFirst below. Opening instantly is the whole point of an installed
 * app, and the shell is the one file that has to arrive before anything at all
 * can be drawn.
 *
 * Bump CACHE_VERSION on any change to this file's caching rules; the activate
 * handler deletes every cache that doesn't match, so old entries never linger.
 */
const CACHE_VERSION = 'v6'
const SHELL_CACHE = `k846-shell-${CACHE_VERSION}`
const ASSET_CACHE = `k846-assets-${CACHE_VERSION}`
const FONT_CACHE = `k846-fonts-${CACHE_VERSION}`
const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, FONT_CACHE])

// Enough to paint the shell offline. Deliberately small: the hashed build
// assets are cached on first use instead, so a failed precache of one stale
// filename can never block the whole install.
// The crest is in here because the launch screen is only on screen for 1.3
// seconds. Fetched at that moment it does not arrive in time and the screen
// shows its dark ground with no crest on it -- reported as "a black screen,
// then the home page, no welcome screen". Precached, it is already local.
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/app-icons/icon-192.png',
  // Both crests the shell draws: the 448px plate on the launch screen and the
  // 192px mark in the header. Together they are a third of the single 600x900
  // file that used to serve both, and each is now the size it is drawn at.
  '/assets/crest-846-md.webp', '/assets/crest-846-sm.webp']

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

  /* Drop the cached shell so the next load fetches a fresh one.
   *
   * Needed because of shellFirst below: when a NEW BUILD is live but this
   * worker is unchanged -- which is the usual case, since a deploy almost never
   * touches this file -- there is no waiting worker to activate, and a plain
   * reload would be served the same stale index.html and land right back on the
   * build the visitor is trying to leave. Reloading is only honest once the
   * cached copy is gone.
   */
  if (event.data === 'refresh-shell') {
    const done = () => event.ports?.[0]?.postMessage('ok')
    event.waitUntil(
      caches.open(SHELL_CACHE)
        .then((cache) => Promise.all(['/', '/index.html'].map((u) => cache.delete(u))))
        .then(done, done)
    )
  }
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

/* The page itself: from cache immediately, refreshed behind you.
 *
 * This used to be networkFirst, and that is what put a blank screen in front of
 * every cold open. networkFirst awaits the round trip before returning
 * anything, and it only consults the cache when fetch REJECTS -- so a
 * slow-but-not-failing connection never falls back at all, it just waits, and
 * the web view sits on its own white default until the HTML lands. Reported
 * from an iPhone in India opening the installed app against a server in
 * Oregon: a grey screen, then a white one, then the dashboard.
 *
 * The shell is precached at install and is a few kB. Serving it from cache is
 * instant and offline-proof; the network copy replaces it for next time. A
 * deploy therefore arrives one open later, which is what the existing "new
 * version" prompt is for -- and one launch behind beats every launch blank.
 */
async function shellFirst(request, cacheName, shellUrl) {
  const cache = await caches.open(cacheName)
  const cached = (await cache.match(shellUrl)) || (await cache.match(request))
  // Not awaited when a cached copy exists: the refresh must never be the thing
  // the first paint is waiting for, which was the whole bug.
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(shellUrl, response.clone())
        // And the build the new shell asks for, while we are here. Without
        // this the deploy lands on the NEXT open: shell from cache instantly,
        // then a quarter of a megabyte of freshly-named JS fetched from Oregon
        // with the launch screen held up in front of it the whole way. Pulled
        // now, in the background of a visit that is already finished, the next
        // open is local and immediate.
        primeBuild(response.clone()).catch(() => {})
      }
      return response
    })
    .catch(() => null)
  if (cached) return cached
  const response = await network
  if (response) return response
  throw new Error(`offline and no shell cached: ${request.url}`)
}

/* Warm the asset cache with the hashed files a freshly-fetched shell names.
 *
 * Only /assets/ URLs, which carry a content hash, so a wrong guess is
 * impossible -- a file that changed has a different name. Failures are
 * deliberately silent: this is an optimisation running behind a page that has
 * already loaded, and it must never be able to break one.
 */
async function primeBuild(response) {
  const html = await response.text()
  const urls = new Set()
  // The build writes these relative -- src="./assets/index-<hash>.js" -- so the
  // leading dot is optional and the match is normalised back to a root path.
  const re = /["'(]\.?(\/assets\/[A-Za-z0-9._-]+\.(?:js|css))["')]/g
  let m
  while ((m = re.exec(html))) urls.add(m[1])
  if (!urls.size) return
  const cache = await caches.open(ASSET_CACHE)
  await Promise.all([...urls].map(async (url) => {
    if (await cache.match(url)) return
    await cache.add(url).catch(() => {})
  }))
}

// Serve from cache immediately, refresh in the background. Right for hashed
// build assets and fonts, which are either immutable or change rarely.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const stored = await cache.match(request)
  // A stored response that is not ok is worse than none at all. This is
  // cache-first, so a bad entry -- a put that ran out of quota half way, an
  // error page saved during a deploy -- is handed back for ever, and a broken
  // image never heals itself. Opaque cross-origin responses report status 0 and
  // are legitimate; only a real failure status is thrown away.
  const cached = stored && (stored.ok || stored.type === 'opaque' || stored.status === 0) ? stored : undefined
  if (stored && !cached) await cache.delete(request).catch(() => {})
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

  // Navigations: the cached shell first, so the first paint never waits on the
  // network. Hash routing means every in-app route resolves to the same
  // document, so one cached shell covers the whole site.
  //
  // The tab's own navigation, and only that. A frame loading inside the page is
  // a navigation too, and the website's entrance -- the nine halls -- is an
  // iframe: served the shell, the front door would have the app behind it.
  // `destination` is what tells them apart, 'document' against 'iframe'; where
  // it is not implemented it reads as '' and the mode alone decides, which is
  // the behaviour this had before.
  if (request.mode === 'navigate' && request.destination !== 'iframe' && request.destination !== 'frame') {
    event.respondWith(shellFirst(request, SHELL_CACHE, '/index.html'))
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
