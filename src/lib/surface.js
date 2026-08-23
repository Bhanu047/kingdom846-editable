// Cursor-tracked highlight on panels and chart cards.
//
// One document-level listener for the whole app rather than a listener per
// panel: a Battle Lab result page can carry forty panels, and forty
// pointermove handlers each doing their own getBoundingClientRect is the
// classic way to make a page feel heavy precisely when it should feel rich.
//
// Positions are written to CSS custom properties and consumed by
// .panel::before / .chart-card::before, so moving the mouse never touches
// React state and never re-renders anything.

const SELECTOR = '.panel, .chart-card'
const TILT = '.tilt'
// Primary actions are magnetic without needing the class added at every call
// site -- there are dozens across the Battle Lab and the content pages.
const MAGNET = '.magnetic, .btn-primary'
// How far a magnetic control leans toward the cursor, and how hard a tilt card
// rotates. Both deliberately small -- past about 9deg a tilt stops reading as
// weight and starts reading as a gimmick.
const MAGNET_RANGE = 90
const MAGNET_PULL = 0.28
const TILT_MAX = 7

export function installSurfaceTracking() {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846SurfaceTracking) return window.__k846SurfaceTracking
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  // Touch devices have no hover, so the highlight would either never appear or
  // stick wherever the last tap landed. Skip entirely rather than half-work.
  if (window.matchMedia('(hover: none)').matches) return () => {}

  let current = null
  let currentTilt = null
  let frame = 0
  let pending = null
  // Re-queried each move but throttled to one DOM read per animation frame by
  // the rAF gate above, so this is a querySelectorAll at 60fps at worst -- far
  // cheaper than a per-element listener set that has to be rebound on rerender.
  const magnetHosts = () => document.querySelectorAll(MAGNET)

  const paint = () => {
    frame = 0
    if (!pending) return
    const { el, x, y, tilt, magnets } = pending
    pending = null

    if (el) {
      const r = el.getBoundingClientRect()
      if (r.width && r.height) {
        el.style.setProperty('--mx', `${((x - r.left) / r.width * 100).toFixed(1)}%`)
        el.style.setProperty('--my', `${((y - r.top) / r.height * 100).toFixed(1)}%`)
      }
    }

    // Tilt away from the cursor's offset from centre: pushing the pointer to
    // the right lifts the right edge toward you, which is how a physical card
    // held at one corner behaves.
    if (tilt) {
      const r = tilt.getBoundingClientRect()
      if (r.width && r.height) {
        const px = (x - r.left) / r.width - 0.5
        const py = (y - r.top) / r.height - 0.5
        tilt.style.setProperty('--ry', `${(px * TILT_MAX * 2).toFixed(2)}deg`)
        tilt.style.setProperty('--rx', `${(-py * TILT_MAX * 2).toFixed(2)}deg`)
      }
    }

    // Magnets are found by proximity, not by hover -- the whole point is that
    // the control reacts BEFORE the cursor arrives on it.
    for (const m of magnets) {
      const r = m.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = x - cx
      const dy = y - cy
      const dist = Math.hypot(dx, dy)
      const reach = MAGNET_RANGE + Math.max(r.width, r.height) / 2
      if (dist < reach) {
        const falloff = 1 - dist / reach
        m.style.setProperty('--mgx', (dx * MAGNET_PULL * falloff).toFixed(2))
        m.style.setProperty('--mgy', (dy * MAGNET_PULL * falloff).toFixed(2))
      } else if (m.style.getPropertyValue('--mgx') !== '0') {
        m.style.setProperty('--mgx', '0')
        m.style.setProperty('--mgy', '0')
      }
    }
  }

  const onMove = (e) => {
    const target = e.target instanceof Element ? e.target : null
    // closest() walks up from the target, so this correctly finds the innermost
    // panel when they nest -- the one the cursor is actually over.
    const el = target ? target.closest(SELECTOR) : null
    if (el !== current) {
      if (current) current.style.setProperty('--lit', '0')
      current = el
      if (current) current.style.setProperty('--lit', '1')
    }

    const tilt = target ? target.closest(TILT) : null
    if (tilt !== currentTilt) {
      if (currentTilt) { currentTilt.style.setProperty('--rx', '0deg'); currentTilt.style.setProperty('--ry', '0deg') }
      currentTilt = tilt
    }

    // Magnets are re-read per frame rather than cached: the Battle Lab swaps
    // whole result sections in and out, and a cached list goes stale silently.
    const magnets = magnetHosts()
    if (!el && !tilt && !magnets.length) return
    pending = { el, x: e.clientX, y: e.clientY, tilt, magnets }
    if (!frame) frame = requestAnimationFrame(paint)
  }

  // Pointer leaving the window entirely never fires pointermove, so the last
  // panel would stay lit with the highlight frozen mid-surface.
  const onLeave = () => {
    if (current) current.style.setProperty('--lit', '0')
    current = null
    if (currentTilt) { currentTilt.style.setProperty('--rx', '0deg'); currentTilt.style.setProperty('--ry', '0deg') }
    currentTilt = null
    for (const m of magnetHosts()) { m.style.setProperty('--mgx', '0'); m.style.setProperty('--mgy', '0') }
  }

  document.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  window.addEventListener('blur', onLeave)

  const teardown = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('blur', onLeave)
    if (frame) cancelAnimationFrame(frame)
    onLeave()
    delete window.__k846SurfaceTracking
  }
  window.__k846SurfaceTracking = teardown
  return teardown
}
