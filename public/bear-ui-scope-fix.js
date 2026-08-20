(() => {
  const MODAL_ID = 'k846-battle-import-modal'

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function simplifyImportModal() {
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return

    const capacity = modal.querySelector('.k846-import-capacity')
    if (capacity) capacity.style.setProperty('display', 'none', 'important')

    const detected = modal.querySelector('.k846-import-detected')
    if (detected) {
      const title = detected.querySelector('.k846-import-section-title')
      if (title) {
        const span = title.querySelector('span')
        const em = title.querySelector('em')
        if (span) span.textContent = 'Report Values'
        if (em) em.textContent = 'REVIEW BEFORE APPLYING'
      }
    }
  }

  function findCombatStatsSection() {
    return [...document.querySelectorAll('section')].find((section) => {
      const t = text(section)
      return /Rally Bonus Input/i.test(t) && /Combat Stats/i.test(t)
    }) || null
  }

  function activeBearTab() {
    const buttons = [...document.querySelectorAll('button')]
    const formation = buttons.find((b) => /^Hunt Formation$/i.test(text(b)))
    const impact = buttons.find((b) => /^Hunt Impact$/i.test(text(b)))
    if (!formation || !impact) return 'formation'

    const formationActive = String(formation.className || '').includes('bg-gold/15') || String(formation.className || '').includes('text-gold-bright')
    const impactActive = String(impact.className || '').includes('bg-gold/15') || String(impact.className || '').includes('text-gold-bright')
    if (impactActive && !formationActive) return 'impact'
    return 'formation'
  }

  function scopeBearControls() {
    const section = findCombatStatsSection()
    if (!section) return
    const isFormation = activeBearTab() === 'formation'

    // Hunt Formation stays intentionally simple: Attack, Lethality and Troop Tier only.
    // Rally Capacity, Participants and True Gold belong to Hunt Impact.
    const impactOnlyLabels = [/^(March|Rally) capacity$/i, /^Participants$/i, /^True Gold$/i]
    const labels = [...section.querySelectorAll('label')]

    labels.forEach((label) => {
      const span = label.querySelector('span')
      const labelText = text(span || label).replace(/%$/, '').trim()
      if (/^March capacity$/i.test(labelText) && span) span.textContent = 'Rally Capacity'
      const currentText = text(span || label).replace(/%$/, '').trim()
      const isImpactOnly = impactOnlyLabels.some((pattern) => pattern.test(currentText))
      if (!isImpactOnly) {
        label.style.removeProperty('display')
        return
      }
      if (isFormation) label.style.setProperty('display', 'none', 'important')
      else label.style.removeProperty('display')
    })

    [...section.querySelectorAll('div')].forEach((grid) => {
      const directLabels = [...grid.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const visible = directLabels.some((label) => label.style.display !== 'none')
      if (!visible && isFormation) grid.style.setProperty('display', 'none', 'important')
      else grid.style.removeProperty('display')
    })

    const note = [...section.querySelectorAll('div')].find((node) => /Defense, Health and Squad stats are not inputs|Hunt Formation uses only|Hunt Impact uses your rally/i.test(text(node)))
    if (note) {
      note.textContent = isFormation
        ? 'Enter Infantry, Cavalry and Archer Attack + Lethality, choose your Troop Tier, then calculate the formation.'
        : 'Hunt Impact uses the uploaded combat stats plus troop counts, heroes, widgets and troop tier.'
    }
  }

  function run() {
    simplifyImportModal()
    scopeBearControls()
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (button && (/Hunt Formation/i.test(text(button)) || /Hunt Impact/i.test(text(button)))) {
      requestAnimationFrame(() => requestAnimationFrame(run))
    }
  }, true)

  const observer = new MutationObserver(run)
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] })
  window.addEventListener('hashchange', run)
  setTimeout(run, 0)
})()
