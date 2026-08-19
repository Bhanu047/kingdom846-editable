(() => {
  const PANEL_ID = 'k846-bear-v2'
  const CONFIG_KEY = 'kingdom846.battleLab.bearConfig.v2'

  const HERO_GROUPS = [
    ['Gen 7', ['Charles', 'Ava', 'Wee & Woo']],
    ['Gen 6', ['Triton', 'Sophia', 'Yang']],
    ['Gen 5', ['Long Fei', 'Thrud', 'Vivian']],
    ['Gen 4', ['Alcar', 'Margot', 'Rosa']],
    ['Gen 3', ['Eric', 'Petra', 'Jaeger']],
    ['Gen 2', ['Zoe', 'Hilde', 'Marlin']],
    ['Gen 1 Legendary', ['Helga', 'Amadeus', 'Jabel', 'Saul']],
    ['Epic', ['Howard', 'Gordon', 'Quinn', 'Chenko', 'Diana', 'Amane', 'Yeonwoo', 'Fahd']],
    ['Rare', ['Forrest', 'Seth', 'Edwin', 'Olive']],
  ]

  const TROOPS = [
    { key: 'infantry', label: 'Infantry', short: 'INF' },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV' },
    { key: 'archers', label: 'Archers', short: 'ARC' },
  ]

  const DEFAULT_CONFIG = {
    tier: 'tg5-7',
    heroes: { infantry: '', cavalry: '', archers: '' },
  }

  function isBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function loadConfig() {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}'), heroes: { ...DEFAULT_CONFIG.heroes, ...(JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}')?.heroes || {}) } }
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG))
    }
  }

  function saveConfig(next) {
    sessionStorage.setItem(CONFIG_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('k846:bearConfigChanged', { detail: next }))
  }

  function sectionByText(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text)) || null
  }

  function activeBear() {
    const button = [...document.querySelectorAll('button')].find((node) => (node.textContent || '').includes('Bear Optimizer'))
    if (!button) return false
    const cls = button.className || ''
    return cls.includes('border-gold/45') || Boolean(sectionByText('Optimizer Settings'))
  }

  function hideLegacyProfileCapacity() {
    const profile = sectionByText('Player Profile')
    if (!profile) return
    const label = [...profile.querySelectorAll('label')].find((node) => /march capacity/i.test(node.textContent || ''))
    if (label) label.style.display = 'none'
  }

  function combatValue(troopName, statName) {
    const section = sectionByText('Combat Report Stats')
    if (!section) return '—'
    const cards = [...section.querySelectorAll('div')].filter((node) => {
      const text = node.textContent || ''
      return text.includes(troopName) && /Attack/i.test(text) && /Lethality/i.test(text) && node.querySelectorAll('input[type="number"]').length >= 4
    })
    cards.sort((a, b) => a.querySelectorAll('input[type="number"]').length - b.querySelectorAll('input[type="number"]').length)
    const card = cards[0]
    if (!card) return '—'
    const inputs = [...card.querySelectorAll('input[type="number"]')].slice(0, 4)
    const index = statName === 'attack' ? 0 : 1
    const value = Number(inputs[index]?.value)
    return Number.isFinite(value) ? `${value.toFixed(2)}%` : '—'
  }

  function heroOptions(selected) {
    const groups = HERO_GROUPS.map(([label, heroes]) => `
      <optgroup label="${label}">
        ${heroes.map((hero) => `<option value="${hero.replace(/"/g, '&quot;')}" ${hero === selected ? 'selected' : ''}>${hero}</option>`).join('')}
      </optgroup>`).join('')
    return `<option value="" ${selected ? '' : 'selected'}>Select lead hero</option>${groups}`
  }

  function troopCard(troop, config) {
    return `
      <div style="border:1px solid rgba(212,175,55,.14);border-radius:14px;background:rgba(255,255,255,.025);padding:13px;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div>
            <div style="font:800 9px Montserrat,system-ui,sans-serif;letter-spacing:.15em;color:rgba(212,175,55,.55)">${troop.short}</div>
            <div style="margin-top:2px;font:700 15px Cinzel,serif;color:#f1e7ce">${troop.label}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px">
          <div style="border-radius:9px;background:rgba(2,12,26,.48);padding:8px">
            <div style="font:700 8px Montserrat,system-ui,sans-serif;letter-spacing:.12em;color:rgba(241,231,206,.34)">ATTACK</div>
            <div data-bear-stat="${troop.key}.attack" style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${combatValue(troop.label, 'attack')}</div>
          </div>
          <div style="border-radius:9px;background:rgba(2,12,26,.48);padding:8px">
            <div style="font:700 8px Montserrat,system-ui,sans-serif;letter-spacing:.12em;color:rgba(241,231,206,.34)">LETHALITY</div>
            <div data-bear-stat="${troop.key}.lethality" style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${combatValue(troop.label, 'lethality')}</div>
          </div>
        </div>
        <label style="display:block;margin-top:11px">
          <span style="display:block;margin-bottom:5px;font:800 9px Montserrat,system-ui,sans-serif;letter-spacing:.12em;color:rgba(241,231,206,.42)">LEAD HERO</span>
          <select data-bear-hero="${troop.key}" style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.18);border-radius:10px;background:#06152b;padding:9px 10px;color:#f1e7ce;font:700 11px Montserrat,system-ui,sans-serif;outline:none">
            ${heroOptions(config.heroes[troop.key])}
          </select>
        </label>
      </div>`
  }

  function replaceLegacySettings() {
    const settings = sectionByText('Optimizer Settings')
    if (!settings) return

    const heading = [...settings.querySelectorAll('h2')].find((node) => /Optimizer Settings/i.test(node.textContent || ''))
    if (heading) heading.textContent = 'Bear Setup'

    const eyebrow = [...settings.querySelectorAll('div')].find((node) => (node.textContent || '').trim() === 'Bear Hunt')
    if (eyebrow) eyebrow.textContent = 'Bear Hunt · Ratio Optimizer'

    const badge = [...settings.querySelectorAll('span')].find((node) => /Community model/i.test(node.textContent || ''))
    if (badge) badge.textContent = 'Battle Lab Model'

    ;[...settings.querySelectorAll('p')].forEach((node) => {
      if (/square-root Bear model|Set a floor/i.test(node.textContent || '')) node.style.display = 'none'
    })

    const minimumLabels = [...settings.querySelectorAll('label')].filter((label) => /(?:INF|CAV|ARC) minimum/i.test(label.textContent || ''))
    const minimumContainer = minimumLabels[0]?.parentElement
    if (minimumContainer) minimumContainer.style.display = 'none'

    ;[...settings.querySelectorAll('div')].forEach((node) => {
      if (/Use stats from the same hero\/gear setup/i.test(node.textContent || '')) node.style.display = 'none'
    })

    document.getElementById('k846-bear-session-controls')?.remove()

    let panel = document.getElementById(PANEL_ID)
    if (!panel) {
      const config = loadConfig()
      panel = document.createElement('div')
      panel.id = PANEL_ID
      panel.style.cssText = 'margin-top:16px'
      panel.innerHTML = `
        <div style="border:1px solid rgba(212,175,55,.18);border-radius:14px;background:linear-gradient(145deg,rgba(212,175,55,.035),rgba(255,255,255,.018));padding:14px">
          <label style="display:block">
            <span style="display:block;margin-bottom:6px;font:800 9px Montserrat,system-ui,sans-serif;letter-spacing:.14em;color:rgba(241,231,206,.46)">TROOP TIER / TRUEGOLD STAGE</span>
            <select data-bear-tier style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.2);border-radius:11px;background:#06152b;padding:10px 11px;color:#f1e7ce;font:700 12px Montserrat,system-ui,sans-serif;outline:none">
              <option value="t1-6" ${config.tier === 't1-6' ? 'selected' : ''}>T1 – T6</option>
              <option value="t7-tg2" ${config.tier === 't7-tg2' ? 'selected' : ''}>T7 – TG2</option>
              <option value="tg3-4" ${config.tier === 'tg3-4' ? 'selected' : ''}>TG3 – TG4</option>
              <option value="tg5-7" ${config.tier === 'tg5-7' ? 'selected' : ''}>TG5 – TG7</option>
              <option value="tg8" ${config.tier === 'tg8' ? 'selected' : ''}>TG8</option>
              <option value="t11" ${config.tier === 't11' ? 'selected' : ''}>T11 · War Academy</option>
            </select>
          </label>
          <div style="margin-top:7px;font:500 9px/1.5 Montserrat,system-ui,sans-serif;color:rgba(241,231,206,.34)">Choose the troop progression used in the Bear setup. No march-capacity input is required for the ratio output.</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:11px" data-bear-troop-grid>
          ${TROOPS.map((troop) => troopCard(troop, config)).join('')}
        </div>

        <div style="margin-top:11px;border:1px solid rgba(96,165,250,.12);border-radius:11px;background:rgba(59,130,246,.035);padding:10px 11px;font:500 9px/1.55 Montserrat,system-ui,sans-serif;color:rgba(191,219,254,.55)">
          Attack and Lethality come from the imported Combat Report Stats. Hero and troop-tier selections are stored for this Bear session. Only validated Bear modifiers will be allowed to alter the recommendation.
        </div>`

      const firstHidden = [...settings.children].find((node) => node.style?.display === 'none')
      if (firstHidden) settings.insertBefore(panel, firstHidden)
      else settings.appendChild(panel)

      panel.querySelector('[data-bear-tier]')?.addEventListener('change', (event) => {
        const next = loadConfig()
        next.tier = event.target.value
        saveConfig(next)
      })
      panel.querySelectorAll('[data-bear-hero]').forEach((select) => select.addEventListener('change', (event) => {
        const next = loadConfig()
        next.heroes[event.target.dataset.bearHero] = event.target.value
        saveConfig(next)
      }))
    }
  }

  function cleanResultSection() {
    const result = [...document.querySelectorAll('section')].find((section) => {
      const text = section.textContent || ''
      return text.includes('Optimal Split') && (text.includes('Recommended March') || text.includes('Recommended Bear Ratio'))
    })
    if (!result) return

    const eyebrow = [...result.querySelectorAll('div')].find((node) => /Recommended March|Recommended Bear Ratio/.test((node.textContent || '').trim()))
    if (eyebrow && (eyebrow.textContent || '').trim() === 'Recommended March') eyebrow.textContent = 'Recommended Bear Ratio'

    ;[...result.querySelectorAll('div')].forEach((node) => {
      const text = (node.textContent || '').trim()
      if (/^\d{1,3}(?:,\d{3})+$/.test(text) && node.querySelectorAll('*').length === 0) node.style.display = 'none'
    })

    TROOPS.forEach((troop) => {
      const candidates = [...result.querySelectorAll('div')].filter((node) => {
        const text = node.textContent || ''
        return text.includes(troop.label) && /\d+(?:\.\d+)?%/.test(text)
      }).sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
      const card = candidates[0]
      if (!card) return
      ;[...card.querySelectorAll('div')].forEach((node) => {
        const text = (node.textContent || '').trim()
        if (/^\d{1,3}(?:,\d{3})+$/.test(text)) node.style.display = 'none'
      })
    })
  }

  function updateVisibleStats() {
    const panel = document.getElementById(PANEL_ID)
    if (!panel) return
    for (const troop of TROOPS) {
      const atk = panel.querySelector(`[data-bear-stat="${troop.key}.attack"]`)
      const leth = panel.querySelector(`[data-bear-stat="${troop.key}.lethality"]`)
      if (atk) atk.textContent = combatValue(troop.label, 'attack')
      if (leth) leth.textContent = combatValue(troop.label, 'lethality')
    }
  }

  function render() {
    if (!isBattleLab()) return
    hideLegacyProfileCapacity()
    if (!activeBear()) return
    replaceLegacySettings()
    cleanResultSection()
    updateVisibleStats()
  }

  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      render()
    })
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })

  document.addEventListener('click', () => setTimeout(render, 70), true)
  document.addEventListener('input', () => setTimeout(updateVisibleStats, 30), true)
  window.addEventListener('hashchange', () => setTimeout(render, 180))
  setTimeout(render, 550)
})()
