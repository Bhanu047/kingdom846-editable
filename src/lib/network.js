/* Connection state.
 *
 * The app opens without a signal now, which is the point of the service worker
 * — but silently. You get the shell, the rankings you last saw, and no
 * indication that any of it is from a cache rather than from the kingdom. An
 * app tells you. That is the difference between "working offline" and "quietly
 * showing you yesterday".
 *
 * navigator.onLine cannot be trusted on its own: it reports whether the device
 * has a network interface, not whether anything is reachable through it. A
 * phone on hotel wifi with no internet is emphatically "online". So the browser
 * events are treated as a hint to go and check, and the server itself is the
 * answer.
 */

const listeners = new Set()

// Start optimistic. Announcing "offline" for the half second before the first
// probe returns would flash a warning at everyone on a perfectly good
// connection, which is worse than being briefly wrong in the other direction.
let online = true
let probing = false

function setOnline(next) {
  if (next === online) return
  online = next
  listeners.forEach((fn) => { try { fn(online) } catch {} })
}

export function isOnline() { return online }

export function onNetworkChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Ask the server directly. cache: 'no-store' so neither the browser nor the
 * service worker can answer this from a cache — a cached 200 would report a
 * healthy connection from inside a tunnel.
 */
export async function probe() {
  if (probing) return online
  probing = true
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' })
    setOnline(res.ok)
  } catch {
    setOnline(false)
  } finally {
    probing = false
  }
  return online
}

/** Called by the API layer, so a failed request is itself evidence. */
export function reportRequestFailure() { setOnline(false) }
export function reportRequestSuccess() { setOnline(true) }

export function installNetworkWatch() {
  if (typeof window === 'undefined') return

  // The browser's own events are the cheap signal; each one triggers a real
  // check rather than being believed outright.
  window.addEventListener('online', () => { probe() })
  window.addEventListener('offline', () => setOnline(false))

  // Coming back to the app after it has been in the background is the other
  // moment the answer is likely to have changed underneath us.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') probe()
  })

  if (navigator.onLine === false) setOnline(false)
  else probe()
}
