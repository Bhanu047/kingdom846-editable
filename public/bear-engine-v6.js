(() => {
  const CONFIG_KEY = 'kingdom846.battleLab.bearConfig.v6'
  const SETUP_ID = 'k846-bear-setup-v6'
  const RESULT_ID = 'k846-bear-result-v6'

  const TROOPS = [
    { key: 'infantry', label: 'Infantry', short: 'INF', baseAttack: 472 },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV', baseAttack: 1416 },
    { key: 'archers', label: 'Archers', short: 'ARC', baseAttack: 1888 },
  ]

  // ratioMultiplier contains only troop-specific Bear effects that can change the
  // INF/CAV/ARC split after report ATK/LETH has already been entered. Rally-wide
  // ATK/LETH widget effects are tracked separately because they change total Bear
  // damage but cancel out of a pure ratio optimization.
  const HEROES = {
    infantry: [
      { name: 'Other', ratioMultiplier: 1, widgetEffect: 'none', note: 'No modeled hero-specific Bear effect.' },
      { name: 'Helga', ratioMultiplier: 1, widgetEffect: 'rally_let', note: 'Rally-wide widget effect; ratio stays unchanged.' },
      { name: 'Amadeus', ratioMultiplier: 1, widgetEffect: 'rally_atk', note: 'His modeled Bear effects are rally-wide, so they increase damage but do not change the split.' },
      { name: 'Zoe', ratioMultiplier: 1, widgetEffect: 'none', note: 'No verified troop-specific Bear ratio modifier.' },
      { name: 'Eric', ratioMultiplier: 1, widgetEffect: 'none', note: 'No verified troop-specific Bear ratio modifier.' },
      { name: 'Alcar', ratioMultiplier: 1, widgetEffect: 'none', note: 'Hero-specific Bear calibration pending.' },
      { name: 'Long Fei', ratioMultiplier: 1, widgetEffect: 'none', note: 'Hero-specific Bear calibration pending.' },
      { name: 'Triton', ratioMultiplier: 1, widgetEffect: 'none', note: 'Hero-specific Bear calibration pending.' },
      { name: 'Charles', ratioMultiplier: 1, widgetEffect: 'none', note: 'Defensive profile; no verified ratio modifier.' },
      { name: 'Howard', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Forrest', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Seth', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
    ],
    cavalry: [
      { name: 'Other', ratioMultiplier: 1, widgetEffect: 'none', note: 'No modeled hero-specific Bear effect.' },
      { name: 'Jabel', ratioMultiplier: 1, widgetEffect: 'none', note: 'No verified troop-specific Bear ratio modifier.' },
      { name: 'Hilde', ratioMultiplier: 1, widgetEffect: 'none', note: 'Defensive widget; no rally ratio effect.' },
      { name: 'Petra', ratioMultiplier: 1, widgetEffect: 'rally_atk', note: 'Her modeled offensive effects are rally-wide; widget raises total rally damage, not the ratio.' },
      { name: 'Margot', ratioMultiplier: 1, widgetEffect: 'none', note: 'No verified troop-specific Bear ratio modifier.' },
      { name: 'Thrud', ratioMultiplier: 1, widgetEffect: 'rally_let', note: 'Rally-wide widget effect; ratio stays unchanged.' },
      { name: 'Sophia', ratioMultiplier: 1, widgetEffect: 'none', note: 'No verified troop-specific Bear ratio modifier.' },
      { name: 'Ava', ratioMultiplier: 1, widgetEffect: 'rally_let', note: 'Her verified Expedition effects are rally-wide, so they increase damage without changing the split.' },
      { name: 'Gordon', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Chenko', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Fahd', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Edwin', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
    ],
    archers: [
      { name: 'Other', ratioMultiplier: 1, widgetEffect: 'none', note: 'No modeled hero-specific Bear effect.' },
      { name: 'Saul', ratioMultiplier: 1, widgetEffect: 'none', note: 'No verified troop-specific Bear ratio modifier.' },
      { name: 'Marlin', ratioMultiplier: 1, widgetEffect: 'rally_let', note: 'His modeled offensive skills are rally-wide; widget raises total damage but does not change the split.' },
      { name: 'Jaeger', ratioMultiplier: 1, widgetEffect: 'none', note: 'Defensive widget; no verified ratio modifier.' },
      { name: 'Rosa', ratioMultiplier: 1.30, widgetEffect: 'rally_let', note: 'Golden Rhythm gives Archers a verified troop-specific +30% total Attack effect.' },
      { name: 'Vivian', ratioMultiplier: 1, widgetEffect: 'none', note: 'Bear-specific interactions do not yield a verified troop-ratio modifier here.' },
      { name: 'Yang', ratioMultiplier: 1.32, widgetEffect: 'rally_let', note: 'Archer-only Ice Zone is modeled relative to Yang’s army-wide periodic damage effect.' },
      { name: 'Wee & Woo', ratioMultiplier: 1, widgetEffect: 'none', note: 'Defensive widget; hero-specific Bear calibration pending.' },
      { name: 'Quinn', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Amane', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Yeonwoo', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Diana', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
      { name: 'Olive', ratioMultiplier: 1, widgetEffect: 'none', note: 'No exclusive rally widget.' },
    ],
  }

  const TIER_FACTORS = {
    't1-6':   { label: 'T1 – T6', calibrated: false },
    't7-tg2': { label: 'T7 – TG2', calibrated: false },
    'tg3-4':  { label: 'TG3 – TG4', calibrated: false },
    // Recalibrated against four independent TG5–TG7 reference outputs.
    'tg5-7':  { label: 'TG5 – TG7', calibrated: true, infantry: 1, cavalry: 1.238, archers: 1.4895 },
    'tg8':    { label: 'TG8', calibrated: false },
    't11':    { label: 'T11 · War Academy', calibrated: false },
  }

  const DEFAULT = {
    tier: 'tg5-7',
    heroes: { infantry: 'Other', cavalry: 'Other', archers: 'Other' },
    widgets: { infantry: 0, cavalry: 0, archers: 0 },
  }

  const REFERENCE_CASES = [
    {
      name: 'A',
      stats: { infantry: [620.4, 613.3], cavalry: [507.9, 528.5], archers: [523.3, 589.6] },
      expected: [3, 23, 74],
    },
    {
      name: 'B',
      stats: { infantry: [520.4, 589.3], cavalry: [882.1, 1069.0], archers: [523.3, 583.6] },
      expected: [1, 73, 26],
    },
    {
      name: 'C',
      stats: { infantry: [580.4, 611.5], cavalry: [567.9, 553.5], archers: [977.5, 1196.6] },
      expected: [1, 4, 95],
    },
    {
      name: 'D',
      stats: { infantry: [448.4, 571.3], cavalry: [435.9, 510.5], archers: [457.7, 595.6] },
      expected: [2, 21, 77],
    },
  ]

  function heroEntry(type, name) {
    return (HEROES[type] || []).find((hero) => hero.name === name) || HEROES[type][0]
  }

  function widgetBonus(level) {
    const n = Number(level) || 0
    if (n >= 10) return 15
    if (n >= 8) return 12.5
    if (n >= 6) return 10
    if (n >= 4) return 7.5
    if (n >= 2) return 5
    return 0
  }

  function load() {
    try {
      const raw = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}')
      return {
        ...DEFAULT,
        ...raw,
        heroes: { ...DEFAULT.heroes, ...(raw.heroes || {}) },
        widgets: { ...DEFAULT.widgets, ...(raw.widgets || {}) },
      }
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

  function coefficientFor(troop, attack, lethality, tier, hero) {
    const attackFactor = (1 + attack / 100) * (1 + lethality / 100)
    const tierFactor = tier?.[troop.key]
    if (!Number.isFinite(tierFactor)) return 0
    return troop.baseAttack * attackFactor * tierFactor * (hero?.ratioMultiplier || 1)
  }

  function continuousPercents(coefficients) {
    const denom = coefficients.reduce((sum, value) => sum + value ** 2, 0)
    if (!denom) return [0, 0, 0]
    return coefficients.map((value) => value ** 2 / denom * 100)
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

  function calculateFromStats(stats, config = DEFAULT) {
    const tier = TIER_FACTORS[config.tier]
    if (!tier?.calibrated) return { calibrated: false, tier }
    const coefficients = TROOPS.map((troop) => {
      const pair = stats[troop.key] || [0, 0]
      const hero = heroEntry(troop.key, config.heroes[troop.key])
      return coefficientFor(troop, Number(pair[0]) || 0, Number(pair[1]) || 0, tier, hero)
    })
    return {
      calibrated: true,
      tier,
      coefficients,
      percents: continuousPercents(coefficients),
      whole: bestIntegerComposition(coefficients),
    }
  }

  function regressionStatus() {
    const neutral = { ...DEFAULT, heroes: { infantry: 'Other', cavalry: 'Other', archers: 'Other' } }
    const results = REFERENCE_CASES.map((test) => {
      const actual = calculateFromStats(test.stats, neutral).whole
      const pass = actual?.every((value, index) => value === test.expected[index])
      return { ...test, actual, pass }
    })
    return { passed: results.filter((test) => test.pass).length, total: results.length, results }
  }

  function widgetSummary(config) {
    let rallyAttack = 0
    let rallyLethality = 0
    const details = []
    TROOPS.forEach((troop) => {
      const hero = heroEntry(troop.key, config.heroes[troop.key])
      const level = Number(config.widgets[troop.key]) || 0
      const bonus = widgetBonus(level)
      if (!bonus || hero.widgetEffect === 'none') return
      if (hero.widgetEffect === 'rally_atk') rallyAttack += bonus
      if (hero.widgetEffect === 'rally_let') rallyLethality += bonus
      details.push(`${hero.name} W${level}: +${bonus}% ${hero.widgetEffect === 'rally_atk' ? 'Rally ATK' : 'Rally LETH'}`)
    })
    return { rallyAttack, rallyLethality, details }
  }

  function model() {
    const config = load()
    const tier = TIER_FACTORS[config.tier]
    const rows = TROOPS.map((troop) => {
      const attack = statValue(troop.label, 0)
      const lethality = statValue(troop.label, 1)
      const selectedHero = heroEntry(troop.key, config.heroes[troop.key])
      const widgetLevel = Number(config.widgets[troop.key]) || 0
      return { ...troop, attack, lethality, selectedHero, widgetLevel, widgetBonus: widgetBonus(widgetLevel) }
    })
    const ready = rows.every((row) => row.attack > 0 && row.lethality > 0)
    const widgets = widgetSummary(config)
    if (!ready || !tier?.calibrated) {
      return { config, tier, rows, ready, calibrated: !!tier?.calibrated, percents: [0, 0, 0], whole: null, widgets }
    }

    const coefficients = rows.map((row) => coefficientFor(row, row.attack, row.lethality, tier, row.selectedHero))
    const percents = continuousPercents(coefficients)
    const whole = bestIntegerComposition(coefficients)
    rows.forEach((row, index) => {
      row.coefficient = coefficients[index]
      row.percent = percents[index]
    })
    return { config, tier, rows, ready, calibrated: true, coefficients, percents, whole, widgets }
  }

  function heroOptions(type, selected) {
    return HEROES[type].map((hero) => `<option value="${hero.name}" ${hero.name === selected ? 'selected' : ''}>${hero.name}</option>`).join('')
  }

  function widgetOptions(selected) {
    return Array.from({ length: 11 }, (_, level) => `<option value="${level}" ${Number(selected) === level ? 'selected' : ''}>${level}</option>`).join('')
  }

  function tierOptions(selected) {
    return Object.entries(TIER_FACTORS).map(([value, tier]) => {
      const suffix = tier.calibrated ? '' : ' · calibration pending'
      return `<option value="${value}" ${value === selected ? 'selected' : ''}>${tier.label}${suffix}</option>`
    }).join('')
  }

  function setupHtml(state) {
    const regression = regressionStatus()
    const pass = regression.passed === regression.total
    return `
      <div style="border:1px solid rgba(212,175,55,.18);border-radius:14px;background:rgba(212,175,55,.035);padding:14px">
        <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(241,231,206,.46)">TROOP TIER / TRUEGOLD STAGE</div>
        <select data-v6-tier style="margin-top:7px;width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.2);border-radius:11px;background:#06152b;padding:11px;color:#f1e7ce;font:700 12px Montserrat,sans-serif">${tierOptions(state.config.tier)}</select>
        <div style="margin-top:7px;font:600 9px/1.45 Montserrat,sans-serif;color:${state.tier?.calibrated ? 'rgba(167,243,208,.68)' : 'rgba(251,191,36,.68)'}">${state.tier?.calibrated ? 'TG5–TG7 core model enabled.' : 'This tier is still calibration-pending, so Battle Lab will not publish a final ratio for it.'}</div>
        <div style="margin-top:7px;font:700 9px Montserrat,sans-serif;color:${pass ? 'rgba(167,243,208,.72)' : 'rgba(248,113,113,.78)'}">CORE CHECK ${regression.passed}/${regression.total} ${pass ? 'PASS' : 'FAIL'}</div>
      </div>

      <div style="margin-top:10px;border:1px solid rgba(96,165,250,.16);border-radius:12px;background:rgba(30,64,175,.06);padding:11px;font:600 9px/1.55 Montserrat,sans-serif;color:rgba(191,219,254,.60)">
        Use a Rally Bonus report created with the same three lead heroes you select below. Static hero/gear/widget stats already visible in the report are not added again. Hero selection is used for Bear-only skill behavior that the percentages do not show.
      </div>

      <div data-bear-troop-grid style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:11px">
        ${state.rows.map((row) => {
          const hasRallyWidget = row.selectedHero.widgetEffect !== 'none'
          const widgetText = !hasRallyWidget
            ? 'No rally-relevant widget effect modeled.'
            : `Widget ${row.widgetLevel}: +${row.widgetBonus}% ${row.selectedHero.widgetEffect === 'rally_atk' ? 'Rally ATK' : 'Rally Lethality'} · global damage effect.`
          return `
          <div style="min-width:0;border:1px solid rgba(212,175,55,.14);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
            <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.15em;color:rgba(212,175,55,.55)">${row.short}</div>
            <div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px">
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">ATTACK</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${row.attack > 0 ? row.attack.toFixed(2) + '%' : '—'}</div></div>
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">LETHALITY</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69">${row.lethality > 0 ? row.lethality.toFixed(2) + '%' : '—'}</div></div>
            </div>
            <label style="display:block;margin-top:11px"><span style="display:block;margin-bottom:5px;font:800 9px Montserrat,sans-serif;color:rgba(241,231,206,.42)">LEAD HERO</span><select data-v6-hero="${row.key}" style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.18);border-radius:10px;background:#06152b;padding:10px;color:#f1e7ce;font:700 11px Montserrat,sans-serif">${heroOptions(row.key, state.config.heroes[row.key])}</select></label>
            <label style="display:block;margin-top:9px"><span style="display:block;margin-bottom:5px;font:800 9px Montserrat,sans-serif;color:rgba(241,231,206,.42)">WIDGET LEVEL</span><select data-v6-widget="${row.key}" ${hasRallyWidget ? '' : 'disabled'} style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.18);border-radius:10px;background:#06152b;padding:10px;color:${hasRallyWidget ? '#f1e7ce' : 'rgba(241,231,206,.35)'};font:700 11px Montserrat,sans-serif">${widgetOptions(state.config.widgets[row.key])}</select></label>
            <div style="margin-top:8px;font:600 9px/1.45 Montserrat,sans-serif;color:rgba(191,219,254,.48)">${row.selectedHero.note}</div>
            <div style="margin-top:5px;font:600 8px/1.45 Montserrat,sans-serif;color:rgba(241,231,206,.34)">${widgetText}</div>
          </div>`
        }).join('')}
      </div>

      <details style="margin-top:12px;border:1px solid rgba(212,175,55,.12);border-radius:12px;background:rgba(255,255,255,.02);padding:10px 12px">
        <summary style="cursor:pointer;font:800 10px Montserrat,sans-serif;color:rgba(240,205,105,.72)">Bear math used by Battle Lab</summary>
        <div style="margin-top:10px;font:600 10px/1.65 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">Aᵢ = (1 + ATKᵢ/100) × (1 + LETHᵢ/100)<br>Cᵢ = BaseATKᵢ × Aᵢ × Tierᵢ × Heroᵢ<br>Dᵢ ∝ Cᵢ × √Nᵢ<br>Continuous optimum: Nᵢ ∝ Cᵢ²<br>Final output: exhaustive 1%-step search, INF+CAV+ARC=100, each ≥1.</div>
        <div style="margin-top:8px;font:500 9px/1.55 Montserrat,sans-serif;color:rgba(241,231,206,.38)">Rally-wide widget ATK/LETH modifiers are tracked separately because a common multiplier changes total damage but not the optimal troop percentages.</div>
      </details>`
  }

  function resultHtml(state) {
    if (!state.ready) {
      return `<div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div><div style="margin-top:5px;font:700 22px Cinzel,serif;color:#f1e7ce">Waiting for Combat Stats</div><div style="margin-top:8px;font:600 11px/1.6 Montserrat,sans-serif;color:rgba(241,231,206,.45)">Upload a Rally Bonus screenshot or enter Attack and Lethality for Infantry, Cavalry and Archers.</div>`
    }
    if (!state.calibrated) {
      return `<div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div><div style="margin-top:5px;font:700 22px Cinzel,serif;color:#f1e7ce">Calibration Required</div><div style="margin-top:8px;font:600 11px/1.6 Montserrat,sans-serif;color:rgba(251,191,36,.62)">${state.tier?.label || 'Selected tier'} has not passed enough direct reference tests yet.</div>`
    }

    const stacked = state.rows.map((row, index) => `<div style="height:100%;width:${state.percents[index]}%;background:${row.key === 'infantry' ? '#c6a43c' : row.key === 'cavalry' ? '#8baed8' : '#d58b72'}" title="${row.label} ${state.percents[index].toFixed(1)}%"></div>`).join('')
    const bars = state.rows.map((row, index) => `
      <div style="margin-top:13px;border:1px solid rgba(212,175,55,.12);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
        <div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(212,175,55,.55)">${row.short}</div><div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div><div style="margin-top:2px;font:600 9px Montserrat,sans-serif;color:rgba(241,231,206,.38)">${row.selectedHero.name} · W${row.widgetLevel}</div></div><div style="font:800 17px 'JetBrains Mono',monospace;color:#f1e7ce">${state.percents[index].toFixed(1)}%</div></div>
        <div style="margin-top:10px;height:10px;border-radius:999px;background:#071226;overflow:hidden"><div style="height:100%;width:${Math.max(1, state.percents[index])}%;background:linear-gradient(90deg,#9e7d1b,#f4d469);border-radius:999px"></div></div>
      </div>`).join('')

    const widgetLine = state.widgets.details.length
      ? `${state.widgets.details.join(' · ')}. These are global rally modifiers and are not double-counted into the ratio.`
      : 'No rally-wide widget modifier selected.'

    return `
      <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div>
      <div style="margin-top:4px;font:700 26px Cinzel,serif;color:#f1e7ce">Optimal Split</div>
      <div style="margin-top:6px;font:800 16px 'JetBrains Mono',monospace;color:#f0cd69">${state.whole.join(' / ')}</div>
      <div style="margin-top:4px;font:600 9px Montserrat,sans-serif;color:rgba(241,231,206,.38)">Whole-number formation · totals 100%</div>
      <div style="margin-top:15px;height:18px;display:flex;overflow:hidden;border-radius:999px;border:1px solid rgba(212,175,55,.16);background:#071226">${stacked}</div>
      ${bars}
      <div style="margin-top:14px;border:1px solid rgba(212,175,55,.10);border-radius:12px;padding:11px;font:600 10px/1.55 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">${state.rows.map((row, index) => `${row.short} ${state.percents[index].toFixed(2)}%`).join(' · ')}</div>
      <div style="margin-top:10px;border:1px solid rgba(96,165,250,.12);border-radius:12px;padding:10px;font:600 9px/1.5 Montserrat,sans-serif;color:rgba(191,219,254,.50)">${widgetLine}</div>`
  }

  function hideLegacy() {
    ;['k846-bear-setup-v2','k846-bear-setup-v3','k846-bear-setup-v4','k846-bear-setup-v5','k846-bear-result-v3','k846-bear-result-v4','k846-bear-result-v5','k846-bear-v2','k846-bear-ratio-graph'].forEach((id) => document.getElementById(id)?.remove())
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

    setup.querySelector('[data-v6-tier]')?.addEventListener('change', (event) => {
      const config = load()
      config.tier = event.target.value
      save(config)
    })

    setup.querySelectorAll('[data-v6-hero]').forEach((select) => select.addEventListener('change', (event) => {
      const config = load()
      const type = event.target.dataset.v6Hero
      config.heroes[type] = event.target.value
      const hero = heroEntry(type, event.target.value)
      if (hero.widgetEffect === 'none') config.widgets[type] = 0
      save(config)
    }))

    setup.querySelectorAll('[data-v6-widget]').forEach((select) => select.addEventListener('change', (event) => {
      const config = load()
      config.widgets[event.target.dataset.v6Widget] = Number(event.target.value) || 0
      save(config)
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

  window.__k846BearV6 = {
    regressionStatus,
    calculateFromStats,
    bestIntegerComposition,
    widgetBonus,
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
