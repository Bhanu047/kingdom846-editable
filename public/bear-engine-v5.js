(() => {
  const CONFIG_KEY = 'kingdom846.battleLab.bearConfig.v5'
  const SETUP_ID = 'k846-bear-setup-v5'
  const RESULT_ID = 'k846-bear-result-v5'

  const TROOPS = [
    { key: 'infantry', label: 'Infantry', short: 'INF', baseAttack: 472 },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV', baseAttack: 1416 },
    { key: 'archers', label: 'Archers', short: 'ARC', baseAttack: 1888 },
  ]

  const HEROES = {
    infantry: [
      ['Other', 1, 'No extra hero modifier is applied.'],
      ['Helga', 1, 'Static hero stats are already reflected in the report.'],
      ['Amadeus', 1, 'No extra troop-specific Bear modifier is calibrated yet.'],
      ['Zoe', 1, 'No extra troop-specific Bear modifier is calibrated yet.'],
      ['Eric', 1, 'No extra troop-specific Bear modifier is calibrated yet.'],
      ['Alcar', 1, 'Awaiting direct Bear calibration.'],
      ['Long Fei', 1, 'Awaiting direct Bear calibration.'],
      ['Triton', 1, 'Awaiting direct Bear calibration.'],
      ['Charles', 1, 'Awaiting direct Bear calibration.'],
    ],
    cavalry: [
      ['Other', 1, 'No extra hero modifier is applied.'],
      ['Jabel', 1, 'Static hero stats are already reflected in the report.'],
      ['Hilde', 1, 'Awaiting direct Bear calibration.'],
      ['Petra', 1, 'No extra troop-specific Bear modifier is calibrated yet.'],
      ['Margot', 1, 'Awaiting direct Bear calibration.'],
      ['Thrud', 1, 'Awaiting direct Bear calibration.'],
      ['Sophia', 1, 'Awaiting direct Bear calibration.'],
      ['Ava', 1, 'Awaiting direct Bear calibration.'],
    ],
    archers: [
      ['Other', 1, 'No extra hero modifier is applied.'],
      ['Saul', 1, 'Static hero stats are already reflected in the report.'],
      ['Marlin', 1, 'No extra troop-specific Bear modifier is calibrated yet.'],
      ['Jaeger', 1, 'Awaiting direct Bear calibration.'],
      ['Rosa', 1.30, 'Direct Bear testing is still required before treating this extra modifier as fully validated.'],
      ['Vivian', 1, 'Awaiting direct Bear calibration.'],
      ['Yang', 1, 'Awaiting direct Bear calibration.'],
      ['Wee & Woo', 1, 'Awaiting direct Bear calibration.'],
    ],
  }

  // TG5–TG7 factors are calibrated against the user's direct Frakinator reference cases.
  // Other tiers are intentionally blocked from a "verified" answer until equivalent
  // controlled references are supplied, rather than silently using fake neutral factors.
  const TIER_FACTORS = {
    't1-6':   { label: 'T1 – T6', calibrated: false },
    't7-tg2': { label: 'T7 – TG2', calibrated: false },
    'tg3-4':  { label: 'TG3 – TG4', calibrated: false },
    'tg5-7':  { label: 'TG5 – TG7', calibrated: true, infantry: 1, cavalry: 1.25, archers: 1.488 },
    'tg8':    { label: 'TG8', calibrated: false },
    't11':    { label: 'T11 · War Academy', calibrated: false },
  }

  const DEFAULT = {
    tier: 'tg5-7',
    heroes: { infantry: 'Other', cavalry: 'Other', archers: 'Other' },
  }

  const REFERENCE_CASES = [
    {
      name: 'Reference A',
      stats: {
        infantry: [620.4, 613.3], cavalry: [507.9, 528.5], archers: [523.3, 589.6],
      },
      expected: [3, 23, 74],
    },
    {
      name: 'Reference B',
      stats: {
        infantry: [520.4, 589.3], cavalry: [882.1, 1069.0], archers: [523.3, 583.6],
      },
      expected: [1, 73, 26],
    },
    {
      name: 'Reference C',
      stats: {
        infantry: [580.4, 611.5], cavalry: [567.9, 553.5], archers: [977.5, 1196.6],
      },
      expected: [1, 4, 95],
    },
  ]

  function heroEntry(type, name) {
    const row = (HEROES[type] || []).find(([heroName]) => heroName === name) || HEROES[type][0]
    return { name: row[0], ratioMultiplier: row[1], note: row[2] }
  }

  function load() {
    try {
      const raw = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}')
      return { ...DEFAULT, ...raw, heroes: { ...DEFAULT.heroes, ...(raw.heroes || {}) } }
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT))
    }
  }

  function save(config) {
    sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    render()
  }

  function isBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function sectionByText(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text)) || null
  }

  function activeBear() {
    const button = [...document.querySelectorAll('button')].find((node) => (node.textContent || '').includes('Bear Optimizer'))
    return !!button && ((button.className || '').includes('border-gold/45') || !!sectionByText('Optimizer Settings') || !!document.getElementById(SETUP_ID))
  }

  function statValue(troopLabel, index) {
    const stats = sectionByText('Combat Report Stats')
    if (!stats) return 0
    const cards = [...stats.querySelectorAll('div')].filter((node) => {
      const text = node.textContent || ''
      return text.includes(troopLabel)
        && /Attack/i.test(text)
        && /Lethality/i.test(text)
        && node.querySelectorAll('input[type="number"]').length >= 4
    }).sort((a, b) => a.querySelectorAll('input[type="number"]').length - b.querySelectorAll('input[type="number"]').length)
    const input = cards[0]?.querySelectorAll('input[type="number"]')?.[index]
    const value = Number(input?.value)
    return Number.isFinite(value) ? value : 0
  }

  function coefficientFor(troop, attack, lethality, tier, selectedHero) {
    const attackFactor = (1 + attack / 100) * (1 + lethality / 100)
    const tierFactor = tier?.[troop.key]
    const skillFactor = selectedHero?.ratioMultiplier || 1
    if (!Number.isFinite(tierFactor)) return 0
    return troop.baseAttack * attackFactor * tierFactor * skillFactor
  }

  function bestIntegerComposition(coefficients) {
    let bestScore = -Infinity
    let best = [1, 1, 98]
    for (let infantry = 1; infantry <= 98; infantry += 1) {
      for (let cavalry = 1; cavalry <= 99 - infantry; cavalry += 1) {
        const archers = 100 - infantry - cavalry
        if (archers < 1) continue
        const score = coefficients[0] * Math.sqrt(infantry)
          + coefficients[1] * Math.sqrt(cavalry)
          + coefficients[2] * Math.sqrt(archers)
        if (score > bestScore) {
          bestScore = score
          best = [infantry, cavalry, archers]
        }
      }
    }
    return best
  }

  function continuousPercents(coefficients) {
    const denom = coefficients.reduce((sum, value) => sum + value ** 2, 0)
    if (!denom) return [0, 0, 0]
    return coefficients.map((value) => value ** 2 / denom * 100)
  }

  function calculateFromStats(stats, config = DEFAULT) {
    const tier = TIER_FACTORS[config.tier]
    if (!tier?.calibrated) return { calibrated: false, tier }
    const coefficients = TROOPS.map((troop) => {
      const pair = stats[troop.key] || [0, 0]
      return coefficientFor(troop, Number(pair[0]) || 0, Number(pair[1]) || 0, tier, heroEntry(troop.key, config.heroes[troop.key]))
    })
    const percents = continuousPercents(coefficients)
    const whole = bestIntegerComposition(coefficients)
    return { calibrated: true, tier, coefficients, percents, whole }
  }

  function regressionStatus() {
    const neutral = { tier: 'tg5-7', heroes: { infantry: 'Other', cavalry: 'Other', archers: 'Other' } }
    const results = REFERENCE_CASES.map((test) => {
      const result = calculateFromStats(test.stats, neutral)
      const pass = result.whole?.every((value, index) => value === test.expected[index])
      return { ...test, actual: result.whole, pass }
    })
    return { passed: results.filter((test) => test.pass).length, total: results.length, results }
  }

  function model() {
    const config = load()
    const tier = TIER_FACTORS[config.tier]
    const rows = TROOPS.map((troop) => {
      const attack = statValue(troop.label, 0)
      const lethality = statValue(troop.label, 1)
      const selectedHero = heroEntry(troop.key, config.heroes[troop.key])
      return { ...troop, attack, lethality, selectedHero }
    })
    const ready = rows.every((row) => row.attack > 0 && row.lethality > 0)
    if (!ready || !tier?.calibrated) return { config, tier, rows, ready, calibrated: !!tier?.calibrated, percents: [0, 0, 0], whole: null }

    const coefficients = rows.map((row) => coefficientFor(row, row.attack, row.lethality, tier, row.selectedHero))
    const percents = continuousPercents(coefficients)
    const whole = bestIntegerComposition(coefficients)
    rows.forEach((row, index) => {
      row.coefficient = coefficients[index]
      row.percent = percents[index]
    })
    return { config, tier, rows, ready, calibrated: true, coefficients, percents, whole }
  }

  function heroOptions(type, selected) {
    return HEROES[type].map(([name]) => `<option value="${name}" ${name === selected ? 'selected' : ''}>${name}</option>`).join('')
  }

  function tierOptions(selected) {
    return Object.entries(TIER_FACTORS).map(([value, tier]) => {
      const suffix = tier.calibrated ? '' : ' · calibration pending'
      return `<option value="${value}" ${value === selected ? 'selected' : ''}>${tier.label}${suffix}</option>`
    }).join('')
  }

  function setupHtml(state) {
    const regression = regressionStatus()
    const regressionPass = regression.passed === regression.total
    return `
      <div style="border:1px solid rgba(212,175,55,.18);border-radius:14px;background:rgba(212,175,55,.035);padding:14px">
        <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(241,231,206,.46)">TROOP TIER / TRUEGOLD STAGE</div>
        <select data-v5-tier style="margin-top:7px;width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.2);border-radius:11px;background:#06152b;padding:11px;color:#f1e7ce;font:700 12px Montserrat,sans-serif">${tierOptions(state.config.tier)}</select>
        <div style="margin-top:7px;font:600 9px/1.45 Montserrat,sans-serif;color:${state.tier?.calibrated ? 'rgba(167,243,208,.68)' : 'rgba(251,191,36,.68)'}">${state.tier?.calibrated ? 'TG5–TG7 core factors are enabled.' : 'This tier is not calibrated yet. Battle Lab will not present an unverified ratio as final.'}</div>
        <div style="margin-top:7px;font:700 9px Montserrat,sans-serif;color:${regressionPass ? 'rgba(167,243,208,.7)' : 'rgba(248,113,113,.75)'}">CORE REGRESSION ${regression.passed}/${regression.total} ${regressionPass ? 'PASS' : 'FAIL'}</div>
      </div>
      <div data-bear-troop-grid style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:11px">
        ${state.rows.map((row) => `
          <div style="min-width:0;border:1px solid rgba(212,175,55,.14);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
            <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.15em;color:rgba(212,175,55,.55)">${row.short}</div>
            <div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px">
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">ATTACK</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${row.attack > 0 ? row.attack.toFixed(2) + '%' : '—'}</div></div>
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">LETHALITY</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${row.lethality > 0 ? row.lethality.toFixed(2) + '%' : '—'}</div></div>
            </div>
            <label style="display:block;margin-top:11px"><span style="display:block;margin-bottom:5px;font:800 9px Montserrat,sans-serif;color:rgba(241,231,206,.42)">LEAD HERO</span><select data-v5-hero="${row.key}" style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.18);border-radius:10px;background:#06152b;padding:10px;color:#f1e7ce;font:700 11px Montserrat,sans-serif">${heroOptions(row.key, state.config.heroes[row.key])}</select></label>
            <div style="margin-top:8px;font:600 9px/1.45 Montserrat,sans-serif;color:rgba(191,219,254,.48)">${row.selectedHero.note}</div>
          </div>`).join('')}
      </div>
      <details style="margin-top:12px;border:1px solid rgba(212,175,55,.12);border-radius:12px;background:rgba(255,255,255,.02);padding:10px 12px">
        <summary style="cursor:pointer;font:800 10px Montserrat,sans-serif;color:rgba(240,205,105,.72)">How Battle Lab calculates the Bear ratio</summary>
        <div style="margin-top:10px;font:600 10px/1.65 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">Dᵢ = K × √Nᵢ × BaseATKᵢ × Aᵢ × Sᵢ<br>Aᵢ = (1 + ATKᵢ/100) × (1 + LETHᵢ/100)<br>Cᵢ = BaseATKᵢ × Aᵢ × Sᵢ<br>Continuous optimum: Nᵢ ∝ Cᵢ²<br>Displayed formation: exhaustive 1%-step search, INF+CAV+ARC=100, each ≥1.</div>
        <div style="margin-top:8px;font:500 9px/1.55 Montserrat,sans-serif;color:rgba(241,231,206,.38)">The common Bear constant and total march size cancel when optimizing only the ratio, so March Capacity is not used.</div>
      </details>`
  }

  function resultHtml(state) {
    if (!state.ready) {
      return `<div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div><div style="margin-top:5px;font:700 22px Cinzel,serif;color:#f1e7ce">Waiting for Combat Stats</div><div style="margin-top:8px;font:600 11px/1.6 Montserrat,sans-serif;color:rgba(241,231,206,.45)">Upload a battle-report screenshot or enter Attack and Lethality for Infantry, Cavalry and Archers. Battle Lab will not calculate from placeholder values.</div>`
    }
    if (!state.calibrated) {
      return `<div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div><div style="margin-top:5px;font:700 22px Cinzel,serif;color:#f1e7ce">Calibration Required</div><div style="margin-top:8px;font:600 11px/1.6 Montserrat,sans-serif;color:rgba(251,191,36,.62)">${state.tier?.label || 'Selected tier'} does not yet have enough direct reference tests. No fake final ratio is shown.</div>`
    }

    const stacked = state.rows.map((row, index) => `<div style="height:100%;width:${state.percents[index]}%;background:${row.key === 'infantry' ? '#c6a43c' : row.key === 'cavalry' ? '#8baed8' : '#d58b72'}" title="${row.label} ${state.percents[index].toFixed(1)}%"></div>`).join('')
    const bars = state.rows.map((row, index) => `
      <div style="margin-top:13px;border:1px solid rgba(212,175,55,.12);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
        <div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(212,175,55,.55)">${row.short}</div><div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div><div style="margin-top:2px;font:600 9px Montserrat,sans-serif;color:rgba(241,231,206,.38)">${row.selectedHero.name}</div></div><div style="font:800 17px 'JetBrains Mono',monospace;color:#f1e7ce">${state.percents[index].toFixed(1)}%</div></div>
        <div style="margin-top:10px;height:10px;border-radius:999px;background:#071226;overflow:hidden"><div style="height:100%;width:${Math.max(1, state.percents[index])}%;background:linear-gradient(90deg,#9e7d1b,#f4d469);border-radius:999px"></div></div>
      </div>`).join('')

    return `
      <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div>
      <div style="margin-top:4px;font:700 26px Cinzel,serif;color:#f1e7ce">Optimal Split</div>
      <div style="margin-top:6px;font:800 14px 'JetBrains Mono',monospace;color:#f0cd69">${state.whole.join(' / ')}</div>
      <div style="margin-top:4px;font:600 9px Montserrat,sans-serif;color:rgba(241,231,206,.38)">Whole-number formation · totals 100%</div>
      <div style="margin-top:15px;height:18px;display:flex;overflow:hidden;border-radius:999px;border:1px solid rgba(212,175,55,.16);background:#071226">${stacked}</div>
      ${bars}
      <div style="margin-top:14px;border:1px solid rgba(212,175,55,.10);border-radius:12px;padding:11px;font:600 10px/1.55 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">${state.rows.map((row, index) => `${row.short} ${state.percents[index].toFixed(2)}%`).join(' · ')}</div>`
  }

  function hideLegacy() {
    ;['k846-bear-setup-v2','k846-bear-setup-v3','k846-bear-setup-v4','k846-bear-result-v3','k846-bear-result-v4','k846-bear-v2','k846-bear-ratio-graph'].forEach((id) => document.getElementById(id)?.remove())
    const settings = sectionByText('Optimizer Settings') || sectionByText('Bear Setup')
    if (settings) {
      ;[...settings.children].forEach((node) => {
        if (node.id !== SETUP_ID && !node.contains?.(document.getElementById(SETUP_ID))) {
          const text = node.textContent || ''
          if (/square-root Bear model|minimum|Use stats from|Current March Capacity/i.test(text)) node.style.display = 'none'
        }
      })
      const h2 = settings.querySelector('h2')
      if (h2) h2.textContent = 'Bear Setup'
    }
    const oldResults = [...document.querySelectorAll('section')].filter((section) => {
      const text = section.textContent || ''
      return text.includes('Optimal Split') && section.id !== RESULT_ID
    })
    oldResults.forEach((section) => { section.style.display = 'none' })
  }

  function render() {
    if (!isBattleLab() || !activeBear()) {
      document.getElementById(RESULT_ID)?.remove()
      return
    }
    const state = model()
    hideLegacy()
    const settings = sectionByText('Optimizer Settings') || sectionByText('Bear Setup')
    if (!settings) return

    let setup = document.getElementById(SETUP_ID)
    if (!setup) {
      setup = document.createElement('div')
      setup.id = SETUP_ID
      setup.style.marginTop = '15px'
      settings.appendChild(setup)
    }
    setup.innerHTML = setupHtml(state)
    setup.querySelector('[data-v5-tier]')?.addEventListener('change', (event) => {
      const config = load(); config.tier = event.target.value; save(config)
    })
    setup.querySelectorAll('[data-v5-hero]').forEach((select) => select.addEventListener('change', (event) => {
      const config = load(); config.heroes[event.target.dataset.v5Hero] = event.target.value; save(config)
    }))

    const workspace = settings.parentElement
    if (!workspace) return
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

  window.__k846BearV5 = {
    regressionStatus,
    calculateFromStats,
    bestIntegerComposition,
  }

  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; render() })
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  document.addEventListener('input', () => setTimeout(render, 30), true)
  document.addEventListener('change', () => setTimeout(render, 40), true)
  document.addEventListener('click', () => setTimeout(render, 60), true)
  window.addEventListener('hashchange', () => setTimeout(render, 160))
  setTimeout(render, 500)
})()
