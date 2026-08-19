(() => {
  const CONFIG_KEY = 'kingdom846.battleLab.bearConfig.v4'
  const SETUP_ID = 'k846-bear-setup-v4'
  const RESULT_ID = 'k846-bear-result-v4'

  const TROOPS = [
    { key: 'infantry', label: 'Infantry', short: 'INF', baseAttack: 472 },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV', baseAttack: 1416 },
    { key: 'archers', label: 'Archers', short: 'ARC', baseAttack: 1888 },
  ]

  // The report percentages already contain the rally leader's static hero/gear stats.
  // Hero options here therefore represent only additional Expedition skill effects that
  // can change one troop branch relative to the others. Army-wide common multipliers
  // cancel out of an optimal-ratio calculation and are intentionally not double-counted.
  const HEROES = {
    infantry: [
      { name: 'Other', ratioMultiplier: 1, note: 'No additional verified troop-specific Bear modifier.' },
      { name: 'Helga', ratioMultiplier: 1, note: 'Static hero stats remain in the imported report.' },
      { name: 'Amadeus', ratioMultiplier: 1, note: 'Army-wide offensive effects do not change the troop ratio.' },
      { name: 'Zoe', ratioMultiplier: 1, note: 'Static hero stats remain in the imported report.' },
      { name: 'Eric', ratioMultiplier: 1, note: 'Static hero stats remain in the imported report.' },
      { name: 'Alcar', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Long Fei', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Triton', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Charles', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
    ],
    cavalry: [
      { name: 'Other', ratioMultiplier: 1, note: 'No additional verified troop-specific Bear modifier.' },
      { name: 'Jabel', ratioMultiplier: 1, note: 'Static hero stats remain in the imported report.' },
      { name: 'Hilde', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Petra', ratioMultiplier: 1, note: 'Army-wide offensive effects do not change the troop ratio.' },
      { name: 'Margot', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Thrud', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Sophia', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Ava', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
    ],
    archers: [
      { name: 'Other', ratioMultiplier: 1, note: 'No additional verified troop-specific Bear modifier.' },
      { name: 'Saul', ratioMultiplier: 1, note: 'Static hero stats remain in the imported report.' },
      { name: 'Marlin', ratioMultiplier: 1, note: 'Army-wide offensive effects do not change the troop ratio.' },
      { name: 'Jaeger', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Rosa', ratioMultiplier: 1.30, note: 'Applies the verified +30% Archer total Attack Expedition effect.' },
      { name: 'Vivian', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Yang', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
      { name: 'Wee & Woo', ratioMultiplier: 1, note: 'Awaiting troop-specific Bear calibration.' },
    ],
  }

  // TG5-TG7 is calibrated against the supplied reference case.
  // Other tier groups stay neutral until we have equivalent controlled reference results.
  const TIER_FACTORS = {
    't1-6':   { infantry: 1, cavalry: 1, archers: 1, calibrated: false },
    't7-tg2': { infantry: 1, cavalry: 1, archers: 1, calibrated: false },
    'tg3-4':  { infantry: 1, cavalry: 1, archers: 1, calibrated: false },
    'tg5-7':  { infantry: 1, cavalry: 1.2928172188291538, archers: 1.5363866939156945, calibrated: true },
    'tg8':    { infantry: 1, cavalry: 1, archers: 1, calibrated: false },
    't11':    { infantry: 1, cavalry: 1, archers: 1, calibrated: false },
  }

  const DEFAULT = { tier: 'tg5-7', heroes: { infantry: 'Other', cavalry: 'Other', archers: 'Other' } }

  function isBattleLab() { return /battle-lab/i.test(location.hash || '') }
  function sectionByText(text) { return [...document.querySelectorAll('section')].find((s) => (s.textContent || '').includes(text)) || null }
  function activeBear() {
    const b = [...document.querySelectorAll('button')].find((n) => (n.textContent || '').includes('Bear Optimizer'))
    return !!b && ((b.className || '').includes('border-gold/45') || !!sectionByText('Optimizer Settings') || !!document.getElementById(SETUP_ID))
  }
  function load() {
    try {
      const raw = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}')
      return { ...DEFAULT, ...raw, heroes: { ...DEFAULT.heroes, ...(raw.heroes || {}) } }
    } catch { return JSON.parse(JSON.stringify(DEFAULT)) }
  }
  function save(config) { sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config)); render() }

  function statValue(troopLabel, index) {
    const stats = sectionByText('Combat Report Stats')
    if (!stats) return 0
    const cards = [...stats.querySelectorAll('div')].filter((node) => {
      const text = node.textContent || ''
      return text.includes(troopLabel) && /Attack/i.test(text) && /Lethality/i.test(text) && node.querySelectorAll('input[type="number"]').length >= 4
    }).sort((a,b) => a.querySelectorAll('input[type="number"]').length - b.querySelectorAll('input[type="number"]').length)
    const input = cards[0]?.querySelectorAll('input[type="number"]')?.[index]
    const value = Number(input?.value)
    return Number.isFinite(value) ? value : 0
  }

  function hero(type, name) { return HEROES[type].find((h) => h.name === name) || HEROES[type][0] }

  function model() {
    const config = load()
    const tier = TIER_FACTORS[config.tier] || TIER_FACTORS['tg5-7']
    const rows = TROOPS.map((troop) => {
      const attack = statValue(troop.label, 0)
      const lethality = statValue(troop.label, 1)
      const selectedHero = hero(troop.key, config.heroes[troop.key])

      const attackFactor = (1 + attack / 100) * (1 + lethality / 100)
      const tierFactor = tier[troop.key] || 1
      const skillFactor = selectedHero.ratioMultiplier || 1
      const coefficient = troop.baseAttack * attackFactor * tierFactor * skillFactor

      return { ...troop, attack, lethality, selectedHero, attackFactor, tierFactor, skillFactor, coefficient }
    })

    const denom = rows.reduce((sum, row) => sum + row.coefficient ** 2, 0) || 1
    rows.forEach((row) => { row.percent = row.coefficient ** 2 / denom * 100 })
    return { config, tier, rows }
  }

  function heroOptions(type, selected) {
    return HEROES[type].map((h) => `<option value="${h.name}" ${h.name === selected ? 'selected' : ''}>${h.name}</option>`).join('')
  }

  function tierOptions(selected) {
    return [
      ['t1-6','T1 – T6'], ['t7-tg2','T7 – TG2'], ['tg3-4','TG3 – TG4'],
      ['tg5-7','TG5 – TG7'], ['tg8','TG8'], ['t11','T11 · War Academy']
    ].map(([value,label]) => `<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('')
  }

  function setupHtml(state) {
    return `
      <div style="border:1px solid rgba(212,175,55,.18);border-radius:14px;background:rgba(212,175,55,.035);padding:14px">
        <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(241,231,206,.46)">TROOP TIER / TRUEGOLD STAGE</div>
        <select data-v4-tier style="margin-top:7px;width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.2);border-radius:11px;background:#06152b;padding:11px;color:#f1e7ce;font:700 12px Montserrat,sans-serif">${tierOptions(state.config.tier)}</select>
        <div style="margin-top:7px;font:600 9px/1.45 Montserrat,sans-serif;color:${state.tier.calibrated?'rgba(167,243,208,.62)':'rgba(251,191,36,.62)'}">${state.tier.calibrated ? 'TG5–TG7 reference factors are enabled.' : 'This tier group still needs a controlled reference result before its troop-skill factors are considered validated.'}</div>
      </div>
      <div data-bear-troop-grid style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:11px">
        ${state.rows.map((row) => `
          <div style="min-width:0;border:1px solid rgba(212,175,55,.14);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
            <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.15em;color:rgba(212,175,55,.55)">${row.short}</div>
            <div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px">
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">ATTACK</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${row.attack.toFixed(2)}%</div></div>
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">LETHALITY</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${row.lethality.toFixed(2)}%</div></div>
            </div>
            <label style="display:block;margin-top:11px"><span style="display:block;margin-bottom:5px;font:800 9px Montserrat,sans-serif;color:rgba(241,231,206,.42)">LEAD HERO</span><select data-v4-hero="${row.key}" style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.18);border-radius:10px;background:#06152b;padding:10px;color:#f1e7ce;font:700 11px Montserrat,sans-serif">${heroOptions(row.key,state.config.heroes[row.key])}</select></label>
            <div style="margin-top:8px;font:600 9px/1.45 Montserrat,sans-serif;color:rgba(191,219,254,.48)">${row.selectedHero.note}</div>
          </div>`).join('')}
      </div>
      <details style="margin-top:12px;border:1px solid rgba(212,175,55,.12);border-radius:12px;background:rgba(255,255,255,.02);padding:10px 12px">
        <summary style="cursor:pointer;font:800 10px Montserrat,sans-serif;color:rgba(240,205,105,.72)">How Battle Lab calculates the Bear ratio</summary>
        <div style="margin-top:10px;font:600 10px/1.65 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">Dᵢ = K × √Nᵢ × BaseATKᵢ × Aᵢ × Sᵢ<br>Aᵢ = (1 + ATKᵢ/100) × (1 + LETHᵢ/100)<br>Cᵢ = BaseATKᵢ × Aᵢ × Sᵢ<br>Optimal Nᵢ / N = Cᵢ² / ΣC²</div>
        <div style="margin-top:8px;font:500 9px/1.55 Montserrat,sans-serif;color:rgba(241,231,206,.38)">K contains the Bear-defense constant shown in the reference theory. It cancels when optimizing only the troop percentages, so no March Capacity is required.</div>
      </details>`
  }

  function resultHtml(state) {
    const stacked = state.rows.map((row) => `<div style="height:100%;width:${row.percent}%;background:${row.key==='infantry'?'#c6a43c':row.key==='cavalry'?'#8baed8':'#d58b72'}" title="${row.label} ${row.percent.toFixed(1)}%"></div>`).join('')
    const bars = state.rows.map((row) => `
      <div style="margin-top:13px;border:1px solid rgba(212,175,55,.12);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
        <div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(212,175,55,.55)">${row.short}</div><div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div><div style="margin-top:2px;font:600 9px Montserrat,sans-serif;color:rgba(241,231,206,.38)">${row.selectedHero.name}</div></div><div style="font:800 17px 'JetBrains Mono',monospace;color:#f1e7ce">${row.percent.toFixed(1)}%</div></div>
        <div style="margin-top:10px;height:10px;border-radius:999px;background:#071226;overflow:hidden"><div style="height:100%;width:${Math.max(1,row.percent)}%;background:linear-gradient(90deg,#9e7d1b,#f4d469);border-radius:999px"></div></div>
      </div>`).join('')
    const rounded = state.rows.map((r) => Math.round(r.percent))
    return `
      <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div>
      <div style="margin-top:4px;font:700 26px Cinzel,serif;color:#f1e7ce">Optimal Split</div>
      <div style="margin-top:6px;font:700 11px Montserrat,sans-serif;color:rgba(241,231,206,.48)">Rounded formation: ${rounded.join(' / ')}</div>
      <div style="margin-top:15px;height:18px;display:flex;overflow:hidden;border-radius:999px;border:1px solid rgba(212,175,55,.16);background:#071226">${stacked}</div>
      ${bars}
      <div style="margin-top:14px;border:1px solid rgba(212,175,55,.10);border-radius:12px;padding:11px;font:600 10px/1.55 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">${state.rows.map((r)=>`${r.short} ${r.percent.toFixed(1)}%`).join(' · ')}</div>`
    `
  }

  function hideLegacy() {
    document.getElementById('k846-bear-setup-v3')?.remove()
    document.getElementById('k846-bear-result-v3')?.remove()
    document.getElementById('k846-bear-v2')?.remove()
    document.getElementById('k846-bear-ratio-graph')?.remove()

    const settings = sectionByText('Optimizer Settings') || sectionByText('Bear Setup')
    if (settings) {
      ;[...settings.children].forEach((node) => {
        if (node.id !== SETUP_ID && !node.contains?.(document.getElementById(SETUP_ID))) {
          const text = node.textContent || ''
          if (/square-root Bear model|minimum|Use stats from|Current March Capacity/i.test(text)) node.style.display = 'none'
        }
      })
      const h2 = settings.querySelector('h2'); if (h2) h2.textContent = 'Bear Setup'
    }

    const oldResult = [...document.querySelectorAll('section')].find((section) => {
      const text = section.textContent || ''
      return text.includes('Optimal Split') && !section.closest(`#${RESULT_ID}`)
    })
    if (oldResult) oldResult.style.display = 'none'
  }

  function render() {
    if (!isBattleLab() || !activeBear()) {
      document.getElementById(RESULT_ID)?.remove()
      return
    }
    const state = model()
    hideLegacy()

    const settings = sectionByText('Optimizer Settings') || sectionByText('Bear Setup')
    if (settings) {
      let setup = document.getElementById(SETUP_ID)
      if (!setup) { setup = document.createElement('div'); setup.id = SETUP_ID; setup.style.marginTop = '15px'; settings.appendChild(setup) }
      setup.innerHTML = setupHtml(state)
      setup.querySelector('[data-v4-tier]')?.addEventListener('change', (e) => { const c=load(); c.tier=e.target.value; save(c) })
      setup.querySelectorAll('[data-v4-hero]').forEach((select) => select.addEventListener('change', (e) => { const c=load(); c.heroes[e.target.dataset.v4Hero]=e.target.value; save(c) }))
    }

    const workspace = settings?.parentElement
    if (workspace) {
      let result = document.getElementById(RESULT_ID)
      if (!result) {
        result = document.createElement('section')
        result.id = RESULT_ID
        result.className = 'panel panel-glow p-5 md:p-6'
        result.style.marginTop = '18px'
        workspace.appendChild(result)
      }
      result.innerHTML = resultHtml(state)
    }
  }

  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; render() })
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  document.addEventListener('input', () => setTimeout(render, 30), true)
  document.addEventListener('click', () => setTimeout(render, 60), true)
  window.addEventListener('hashchange', () => setTimeout(render, 160))
  setTimeout(render, 500)
})()