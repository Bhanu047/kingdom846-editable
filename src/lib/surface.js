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

export function installSurfaceTracking() {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846SurfaceTracking) return window.__k846SurfaceTracking
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  // Touch devices have no hover, so the highlight would either never appear or
  // stick wherever the last tap landed. Skip entirely rather than half-work.
  if (window.matchMedia('(hover: none)').matches) return () => {}

  let current = null
  let frame = 0
  let pending = null

  const paint = () => {
    frame = 0
    if (!pending) return
    const { el, x, y } = pending
    pending = null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    el.style.setProperty('--mx', `${((x - r.left) / r.width * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${((y - r.top) / r.height * 100).toFixed(1)}%`)
  }

  const onMove = (e) => {
    // closest() walks up from the target, so this correctly finds the innermost
    // panel when they nest -- the one the cursor is actually over.
    const el = e.target instanceof Element ? e.target.closest(SELECTOR) : null
    if (el !== current) {
      if (current) current.style.setProperty('--lit', '0')
      current = el
      if (current) current.style.setProperty('--lit', '1')
    }
    if (!el) return
    pending = { el, x: e.clientX, y: e.clientY }
    if (!frame) frame = requestAnimationFrame(paint)
  }

  // Pointer leaving the window entirely never fires pointermove, so the last
  // panel would stay lit with the highlight frozen mid-surface.
  const onLeave = () => {
    if (current) current.style.setProperty('--lit', '0')
    current = null
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
