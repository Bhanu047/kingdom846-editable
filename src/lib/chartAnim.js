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
export function useInView(options) {
  const [seen, setSeen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true)
      return undefined
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // Already scrolled past counts as seen. Without this a chart the reader
        // JUMPS over -- a restored scroll position, an anchor link, a fast
        // fling -- never intersects at all, so its entrance never fires and its
        // line stays at the hidden start state permanently. Caught exactly that
        // on Atlas Score History: scroll straight to the section below it and
        // the curve was simply never drawn.
        const passed = !e.isIntersecting && e.boundingClientRect.bottom <= e.rootBounds?.top
        if (!e.isIntersecting && !passed) continue
        setSeen(true)
        io.disconnect()
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
    return () => io.disconnect()
  }, [seen, options])

  return [ref, seen]
}
