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
}

/** Activate the waiting worker and reload into it. */
export function applyUpdate(registration) {
  const waiting = registration?.waiting
  if (!waiting) { window.location.reload(); return }
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
