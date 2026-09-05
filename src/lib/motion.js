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
 * Two things decide whether a heading gets this, and both are guards rather
 * than preferences:
 *
 * - It waits for the page itself. Every page here is lazy, so on a first visit
 *   the heading does not exist yet when the route changes. This used to run a
 *   frame after mount and quietly find nothing, which is why the decode only
 *   ever showed on the handful of pages whose chunk was already cached.
 *
 * - The heading must be PURE TEXT. scrambleText writes textContent, so a title
 *   containing an icon or per-letter spans would have those children flattened
 *   into a string and destroyed. That is also what keeps this off the home
 *   hero, whose wordmark is split into spans and has its own entrance.
 */
export function scrambleHeading(root) {
  if (!root || prefersReducedMotion()) return () => {}

  let anim = null
  let el = null
  let original = ''

  const stopWait = whenPageReady(root, () => {
    // Any h1 the page put at its head -- PageHeader's gilt title, Battle Lab's
    // own, the console's. Not a specific class: the pages do not agree on one,
    // and the ones that were left out were the ones that carried a plain h1.
    for (const h of root.querySelectorAll('h1')) {
      if (h.children.length > 0) continue                 // not pure text
      const text = (h.textContent || '').trim()
      if (!text || text.length > 60) continue
      el = h
      original = h.textContent
      break
    }
    if (!el) return

    try {
      anim = animate(el, {
        // 'A-Z0-9' keeps the noise in the kingdom's own alphabet: a title made
        // of lowercase and punctuation reads as a glitch rather than a cipher.
        textContent: animeText.scrambleText({ chars: 'A-Z0-9' }),
        duration: 900,
        ease: 'outQuad',
        onComplete: () => { el.textContent = original },
      })
    } catch (err) {
      console.error('[motion] heading scramble failed', err)
      el.textContent = original
    }
  })

  return () => {
    stopWait()
    try { anim?.pause() } catch {}
    // Whatever frame it was on, the reader gets the real title back.
    if (el) el.textContent = original
  }
}

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
 * The ember lattice: a grid of embers with a wave running through it.
 *
 * This is anime.js's signature -- `stagger` with a `grid`, which orders the
 * delay by distance through a matrix rather than along a list, so a single call
 * sends a ripple across two dimensions. The hall already has embers drifting up
 * it in CSS; this is the same fire, arranged, and it answers you: the wave
 * starts from wherever you touched.
 *
 * The dots are 3px and animate transform and opacity only, so a wave across the
 * whole field is one composited pass. The grid is smaller on a phone -- 84
 * cells rather than 176 -- because the hero is a third of the width there and a
 * denser field would only read as noise.
 */
export function installEmberLattice(host, opts = {}) {
  if (!host || typeof window === 'undefined' || prefersReducedMotion()) return () => {}

  const narrow = window.matchMedia('(max-width: 640px)').matches
  const cols = opts.cols || (narrow ? 14 : 22)
  const rows = opts.rows || (narrow ? 6 : 8)

  host.style.setProperty('--lattice-cols', cols)
  host.style.setProperty('--lattice-rows', rows)

  /* Scattered inside the grid, not sitting on it. The stagger's grid maths is
     by INDEX, so nudging each ember off its cell centre costs the wave nothing
     and is the whole difference between embers in a hall and a tech lattice.
     The offset is a margin rather than a transform: anime.js owns transform
     here, and a second writer would simply overwrite the first. */
  const cellW = host.clientWidth / cols
  const cellH = host.clientHeight / rows
  const jitter = (extent) => (Math.random() - 0.5) * extent * 0.7

  const cells = []
  const frag = document.createDocumentFragment()
  for (let i = 0; i < cols * rows; i++) {
    const dot = document.createElement('span')
    dot.className = 'lattice-dot'
    const size = 2 + Math.random() * 2.4
    dot.style.width = dot.style.height = `${size.toFixed(1)}px`
    dot.style.marginLeft = `${jitter(cellW).toFixed(1)}px`
    dot.style.marginTop = `${jitter(cellH).toFixed(1)}px`
    frag.appendChild(dot)
    cells.push(dot)
  }
  host.replaceChildren(frag)

  let running = null
  const wave = (from) => {
    try { running?.pause() } catch {}
    running = animate(cells, {
      // Two keyframes: the ember catches, then falls back to its resting glow.
      opacity: [{ to: 0.9, duration: 190 }, { to: 0.1, duration: 700 }],
      scale: [{ to: 2.6, duration: 210 }, { to: 1, duration: 720, ease: motion.spring.accent() }],
      // The grid is the whole point -- delay by distance through the matrix.
      delay: stagger(34, { grid: [cols, rows], from }),
    })
  }

  // Which cell is under a point, so the wave starts where the hand landed.
  const cellAt = (x, y) => {
    const r = host.getBoundingClientRect()
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * cols)))
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(((y - r.top) / r.height) * rows)))
    return cy * cols + cx
  }

  const hero = host.parentElement || host
  const onPoint = (e) => wave(cellAt(e.clientX, e.clientY))
  hero.addEventListener('pointerdown', onPoint, { passive: true })

  // First wave comes out of the middle, under the crest, on arrival.
  const hello = setTimeout(() => wave('center'), 420)

  return () => {
    clearTimeout(hello)
    hero.removeEventListener('pointerdown', onPoint)
    try { running?.pause() } catch {}
    host.replaceChildren()
  }
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
  const lattice = pick('.ember-lattice')
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
    if (lattice) tl.add(lattice, { translateY: -46, opacity: 0.25 }, 0)
  } catch (err) {
    console.error('[motion] hero scrub failed', err)
    return () => {}
  }

  return () => {
    try { tl?.revert?.() } catch {}
    for (const el of [crest, word, motto, lattice]) {
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
export function installNavMark(selector = 'nav') {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const nav = document.querySelector(selector)
  if (!nav) return () => {}

  const mark = document.createElement('span')
  mark.className = 'nav-mark'
  mark.setAttribute('aria-hidden', 'true')
  nav.appendChild(mark)
  document.documentElement.classList.add('k846-js-nav')

  let landed = false
  const place = () => {
    const active = nav.querySelector('.nav-item.active')
    if (!active) { mark.style.opacity = '0'; return }

    // offsetTop is measured against nav itself, which is already positioned.
    const height = Math.round(active.offsetHeight * 0.62)
    const top = Math.round(active.offsetTop + (active.offsetHeight - height) / 2)
    mark.style.height = `${height}px`

    if (!landed) {
      landed = true
      mark.style.transform = `translateY(${top}px)`
      animate(mark, {
        opacity: { from: 0, to: 1 },
        scaleY: { from: 0, to: 1 },
        ease: motion.spring.accent(),
      })
      return
    }
    animate(mark, {
      translateY: top,
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
