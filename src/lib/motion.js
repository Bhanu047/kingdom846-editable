import { useEffect } from 'react'
import { animate, stagger, spring, createTimeline, createAnimatable, onScroll, svg as animeSvg, text as animeText } from 'animejs'

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
 * responding to the reader. These respond -- to the cursor here, to the scroll
 * in the hero scrub below -- rather than playing once and finishing.
 * ------------------------------------------------------------------------- */

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
 * Run `fn` once the routed page has actually mounted.
 *
 * Pages are lazy-loaded behind Suspense, so at mount the stage holds
 * PageSkeleton and nothing else. Waiting a single frame is enough only when
 * that page's chunk is already cached; on a first visit it is still on the
 * wire, and a frame later there is still nothing there but the placeholder. So
 * the entrance was spent animating the skeleton, and the real page arrived with
 * no entrance at all -- which is exactly why the title decode appeared on some
 * pages and not others. It was never the heading. It was whichever chunks
 * happened to be warm.
 *
 * The observer's callback runs as a microtask, before the browser paints the
 * newly inserted content, so an animation started from here still owns the
 * first frame: nothing flashes in at full opacity and then re-animates.
 *
 * @param {Element} container   the page stage
 * @param {() => void} fn       runs once, when the real page is in the DOM
 * @returns {() => void}        cancel, safe to call at any point
 */
function whenPageReady(container, fn) {
  if (!container) return () => {}

  let done = false
  let raf = 0
  let timer = 0
  let mo = null

  const stop = () => {
    done = true
    cancelAnimationFrame(raf)
    clearTimeout(timer)
    try { mo?.disconnect() } catch {}
  }

  const ready = () =>
    container.children.length > 0 && !container.querySelector('[data-page-skeleton]')

  const check = () => {
    if (done || !ready()) return
    stop()
    fn()
  }

  // Already mounted -- a warm chunk, or a route that was never lazy.
  if (ready()) { fn(); return () => {} }

  mo = new MutationObserver(check)
  mo.observe(container, { childList: true, subtree: true })
  raf = requestAnimationFrame(check)
  // A chunk that never arrives leaves nothing to animate; give up quietly
  // rather than hold an observer on the page for the rest of the session.
  timer = setTimeout(stop, 8000)

  return stop
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

  /* Wait for the real page, not for a frame. Pages are lazy-loaded behind
     Suspense, so at mount the stage holds the skeleton -- animating that
     staggers a placeholder and then leaves inline styles on nodes React is
     about to replace. On a cold chunk it is still the skeleton a frame later,
     which is why this used to do nothing at all on a page's first visit. */
  const stopWait = whenPageReady(container, () => {
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
    stopWait()
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
 * The page title blooms out of its own centre, a letter at a time.
 *
 * What was here decoded the heading out of random characters. It read as a
 * terminal booting rather than as a kingdom, and it was the first thing to go
 * when it was seen in place -- so the noise is gone and the movement is not.
 *
 * splitText gives every character its own element, and `stagger` ordered
 * `from: 'center'` releases them outward in both directions at once: the title
 * opens the way the rule under it does, rather than travelling across the page.
 * Each letter arrives tipped back and springs upright, which is the wordmark's
 * own gesture carried onto every other page.
 *
 * The characters must carry the gilt themselves. `.gilt-display` paints a
 * gradient and clips it to the heading's text -- and a transformed child paints
 * into its own layer, dropping out of that clip and vanishing. index.css has
 * carried that warning since the welcome screen hit it; `.k846-char` is the
 * answer, the same one the hero wordmark uses.
 */
export function bloomHeading(root) {
  if (!root || prefersReducedMotion()) return () => {}

  let split = null
  const stopWait = whenPageReady(root, () => {
    const el = root.querySelector('h1.gilt-display')
    if (!el || el.children.length > 0) return                 // not pure text
    const text = (el.textContent || '').trim()
    if (!text || text.length > 60) return

    try {
      el.classList.add('k846-bloom-title')
      split = animeText.splitText(el, { chars: { class: 'k846-char' }, words: false })
      animate(split.chars, {
        opacity: { from: 0, to: 1 },
        scale: { from: 0.62, to: 1 },
        translateY: { from: 16, to: 0 },
        rotateX: { from: -58, to: 0 },
        delay: stagger(26, { from: 'center' }),
        ease: motion.spring.accent(),
      })
    } catch (err) {
      console.error('[motion] title bloom failed, showing it', err)
      try { split?.revert() } catch {}
      el.classList.remove('k846-bloom-title')
      split = null
    }
  })

  return () => {
    stopWait()
    // Hand the heading back whole: a reverted split leaves the original text.
    try { split?.revert() } catch {}
    root.querySelector('h1.gilt-display')?.classList.remove('k846-bloom-title')
  }
}

/* ---------------------------------------------------------------------------
 * Spectacle.
 *
 * Everything above is craft you feel without noticing: springs instead of
 * curves, a cascade instead of a fade. That was the right first move and it is
 * also, fairly, invisible -- the kingdom asked for anime.js because of what
 * anime.js is FAMOUS for, and none of it was here.
 *
 * These four are. Each one is a thing anime.js does that nothing else does as
 * well, and each is tied to something this site already is: a torch-lit hall
 * with a crest, a motto and a war record.
 * ------------------------------------------------------------------------- */

/**
 * Hold an entrance until the visitor is actually looking at the page.
 *
 * The front door -- the nine halls and ENTER THE REALM -- is an overlay, and
 * the app mounts behind it while it stands. So the hero's arrival was running
 * the moment React rendered: measured, the motto was mid-flight at 2.0s and
 * finished by 2.6s, with the door still shut over the top of it. Nobody had
 * ever seen it. The animation was never the problem; the timing was.
 *
 * App.jsx raises `k846:entered` when the door opens (and sets the flag for
 * anything mounting later). The timeout is the safety: an entrance that waits
 * on an event which never comes is content that never appears.
 *
 * @param {() => void} fn
 * @returns {() => void} cancel
 */
export function whenEntered(fn, timeout = 9000) {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846Entered) { fn(); return () => {} }

  let done = false
  let timer = 0
  const off = () => {
    clearTimeout(timer)
    window.removeEventListener('k846:entered', go)
  }
  const go = () => {
    if (done) return
    done = true
    off()
    fn()
  }
  timer = setTimeout(go, timeout)
  window.addEventListener('k846:entered', go)

  return () => { done = true; off() }
}

/**
 * The hero is scrubbed by the scroll, not triggered by it.
 *
 * The difference is the whole point. A trigger fires once and plays out at its
 * own speed; a scrubbed timeline is bound to the scrollbar, so the crest rises
 * and dims exactly as fast as you scroll, stops when you stop, and runs
 * backwards when you scroll back up. anime.js's onScroll does it by driving the
 * timeline's time from the scroll position -- `sync` smooths that so it glides
 * rather than snapping frame to frame.
 *
 * This replaces a hand-written scroll listener that moved two layers by a fixed
 * rate. Same idea, an order of magnitude more of it: five layers, each with its
 * own travel, scale and fade, composed as one timeline.
 *
 * The app scrolls an inner pane, so the container is that pane and not the
 * window -- reveal.js documents why (its scroll events never reach the
 * document).
 */
export function installHeroScrub({ pane = '.app-scroll', hero = '.hero-frame' } = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const heroEl = document.querySelector(hero)
  const paneEl = document.querySelector(pane)
  if (!heroEl || !paneEl) return () => {}

  const pick = (sel) => document.querySelector(sel)
  const crest = pick('.hero-crest')
  const word = pick('.hero-wordmark')
  const motto = pick('.hero-motto')
  if (!crest && !word) return () => {}

  let tl = null
  try {
    tl = createTimeline({
      defaults: { ease: 'linear' },
      autoplay: onScroll({
        container: paneEl,
        target: heroEl,
        /* Each threshold reads CONTAINER edge first, then TARGET edge -- not
           the other way round. 'top bottom' is the container's top meeting the
           hero's bottom, i.e. the hero fully gone. Written the other way it
           resolves to an end offset BEFORE the start, the observer's travel is
           zero, and the timeline sits at progress 0 forever: it looks exactly
           like onScroll silently not working. */
        enter: 'top top',      // container top meets hero top: it starts to leave
        leave: 'top bottom',   // container top meets hero bottom: it is gone
        sync: 0.65,            // smoothed, so it glides with the scroll
      }),
    })
    // Different travels are what make it read as depth rather than as one
    // picture sliding: the crest goes furthest and fades first.
    if (crest) tl.add(crest, { translateY: -150, scale: 0.78, opacity: 0.05 }, 0)
    if (word) tl.add(word, { translateY: -70, scale: 0.94, opacity: 0.3 }, 0)
    if (motto) tl.add(motto, { translateY: -34, opacity: 0 }, 0)
  } catch (err) {
    console.error('[motion] hero scrub failed', err)
    return () => {}
  }

  return () => {
    try { tl?.revert?.() } catch {}
    for (const el of [crest, word, motto]) {
      if (el) { el.style.transform = ''; el.style.opacity = '' }
    }
  }
}

/**
 * The motto arrives a word at a time, from behind its own line.
 *
 * splitText wraps each word in its own element -- with `wrap: 'clip'`, in a
 * mask -- so the words can be animated up from below the line and appear to
 * rise out of it rather than fade in on top of it. It is the one effect here
 * that could not be written in CSS at all: the site does not know how the motto
 * breaks into lines until the browser has laid it out.
 *
 * Deliberately late (start 760ms): the wordmark's letters are still landing
 * before this, and the two reading in sequence is the point.
 */
export function animateMotto(el) {
  if (!el || prefersReducedMotion()) return () => {}

  let split = null
  try {
    split = animeText.splitText(el, { words: { wrap: 'clip' }, chars: false })
    animate(split.words, {
      y: [{ from: '110%' }],
      opacity: [{ from: 0, to: 1 }],
      duration: 900,
      delay: stagger(80, { start: 760 }),
      ease: motion.spring.section(),
    })
  } catch (err) {
    console.error('[motion] motto failed, showing it', err)
    try { split?.revert() } catch {}
    return () => {}
  }

  return () => { try { split?.revert() } catch {} }
}

/**
 * The war record counts up.
 *
 * A kingdom's rating, its KvK count, its dominations -- these are the numbers
 * the page exists to show, and they were simply printed. Counting them up is
 * the oldest trick there is and it still works, because the eye follows a
 * moving number and reads a still one only if it was already looking.
 *
 * Honest about the value: it eases to the real figure and stops there. A spring
 * would overshoot, and a rating that swings to 1.281 before settling on 1.234
 * is a number the site just made up.
 *
 * Marked with data-count in the markup rather than found by selector, so a
 * number that must not be animated (a date, a rank, a countdown that is already
 * ticking) simply does not carry the attribute.
 */
export function installCountUps(root) {
  if (!root || typeof window === 'undefined' || prefersReducedMotion()) return () => {}

  const els = [...root.querySelectorAll('[data-count]')].filter((el) => !el.dataset.counted)
  if (!els.length) return () => {}

  const runs = []
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      io.unobserve(e.target)
      run(e.target)
    }
  }, { threshold: 0.4 })

  const run = (el) => {
    const raw = (el.textContent || '').trim()
    // prefix (#, +) / the number / suffix (%, x) -- all three are kept, only
    // the middle is animated.
    const m = raw.match(/^([^0-9-]*)(-?[\d,]*\.?\d+)(.*)$/)
    if (!m) return
    const [, prefix, numStr, suffix] = m
    const grouped = numStr.includes(',')
    const decimals = (numStr.split('.')[1] || '').length
    const target = Number(numStr.replace(/,/g, ''))
    if (!Number.isFinite(target)) return

    el.dataset.counted = '1'
    const format = (n) => {
      const fixed = n.toFixed(decimals)
      return prefix + (grouped ? Number(fixed).toLocaleString(undefined, {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }) : fixed) + suffix
    }

    const state = { n: 0 }
    el.textContent = format(0)
    try {
      runs.push(animate(state, {
        n: target,
        duration: 1500,
        ease: 'outExpo',
        onUpdate: () => { el.textContent = format(state.n) },
        // Whatever the last frame rounded to, the real figure is what stays.
        onComplete: () => { el.textContent = raw },
      }))
    } catch (err) {
      console.error('[motion] count-up failed, showing the figure', err)
      el.textContent = raw
    }
  }

  for (const el of els) io.observe(el)

  return () => {
    io.disconnect()
    for (const a of runs) { try { a.pause() } catch {} }
    // Never leave a stat mid-count.
    for (const el of els) if (el.dataset.counted) el.dataset.counted = ''
  }
}

/**
 * The page's heraldic rule draws itself outward from its own centre.
 *
 * createDrawable animates a path's stroke the way an engraver cuts one -- and
 * `draw` takes a START and an END along the path, so drawing it from '0.5 0.5'
 * to '0 1' opens it from the middle in both directions at once rather than
 * wiping across. That direction matters here: a rule that sweeps left to right
 * drags the eye across the reading direction at the exact moment the reader is
 * starting the page, which is why the old gilt sweep was taken out.
 *
 * The gem is struck first, on the loose spring, and the rule opens from under
 * it. Without JavaScript the rule is simply drawn and the gem is simply there,
 * so a header that never animates is still a header.
 */
export function drawHeaderRule(root) {
  if (!root || prefersReducedMotion()) return () => {}

  let tl = null
  const stopWait = whenPageReady(root, () => {
    const host = root.querySelector('.ph-flourish')
    const line = host?.querySelector('.ph-flourish-line')
    const gem = host?.querySelector('.ph-flourish-gem')
    if (!line) return

    try {
      const [drawn] = animeSvg.createDrawable(line)
      tl = createTimeline()
      if (gem) {
        tl.add(gem, {
          scale: { from: 0, to: 1 },
          rotate: { from: -120, to: 45 },
          opacity: { from: 0, to: 1 },
          duration: 700,
          ease: motion.spring.accent(),
        }, 0)
      }
      tl.add(drawn, {
        // start and end along the path: shut in the middle, then opened.
        draw: ['0.5 0.5', '0 1'],
        duration: 820,
        ease: 'inOutQuad',
      }, 90)
    } catch (err) {
      console.error('[motion] header rule failed, leaving it drawn', err)
    }
  })

  return () => {
    stopWait()
    try { tl?.revert?.() } catch {}
  }
}

/**
 * The chronicle draws itself as you read down it.
 *
 * The timeline's spine was a gradient div. It is an SVG path now, and its
 * stroke is drawn by the SCROLL rather than on a timer: the line reaches
 * exactly as far as you have read, stops when you stop, and retreats when you
 * scroll back up. Of everything here this is the one that is genuinely about
 * the content -- the kingdom's history writing itself out at the speed you take
 * it in.
 *
 * Thresholds again read CONTAINER edge first, then TARGET edge.
 */
export function installChronicle({ pane = '.app-scroll', line = '.chronicle-path', target = '.chronicle-scope' } = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const paneEl = document.querySelector(pane)
  const lineEl = document.querySelector(line)
  const targetEl = document.querySelector(target)
  if (!paneEl || !lineEl || !targetEl) return () => {}

  let tl = null
  try {
    const [drawn] = animeSvg.createDrawable(lineEl)
    tl = createTimeline({
      defaults: { ease: 'linear' },
      autoplay: onScroll({
        container: paneEl,
        target: targetEl,
        enter: 'bottom top',      // container bottom meets the chronicle's top
        leave: 'bottom bottom',   // container bottom meets its end
        /* Smoothed, but not so smoothed that a short page never finishes the
           line while the reader sits at the bottom of it waiting. */
        sync: 0.85,
      }),
    })
    tl.add(drawn, { draw: ['0 0', '0 1'] }, 0)
  } catch (err) {
    console.error('[motion] chronicle failed, leaving the line drawn', err)
    return () => {}
  }

  return () => { try { tl?.revert?.() } catch {} }
}

/**
 * One gilt mark that travels between nav items.
 *
 * The active item drew its own 3px bar and grew it in place, so every
 * navigation was a bar vanishing here and a different bar appearing there. A
 * single mark that SLIDES says what those two never could: that this is one
 * rail, and you have moved along it.
 *
 * It watches for the class React toggles rather than being told where to go,
 * so it stays right no matter which button did the navigating -- the sidebar,
 * a link in the page, the browser's back button, or a hash typed by hand.
 *
 * CSS keeps its own per-item bar until this is installed, so a rail whose
 * JavaScript never arrives still shows which page you are on.
 */
export function installNavMark(selector = 'nav', {
  item = '.nav-item', activeClass = 'active', markClass = 'nav-mark', axis = 'y', span = 0.62,
} = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const nav = document.querySelector(selector)
  if (!nav) return () => {}

  const mark = document.createElement('span')
  mark.className = markClass
  mark.setAttribute('aria-hidden', 'true')
  nav.appendChild(mark)
  document.documentElement.classList.add('k846-js-nav')

  const vertical = axis === 'y'
  let landed = false
  const place = () => {
    const active = nav.querySelector(`${item}.${activeClass}`)
    if (!active) { mark.style.opacity = '0'; return }

    // offsets are measured against nav itself, which is already positioned.
    const size = Math.round((vertical ? active.offsetHeight : active.offsetWidth) * span)
    const start = Math.round(
      (vertical ? active.offsetTop : active.offsetLeft) +
      ((vertical ? active.offsetHeight : active.offsetWidth) - size) / 2
    )
    mark.style[vertical ? 'height' : 'width'] = `${size}px`

    if (!landed) {
      landed = true
      mark.style.transform = vertical ? `translateY(${start}px)` : `translateX(${start}px)`
      animate(mark, {
        opacity: { from: 0, to: 1 },
        [vertical ? 'scaleY' : 'scaleX']: { from: 0, to: 1 },
        ease: motion.spring.accent(),
      })
      return
    }
    animate(mark, {
      [vertical ? 'translateY' : 'translateX']: start,
      opacity: 1,
      ease: motion.spring.section(),
    })
  }

  place()

  // React re-renders the buttons with a new className; that is the signal.
  const mo = new MutationObserver(place)
  mo.observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true })

  // The rail scrolls and the window resizes; the mark is positioned in pixels.
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
  ro?.observe(nav)

  return () => {
    mo.disconnect()
    ro?.disconnect()
    mark.remove()
    document.documentElement.classList.remove('k846-js-nav')
  }
}

/**
 * The podium is struck, not revealed.
 *
 * Ranks one, two and three carry the kingdom's names, and they arrived on the
 * same cascade as rank forty. Each badge now lands on the loose spring -- from
 * small and turned, overshooting once -- so the top of the board reads as
 * something awarded rather than something listed.
 *
 * Only the first three, deliberately: a whole page of struck badges is a page
 * with no podium.
 */
export function strikePodium(root, selector = '.rank-badge') {
  if (!root || prefersReducedMotion()) return () => {}
  const badges = [...root.querySelectorAll(selector)].slice(0, 3)
  if (!badges.length) return () => {}

  let anim = null
  try {
    anim = animate(badges, {
      scale: { from: 0.45, to: 1 },
      rotate: { from: -18, to: 0 },
      opacity: { from: 0, to: 1 },
      delay: stagger(110, { start: 120 }),
      ease: motion.spring.accent(),
      onComplete: () => { for (const b of badges) { b.style.transform = ''; b.style.opacity = '' } },
    })
  } catch (err) {
    console.error('[motion] podium failed, showing the badges', err)
    for (const b of badges) { b.style.transform = ''; b.style.opacity = '' }
  }

  return () => {
    try { anim?.pause() } catch {}
    for (const b of badges) { b.style.transform = ''; b.style.opacity = '' }
  }
}

/**
 * An overlay opens instead of appearing.
 *
 * The drawer and the search panel were mounted straight in at full size, which
 * on a phone is the single most-used interaction on the site and the one place
 * where nothing moved at all. They open now: the backdrop washes in, the panel
 * itself springs, and whatever it contains cascades after it.
 *
 * The drawer opens along its own hinge -- scaleX from its left edge -- rather
 * than sliding in from off-screen. A panel that travels sideways across the
 * page is the motion this site keeps taking out; a door that swings open from
 * the edge it is attached to is the same idea without the sweep.
 *
 * @param {Element} panel
 * @param {{ backdrop?: Element, from?: 'left'|'centre', cascade?: string }} opts
 */
export function openOverlay(panel, { backdrop, from = 'centre', cascade } = {}) {
  if (!panel || prefersReducedMotion()) return () => {}

  const runs = []
  try {
    if (backdrop) {
      runs.push(animate(backdrop, { opacity: { from: 0, to: 1 }, duration: 260, ease: 'outQuad' }))
    }

    if (from === 'left') {
      panel.style.transformOrigin = 'left center'
      runs.push(animate(panel, {
        scaleX: { from: 0.94, to: 1 },
        opacity: { from: 0, to: 1 },
        ease: motion.spring.section(),
      }))
    } else {
      runs.push(animate(panel, {
        scale: { from: 0.94, to: 1 },
        translateY: { from: -12, to: 0 },
        opacity: { from: 0, to: 1 },
        ease: motion.spring.element(),
      }))
    }

    if (cascade) {
      const items = [...panel.querySelectorAll(cascade)]
      if (items.length) {
        runs.push(animate(items, {
          opacity: { from: 0, to: 1 },
          translateY: { from: motion.rise.sm, to: 0 },
          delay: stagger(28, { start: 90 }),
          ease: motion.spring.element(),
        }))
      }
    }
  } catch (err) {
    console.error('[motion] overlay failed, showing it', err)
    panel.style.opacity = ''
    panel.style.transform = ''
  }

  return () => {
    for (const run of runs) { try { run.pause() } catch {} }
    // An overlay closed mid-open must not leave anything invisible behind it.
    panel.style.opacity = ''
    panel.style.transform = ''
    panel.style.transformOrigin = ''
    if (backdrop) backdrop.style.opacity = ''
    if (cascade) {
      for (const el of panel.querySelectorAll(cascade)) { el.style.opacity = ''; el.style.transform = '' }
    }
  }
}

/**
 * Artwork settles in when it arrives.
 *
 * Every hall, banner and hero plate on the site was popped in at full size the
 * instant it decoded -- which on a slow connection is a hole in the page and
 * then, abruptly, a picture. It now fades up from slightly oversized, so the
 * image appears to settle into its frame rather than to be dropped into it.
 *
 * The listener matters more than the animation: images here are lazy, so most
 * of them decode long after their component mounted, and a plain effect would
 * animate a frame that is still empty. A cached image, whose load event has
 * already been and gone, is handled by the `complete` check -- without it,
 * everything already in the browser's cache would sit at opacity 0 forever.
 */
export function revealArt(img) {
  if (!img || prefersReducedMotion()) return () => {}

  let anim = null
  const show = () => { img.style.opacity = ''; img.style.transform = '' }

  const play = () => {
    try {
      anim = animate(img, {
        opacity: { from: 0, to: 1 },
        scale: { from: 1.06, to: 1 },
        duration: 620,
        ease: 'outExpo',
        onComplete: show,
      })
    } catch (err) {
      console.error('[motion] art reveal failed, showing it', err)
      show()
    }
  }

  // Already decoded (cache, or a re-render): play now, do not wait for a load
  // event that will never fire again.
  if (img.complete && img.naturalWidth > 0) {
    play()
    return () => { try { anim?.pause() } catch {} ; show() }
  }

  img.addEventListener('load', play, { once: true })
  // A broken image must not be left invisible either.
  img.addEventListener('error', show, { once: true })

  return () => {
    img.removeEventListener('load', play)
    img.removeEventListener('error', show)
    try { anim?.pause() } catch {}
    show()
  }
}

/**
 * A countdown digit answers when it changes.
 *
 * Two weights, and the difference is the whole reason this is not annoying. A
 * large counter -- the next event's own clock -- drops its new figure into
 * place. The small ones in the event list only breathe: opacity alone, no
 * travel. A dozen cards each dropping a seconds digit every second is not a
 * page that feels alive, it is a page that flickers.
 */
export function rollDigit(el, { subtle = false } = {}) {
  if (!el || prefersReducedMotion()) return
  const clear = () => { el.style.transform = ''; el.style.opacity = '' }
  try {
    animate(el, subtle
      ? { opacity: { from: 0.45, to: 1 }, duration: 200, ease: 'outQuad', onComplete: clear }
      : { translateY: { from: -8, to: 0 }, opacity: { from: 0.3, to: 1 }, duration: 280, ease: 'outExpo', onComplete: clear })
  } catch (err) {
    clear()
  }
}

/**
 * The scroll progress filament.
 *
 * This one was not slow or dull, it was DEAD: the bar measured
 * `document.querySelector('main')`, and main is the flex column with
 * overflow-hidden -- its scrollTop is always 0 and its scrollHeight always
 * equals its clientHeight, so the width was permanently 0%. The app scrolls an
 * inner pane; reveal.js has documented that since the first reveal bug.
 *
 * It is a transform now rather than a width. A width animation relayouts the
 * fixed bar on every scroll frame, which is the one moment on the page where
 * there is nothing to spare; a scaleX rides the compositor.
 *
 * Deliberately NOT gated on reduced motion: this is an indicator of where you
 * are in a document, not an ornament, and it moves only in answer to a scroll
 * the reader is already making.
 */
export function installScrollProgress(bar, { pane = '.app-scroll' } = {}) {
  if (!bar || typeof window === 'undefined') return () => {}
  const scroller = document.querySelector(pane)
  if (!scroller) return () => {}

  let frame = 0
  const paint = () => {
    frame = 0
    const travel = scroller.scrollHeight - scroller.clientHeight
    const p = travel > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / travel)) : 0
    bar.style.transform = `scaleX(${p.toFixed(4)})`
    // Hidden at the very top: a filament of zero length is still a bright dot
    // in the corner of every freshly opened page.
    bar.style.opacity = p > 0.002 ? '1' : '0'
  }
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint) }

  scroller.addEventListener('scroll', onScroll, { passive: true })
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(paint) : null
  ro?.observe(scroller)
  paint()

  return () => {
    scroller.removeEventListener('scroll', onScroll)
    ro?.disconnect()
    cancelAnimationFrame(frame)
  }
}

/**
 * A refusal shakes.
 *
 * The wrong password put a line of red text under the field and left the panel
 * sitting there, which is the quietest possible way to say no. This is the
 * gesture everyone already knows -- and it is the one place a sideways
 * movement belongs on this site, because the meaning IS the sideways movement.
 * Small and quick: 7px, three passes, done in under half a second.
 */
export function denyShake(el) {
  if (!el || prefersReducedMotion()) return
  try {
    animate(el, {
      translateX: [
        { to: -7, duration: 60 }, { to: 7, duration: 90 }, { to: -5, duration: 80 },
        { to: 4, duration: 70 }, { to: 0, duration: 90 },
      ],
      ease: 'inOutQuad',
      onComplete: () => { el.style.transform = '' },
    })
  } catch (err) {
    el.style.transform = ''
  }
}

/**
 * Every press sends a ring out from the point of contact.
 *
 * The lattice answers a touch in one place, on the home hero. This is the same
 * idea everywhere: press anything you can act on and a gilt ring opens from
 * exactly where your finger or the blade's tip landed. On a phone, where there
 * is no hover to tell you anything is alive, a press is the ONLY conversation
 * the page gets -- and it was silent.
 *
 * One fixed layer holds the rings, so nothing is ever inserted into the button
 * you just pressed: a child appearing inside a flex row shifts its layout, and
 * `overflow: hidden` on the button would clip the ring anyway. The layer is
 * pointer-events: none from end to end, so it can never eat the click it is
 * responding to.
 *
 * Singleton, like the other installers.
 */
export function installTapRipple({
  selector = 'a, button, [role="button"], .tilt-tile, .nav-item, .app-tab, summary',
} = {}) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  if (window.__k846Ripple) return window.__k846Ripple

  const layer = document.createElement('div')
  layer.className = 'k846-ripple-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  const onDown = (e) => {
    // Only the primary button: a right-click opens a menu, it does not strike.
    if (e.button != null && e.button !== 0) return
    const hit = e.target.closest?.(selector)
    if (!hit || hit.disabled) return

    const ring = document.createElement('span')
    ring.className = 'k846-ripple'
    ring.style.left = `${e.clientX}px`
    ring.style.top = `${e.clientY}px`
    layer.appendChild(ring)

    // A drummed button must not pile up rings faster than they can fade.
    while (layer.childElementCount > 6) layer.firstElementChild.remove()

    try {
      animate(ring, {
        scale: { from: 0.25, to: 1 },
        opacity: [{ to: 0.6, duration: 90 }, { to: 0, duration: 520 }],
        ease: 'outExpo',
        onComplete: () => ring.remove(),
      })
    } catch (err) {
      ring.remove()
    }
  }

  window.addEventListener('pointerdown', onDown, { passive: true })

  const stop = () => {
    window.removeEventListener('pointerdown', onDown)
    layer.remove()
    window.__k846Ripple = null
  }
  window.__k846Ripple = stop
  return stop
}

/**
 * The crest lands, and the room answers.
 *
 * The hero's arrival had letters and a motto, and nothing at its centre: the
 * crest simply existed. It is struck now -- dropped from above on the loose
 * spring -- and a single gilt ring opens out from where it lands and fades.
 * One ring, drawn as light, in place of the field of dots that used to react
 * here: it says the same thing (the room felt that) without turning the hall
 * into a grid.
 */
export function strikeCrest(host) {
  if (!host || typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const crest = host.querySelector('.hero-crest')
  if (!crest) return () => {}

  const ring = document.createElement('span')
  ring.className = 'k846-crest-ring'
  ring.setAttribute('aria-hidden', 'true')

  const place = () => {
    // Centred on the crest, inside the hero band, measured rather than assumed:
    // the crest is a different size at every breakpoint.
    const h = host.getBoundingClientRect()
    const c = crest.getBoundingClientRect()
    ring.style.left = `${c.left - h.left + c.width / 2}px`
    ring.style.top = `${c.top - h.top + c.height / 2}px`
  }

  host.appendChild(ring)
  place()

  let runs = []
  try {
    runs.push(animate(crest, {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.64, to: 1 },
      translateY: { from: -38, to: 0 },
      ease: motion.spring.accent(),
      onComplete: () => { crest.style.opacity = ''; crest.style.transform = '' },
    }))
    runs.push(animate(ring, {
      scale: [{ from: 0.18, to: 1.5 }],
      opacity: [{ to: 0.85, duration: 150 }, { to: 0, duration: 1000 }],
      delay: 140,
      ease: 'outExpo',
      onComplete: () => ring.remove(),
    }))
  } catch (err) {
    console.error('[motion] crest strike failed, showing it', err)
    crest.style.opacity = ''
    crest.style.transform = ''
    ring.remove()
  }

  return () => {
    for (const run of runs) { try { run.pause() } catch {} }
    crest.style.opacity = ''
    crest.style.transform = ''
    ring.remove()
  }
}

/**
 * Touch the hall and light blooms where your hand landed.
 *
 * This is what the lattice was reaching for and got wrong: the hero answering
 * a touch. A grid of dots rippling was the wrong instrument for a torch-lit
 * room -- so the answer is light. A warm pool opens at the point of contact,
 * swells past its own size and fades, in `screen` blend, which can only
 * lighten. It cannot dim the crest or the wordmark it passes under.
 *
 * The bloom is added to the hero itself rather than a fixed layer, so it is
 * clipped by the hero's own frame: light spilling over the panel edge and
 * across the page would read as a bug, not as a flare.
 */
export function installHeroBloom(host) {
  if (!host || typeof window === 'undefined' || prefersReducedMotion()) return () => {}

  const onDown = (e) => {
    const r = host.getBoundingClientRect()
    const bloom = document.createElement('span')
    bloom.className = 'k846-hero-bloom'
    bloom.setAttribute('aria-hidden', 'true')
    bloom.style.left = `${e.clientX - r.left}px`
    bloom.style.top = `${e.clientY - r.top}px`
    host.appendChild(bloom)

    // A drummed hero must not stack blooms faster than they fade.
    const blooms = host.querySelectorAll('.k846-hero-bloom')
    if (blooms.length > 4) blooms[0].remove()

    try {
      animate(bloom, {
        scale: { from: 0.28, to: 1 },
        opacity: [{ to: 0.85, duration: 130 }, { to: 0, duration: 760 }],
        ease: 'outExpo',
        onComplete: () => bloom.remove(),
      })
    } catch (err) {
      bloom.remove()
    }
  }

  host.addEventListener('pointerdown', onDown, { passive: true })

  return () => {
    host.removeEventListener('pointerdown', onDown)
    for (const b of host.querySelectorAll('.k846-hero-bloom')) b.remove()
  }
}

/**
 * The alliance banners turn to face you.
 *
 * They arrived on the same generic cascade as any list of panels -- which is
 * fine, and says nothing about what they are. Four alliance cards, each
 * carrying a banner, are the closest thing this site has to standards on a
 * field: so they swing in on their own hinge, tipped away and turning flat,
 * one after another.
 *
 * The perspective goes on the GRID, not on each card. Per-card perspective
 * gives every one its own vanishing point, and four cards each turning toward
 * a different centre reads as four separate accidents rather than one rank
 * turning together.
 */
export function turnCards(container, selector = '.royal-grid-card') {
  if (!container || prefersReducedMotion()) return () => {}
  const cards = [...container.querySelectorAll(selector)]
  if (!cards.length) return () => {}

  const show = () => {
    container.style.perspective = ''
    for (const c of cards) { c.style.opacity = ''; c.style.transform = '' }
  }

  let anim = null
  try {
    container.style.perspective = '1600px'
    anim = animate(cards, {
      opacity: { from: 0, to: 1 },
      rotateY: { from: -38, to: 0 },
      translateY: { from: 22, to: 0 },
      scale: { from: 0.94, to: 1 },
      delay: stagger(90),
      ease: motion.spring.section(),
      onComplete: show,
    })
  } catch (err) {
    console.error('[motion] card turn failed, showing them', err)
    show()
  }

  return () => {
    try { anim?.pause() } catch {}
    show()
  }
}
