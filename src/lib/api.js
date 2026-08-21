// deploy_website replaces the literal __PORT_5000__ token with the backend
// proxy path at deploy time. Locally (token unreplaced) we fall back to a
// relative path, which works when the dev server proxies /api -> 5000.
const RAW = '__PORT_5000__'
export const API_BASE = RAW.startsWith('__PORT_') ? '' : RAW

const TOKEN_KEY = 'k846_auth_token'

// Persist token in sessionStorage so it survives page refreshes but
// is scoped to the current tab (cleared when tab closes).
let _token = null
try { _token = sessionStorage.getItem(TOKEN_KEY) } catch { /* sessionStorage may be blocked */ }

export function setAuthToken(t) {
  _token = t
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* sessionStorage may be blocked */ }
}

export function getAuthToken() { return _token }

export function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  return fetch(`${API_BASE}${path}`, { ...options, headers })
}

export const apiJson = async (path, options = {}) => {
  const res = await apiFetch(path, options)
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { msg = (await res.json()).error || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}
