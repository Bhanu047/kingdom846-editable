(() => {
  const FORMATION = /hunt\s*formation/i
  const IMPACT = /hunt\s*impact/i

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function hideFieldByLabel(root, labelPattern, shouldHide) {
    if (!root) return
    const labels = [...root.querySelectorAll('label')]
    labels.forEach((label) => {
      const labelText = text(label)
      if (!labelPattern.test(labelText)) return
      label.style.display = shouldHide ? 'none' : ''
    })
  }

  function currentBearTab() {
    const buttons = [...document.querySelectorAll('button')]
      .filter((button) => FORMATION.test(text(button)) || IMPACT.test(text(button)))
    const active = buttons.find((button) => /bg-gold\/15|text-gold-bright/.test(button.className || ''))
    if (active && IMPACT.test(text(active))) return 'impact'
    if (active && FORMATION.test(text(active))) return 'formation'

    const impactVisible = [...document.querySelectorAll('section')].some((section) => {
      const t = text(section)
      return IMPACT.test(t) && /Impact Comparison|Damage Probability|Expected Damage/i.test(t)
    })
    return impactVisible ? 'impact' : 'formation'
  }

  function updateBearInputs() {
    if (!/battle-lab/i.test(location.hash || '')) return

    const sections = [...document.querySelectorAll('section')]
    const combatSection = sections.find((section) => /Rally Bonus Input/i.test(text(section)) && /Combat Stats/i.test(text(section)))
    if (!combatSection) return

    const isFormation = currentBearTab() === 'formation'
    hideFieldByLabel(combatSection, /^March capacity\b/i, isFormation)
    hideFieldByLabel(combatSection, /^Participants\b/i, isFormation)
    hideFieldByLabel(combatSection, /^Troop tier\b/i, isFormation)
    hideFieldByLabel(combatSection, /^True Gold\b/i, isFormation)

    // Hide empty grid wrappers left behind by hidden Hunt Impact-only controls.
    [...combatSection.querySelectorAll('div')].forEach((node) => {
      const directLabels = [...node.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const allHidden = directLabels.every((label) => label.style.display === 'none')
      if (allHidden && directLabels.length >= 1) node.style.display = 'none'
      else if (node.style.display === 'none') node.style.display = ''
    })
  }

  function updateImporter() {
    const modal = document.getElementById('k846-battle-import-modal')
    if (!modal) return

    const capacity = modal.querySelector('.k846-import-capacity')
    if (capacity) capacity.style.display = 'none'

    const sectionTitle = modal.querySelector('.k846-import-section-title')
    if (sectionTitle) {
      const main = sectionTitle.querySelector('span')
      if (main) main.textContent = 'Detected Combat Values'
      const review = sectionTitle.querySelector('em')
      if (review) review.textContent = 'Review before applying'
    }
  }

  function refresh() {
    updateBearInputs()
    updateImporter()
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (button && (FORMATION.test(text(button)) || IMPACT.test(text(button)))) {
      requestAnimationFrame(() => requestAnimationFrame(refresh))
    }
  }, true)

  const observer = new MutationObserver(refresh)
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] })
  window.addEventListener('hashchange', refresh)
  setTimeout(refresh, 0)
})()
