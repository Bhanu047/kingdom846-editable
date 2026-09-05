import { useEffect } from 'react'
import { animate, stagger, spring, createTimeline, createAnimatable, utils, text as animeText } from 'animejs'

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

/* ---------------------------------------------------------------------------
 * Presence.
 *
 * Everything above answers "how does a thing arrive". None of it answers what
 * the site DOES while you are looking at it, and that is the actual gap: this
 * page reveals things and then stops, where the motion worth copying keeps
 * responding to the reader. These three respond -- to scroll, and to the
 * cursor -- rather than playing once and finishing.
 * ------------------------------------------------------------------------- */

/**
 * The hero drifts as you scroll: crest, wordmark and tagline move at different
 * rates, so the room has depth instead of scrolling as one flat picture.
 *
 * Tied to scroll POSITION, not fired once on entry -- that is what makes it
 * feel connected to the reader rather than at them. The app scrolls an inner
 * pane, so the listener goes there; reveal.js documents why (scroll events from
 * that pane do not bubble to the document).
 */
export function installHeroParallax({ pane, layers } = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const scroller = typeof pane === 'string' ? document.querySelector(pane) : pane
  if (!scroller || !layers?.length) return () => {}

  const found = layers
    .map(({ selector, rate, fade }) => ({ el: document.querySelector(selector), rate, fade }))
    .filter((l) => l.el)
  if (!found.length) return () => {}

  let frame = 0
  const paint = () => {
    frame = 0
    const y = scroller.scrollTop
    for (const { el, rate, fade } of found) {
      // Transform and opacity only: both composite, so this costs no layout on
      // a scroll that is already the busiest moment on the page.
      el.style.transform = `translate3d(0, ${(y * rate).toFixed(2)}px, 0)`
      if (fade) el.style.opacity = String(Math.max(0, 1 - (y / fade)))
    }
  }
  const onScrollPane = () => { if (!frame) frame = requestAnimationFrame(paint) }
  scroller.addEventListener('scroll', onScrollPane, { passive: true })
  paint()

  return () => {
    scroller.removeEventListener('scroll', onScrollPane)
    cancelAnimationFrame(frame)
    for (const { el } of found) { el.style.transform = ''; el.style.opacity = '' }
  }
}

/**
 * Cards lean toward the cursor and spring back when it leaves.
 *
 * The lean itself is set directly rather than tweened -- a tween chasing a
 * pointer always lags behind it, which reads as sluggish. anime.js takes over
 * for the release, where a spring is exactly right: the card overshoots
 * slightly on its way back to flat, which is what makes it feel sprung rather
 * than merely reset.
 */
export function installCardTilt(selector, { max = 16, lift = 22 } = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  // A touch screen has no hovering cursor to lean toward, and binding this
  // there only means a card stuck mid-tilt after a tap.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {}

  const cards = [...document.querySelectorAll(selector)]
  if (!cards.length) return () => {}

  const cleanups = cards.map((card) => {
    card.style.transformStyle = 'preserve-3d'
    const onMove = (e) => {
      const r = card.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width - 0.5
      const py = (e.clientY - r.top) / r.height - 0.5
      card.style.transform =
        `perspective(700px) rotateY(${(px * max).toFixed(2)}deg) rotateX(${(-py * max).toFixed(2)}deg) translateZ(${lift}px)`
    }
    const onLeave = () => {
      animate(card, {
        rotateX: 0, rotateY: 0, translateZ: 0,
        ease: motion.spring.accent(),
        onComplete: () => { card.style.transform = '' },
      })
    }
    card.addEventListener('pointermove', onMove)
    card.addEventListener('pointerleave', onLeave)
    return () => {
      card.removeEventListener('pointermove', onMove)
      card.removeEventListener('pointerleave', onLeave)
      card.style.transform = ''
      card.style.transformStyle = ''
    }
  })

  return () => cleanups.forEach((fn) => fn())
}

/**
 * The wordmark lands letter by letter, on springs.
 *
 * Those letters carry TWO css animations: the entrance, and gilt-tilt, an
 * infinite tilt that keeps the metal alive. A running CSS animation beats an
 * inline style, so anime.js and gilt-tilt would fight over transform for as
 * long as both were live. The handoff avoids that entirely: CSS holds both
 * animations back while the class is on the element, anime.js springs the
 * letters, and only when it finishes is the class dropped so gilt-tilt takes
 * over a wordmark that is already in place.
 *
 * Transform and opacity only, deliberately. index.css records that a filter
 * animation here dropped rAF from 49ms to 658ms during the hero mount.
 */
export function animateWordmark(el) {
  if (!el || prefersReducedMotion()) return
  const letters = [...el.querySelectorAll('span')].filter((s) => !s.classList.contains('sp'))
  if (!letters.length) return

  el.classList.add('k846-js-letters')
  const release = () => el.classList.remove('k846-js-letters')

  try {
    animate(letters, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 72, to: 0 },
      rotateX: { from: -70, to: 0 },
      scale: { from: 0.45, to: 1 },
      delay: stagger(52, { start: 120 }),
      ease: motion.spring.accent(),
      onComplete: () => {
        // Hand the letters back to CSS with no inline transform left to fight.
        for (const l of letters) { l.style.transform = ''; l.style.opacity = '' }
        release()
      },
    })
  } catch (err) {
    console.error('[motion] wordmark failed, showing it', err)
    for (const l of letters) { l.style.opacity = '1'; l.style.transform = 'none' }
    release()
  }
}

/**
 * The gates open: a full page-change sequence.
 *
 * A route change was a .72s rise -- correct, and small enough to read as a
 * repaint. This is deliberately theatrical, because a kingdom portal should
 * feel like doors opening rather than a div swapping.
 *
 * The incoming page's blocks arrive from below, tipped back in 3D and springing
 * flat, one after another. Fires on every navigation.
 *
 * There was a gilt edge sweeping left to right across the content here too. It
 * was removed: a horizontal wipe cuts across the reading direction and drags
 * the eye sideways at the exact moment the reader is trying to start at the top
 * of a new page. The vertical arrival does not fight them that way.
 */
export function playPageTransition(container) {
  if (!container || prefersReducedMotion()) return () => {}

  let cancelled = false
  let tl = null
  let blocks = []
  let host = null
  let safety = 0

  /* Always leaves the page readable, whatever happened.
     This is the whole reason the function is shaped this way: every failure
     mode here -- a timeline that throws, a route change mid-flight, React
     swapping the subtree under us -- ends with blocks holding an inline
     opacity of 0, which is invisible content. Clearing is unconditional. */
  const show = () => {
    clearTimeout(safety)
    if (host) host.style.perspective = ''
    for (const b of blocks) { b.style.opacity = ''; b.style.transform = '' }
  }

  /* Wait a frame before touching anything. Pages are lazy-loaded behind
     Suspense, so at mount the stage still holds the skeleton -- animating that
     staggers a placeholder and then leaves inline styles on nodes React is
     about to replace. One frame later the real page is mounted. */
  const raf = requestAnimationFrame(() => {
    if (cancelled) return

    // The routed page is usually one wrapper div holding every panel, so the
    // stage's own children are a single block with no cascade in them.
    host = container
    for (let depth = 0; depth < 3 && host.children.length === 1; depth++) {
      const only = host.firstElementChild
      if (!only || !only.children.length) break
      host = only
    }
    blocks = [...host.children]

    try {
      host.style.perspective = '1400px'
      tl = createTimeline()
      if (blocks.length) {
        tl.add(blocks, {
          opacity: { from: 0, to: 1 },
          translateY: { from: 70, to: 0 },
          rotateX: { from: -26, to: 0 },
          scale: { from: 0.93, to: 1 },
          delay: stagger(60),
          ease: motion.spring.section(),
          onComplete: show,
        }, 0)
      } else {
        show()
      }
    } catch (err) {
      console.error('[motion] page transition failed, showing content', err)
      show()
      return
    }

    // Belt and braces. If the timeline never completes -- paused, interrupted,
    // a spring that never settles -- this still hands the page back.
    safety = setTimeout(show, 2200)
  })

  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
    try { tl?.pause() } catch {}
    show()
  }
}

/**
 * The torch: the pointer carries light through the hall.
 *
 * What was here before was a gilt ring that replaced the mouse pointer, and it
 * was wrong twice over. A ring-and-dot cursor is a design-studio idiom -- it
 * belongs on a portfolio site, not in a torch-lit hall -- and replacing the
 * native pointer is a genuine accessibility cost: a custom cursor ignores the
 * visitor's own pointer size, high-contrast and inverted-colour settings, and
 * on magnification it is the one thing on screen that does not scale.
 *
 * So the pointer is the visitor's own again, and the kingdom's contribution is
 * light: a warm, faintly flickering pool that follows a step behind the hand,
 * as a carried torch does. It sits in `screen` blend, which can only lighten --
 * so it warms the ink it passes over and can never dim the text.
 *
 * The lag is the same trick the ring used and the only part worth keeping:
 * createAnimatable drives the position continuously from the pointer rather
 * than playing a timeline, so the light swings after the hand and settles.
 *
 * Desktop only. A touch screen has no hovering pointer for a light to follow,
 * and a torch stranded at the last tap is just a smudge.
 */
export function installTorch() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {}
  if (window.__k846Torch) return window.__k846Torch

  // Two elements on purpose: anime.js owns the outer one's transform, CSS owns
  // the inner one's. One element could not carry both a driven translate and a
  // transitioned scale without them overwriting each other.
  const torch = document.createElement('div')
  const flame = document.createElement('div')
  torch.className = 'k846-torch'
  flame.className = 'k846-torch-flame'
  torch.setAttribute('aria-hidden', 'true')
  torch.appendChild(flame)
  document.body.appendChild(torch)

  const light = createAnimatable(torch, { x: { duration: 260 }, y: { duration: 260 }, ease: 'out(3)' })

  let raf = 0
  let px = 0
  let py = 0
  let moved = false
  const onMove = (e) => {
    px = e.clientX
    py = e.clientY
    if (!moved) { moved = true; document.documentElement.classList.add('k846-torch-live') }
    // One write per frame, transform only: following the pointer costs no layout.
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; light.x(px); light.y(py) })
  }

  // Over something you can act on, the light leans in -- the hover cue the
  // element already has, answered by the room rather than by an ornament.
  const INTERACTIVE = 'a, button, [role="button"], .tilt-tile, summary'
  const onOver = (e) => {
    torch.classList.toggle('is-near', !!e.target.closest?.(INTERACTIVE))
  }
  const onDown = () => torch.classList.add('is-lit')
  const onUp = () => torch.classList.remove('is-lit')
  const onLeave = () => document.documentElement.classList.remove('k846-torch-live')

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerover', onOver, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  document.addEventListener('pointerleave', onLeave)

  const stop = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerover', onOver)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    document.removeEventListener('pointerleave', onLeave)
    try { light.revert?.() } catch {}
    torch.remove()
    document.documentElement.classList.remove('k846-torch-live')
    window.__k846Torch = null
  }
  window.__k846Torch = stop
  return stop
}

/**
 * The page title decodes into place on arrival.
 *
 * anime.js's scrambleText drives a numeric tween through a modifier that
 * renders each frame as characters, so the heading churns through noise and
 * resolves. It happens IN PLACE -- nothing travels, nothing crosses the
 * content -- which is why it suits this site where a horizontal wipe did not.
 *
 * It also earns its place thematically: a kingdom portal whose pages announce
 * themselves by resolving out of static reads as a war console rather than a
 * brochure.
 *
 * Only ever applied to a heading that is PURE TEXT. scrambleText writes
 * textContent, so a title containing an icon or a span would have those
 * children flattened into a string and destroyed. The guard is not optional.
 */
export function scrambleHeading(root) {
  if (!root || prefersReducedMotion()) return () => {}

  const el = root.querySelector('h1.gilt-display')
  if (!el) return () => {}
  if (el.children.length > 0) return () => {}          // not pure text -- leave it alone
  const original = el.textContent
  if (!original || original.length > 60) return () => {}

  let anim = null
  try {
    anim = animate(el, {
      // 'A-Z0-9' keeps the noise in the kingdom's own alphabet: a title made of
      // lowercase and punctuation reads as a glitch rather than a cipher.
      textContent: animeText.scrambleText({ chars: 'A-Z0-9' }),
      duration: 900,
      ease: 'outQuad',
      onComplete: () => { el.textContent = original },
    })
  } catch (err) {
    console.error('[motion] heading scramble failed', err)
    el.textContent = original
    return () => {}
  }

  return () => {
    try { anim?.pause() } catch {}
    // Whatever frame it was on, the reader gets the real title back.
    el.textContent = original
  }
}
