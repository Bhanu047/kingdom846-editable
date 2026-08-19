(() => {
  const CONFIG_KEY = 'kingdom846.battleLab.bearConfig.v3'
  const SETUP_ID = 'k846-bear-setup-v3'
  const RESULT_ID = 'k846-bear-result-v3'

  const TROOPS = [
    { key: 'infantry', label: 'Infantry', short: 'INF', weight: 1 / 3 },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV', weight: 1 },
    { key: 'archers', label: 'Archers', short: 'ARC', weight: 4 / 3 },
  ]

  // Verified legendary roster and max Expedition ATK values from KingshotData.
  // Offensive skill modifiers below are expected-value conversions of documented Expedition skills.
  const HEROES = {
    infantry: [
      { name: 'Helga', gen: 'Gen 1', expAtk: 200.16, globalAtk: 25, globalLeth: 25 },
      { name: 'Amadeus', gen: 'Gen 1', expAtk: 260.21, globalAtk: 25, globalLeth: 25, globalDamage: 1.20 },
      { name: 'Zoe', gen: 'Gen 2', expAtk: 240.19, globalAtk: 25 },
      { name: 'Eric', gen: 'Gen 3', expAtk: 290.23 },
      { name: 'Alcar', gen: 'Gen 4', expAtk: 370.30, ownDamage: 3.20 },
      { name: 'Long Fei', gen: 'Gen 5', expAtk: 444.36, globalDamage: 1.25 },
      { name: 'Triton', gen: 'Gen 6', expAtk: 540.43 },
      { name: 'Charles', gen: 'Gen 7', expAtk: 650.52 },
    ],
    cavalry: [
      { name: 'Jabel', gen: 'Gen 1', expAtk: 200.16, globalLeth: 25, globalDamage: 1.25 },
      { name: 'Hilde', gen: 'Gen 2', expAtk: 240.19, globalAtk: 15, globalDamage: 1.25 },
      { name: 'Petra', gen: 'Gen 3', expAtk: 290.23, globalDamage: 1.5625 },
      { name: 'Margot', gen: 'Gen 4', expAtk: 370.30, globalAtk: 25, ownDamage: 1.50 },
      { name: 'Thrud', gen: 'Gen 5', expAtk: 444.36, crossDamage: { infantry: 1.15, archers: 1.15 } },
      { name: 'Sophia', gen: 'Gen 6', expAtk: 540.43, ownDamage: 2.00, globalDamage: 1.375 },
      { name: 'Ava', gen: 'Gen 7', expAtk: 650.52, globalLeth: 25, globalDamage: 1.25 },
    ],
    archers: [
      { name: 'Saul', gen: 'Gen 1', expAtk: 200.16, globalLeth: 25 },
      { name: 'Marlin', gen: 'Gen 2', expAtk: 240.19, globalDamage: 1.20 },
      { name: 'Jaeger', gen: 'Gen 3', expAtk: 290.23, globalDamage: 1.08 },
      { name: 'Rosa', gen: 'Gen 4', expAtk: 370.30, ownAtk: 30, globalDamage: 1.20 },
      { name: 'Vivian', gen: 'Gen 5', expAtk: 444.36, ownDamage: 1.15, globalDamage: 1.30 },
      { name: 'Yang', gen: 'Gen 6', expAtk: 540.43, ownDamage: 1.40, globalDamage: 1.50 },
      { name: 'Wee & Woo', gen: 'Gen 7', expAtk: 650.52, globalAtk: 15, globalLeth: 10, globalDamage: 1.25 },
    ],
  }

  const DEFAULT = { tier: 'tg5-7', heroes: { infantry: 'Amadeus', cavalry: 'Petra', archers: 'Rosa' } }

  function isBattleLab() { return /battle-lab/i.test(location.hash || '') }
  function sectionByText(text) { return [...document.querySelectorAll('section')].find((s) => (s.textContent || '').includes(text)) || null }
  function activeBear() { const b = [...document.querySelectorAll('button')].find((n) => (n.textContent || '').includes('Bear Optimizer')); return !!b && ((b.className || '').includes('border-gold/45') || !!sectionByText('Optimizer Settings') || !!sectionByText('Bear Setup')) }
  function load() { try { return { ...DEFAULT, ...JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}'), heroes: { ...DEFAULT.heroes, ...(JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}').heroes || {}) } } } catch { return JSON.parse(JSON.stringify(DEFAULT)) } }
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

  function selectedHero(type, name) {
    return HEROES[type].find((hero) => hero.name === name) || HEROES[type][0]
  }

  function model() {
    const config = load()
    const heroes = Object.fromEntries(TROOPS.map((t) => [t.key, selectedHero(t.key, config.heroes[t.key])]))
    const globalAtk = Object.values(heroes).reduce((s,h) => s + (h.globalAtk || 0), 0)
    const globalLeth = Object.values(heroes).reduce((s,h) => s + (h.globalLeth || 0), 0)
    const globalDamage = Object.values(heroes).reduce((m,h) => m * (h.globalDamage || 1), 1)
    const cross = { infantry: 1, cavalry: 1, archers: 1 }
    Object.values(heroes).forEach((hero) => Object.entries(hero.crossDamage || {}).forEach(([type,m]) => { cross[type] *= m }))

    const rows = TROOPS.map((troop) => {
      const hero = heroes[troop.key]
      const attack = statValue(troop.label, 0)
      const lethality = statValue(troop.label, 1)
      const attackFactor = 1 + (attack + globalAtk + hero.expAtk + (hero.ownAtk || 0)) / 100
      const lethFactor = 1 + (lethality + globalLeth + (hero.ownLeth || 0)) / 100
      const damageFactor = globalDamage * (hero.ownDamage || 1) * cross[troop.key]
      const coefficient = troop.weight * attackFactor * lethFactor * damageFactor
      return { ...troop, hero, attack, lethality, coefficient, attackFactor, lethFactor, damageFactor }
    })
    const denom = rows.reduce((sum,row) => sum + row.coefficient * row.coefficient, 0) || 1
    rows.forEach((row) => { row.percent = (row.coefficient * row.coefficient / denom) * 100 })
    return { config, heroes, rows, globalAtk, globalLeth, globalDamage }
  }

  function heroOptions(type, selected) {
    return HEROES[type].map((hero) => `<option value="${hero.name.replace(/"/g,'&quot;')}" ${hero.name === selected ? 'selected' : ''}>${hero.name} · ${hero.gen}</option>`).join('')
  }

  function setupHtml(state) {
    return `
      <div style="border:1px solid rgba(212,175,55,.18);border-radius:14px;background:rgba(212,175,55,.035);padding:14px">
        <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(241,231,206,.46)">TROOP TIER / TRUEGOLD STAGE</div>
        <select data-v3-tier style="margin-top:7px;width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.2);border-radius:11px;background:#06152b;padding:11px;color:#f1e7ce;font:700 12px Montserrat,sans-serif">
          <option value="t1-6" ${state.config.tier==='t1-6'?'selected':''}>T1 – T6</option>
          <option value="t7-tg2" ${state.config.tier==='t7-tg2'?'selected':''}>T7 – TG2</option>
          <option value="tg3-4" ${state.config.tier==='tg3-4'?'selected':''}>TG3 – TG4</option>
          <option value="tg5-7" ${state.config.tier==='tg5-7'?'selected':''}>TG5 – TG7</option>
          <option value="tg8" ${state.config.tier==='tg8'?'selected':''}>TG8</option>
          <option value="t11" ${state.config.tier==='t11'?'selected':''}>T11 · War Academy</option>
        </select>
      </div>
      <div data-bear-troop-grid style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:11px">
        ${state.rows.map((row) => `
          <div style="min-width:0;border:1px solid rgba(212,175,55,.14);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
            <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.15em;color:rgba(212,175,55,.55)">${row.short}</div>
            <div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px">
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">ATTACK</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69;overflow:hidden;text-overflow:ellipsis">${row.attack.toFixed(2)}%</div></div>
              <div style="min-width:0;border-radius:9px;background:rgba(2,12,26,.48);padding:8px"><div style="font:700 8px Montserrat,sans-serif;color:rgba(241,231,206,.34)">LETHALITY</div><div style="margin-top:3px;font:800 12px 'JetBrains Mono',monospace;color:#f0cd69;overflow:hidden;text-overflow:ellipsis">${row.lethality.toFixed(2)}%</div></div>
            </div>
            <label style="display:block;margin-top:11px"><span style="display:block;margin-bottom:5px;font:800 9px Montserrat,sans-serif;color:rgba(241,231,206,.42)">LEAD HERO</span><select data-v3-hero="${row.key}" style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.18);border-radius:10px;background:#06152b;padding:10px;color:#f1e7ce;font:700 11px Montserrat,sans-serif">${heroOptions(row.key,state.config.heroes[row.key])}</select></label>
            <div style="margin-top:8px;font:600 9px/1.45 Montserrat,sans-serif;color:rgba(191,219,254,.48)">Hero Expedition ATK +${row.hero.expAtk.toFixed(2)}% · modeled offensive factor ${row.damageFactor.toFixed(3)}×</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:11px;border:1px solid rgba(96,165,250,.12);border-radius:11px;background:rgba(59,130,246,.035);padding:10px 11px;font:500 9px/1.55 Montserrat,sans-serif;color:rgba(191,219,254,.55)">Hero choice now changes the Bear ratio. The current hero model uses documented max Expedition stats and expected-value conversions of offensive Expedition skills; defensive-only skills do not inflate Bear damage.</div>`
  }

  function resultHtml(state) {
    const bars = state.rows.map((row) => `
      <div style="margin-top:13px;border:1px solid rgba(212,175,55,.12);border-radius:14px;background:rgba(255,255,255,.025);padding:13px">
        <div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font:800 9px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(212,175,55,.55)">${row.short}</div><div style="margin-top:2px;font:700 16px Cinzel,serif;color:#f1e7ce">${row.label}</div><div style="margin-top:2px;font:600 9px Montserrat,sans-serif;color:rgba(241,231,206,.38)">${row.hero.name}</div></div><div style="font:800 17px 'JetBrains Mono',monospace;color:#f1e7ce">${row.percent.toFixed(1)}%</div></div>
        <div style="margin-top:10px;height:10px;border-radius:999px;background:#071226;overflow:hidden"><div style="height:100%;width:${Math.max(1,row.percent)}%;background:linear-gradient(90deg,#9e7d1b,#f4d469);border-radius:999px"></div></div>
      </div>`).join('')
    const stacked = state.rows.map((row) => `<div style="height:100%;width:${row.percent}%;background:${row.key==='infantry'?'#c6a43c':row.key==='cavalry'?'#8baed8':'#d58b72'}" title="${row.label} ${row.percent.toFixed(1)}%"></div>`).join('')
    return `
      <div style="font:800 9px Montserrat,sans-serif;letter-spacing:.18em;color:rgba(212,175,55,.65)">RECOMMENDED BEAR RATIO</div>
      <div style="margin-top:4px;font:700 26px Cinzel,serif;color:#f1e7ce">Optimal Split</div>
      <div style="margin-top:15px;height:18px;display:flex;overflow:hidden;border-radius:999px;border:1px solid rgba(212,175,55,.16);background:#071226">${stacked}</div>
      ${bars}
      <div style="margin-top:14px;border:1px solid rgba(212,175,55,.10);border-radius:12px;padding:11px;font:600 10px/1.55 'JetBrains Mono',monospace;color:rgba(241,231,206,.55)">${state.rows.map((r)=>`${r.short} ${r.percent.toFixed(1)}%`).join(' · ')}</div>`
  }

  function bindSetup(setup) {
    setup.querySelector('[data-v3-tier]')?.addEventListener('change', (e) => { const c=load(); c.tier=e.target.value; save(c) })
    setup.querySelectorAll('[data-v3-hero]').forEach((select) => select.addEventListener('change', (e) => { const c=load(); c.heroes[e.target.dataset.v3Hero]=e.target.value; save(c) }))
  }

  function render() {
    if (!isBattleLab() || !activeBear()) return
    const settings = sectionByText('Optimizer Settings') || sectionByText('Bear Setup')
    if (!settings) return
    const state = model()

    const heading = [...settings.querySelectorAll('h2')].find((n) => /Optimizer Settings|Bear Setup/.test(n.textContent || ''))
    if (heading) heading.textContent = 'Bear Setup'
    ;[...settings.children].forEach((child) => { if (child.id !== SETUP_ID && !child.querySelector?.(`#${SETUP_ID}`) && !(child.querySelector?.('h2') || /Bear Hunt/.test(child.textContent || ''))) child.style.display='none' })

    let setup = document.getElementById(SETUP_ID)
    if (!setup) { setup=document.createElement('div'); setup.id=SETUP_ID; setup.style.marginTop='16px'; settings.appendChild(setup) }
    setup.innerHTML = setupHtml(state)
    bindSetup(setup)

    const legacyResult = [...document.querySelectorAll('section')].find((s) => (s.textContent || '').includes('Optimal Split') && !s.id)
    if (legacyResult) legacyResult.style.display='none'
    let result = document.getElementById(RESULT_ID)
    if (!result) { result=document.createElement('section'); result.id=RESULT_ID; result.className='panel panel-glow p-5 md:p-6'; settings.parentElement?.appendChild(result) }
    result.innerHTML = resultHtml(state)
  }

  let queued=false
  const observer=new MutationObserver(()=>{ if(queued)return; queued=true; requestAnimationFrame(()=>{queued=false; render()}) })
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})
  document.addEventListener('input',()=>setTimeout(render,40),true)
  document.addEventListener('change',()=>setTimeout(render,40),true)
  document.addEventListener('click',()=>setTimeout(render,80),true)
  window.addEventListener('hashchange',()=>setTimeout(render,180))
  setTimeout(render,600)
})()
