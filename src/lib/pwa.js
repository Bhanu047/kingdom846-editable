/* Install and update plumbing for the installable app.
 *
 * The UI lives in components/InstallPrompt.jsx; this file holds everything that
 * has to run outside React — the registration itself, and the capture of
 * `beforeinstallprompt`, which fires early enough that a component mounting a
 * moment later would miss it.
 */

// Chrome fires beforeinstallprompt once, and only once, per page load. Stash it
// the instant it arrives so the banner can offer installation whenever the
// visitor is ready, not only in the millisecond the event happened to land.
let deferredPrompt = null
const promptListeners = new Set()

function setPrompt(value) {
  deferredPrompt = value
  promptListeners.forEach((fn) => { try { fn(value) } catch {} })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    setPrompt(event)
  })
  // Once installed the stored event is spent, and a banner offering to install
  // an app the visitor already has is just noise.
  window.addEventListener('appinstalled', () => setPrompt(null))
}

// The waiting registration is held here for the same reason as the install
// prompt: it can become available long before -- or long after -- any given
// component is mounted, so it cannot live in component state.
let waitingRegistration = null
const updateListeners = new Set()

function setWaiting(registration) {
  waitingRegistration = registration
  updateListeners.forEach((fn) => { try { fn(registration) } catch {} })
}

export function getWaitingRegistration() { return waitingRegistration }

export function onUpdateReady(fn) {
  updateListeners.add(fn)
  return () => updateListeners.delete(fn)
}

export function getInstallPrompt() { return deferredPrompt }

export function onInstallPromptChange(fn) {
  promptListeners.add(fn)
  return () => promptListeners.delete(fn)
}

/** Show the browser's install dialog. Returns true if the visitor accepted. */
export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  // Spent either way: the same event object cannot be prompted twice.
  setPrompt(null)
  return outcome === 'accepted'
}

/** True when the page is running as an installed app rather than in a tab. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    // iOS predates the display-mode media query and reports it here instead.
    || window.navigator.standalone === true
}

/** iOS has no install prompt — Safari requires Share → Add to Home Screen. */
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

/**
 * Register the service worker. Call once, from the app entry point rather than
 * from a component -- the install banner is gated behind the entrance screen,
 * and offline support must not be gated behind anything.
 *
 * Dev is skipped deliberately: a worker caching Vite's module graph makes
 * hot reload behave in ways that look like bugs in the code being edited.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (import.meta.env?.DEV) return

  // Registration is deferred to `load` so the worker never competes with the
  // first paint for bandwidth -- but React can mount after `load` has already
  // fired, and a listener added then would never run at all. Check first.
  const start = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

      // A worker already waiting means the visitor loaded the app from cache
      // while a newer build was sitting behind it.
      if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration)

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          // No controller means this is the first install, not an update —
          // there is nothing for the visitor to reload into.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) setWaiting(registration)
        })
      })

      // Catch a build deployed while the app sat open in a background tab.
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)

    } catch {
      // An unavailable worker costs offline support and nothing else; the site
      // works exactly as it did before, so this is never worth an error to the user.
    }
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })

  /* Deliberately NOT behind that gate.
   *
   * `load` waits for every subresource, the welcome iframe and its own fonts
   * included, and a third-party stylesheet that hangs rather than fails can
   * hold it for a long time -- measured here never firing at all inside eight
   * seconds. Registration can afford to wait for that; telling someone their
   * app is out of date cannot, because it is the whole reason they are looking
   * at a version that no longer exists. It costs one small request against an
   * endpoint the worker does not touch.
   */
  startBuildWatch()
}

function startBuildWatch() {
  // A beat after first paint, so it never competes with the shell.
  setTimeout(() => checkBuild(), 2500)
  // And whenever the app is brought back to the foreground -- which is exactly
  // what someone does after being told a fix has shipped.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkBuild()
  })
}

/* Is the build on the server the one this page is running?
 *
 * The worker's `updatefound` only fires when public/sw.js itself changes bytes,
 * and a deploy almost never touches that file -- so the "a new version is
 * ready" prompt has been sitting behind an event that a normal deploy does not
 * raise. Meanwhile the shell is served from cache, so the app someone has open
 * is the PREVIOUS build until they happen to open it twice. Live fix, stale
 * phone, and nothing on screen to say so: reported as a bug that had already
 * been fixed an hour earlier.
 *
 * So the page asks the server directly. /api/ bypasses the worker, so the
 * answer is always the network's, and the entry module's hashed name is the
 * build identity -- if it differs from the one this document loaded, there is
 * something newer to reload into.
 *
 * Never noisier than every ten minutes, and silent on any failure: being
 * offline must not look like being out of date.
 */
const BUILD_CHECK_INTERVAL = 10 * 60 * 1000
let lastBuildCheck = 0

const assetPath = (el, attr) => {
  const raw = el?.getAttribute(attr)
  if (!raw) return null
  try { return new URL(raw, window.location.href).pathname } catch { return null }
}

function loadedBuild() {
  return {
    build: assetPath(document.querySelector('script[type="module"][src*="assets/index-"]'), 'src'),
    style: assetPath(document.querySelector('link[rel="stylesheet"][href*="assets/index-"]'), 'href'),
  }
}

async function checkBuild() {
  if (waitingRegistration) return                       // already asking
  const now = Date.now()
  if (now - lastBuildCheck < BUILD_CHECK_INTERVAL) return
  lastBuildCheck = now

  const mine = loadedBuild()
  if (!mine.build && !mine.style) return
  try {
    const res = await fetch('/api/version', { cache: 'no-store' })
    if (!res.ok) return
    const live = await res.json()
    // A null value means the server could not read that part of its own shell
    // -- unknown, which is not the same as stale. Only a value that is present
    // AND different counts.
    const stale = (key) => Boolean(live[key] && mine[key] && live[key] !== mine[key])
    // A sentinel rather than a registration: there is no waiting worker in this
    // case, and applyUpdate resolves one itself if there turns out to be.
    if (stale('build') || stale('style')) setWaiting({ staleBuild: true })
  } catch {
    // Offline, or the request was blocked. Nothing to report.
  }
}

/** Activate the waiting worker and reload into it. */
export async function applyUpdate(registration) {
  let reg = registration
  // The build check hands over a sentinel, not a registration -- so look for a
  // waiting worker before concluding there is none.
  if (!reg?.waiting) {
    try { reg = (await navigator.serviceWorker?.ready) || reg } catch {}
  }
  const waiting = reg?.waiting
  if (!waiting) {
    // No waiting worker: this is a new build behind the same worker, so the
    // stale shell has to go before reloading -- otherwise the reload is served
    // the cached index.html and lands back on the build being left behind.
    try {
      const active = reg?.active
      if (active) {
        await new Promise((resolve) => {
          const channel = new MessageChannel()
          channel.port1.onmessage = resolve
          active.postMessage('refresh-shell', [channel.port2])
          // Never let a worker that does not answer strand the visitor on a
          // button that does nothing.
          setTimeout(resolve, 1500)
        })
      }
    } catch {}
    window.location.reload()
    return
  }
  // controllerchange fires once the new worker takes over; reloading before
  // that would just load the old version again.
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
  waiting.postMessage('skip-waiting')
}
