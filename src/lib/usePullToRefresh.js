import { useEffect, useRef, useState } from 'react'

/* Pull-to-refresh for the app shell.
 *
 * App mode turns off the browser's own overscroll, because rubber-banding at
 * the end of a list is one of the loudest "this is a web page" tells. But that
 * also removed the gesture people reach for first when they want fresh data.
 * So the app provides its own, which is what a native app does anyway: the
 * browser's version reloads the document, this one refetches the data and
 * leaves the screen you are on exactly where it is.
 *
 * Deliberately conservative about when it engages, because a pull-to-refresh
 * that steals scrolls is far more annoying than none at all:
 *
 *   - only from a genuine resting position at the very top;
 *   - only when the drag is clearly vertical, so a horizontal swipe through a
 *     carousel or a table is never hijacked;
 *   - only from a single finger, so a pinch-zoom is left alone;
 *   - and it gives up the moment the finger moves back up past the start.
 */
const THRESHOLD = 68     // how far to pull before releasing triggers a refresh
const MAX_PULL = 108     // where the rubber band stops giving
const START_SLOP = 8     // ignored movement, so a tap is never a tiny pull

export function usePullToRefresh(scrollRef, onRefresh, enabled = true) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // The handlers are attached once and read everything mutable through refs;
  // re-binding touch listeners mid-gesture loses the gesture.
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const refreshingRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) return

    let startY = 0, startX = 0, active = false, decided = false, distance = 0

    const reset = () => { active = false; decided = false; distance = 0; setPull(0) }

    const onStart = (e) => {
      if (refreshingRef.current || e.touches.length !== 1) return
      // scrollTop must be exactly 0. Engaging at "close to the top" is how a
      // pull-to-refresh ends up firing when someone meant to scroll up a little.
      if (el.scrollTop > 0) return
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
      active = true
      decided = false
    }

    const onMove = (e) => {
      if (!active || refreshingRef.current) return
      const dy = e.touches[0].clientY - startY
      const dx = e.touches[0].clientX - startX

      if (!decided) {
        if (Math.abs(dy) < START_SLOP && Math.abs(dx) < START_SLOP) return
        // A drag that is more sideways than down belongs to whatever is under
        // the finger, and an upward drag is an ordinary scroll.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { active = false; return }
        decided = true
      }

      if (dy <= 0) { reset(); return }

      // Square-root resistance: the first few pixels follow the finger, and it
      // stiffens the further you go, which is what makes it feel like a band
      // rather than a slider.
      distance = Math.min(MAX_PULL, Math.sqrt(dy) * 7.2)
      setPull(distance)
      // Only now claim the gesture -- preventDefault before the direction is
      // known would swallow ordinary scrolls.
      if (e.cancelable) e.preventDefault()
    }

    const onEnd = async () => {
      if (!active) return
      const shouldRefresh = distance >= THRESHOLD
      active = false
      decided = false
      if (!shouldRefresh) { setPull(0); distance = 0; return }

      refreshingRef.current = true
      setRefreshing(true)
      // Hold the indicator at the threshold while the work happens, so the
      // spinner has somewhere to sit.
      setPull(THRESHOLD)
      const started = Date.now()
      try { await onRefreshRef.current?.() } catch {}
      // A refresh that returns in 40ms reads as nothing having happened at all.
      const elapsed = Date.now() - started
      if (elapsed < 420) await new Promise((r) => setTimeout(r, 420 - elapsed))
      refreshingRef.current = false
      setRefreshing(false)
      setPull(0)
      distance = 0
    }

    // passive: false is required -- a passive listener is not allowed to call
    // preventDefault, and without that the page scrolls underneath the pull.
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', reset)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', reset)
    }
  }, [scrollRef, enabled])

  return { pull, refreshing, threshold: THRESHOLD }
}
