// Press feedback: a gilt ripple thrown from the point of contact.
//
// One delegated pointerdown listener on the document rather than handlers per
// control. The Battle Lab alone renders well over a hundred buttons and swaps
// whole result sections in and out, so per-element binding would mean
// re-binding on every render and leaking the ones that got away.

const HOSTS = 'button, [role="button"], .btn-primary, .btn-secondary, .btn-ghost, .nav-item, .tool-tile, summary'

// Controls that clip to a pill or a circle would slice the ripple into a
// wedge, and controls inside a report clone must never be decorated at all.
const SKIP = '.kv-live, .k846-v2, .k846-cmd'

export function installPressFeedback() {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846Press) return window.__k846Press
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const onDown = (e) => {
    // Primary button / primary touch only: a right-click or a two-finger
    // gesture is not a press and should not flash the control.
    if (e.button !== undefined && e.button !== 0) return
    const host = e.target instanceof Element ? e.target.closest(HOSTS) : null
    if (!host || host.closest(SKIP)) return
    if (host.disabled) return

    const r = host.getBoundingClientRect()
    if (!r.width || !r.height) return

    // Radius reaches the furthest corner, so the ripple always covers the
    // control however far off-centre the press landed.
    const dx = Math.max(e.clientX - r.left, r.right - e.clientX)
    const dy = Math.max(e.clientY - r.top, r.bottom - e.clientY)
    const size = Math.hypot(dx, dy) * 2

    // The host has to be positioned and clipping for the ripple to sit inside
    // it. Both are restored on cleanup so this never permanently alters an
    // element it borrowed.
    const cs = getComputedStyle(host)
    const hadStatic = cs.position === 'static'
    const prevOverflow = host.style.overflow
    if (hadStatic) host.style.position = 'relative'
    host.style.overflow = 'hidden'

    const ink = document.createElement('span')
    ink.className = 'k-ripple'
    ink.style.left = `${e.clientX - r.left}px`
    ink.style.top = `${e.clientY - r.top}px`
    ink.style.setProperty('--r', `${size}px`)
    host.appendChild(ink)

    const done = () => {
      ink.remove()
      // Only hand back what was borrowed, and only if no other ripple is still
      // running on this host.
      if (!host.querySelector('.k-ripple')) {
        if (hadStatic) host.style.position = ''
        host.style.overflow = prevOverflow
      }
    }
    ink.addEventListener('animationend', done, { once: true })
    // A control unmounted mid-animation never fires animationend.
    setTimeout(done, 900)
  }

  document.addEventListener('pointerdown', onDown, { passive: true })

  const teardown = () => {
    document.removeEventListener('pointerdown', onDown)
    document.querySelectorAll('.k-ripple').forEach((n) => n.remove())
    delete window.__k846Press
  }
  window.__k846Press = teardown
  return teardown
}
