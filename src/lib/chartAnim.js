import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { prefersReducedMotion } from './motion'

// Flips true one paint after mount, so a CSS transition has a real "from"
// state to animate away from instead of the element popping in fully
// formed. Since chart components typically live behind a conditional
// (only rendered once a result exists), React fully unmounts/remounts them
// on every recalculation, so the reveal genuinely replays each time.
export function useReveal() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

// Eases a number up from 0 to target over `duration`ms, for KPI-style figures
// that should count up on reveal instead of appearing instantly. Caller formats
// the returned raw number as needed.
//
// This used to run its own rAF loop with a hand-written cubic ease. anime.js
// does the tweening now, which brings two things the loop did not have: a
// visitor who has asked for reduced motion gets the final number immediately
// rather than a 900ms animation, and the tween is driven by one shared engine
// clock instead of a private rAF per counter -- a battle-lab result panel
// renders half a dozen of these at once.
export function useCountUp(target, duration = 900) {
  const [v, setV] = useState(() => (prefersReducedMotion() ? target : 0))
  useEffect(() => {
    if (prefersReducedMotion()) {
      setV(target)
      return
    }
    // anime.js tweens object properties, so the number is carried on one.
    const carrier = { n: 0 }
    const animation = animate(carrier, {
      n: target,
      duration,
      ease: 'outCubic',
      onUpdate: () => setV(carrier.n),
      // A tween that is paused mid-flight would otherwise leave the figure
      // short of its target, which for a power total reads as wrong data.
      onComplete: () => setV(target),
    })
    return () => { try { animation.pause() } catch {} }
  }, [target, duration])
  return v
}

// Uniform Catmull-Rom -> cubic Bezier conversion, so a handful of sample
// points reads as a smooth curve instead of a jagged straight-line path.
export function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

// Reveal when the chart actually reaches the screen, not when it mounts.
//
// useReveal flips one frame after mount, which is right for a chart that
// appears in response to a click -- a Battle Lab result. It is wrong for a
// chart sitting far down a long page: the whole page mounts at once, so every
// entrance plays while the reader is still at the top, and by the time they
// scroll down the charts are already finished and look permanently static.
// That is why the About analytics read as flat.
//
// One-shot on purpose. Re-animating every time a chart scrolls past is the
// thing that makes long pages exhausting.
/**
 * Returns [ref, seen, calm].
 *
 * `seen` flips once, when the element first reaches the viewport. `calm` says
 * the visitor has asked for reduced motion, and it is the CALLER's job to
 * honour it -- by revealing without movement, not by skipping the reveal.
 *
 * Reduced motion used to short-circuit this hook: it set `seen` at mount and
 * never observed anything. That did not remove the motion, because a state
 * flip one tick after mount still runs every CSS transition keyed off it. All
 * it did was fire the entrance while the chart was far below the fold, so by
 * the time the reader scrolled down the animation was long over and the card
 * sat there looking inert. Reported from a Windows Chrome that reports
 * reduce -- the charts looked dead on the one machine the preference was set.
 *
 * So the observer runs for everyone now, and `calm` picks what happens when it
 * fires: a plain fade for those who asked for less, the full sequence for
 * everyone else.
 */
export function useInView(options) {
  const [seen, setSeen] = useState(false)
  const ref = useRef(null)
  const calm = prefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    // No observer at all (very old browser, or a test environment): show the
    // finished state rather than leaving the chart hidden forever.
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return undefined
    }
    let raf = 0
    const reveal = () => {
      setSeen(true)
      io.disconnect()
      document.removeEventListener('scroll', onScroll, true)
      if (raf) cancelAnimationFrame(raf)
    }

    /* The "already scrolled past" case, which the observer cannot report.
     *
     * IntersectionObserver only notifies on threshold CROSSINGS. A card that
     * goes from below the fold to above it -- a restored scroll position, an
     * anchor jump, a fast fling -- was never intersecting at either end, so no
     * crossing happens and no callback is delivered. The old guard read the
     * geometry of a callback that never arrived, so a chart jumped past stayed
     * at its hidden start state for the rest of the visit. Verified in the
     * browser: after a jump to the bottom of the page the observers logged no
     * callbacks at all, and four charts sat invisible.
     *
     * A geometry check on scroll covers it. Capture phase, because the page
     * scrolls an inner container and scroll events do not bubble; passive and
     * rAF-collapsed, so a fling costs one rect read per frame; and it detaches
     * itself the moment the card is seen.
     */
    const checkPassed = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      if (rect.bottom <= 0) reveal()
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(checkPassed)
    }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // The ordinary case: the card has come into view.
        if (e.isIntersecting) { reveal(); return }
        // An observer callback that arrives while the card is already above the
        // viewport still counts -- it happens when the element is observed
        // after the scroll rather than before.
        if (e.boundingClientRect.bottom <= (e.rootBounds?.top ?? 0)) { reveal(); return }
      }
    }, {
      // threshold 0, never a fraction: a card taller than the viewport can
      // never reach one, and would sit un-animated forever. The negative
      // bottom margin holds the entrance back until the card is properly on
      // screen rather than firing it one pixel in.
      rootMargin: '0px 0px -10% 0px',
      threshold: 0,
      ...options,
    })
    io.observe(el)
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    // And check once now, for a card mounted below a page that is already
    // scrolled past it.
    checkPassed()

    return () => {
      io.disconnect()
      document.removeEventListener('scroll', onScroll, true)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [seen, options])

  return [ref, seen, calm]
}
