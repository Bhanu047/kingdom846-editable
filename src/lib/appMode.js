/* App mode — is the portal running as an installed app, or as a website?
 *
 * Everything native-feeling in the UI hangs off this one answer: the launch
 * screen instead of the entrance door, the bottom tab bar instead of the
 * hamburger drawer, and the CSS that turns off the browser behaviours (rubber
 * band scrolling, double-tap zoom, tap flash, text selection on chrome) that
 * give a web page away the moment you touch it.
 *
 * The website is deliberately untouched by all of it. Someone visiting in a
 * browser tab should get the site they have always had, entrance and all.
 */

// `standalone` covers Android and desktop installs; `fullscreen` and
// `minimal-ui` are the other installed display modes a manifest can ask for;
// navigator.standalone is how iOS reported it for years before it supported the
// display-mode query at all.
const MODE_QUERY = '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)'

// Lets the app shell be seen in a normal tab — `?appmode=1` to enter it,
// `?appmode=0` to leave. Kept for the session so a reload does not drop it.
// Without this the only way to look at the app layout is to install it.
const OVERRIDE_KEY = 'k846-app-mode-override'

function readOverride() {
  try {
    const param = new URLSearchParams(window.location.search).get('appmode')
    if (param === '1' || param === '0') {
      sessionStorage.setItem(OVERRIDE_KEY, param)
      return param === '1'
    }
    const stored = sessionStorage.getItem(OVERRIDE_KEY)
    if (stored === '1' || stored === '0') return stored === '1'
  } catch {}
  return null
}

export function isAppMode() {
  if (typeof window === 'undefined') return false
  const override = readOverride()
  if (override !== null) return override
  return Boolean(window.matchMedia?.(MODE_QUERY).matches) || window.navigator.standalone === true
}

/**
 * Stamp the answer onto <html> so CSS can act on it without React, and before
 * the first paint — a tab bar that appears a frame late is exactly the kind of
 * thing that reads as "web page pretending".
 */
export function installAppMode() {
  if (typeof document === 'undefined') return
  const apply = () => {
    const on = isAppMode()
    document.documentElement.toggleAttribute('data-app-mode', on)
    // Android's address bar is gone in standalone, so the themed colour is now
    // the status bar behind the header rather than a browser chrome tint.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', on ? '#0E1220' : '#06152b')
  }
  apply()
  // Installing (or launching from the home screen into an existing tab) can
  // flip display-mode under a running page.
  try { window.matchMedia(MODE_QUERY).addEventListener('change', apply) } catch {}
  return apply
}
