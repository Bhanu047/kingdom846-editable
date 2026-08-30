// Scroll choreography.
//
// The site already had a `.reveal` class, but it was written against
// `animation-timeline: view()` behind an @supports guard. Where that is not
// supported the rule never applies at all, and where it IS supported it only
// fades opacity -- so in practice pages painted fully formed and nothing
// performed as you scrolled. This replaces it with an IntersectionObserver,
// which works everywhere and can drive a real entrance.
//
// Targets are found by selector rather than by hand-tagging every element,
// because the point is that EVERY page gains this, not the three someone
// remembered to annotate.
const TARGETS = [
  'section',
  '.panel',
  '.chart-card',
  '.tool-tile',
  '[data-reveal]',
].join(',')

// Anything inside these is excluded. Report clones are rasterised off-screen,
// so an observer would never fire for them and every cloned block would export
// stuck at its hidden start state. The welcome overlay is excluded for a
// different reason: it is a fixed, full-viewport <section> that is already the
// first thing anyone sees. There is no scroll to reveal it on, and hiding it
// to wait for one is how it ends up not appearing at all.
const EXCLUDE = '.kv-live, .k846-v2, .k846-cmd, .royal-welcome-shell'

export function installReveal() {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846Reveal) return window.__k846Reveal

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const observer = reduced ? null : new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.dataset.k846Rev = 'in'
        // One-shot. Re-animating on every scroll past is the thing that makes
        // scroll-driven sites tiring to read.
        observer.unobserve(e.target)
      }
    },
    // threshold 0, not a fraction. An element taller than the viewport can
    // never reach a ratio of 0.06 -- its maximum possible ratio is
    // viewportHeight/elementHeight -- so any long section simply never
    // revealed and sat invisible on the page. The Events page had exactly
    // that. With threshold 0 the entry fires as soon as any part crosses, and
    // the negative bottom margin still holds it back until the element's top
    // reaches 88% of the viewport, so the motion finishes as the reader
    // arrives rather than starting then.
    { rootMargin: '0px 0px -12% 0px', threshold: 0 },
  )

  // The state lives in a data attribute, NOT a class.
  //
  // These targets are React-rendered: `<section className={...}>` and friends
  // set className from props, so React owns that attribute and rewrites it on
  // every re-render -- silently deleting whatever was added here. The failure
  // is one-directional and invisible: an element that had been revealed loses
  // `is-in`, falls back to the hidden start state, and simply never comes back,
  // because scan() has already marked it seen and the observer has already
  // unobserved it. That is how the whole welcome screen could end up rendered
  // at opacity 0. React does not manage data attributes it did not set, so
  // `data-k846-rev` survives the re-render that a class does not.
  const scan = () => {
    for (const el of document.querySelectorAll(TARGETS)) {
      if (el.dataset.k846Rev) continue
      if (el.closest(EXCLUDE)) continue
      if (reduced) { el.dataset.k846Rev = 'in'; continue }
      // Elements already in view on first paint still animate -- that is the
      // page's entrance -- but everything below the fold waits for the scroll.
      el.dataset.k846Rev = 'wait'
      observer.observe(el)
    }
  }

  // Safety net.
  //
  // The observer is the mechanism; it is not a guarantee. A target can be
  // tagged and observed at a moment when no entry is ever delivered for it --
  // lazily-mounted routes and Suspense boundaries make this easy to hit, and
  // it reproduces intermittently: the same page leaves the Battle Lab hero
  // invisible on one load and reveals it on the next. Because scan() marks an
  // element seen and the observer only ever fires once, a miss is permanent.
  //
  // So anything still in the hidden start state while it is ON SCREEN gets
  // revealed outright. A missed animation is a far better failure than content
  // nobody can read.
  const sweep = () => {
    for (const el of document.querySelectorAll('[data-k846-rev="wait"]')) {
      const r = el.getBoundingClientRect()
      if (r.bottom > 0 && r.top < (window.innerHeight || 0)) {
        el.dataset.k846Rev = 'in'
        observer?.unobserve(el)
      }
    }
  }

  // Capture phase, on the document: the app scrolls an inner pane rather than
  // the page, and scroll events from that pane do not bubble.
  let sweepPending = 0
  const onScroll = () => {
    if (sweepPending) return
    sweepPending = requestAnimationFrame(() => { sweepPending = 0; sweep() })
  }
  document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  const sweepTimer = setInterval(sweep, 800)

  scan()

  // The app is a client-rendered SPA: routes swap whole subtrees in, and the
  // Battle Lab injects result sections after a calculation. A MutationObserver
  // keeps those covered without every page having to call anything.
  const mo = new MutationObserver(() => {
    if (mo._t) return
    mo._t = requestAnimationFrame(() => { mo._t = 0; scan() })
  })
  mo.observe(document.body, { childList: true, subtree: true })

  const teardown = () => {
    observer?.disconnect()
    mo.disconnect()
    clearInterval(sweepTimer)
    document.removeEventListener('scroll', onScroll, { capture: true })
    if (sweepPending) cancelAnimationFrame(sweepPending)
    delete window.__k846Reveal
  }
  window.__k846Reveal = teardown
  return teardown
}
