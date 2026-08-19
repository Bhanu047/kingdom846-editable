(() => {
  const STYLE_ID = 'k846-battle-lab-layout-v3-style'
  const IMPORT_ID = 'k846-combat-import-button'

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

  function addImportButton() {
    const stats = sectionByText('Combat Report Stats')
    if (!stats || document.getElementById(IMPORT_ID)) return
    const title = [...stats.querySelectorAll('h2')].find((node) => /Combat Report Stats/i.test(node.textContent || ''))
    if (!title) return
    const button = document.createElement('button')
    button.id = IMPORT_ID
    button.type = 'button'
    button.textContent = 'Import'
    button.className = 'btn-primary btn-royal mt-3 w-full justify-center'
    button.style.marginTop = '12px'
    title.insertAdjacentElement('afterend', button)
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

  function cleanupBearWhenInactive() {
    const bear = [...document.querySelectorAll('button')].find((button) => (button.textContent || '').includes('Bear Optimizer'))
    const active = !!bear && (bear.className || '').includes('border-gold/45')
    if (!active) document.getElementById('k846-bear-result-v3')?.remove()
  }

  function render() {
    if (!isBattleLab()) return
    installStyles()
    hidePlayerProfile()
    addImportButton()
    configureTabs()
    cleanupBearWhenInactive()
  }

  const observer = new MutationObserver(() => requestAnimationFrame(render))
  observer.observe(document.documentElement, { subtree: true, childList: true })
  document.addEventListener('click', () => setTimeout(render, 60), true)
  window.addEventListener('hashchange', () => setTimeout(render, 150))
  setTimeout(render, 450)
})()
