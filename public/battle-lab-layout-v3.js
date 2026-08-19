(() => {
  const STYLE_ID = 'k846-battle-lab-layout-v3-style'

  function isBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function sectionByText(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text)) || null
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      @media (max-width: 760px) {
        [data-k846-module-tabs] { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 8px !important; }
        [data-k846-module-tabs] > button { min-width: 0 !important; width: 100% !important; padding: 11px !important; }
        [data-k846-module-tabs] > button > div:last-child { white-space: normal !important; line-height: 1.2 !important; }
        [data-bear-troop-grid] { grid-template-columns: 1fr !important; }
        [data-bear-troop-grid] > * { min-width: 0 !important; width: 100% !important; }
      }
    `
    document.head.appendChild(style)
  }

  function hidePlayerProfile() {
    const profile = sectionByText('Player Profile')
    if (profile) profile.style.display = 'none'
  }

  function configureTabs() {
    const labels = ['Bear Optimizer', 'Mystic Trials', 'Battle Simulator', 'Hero Synergy', 'Formation Optimizer']
    const buttons = labels.map((label) => [...document.querySelectorAll('button')].find((button) => (button.textContent || '').includes(label))).filter(Boolean)
    if (!buttons.length) return

    const section = buttons[0].closest('section')
    if (!section) return
    section.dataset.k846ModuleTabs = 'true'
    section.style.gridTemplateColumns = 'repeat(4,minmax(0,1fr))'

    const heroButton = buttons.find((button) => (button.textContent || '').includes('Hero Synergy'))
    if (heroButton) heroButton.style.display = 'none'

    const formation = buttons.find((button) => (button.textContent || '').includes('Formation Optimizer'))
    if (formation) {
      const labelNode = [...formation.querySelectorAll('div')].find((node) => (node.textContent || '').trim() === 'Formation Optimizer')
      if (labelNode) labelNode.textContent = 'Formation'
    }
    const battle = buttons.find((button) => (button.textContent || '').includes('Battle Simulator'))
    if (battle) {
      const labelNode = [...battle.querySelectorAll('div')].find((node) => (node.textContent || '').trim() === 'Battle Simulator')
      if (labelNode) labelNode.textContent = 'Battle'
    }
  }

  function render() {
    if (!isBattleLab()) return
    installStyles()
    hidePlayerProfile()
    configureTabs()
  }

  const observer = new MutationObserver(() => requestAnimationFrame(render))
  observer.observe(document.documentElement, { subtree: true, childList: true })
  window.addEventListener('hashchange', () => setTimeout(render, 150))
  setTimeout(render, 450)
})()
