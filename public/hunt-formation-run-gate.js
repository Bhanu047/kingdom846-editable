(() => {
  const BUTTON_ID = 'k846-calculate-hunt-formation'
  let calculated = false

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function activeTab() {
    const buttons = [...document.querySelectorAll('button')]
    const formation = buttons.find((b) => /^Hunt Formation$/i.test(text(b)))
    const impact = buttons.find((b) => /^Hunt Impact$/i.test(text(b)))
    if (!formation || !impact) return null
    const impactActive = String(impact.className || '').includes('bg-gold/15') || String(impact.className || '').includes('text-gold-bright')
    const formationActive = String(formation.className || '').includes('bg-gold/15') || String(formation.className || '').includes('text-gold-bright')
    if (impactActive && !formationActive) return 'impact'
    return 'formation'
  }

  function combatSection() {
    const heading = [...document.querySelectorAll('h1,h2,h3')].find((n) => /^Combat Stats$/i.test(text(n)))
    return heading?.closest('section') || null
  }

  function resultSection() {
    const heading = [...document.querySelectorAll('h1,h2,h3')].find((n) => /^Optimal Troop Split$/i.test(text(n)))
    return heading?.closest('section') || null
  }

  function simplifyResult(section) {
    if (!section) return

    // Capacity is irrelevant to the recommended percentage split, so do not show the
    // default 750,000 value or derived absolute troop counts in Hunt Formation.
    const heading = [...section.querySelectorAll('h1,h2,h3')].find((n) => /^Optimal Troop Split$/i.test(text(n)))
    const header = heading?.parentElement?.parentElement
    if (header) {
      [...header.children].forEach((child) => {
        if (child.contains(heading)) return
        if (/^[\d,]+$/.test(text(child))) child.style.setProperty('display', 'none', 'important')
      })
    }

    ;[...section.querySelectorAll('div')].forEach((node) => {
      if (/^\d{1,3}(?:,\d{3})+$/.test(text(node)) && !/%/.test(text(node))) {
        node.style.setProperty('display', 'none', 'important')
      }
    })
  }

  function setCalculated(next) {
    calculated = !!next
    sync()
  }

  function ensureButton() {
    const section = combatSection()
    const existing = document.getElementById(BUTTON_ID)
    if (!section || activeTab() !== 'formation') {
      existing?.remove()
      return
    }
    if (existing && section.contains(existing)) return
    existing?.remove()

    const button = document.createElement('button')
    button.id = BUTTON_ID
    button.type = 'button'
    button.className = 'btn-primary btn-royal mt-4 w-full justify-center'
    button.textContent = 'Calculate Hunt Formation'
    button.addEventListener('click', () => setCalculated(true))
    section.appendChild(button)
  }

  function sync() {
    const isFormation = activeTab() === 'formation'
    const output = resultSection()
    ensureButton()

    if (output) {
      simplifyResult(output)
      if (isFormation && !calculated) output.style.setProperty('display', 'none', 'important')
      else output.style.removeProperty('display')
    }

    const button = document.getElementById(BUTTON_ID)
    if (button) button.textContent = calculated ? 'Recalculate Hunt Formation' : 'Calculate Hunt Formation'
  }

  document.addEventListener('input', (event) => {
    const section = combatSection()
    if (!section || !section.contains(event.target) || activeTab() !== 'formation') return
    calculated = false
    requestAnimationFrame(sync)
  }, true)

  document.addEventListener('change', (event) => {
    const section = combatSection()
    if (!section || !section.contains(event.target) || activeTab() !== 'formation') return
    calculated = false
    requestAnimationFrame(sync)
  }, true)

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (!button) return
    if (/^Hunt Formation$/i.test(text(button))) {
      calculated = false
      requestAnimationFrame(() => requestAnimationFrame(sync))
    }
    if (/^Hunt Impact$/i.test(text(button))) requestAnimationFrame(() => requestAnimationFrame(sync))
  }, true)

  window.addEventListener('k846:report-applied', () => {
    calculated = false
    setTimeout(sync, 30)
  })

  const observer = new MutationObserver(() => requestAnimationFrame(sync))
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', () => { calculated = false; setTimeout(sync, 40) })
  setTimeout(sync, 0)
})()
