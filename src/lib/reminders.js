/* Event reminders — the browser half.
 *
 * The player picks an alliance, the browser mints a push subscription, and the
 * server keeps it against that alliance. From then on the reminders arrive
 * whether or not the app is open, because it is the server's schedule and the
 * server's clock doing the work.
 */
import { apiJson } from './api'

const CHOICE_KEY = 'k846-reminder-alliance'

/** The push service needs the VAPID key as bytes, not the base64url it ships as. */
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normal = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normal)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Whether this browser can do any of this at all. */
export function remindersSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function permission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission        // 'granted' | 'denied' | 'default'
}

export function savedAlliance() {
  try { return localStorage.getItem(CHOICE_KEY) } catch { return null }
}

function rememberAlliance(slug) {
  try { slug ? localStorage.setItem(CHOICE_KEY, slug) : localStorage.removeItem(CHOICE_KEY) } catch {}
}

async function registration() {
  // `ready` rather than getRegistration: subscribing against a worker that is
  // registered but not yet active throws, and on a first visit the two are
  // milliseconds apart.
  return navigator.serviceWorker.ready
}

/**
 * Ask for permission, subscribe, and register the choice with the server.
 * Returns { ok, reason } rather than throwing — every failure here is a thing
 * the player needs told plainly, not an exception to swallow.
 */
export async function enableReminders(allianceSlug) {
  if (!remindersSupported()) return { ok: false, reason: 'unsupported' }
  if (!allianceSlug) return { ok: false, reason: 'no-alliance' }

  // Must be called from a user gesture; browsers reject it otherwise, and
  // Safari in particular only counts a real tap.
  const result = await Notification.requestPermission()
  if (result !== 'granted') return { ok: false, reason: result === 'denied' ? 'denied' : 'dismissed' }

  try {
    const reg = await registration()
    const { publicKey } = await apiJson('/api/push/key')
    if (!publicKey) return { ok: false, reason: 'no-key' }

    // An existing subscription is reused. Unsubscribing and resubscribing would
    // hand the server a new endpoint and orphan the old row, which then keeps
    // receiving reminders nothing is listening to.
    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      // Required to be true by every browser that implements this: a push may
      // not arrive silently, it has to result in a visible notification.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    await apiJson('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: sub.toJSON(), alliance_slug: allianceSlug }),
    })
    rememberAlliance(allianceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: 'failed', detail: err?.message }
  }
}

/** Change alliance without asking for permission again. */
export async function changeAlliance(allianceSlug) {
  if (!remindersSupported() || permission() !== 'granted') return enableReminders(allianceSlug)
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return enableReminders(allianceSlug)
    await apiJson('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: sub.toJSON(), alliance_slug: allianceSlug }),
    })
    rememberAlliance(allianceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: 'failed', detail: err?.message }
  }
}

export async function disableReminders() {
  rememberAlliance(null)
  if (!remindersSupported()) return { ok: true }
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return { ok: true }
    // Tell the server first. If the order were reversed and the unsubscribe
    // succeeded but the request failed, the server would keep pushing to an
    // endpoint that no longer exists until the push service reported it gone.
    await apiJson('/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe()
    return { ok: true }
  } catch { return { ok: true } }
}

/**
 * What this device is actually signed up for, according to the server rather
 * than to what we last wrote down locally — the two drift when site data is
 * cleared or the app is reinstalled.
 */
export async function reminderStatus() {
  if (!remindersSupported() || permission() !== 'granted') {
    return { subscribed: false, alliance: savedAlliance(), permission: permission() }
  }
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return { subscribed: false, alliance: savedAlliance(), permission: permission() }
    const status = await apiJson('/api/push/status', {
      method: 'POST',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    if (status.alliance_slug) rememberAlliance(status.alliance_slug)
    return { subscribed: !!status.subscribed, alliance: status.alliance_slug || savedAlliance(), permission: permission() }
  } catch {
    return { subscribed: false, alliance: savedAlliance(), permission: permission() }
  }
}

/** The push endpoint for this device, or null when notifications are off. */
async function currentEndpoint() {
  if (!remindersSupported() || permission() !== 'granted') return null
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    return sub?.endpoint || null
  } catch { return null }
}

/**
 * Notification preferences for this device.
 *
 * They are stored against the push subscription rather than in the browser,
 * which is what makes them survive the app being closed -- the previous
 * toggles were component state with hard-coded defaults, so every relaunch
 * reset them, and nothing on the server was reading them anyway.
 */
export async function getNotificationPrefs() {
  const endpoint = await currentEndpoint()
  if (!endpoint) return null
  try {
    const status = await apiJson('/api/push/status', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    })
    return status.subscribed ? status.prefs : null
  } catch { return null }
}

export async function setNotificationPref(key, value) {
  const endpoint = await currentEndpoint()
  if (!endpoint) return { ok: false, reason: 'no-subscription' }
  try {
    const out = await apiJson('/api/push/prefs', {
      method: 'POST',
      body: JSON.stringify({ endpoint, prefs: { [key]: value } }),
    })
    return { ok: true, prefs: out.prefs }
  } catch (err) {
    return { ok: false, reason: 'failed', detail: err?.message }
  }
}

/**
 * Tie this device to the account that just signed in, so the leadership alerts
 * know where to go. Safe to call for anyone: it needs a login and a
 * subscription, and quietly does nothing without both.
 */
export async function bindDeviceToAccount() {
  const endpoint = await currentEndpoint()
  if (!endpoint) return
  try { await apiJson('/api/push/bind', { method: 'POST', body: JSON.stringify({ endpoint }) }) } catch {}
}
