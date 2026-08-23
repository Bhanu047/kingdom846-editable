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
// stuck at its hidden start state.
const EXCLUDE = '.kv-live, .k846-v2, .k846-cmd'

export function installReveal() {
  if (typeof window === 'undefined') return () => {}
  if (window.__k846Reveal) return window.__k846Reveal

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const observer = reduced ? null : new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
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

  const scan = () => {
    for (const el of document.querySelectorAll(TARGETS)) {
      if (el.dataset.k846Rev) continue
      if (el.closest(EXCLUDE)) continue
      el.dataset.k846Rev = '1'
      if (reduced) { el.classList.add('is-in'); continue }
      // Elements already in view on first paint still animate -- that is the
      // page's entrance -- but everything below the fold waits for the scroll.
      el.classList.add('will-reveal')
      observer.observe(el)
    }
  }

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
    delete window.__k846Reveal
  }
  window.__k846Reveal = teardown
  return teardown
}
