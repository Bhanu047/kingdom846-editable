(() => {
  const MODAL_ID = 'k846-battle-import-modal'

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function hideImportCapacity() {
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
        if (span) span.textContent = 'Detected Combat Values'
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
    const tab = activeBearTab()
    const isFormation = tab === 'formation'

    const extraLabels = [/^March capacity$/i, /^Participants$/i, /^Troop tier$/i, /^True Gold$/i]
    const labels = [...section.querySelectorAll('label')]

    labels.forEach((label) => {
      const labelText = text(label.querySelector('span') || label).replace(/%$/, '').trim()
      const isImpactOnly = extraLabels.some((pattern) => pattern.test(labelText))
      if (!isImpactOnly) return
      if (isFormation) label.style.setProperty('display', 'none', 'important')
      else label.style.removeProperty('display')
    })

    // Remove the empty rows left behind after hiding Hunt Impact-only fields.
    [...section.querySelectorAll('div')].forEach((grid) => {
      const directLabels = [...grid.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const impactOnly = directLabels.every((label) => {
        const labelText = text(label.querySelector('span') || label).replace(/%$/, '').trim()
        return extraLabels.some((pattern) => pattern.test(labelText))
      })
      if (!impactOnly) return
      if (isFormation) grid.style.setProperty('display', 'none', 'important')
      else grid.style.removeProperty('display')
    })

    const note = [...section.querySelectorAll('div')].find((node) => /Defense, Health and Squad stats are not inputs|Hunt Formation uses only|Hunt Impact uses your rally/i.test(text(node)))
    if (note) {
      note.textContent = isFormation
        ? 'Hunt Formation uses only Infantry, Cavalry and Archer Attack + Lethality detected from the uploaded report.'
        : 'Hunt Impact uses the uploaded combat stats plus march size, participants, troop tier and True Gold settings.'
    }
  }

  function run() {
    hideImportCapacity()
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
