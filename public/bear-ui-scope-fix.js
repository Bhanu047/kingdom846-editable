(() => {
  const MODAL_ID = 'k846-battle-import-modal'

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function hideImportCapacity() {
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return
    const capacity = modal.querySelector('.k846-import-capacity')
    if (capacity) capacity.style.display = 'none'

    const detected = modal.querySelector('.k846-import-detected')
    if (detected) {
      const title = detected.querySelector('.k846-import-section-title')
      if (title) {
        const em = title.querySelector('em')
        if (em) em.textContent = 'AUTO-DETECTED FROM REPORT'
      }
    }
  }

  function findCombatStatsSection() {
    return [...document.querySelectorAll('section')].find((section) => {
      const t = text(section)
      return /Rally Bonus Input/i.test(t) && /Combat Stats/i.test(t)
    }) || null
  }

  function fieldContainerByLabel(section, label) {
    if (!section) return null
    const candidates = [...section.querySelectorAll('label')]
    return candidates.find((labelNode) => new RegExp(`^${label}$`, 'i').test(text(labelNode.querySelector('span') || labelNode).replace(/%$/, '').trim())) || null
  }

  function activeBearTab() {
    const buttons = [...document.querySelectorAll('button')]
    const formation = buttons.find((b) => /Hunt Formation/i.test(text(b)))
    const impact = buttons.find((b) => /Hunt Impact/i.test(text(b)))
    if (!formation || !impact) return null

    const formationActive = /bg-gold|text-gold-bright/.test(formation.className || '')
    const impactActive = /bg-gold|text-gold-bright/.test(impact.className || '')
    if (formationActive && !impactActive) return 'formation'
    if (impactActive && !formationActive) return 'impact'

    // Fallback: whichever button appears visually selected via aria/pressed.
    if (formation.getAttribute('aria-pressed') === 'true') return 'formation'
    if (impact.getAttribute('aria-pressed') === 'true') return 'impact'
    return null
  }

  function scopeBearControls() {
    const section = findCombatStatsSection()
    if (!section) return
    const tab = activeBearTab()
    if (!tab) return

    const labels = [...section.querySelectorAll('label')]
    const extraLabels = ['March capacity', 'Participants', 'Troop tier', 'True Gold']
    labels.forEach((label) => {
      const labelText = text(label.querySelector('span') || label)
      if (!extraLabels.some((name) => new RegExp(`^${name}$`, 'i').test(labelText))) return
      label.style.display = tab === 'formation' ? 'none' : ''
    })

    // Hide now-empty two-column rows on Hunt Formation.
    [...section.querySelectorAll('div.grid')].forEach((grid) => {
      const directLabels = [...grid.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const allHidden = directLabels.every((label) => label.style.display === 'none')
      if (allHidden) grid.style.display = 'none'
      else if (tab === 'impact') grid.style.display = ''
    })

    const note = [...section.querySelectorAll('div')].find((node) => /Defense, Health and Squad stats are not inputs/i.test(text(node)))
    if (note) {
      note.textContent = tab === 'formation'
        ? 'Hunt Formation uses only Infantry, Cavalry and Archer Attack + Lethality from your uploaded Rally Bonus report.'
        : 'Hunt Impact uses your rally setup controls here together with the uploaded combat stats.'
    }
  }

  function run() {
    hideImportCapacity()
    scopeBearControls()
  }

  document.addEventListener('click', (event) => {
    if (event.target?.closest?.('button')) setTimeout(run, 30)
  }, true)

  const observer = new MutationObserver(() => run())
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] })
  run()
})()
