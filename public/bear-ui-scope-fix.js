(() => {
  const MODAL_ID = 'k846-battle-import-modal'
  const DEFAULT_RALLY_VALUES = ['580.4', '611.5', '567.9', '553.5', '977.5', '1196.6']
  let defaultsChecked = false

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
    // React renders Optimal Troop Split only for Hunt Formation, so this is
    // more reliable than trying to infer the active tab from Tailwind classes.
    const formationHeading = [...document.querySelectorAll('h2,h3')]
      .find((node) => /^Optimal Troop Split$/i.test(text(node)))
    if (formationHeading) return 'formation'

    const impactHeading = [...document.querySelectorAll('h2,h3')]
      .find((node) => /Impact Comparison|Damage Probability Forecast/i.test(text(node)))
    if (impactHeading) return 'impact'

    const buttons = [...document.querySelectorAll('button')]
    const formation = buttons.find((b) => /^Hunt Formation$/i.test(text(b)))
    const impact = buttons.find((b) => /^Hunt Impact$/i.test(text(b)))
    if (formation?.getAttribute('aria-pressed') === 'true') return 'formation'
    if (impact?.getAttribute('aria-pressed') === 'true') return 'impact'
    return 'formation'
  }

  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!setter) return
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function clearBuiltInFormationDefaults(section, isFormation) {
    if (defaultsChecked || !isFormation || !section) return

    const numberInputs = [...section.querySelectorAll('input[type="number"]')]
    const rallyInputs = numberInputs.slice(0, 6)
    if (rallyInputs.length !== 6) return

    const values = rallyInputs.map((input) => String(input.value || '').trim())
    const stillBuiltInDefaults = values.every((value, index) => value === DEFAULT_RALLY_VALUES[index])
    defaultsChecked = true

    // Do not present demo/calibration values as if the user supplied them.
    if (stillBuiltInDefaults) rallyInputs.forEach((input) => setReactInput(input, '0'))
  }

  function scopeBearControls() {
    const section = findCombatStatsSection()
    if (!section) return
    const isFormation = activeBearTab() === 'formation'

    // Hunt Formation needs only Attack, Lethality and Troop Tier.
    // Rally Capacity, Participants and True Gold are Hunt Impact-only.
    const impactOnlyLabels = [/^(March|Rally) capacity$/i, /^Participants$/i, /^True Gold$/i]
    const labels = [...section.querySelectorAll('label')]

    labels.forEach((label) => {
      const span = label.querySelector('span')
      const labelText = text(span || label).replace(/%$/, '').trim()
      if (/^March capacity$/i.test(labelText) && span) span.textContent = 'Rally Capacity'
      const currentText = text(span || label).replace(/%$/, '').trim()
      const isImpactOnly = impactOnlyLabels.some((pattern) => pattern.test(currentText))

      if (isImpactOnly && isFormation) label.style.setProperty('display', 'none', 'important')
      else label.style.removeProperty('display')
    })

    // Collapse rows that contain only hidden Impact controls, while retaining
    // the Troop Tier + hidden True Gold row on Formation.
    [...section.querySelectorAll('div')].forEach((grid) => {
      const directLabels = [...grid.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const visible = directLabels.some((label) => getComputedStyle(label).display !== 'none')
      if (!visible && isFormation) grid.style.setProperty('display', 'none', 'important')
      else grid.style.removeProperty('display')
    })

    clearBuiltInFormationDefaults(section, isFormation)

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
