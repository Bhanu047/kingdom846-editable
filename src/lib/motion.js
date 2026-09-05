import { useEffect } from 'react'
import { animate, stagger, spring } from 'animejs'

// Orchestrated motion, on top of anime.js.
//
// Ambient motion -- the hall breathing, embers, shimmer, gilt sweeps -- stays
// in CSS on purpose. The browser runs those on the compositor without waking
// JavaScript, which on a phone is the difference between a warm battery and a
// cold one. This file is only for the things CSS is genuinely bad at:
// sequencing a list, and tweening a number.
//
// Everything here is a no-op when the visitor has asked for reduced motion.

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Reveal a container's children one after another.
 *
 * This replaces the `.stagger-in` CSS class for lists whose length is not known
 * ahead of time. That class carries hand-written delays for :nth-child(1)
 * through (8); a ninth item matches no rule, so it keeps the class's opacity: 0
 * start and its zero delay, and arrives BEFORE the eight above it. A roster or
 * a ranking table is exactly where that shows.
 *
 * @param {Element} container
 * @param {{ step?: number, duration?: number, distance?: number, delay?: number }} [opts]
 * @returns {() => void} cancel
 */
export function staggerIn(container, opts = {}) {
  if (!container) return () => {}

  const children = Array.from(container.children)
  if (!children.length) return () => {}

  const { step = 70, duration = 520, distance = 16, delay = 0 } = opts

  // Asked for stillness: show everything, immediately, and animate nothing.
  if (prefersReducedMotion()) {
    for (const child of children) {
      child.style.opacity = ''
      child.style.transform = ''
    }
    return () => {}
  }

  const animation = animate(children, {
    opacity: { from: 0, to: 1 },
    translateY: { from: distance, to: 0 },
    duration,
    delay: stagger(step, { start: delay }),
    ease: 'outExpo',
  })

  return () => {
    // Leaving mid-flight must not strand a card at opacity 0.
    try { animation.pause() } catch {}
    for (const child of children) {
      child.style.opacity = ''
      child.style.transform = ''
    }
  }
}

/**
 * Run staggerIn over a ref's children whenever `deps` change -- e.g. once the
 * alliances have loaded and there is finally something to reveal.
 */
export function useStaggerIn(ref, deps = [], opts = {}) {
  useEffect(() => {
    return staggerIn(ref.current, opts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/* Marks the document while JS is driving the reveals. CSS yields to it, so a
   visitor whose JavaScript never arrives still gets the original animation
   rather than a page of invisible panels. */
const JS_FLAG = 'k846-js-stagger'

/**
 * Drive every `.stagger-in` on the page with anime.js instead of CSS.
 *
 * The class carried hand-written delays for :nth-child(1) through (8). A ninth
 * child matched no rule, kept the class's opacity: 0 start and its zero delay,
 * and so arrived BEFORE the eight above it -- a roster or a ranking table shows
 * that immediately. Capping the late ones in CSS stopped them jumping the
 * queue, but they still all land together.
 *
 * Here the cascade has no bound, and the group only starts when it is actually
 * scrolled into view. The CSS version began the moment the page loaded, so a
 * panel three screens down had finished animating before anyone reached it.
 *
 * Singleton, like installReveal: mounting a second copy would animate every
 * group twice.
 */
export function installStagger(opts = {}) {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846Stagger) return window.__k846Stagger

  // Defaults come from the motion system below, so the stagger shares its
  // rhythm with the section reveal rather than carrying its own timing.
  const { step = 45, distance = 8 } = opts
  const root = document.documentElement
  root.classList.add(JS_FLAG)

  const show = (els) => {
    for (const el of els) { el.style.opacity = '1'; el.style.transform = 'none' }
  }

  // Asked for stillness: take the class over so CSS cannot animate it, show
  // everything, and never observe anything.
  if (prefersReducedMotion()) {
    const reveal = () => show(document.querySelectorAll('.stagger-in'))
    reveal()
    const mo = new MutationObserver(reveal)
    mo.observe(document.body, { childList: true, subtree: true })
    const stop = () => { mo.disconnect(); root.classList.remove(JS_FLAG); window.__k846Stagger = null }
    window.__k846Stagger = stop
    return stop
  }

  const done = new WeakSet()

  const run = (group) => {
    if (done.has(group)) return
    done.add(group)
    const children = [...group.children].filter((c) => c.classList.contains('stagger-in'))
    if (!children.length) return
    try {
      animate(children, {
        opacity: { from: 0, to: 1 },
        translateY: { from: distance, to: 0 },
        delay: stagger(step),
        ease: motion.spring.element(),
      })
    } catch (err) {
      // A reveal that throws must never leave the page invisible.
      console.error('[motion] stagger failed, showing content', err)
      show(children)
    }
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      io.unobserve(e.target)      // one-shot: re-running on every scroll past is tiring
      run(e.target)
    }
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' })

  // Groups are found by their children, since the container carries no class.
  const scan = () => {
    const groups = new Set()
    for (const el of document.querySelectorAll('.stagger-in')) {
      if (el.parentElement) groups.add(el.parentElement)
    }
    for (const g of groups) if (!done.has(g)) io.observe(g)
  }
  scan()

  // Pages mount their panels after this runs, and the battle lab rebuilds whole
  // result grids on every recalculation.
  const mo = new MutationObserver(scan)
  mo.observe(document.body, { childList: true, subtree: true })

  const stop = () => {
    io.disconnect()
    mo.disconnect()
    root.classList.remove(JS_FLAG)
    window.__k846Stagger = null
  }
  window.__k846Stagger = stop
  return stop
}

/* The kingdom's motion system.
 *
 * The site had nine entrance durations, ten easing curves and five travel
 * distances, each tuned where it was written. Every one was fine alone, and
 * together they never settled into a feel.
 *
 * These springs replace them. A spring is not slower or faster than a curve --
 * it is shaped differently. The old section reveal ran opacity .8s and
 * transform .95s, so it took most of a second to look finished. These reach
 * 90% of their travel in 130-200ms and then settle quietly, which is why they
 * read as immediate without reading as abrupt.
 *
 * Measured, not guessed -- time to 90% of travel, and peak overshoot:
 *   section 152ms, +2.8%   element 132ms, +4.4%
 *   snappy  108ms, +4.0%   accent  108ms, +16%
 *
 * Overshoot is the whole character. Keep `accent` for things that should feel
 * struck -- a number landing, a badge arriving -- and off everything else, or
 * the page reads as restless rather than alive.
 */
export const motion = {
  spring: {
    section: () => spring({ stiffness: 300, damping: 26 }),
    element: () => spring({ stiffness: 340, damping: 26 }),
    snappy:  () => spring({ stiffness: 500, damping: 32 }),
    accent:  () => spring({ stiffness: 320, damping: 18 }),
  },
  /* Two distances, not five. The old reveal travelled 30px, which is far
     enough that the eye follows the movement instead of receiving the content. */
  rise: { sm: 8, lg: 16 },
  /* Tight enough to read as one gesture rather than a queue. */
  stagger: { step: 45 },
}

/**
 * Spring one revealed block into place.
 *
 * Called by installReveal when an element crosses into view. The observer, the
 * sweep and the data attribute all stay exactly as they were -- that machinery
 * encodes several hard-won fixes and is not what needed changing. Only the
 * movement itself is different.
 */
export function revealElement(el) {
  if (!el || prefersReducedMotion()) return
  try {
    animate(el, {
      opacity: { from: 0, to: 1 },
      translateY: { from: motion.rise.lg, to: 0 },
      ease: motion.spring.section(),
    })
    const kids = [...el.children]
    if (kids.length > 1) {
      animate(kids, {
        opacity: { from: 0, to: 1 },
        translateY: { from: motion.rise.sm, to: 0 },
        delay: stagger(motion.stagger.step),
        ease: motion.spring.element(),
      })
    }
  } catch (err) {
    // Never leave a section stranded at opacity 0 because a tween threw.
    console.error('[motion] reveal failed, showing content', err)
    el.style.opacity = '1'
    el.style.transform = 'none'
    for (const k of el.children) { k.style.opacity = '1'; k.style.transform = 'none' }
  }
}
