(() => {
  const FORMATION_ID = 'k846-formation-analytics'
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

  function sectionExists(title) {
    const wanted = title.toLowerCase()
    return [...document.querySelectorAll('h1,h2,h3,h4')].some(h => clean(h.textContent) === wanted)
  }

  function cleanupFormationAnalytics() {
    const formationActive = sectionExists('Rally Bonus Report') && sectionExists('Optimal Troop Split')
    if (!formationActive) document.getElementById(FORMATION_ID)?.remove()
  }

  let queued = false
  const sync = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      cleanupFormationAnalytics()
    })
  }

  const root = document.getElementById('root') || document.body
  new MutationObserver(sync).observe(root, { childList: true, subtree: true })

  document.addEventListener('click', e => {
    const button = e.target.closest?.('button')
    if (!button) return
    if (/hunt\s+impact/i.test(button.textContent || '')) {
      document.getElementById(FORMATION_ID)?.remove()
      setTimeout(cleanupFormationAnalytics, 0)
      setTimeout(cleanupFormationAnalytics, 100)
    }
  }, true)

  document.addEventListener('DOMContentLoaded', sync)
  setTimeout(cleanupFormationAnalytics, 300)
})()
