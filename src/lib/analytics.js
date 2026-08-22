// Client tracker for kingdom846.com.
//
// Self-hosted: nothing here talks to a third party, sets a cookie, or reads
// one. The server derives a daily-rotating pseudonym from the request itself,
// so this file has no ID to store and none to leak.
//
// Three rules it follows without being asked:
//   1. Honours Global Privacy Control and Do Not Track. If a visitor has said
//      no, we send nothing at all.
//   2. Never throws into the page. A blocked request, an offline device or an
//      ad blocker eating /api/track must leave the site working normally.
//   3. Sends the referrer HOST only, and only for the first event of a visit.
import { API_BASE, getAuthToken } from './api'

const optedOut = (() => {
  try {
    return navigator.globalPrivacyControl === true
      || navigator.doNotTrack === '1'
      || window.doNotTrack === '1'
      || navigator.msDoNotTrack === '1'
  } catch { return false }
})()

// Only the first event of a page load carries a referrer; after that the
// "referrer" would just be our own site.
let referrerSent = false

// ?utm_source=discord on a shared link, read once and then forgotten. This is
// the only thing here that reads the URL, and it reads a value the person who
// SHARED the link put there -- not anything about the visitor.
const campaign = (() => {
  try {
    const p = new URLSearchParams(location.search)
    const v = p.get('utm_source') || p.get('utm_campaign') || p.get('ref')
    return v ? String(v).slice(0, 60) : null
  } catch { return null }
})()
let campaignSent = false

// Same page fired twice in a row is a re-render, not a visit.
let lastPage = null

function post(payload) {
  if (optedOut) return
  const url = `${API_BASE}/api/track`
  const body = JSON.stringify(payload)
  try {
    // keepalive lets the last event of a session survive the page closing.
    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
      body,
    }).catch(() => { /* offline, blocked, or unreachable — not the page's problem */ })
  } catch {
    // Last resort for browsers that refuse the fetch above. sendBeacon cannot
    // carry the auth header, so the event lands anonymous rather than not at all.
    try { navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' })) } catch { /* give up quietly */ }
  }
}

function send(kind, name, detail) {
  if (!name) return
  const payload = { kind, name: String(name).slice(0, 120) }
  if (detail != null) payload.detail = String(detail).slice(0, 200)
  if (campaign && !campaignSent) {
    campaignSent = true
    payload.campaign = campaign
  }
  if (!referrerSent) {
    referrerSent = true
    try {
      // Our own referrer is noise; only outside traffic is worth recording.
      if (document.referrer && !document.referrer.startsWith(location.origin)) {
        payload.referrer = document.referrer
      }
    } catch { /* referrer unavailable */ }
  }
  post(payload)
}

/** A page view. Repeated calls for the same page are ignored. */
export function trackPage(page) {
  if (!page || page === lastPage) return
  lastPage = page
  send('page', page)
}

// A remount inside this window is a double-render, not a second visit.
// React StrictMode double-invokes effects in development, and route churn can
// remount a suite twice in a frame; neither is a person opening a tool twice.
const RECENT_MS = 1500
const recent = new Map()

/** A Battle Lab tool being opened or run. */
export function trackTool(tool, detail) {
  const key = `${tool}|${detail ?? ''}`
  const now = Date.now()
  if (now - (recent.get(key) || 0) < RECENT_MS) return
  recent.set(key, now)
  send('tool', tool, detail)
}

/** Anything else worth counting: a login, a report download, an application. */
export function trackAction(action, detail) { send('action', action, detail) }

/** True when the visitor has asked not to be tracked, so the UI can say so. */
export const trackingDisabled = optedOut
