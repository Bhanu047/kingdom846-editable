(() => {
  const STYLE_ID = 'k846-battle-lab-layout-v3-style'
  const IMPORT_ID = 'k846-combat-import-button'
  const BATTLE_LAB_BG = 'data:image/webp;base64,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[... ELLIPSIZATION ...]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';

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
      [data-k846-battle-hero] { background-color:#071226 !important; }
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

  function styleBattleLabHero() {
    const heading = [...document.querySelectorAll('h1')].find((node) => (node.textContent || '').trim() === 'Battle Lab')
    const section = heading?.closest('section')
    if (!section) return

    section.dataset.k846BattleHero = 'true'
    section.style.backgroundImage = `linear-gradient(90deg, rgba(4,10,24,.96) 0%, rgba(4,10,24,.82) 42%, rgba(4,10,24,.48) 72%, rgba(4,10,24,.30) 100%), url("${BATTLE_LAB_BG}")`
    section.style.backgroundSize = 'cover'
    section.style.backgroundPosition = 'center center'
    section.style.backgroundRepeat = 'no-repeat'

    const shell = section.firstElementChild
    if (shell) {
      shell.style.minHeight = window.innerWidth <= 760 ? '250px' : '290px'
      shell.style.display = 'flex'
      shell.style.alignItems = 'flex-end'
      shell.style.width = '100%'
    }

    const generatedOverlay = section.querySelector('.pointer-events-none.absolute.inset-0')
    if (generatedOverlay) generatedOverlay.style.display = 'none'

    const tacticalLabel = [...section.querySelectorAll('.eyebrow')].find((node) => /Kingdom 846\s*·\s*Tactical Intelligence/i.test(node.textContent || ''))
    tacticalLabel?.remove()

    ;[...section.querySelectorAll('span')].forEach((badge) => {
      const text = (badge.textContent || '').trim()
      if (/^(Guest access|Clean-room engine)$/i.test(text)) badge.remove()
    })

    heading.style.textShadow = '0 3px 18px rgba(0,0,0,.92)'
    const description = heading.parentElement?.querySelector('p')
    if (description) {
      description.style.color = 'rgba(241,231,206,.78)'
      description.style.textShadow = '0 2px 12px rgba(0,0,0,.92)'
    }
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
    styleBattleLabHero()
    hidePlayerProfile()
    addImportButton()
    configureTabs()
    cleanupBearWhenInactive()
  }

  const observer = new MutationObserver(() => requestAnimationFrame(render))
  observer.observe(document.documentElement, { subtree: true, childList: true })
  document.addEventListener('click', () => setTimeout(render, 60), true)
  window.addEventListener('resize', () => setTimeout(render, 80))
  window.addEventListener('hashchange', () => setTimeout(render, 150))
  setTimeout(render, 450)
})()
