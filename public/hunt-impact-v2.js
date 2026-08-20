(() => {
  const PANEL_ID = 'k846-hunt-impact-v2'
  const STYLE_ID = 'k846-hunt-impact-v2-style'
  const SIMULATIONS = 10000
  const TIER_MULT = { T1: .68, T2: .72, T3: .76, T4: .80, T5: .84, T6: .88, T7: .92, T8: .96, T9: 1, T10: 1.05, T11: 1.10, TG1: 1.12, TG2: 1.14, TG3: 1.16, TG4: 1.18, TG5: 1.20, TG6: 1.22, TG7: 1.24, TG8: 1.26 }
  const WEIGHTS = { infantry: .95, cavalry: 1.02, archers: 1.10 }
  const DAMAGE_SCALE = 3.62

  function n(v, f = 0) { const x = Number(v); return Number.isFinite(x) ? x : f }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
  function fmtM(v) { return `${(v / 1e6).toFixed(2)}M` }
  function normalRandom() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  function styles() {
    if (document.getElementById(STYLE_ID)) return
    const s = document.createElement('style')
    s.id = STYLE_ID
    s.textContent = `
      #${PANEL_ID}{margin-top:18px;color:#f1e7ce;font-family:Montserrat,system-ui,sans-serif}
      #${PANEL_ID} *{box-sizing:border-box}
      #${PANEL_ID} .hi-shell{border:1px solid rgba(212,175,55,.18);border-radius:22px;background:linear-gradient(145deg,rgba(15,29,52,.96),rgba(6,17,33,.98));overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.25)}
      #${PANEL_ID} .hi-head{padding:20px;border-bottom:1px solid rgba(212,175,55,.12);background:radial-gradient(circle at 12% 0%,rgba(212,175,55,.10),transparent 40%)}
      #${PANEL_ID} .hi-kicker{font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:rgba(232,199,102,.62)}
      #${PANEL_ID} h3{margin:4px 0 5px;font-family:Cinzel,serif;font-size:23px;color:#f3dfaa}
      #${PANEL_ID} .hi-sub{margin:0;font-size:11px;line-height:1.55;color:rgba(241,231,206,.48)}
      #${PANEL_ID} .hi-body{padding:18px}
      #${PANEL_ID} .hi-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      #${PANEL_ID} button{border:1px solid rgba(212,175,55,.20);border-radius:10px;background:rgba(255,255,255,.035);color:#ead89f;padding:9px 12px;font-size:10px;font-weight:800;cursor:pointer}
      #${PANEL_ID} button.primary{background:linear-gradient(180deg,#e5c24c,#a77b12);color:#071224;border-color:rgba(240,205,105,.50)}
      #${PANEL_ID} .hi-grid{display:grid;gap:10px}
      #${PANEL_ID} .hi-troop{border:1px solid rgba(212,175,55,.10);border-radius:16px;background:rgba(255,255,255,.022);padding:13px}
      #${PANEL_ID} .hi-troop-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-family:Cinzel,serif;font-size:13px;font-weight:800;color:#f0d894}
      #${PANEL_ID} .hi-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #${PANEL_ID} label span{display:block;margin-bottom:4px;font-size:8px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;color:rgba(241,231,206,.35)}
      #${PANEL_ID} input,#${PANEL_ID} select{width:100%;border:1px solid rgba(212,175,55,.15);border-radius:9px;background:#091427;color:#f1e7ce;padding:9px 10px;font-size:12px;font-weight:700;outline:none}
      #${PANEL_ID} input:focus,#${PANEL_ID} select:focus{border-color:rgba(232,199,102,.5);box-shadow:0 0 0 2px rgba(212,175,55,.07)}
      #${PANEL_ID} .hi-global{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
      #${PANEL_ID} .hi-joiners{margin-top:10px;border:1px solid rgba(212,175,55,.10);border-radius:16px;padding:12px;background:rgba(0,0,0,.10)}
      #${PANEL_ID} .hi-joiner-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #${PANEL_ID} .hi-results{margin-top:16px;display:none}
      #${PANEL_ID} .hi-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #${PANEL_ID} .hi-metric{border:1px solid rgba(212,175,55,.12);border-radius:14px;background:rgba(255,255,255,.025);padding:12px}
      #${PANEL_ID} .hi-metric b{display:block;font-family:JetBrains Mono,monospace;font-size:18px;color:#f0cd69;margin-top:4px}
      #${PANEL_ID} .hi-metric small{font-size:8px;letter-spacing:.10em;text-transform:uppercase;color:rgba(241,231,206,.32)}
      #${PANEL_ID} .hi-chart{margin-top:12px;border:1px solid rgba(212,175,55,.13);border-radius:16px;background:linear-gradient(180deg,#071225,#09172a);padding:14px}
      #${PANEL_ID} .hi-chart-head{display:flex;justify-content:space-between;gap:10px;align-items:end;margin-bottom:10px}
      #${PANEL_ID} .hi-chart-title{font-family:Cinzel,serif;font-size:14px;color:#ead89f}
      #${PANEL_ID} .hi-chart-note{font-size:9px;color:rgba(241,231,206,.35)}
      #${PANEL_ID} .hi-bars{height:170px;display:flex;align-items:end;gap:4px;padding:8px 2px 0;border-bottom:1px solid rgba(232,199,102,.18)}
      #${PANEL_ID} .hi-bar{flex:1;min-width:3px;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,#f3d66a,#8c6410);opacity:.9;position:relative}
      #${PANEL_ID} .hi-bar.mean{box-shadow:0 0 0 2px #f1e7ce inset,0 0 14px rgba(240,205,105,.45)}
      #${PANEL_ID} .hi-axis{display:flex;justify-content:space-between;margin-top:6px;font:9px JetBrains Mono,monospace;color:rgba(241,231,206,.35)}
      #${PANEL_ID} .hi-range{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #${PANEL_ID} .hi-range div{border-radius:11px;background:rgba(212,175,55,.045);padding:10px;font-size:10px;color:rgba(241,231,206,.55)}
      #${PANEL_ID} .hi-range b{display:block;margin-top:3px;color:#ead89f;font:600 12px JetBrains Mono,monospace}
      #${PANEL_ID} .hi-disclaimer{margin-top:10px;border:1px solid rgba(88,166,255,.12);border-radius:11px;background:rgba(88,166,255,.035);padding:10px;font-size:9px;line-height:1.5;color:rgba(199,225,255,.48)}
      @media(max-width:640px){#${PANEL_ID} .hi-metrics{grid-template-columns:1fr}#${PANEL_ID} .hi-fields,#${PANEL_ID} .hi-global,#${PANEL_ID} .hi-joiner-grid{grid-template-columns:1fr 1fr}#${PANEL_ID} h3{font-size:20px}}
    `
    document.head.appendChild(s)
  }

  function findImpactSection() {
    const h = [...document.querySelectorAll('h1,h2,h3')].find(x => /Impact Comparison/i.test((x.textContent || '').trim()))
    return h?.closest('section') || null
  }

  function readSharedStats() {
    const section = [...document.querySelectorAll('section')].find(s => /Combat Stats/i.test(s.textContent || ''))
    if (!section) return null
    const out = {}
    ;['Infantry','Cavalry','Archers'].forEach(label => {
      const card = [...section.querySelectorAll('div')].find(d => (d.textContent || '').trim().startsWith(label) && d.querySelectorAll('input').length >= 2)
      if (!card) return
      const inputs = card.querySelectorAll('input')
      out[label.toLowerCase()] = { attack: n(inputs[0]?.value), lethality: n(inputs[1]?.value) }
    })
    return out
  }

  function template() {
    const troop = (key, title, defaults) => `
      <div class="hi-troop" data-troop="${key}">
        <div class="hi-troop-title"><span>${title}</span><span>${key === 'archers' ? 'ARC' : key === 'cavalry' ? 'CAV' : 'INF'}</span></div>
        <div class="hi-fields">
          <label><span>Troops</span><input data-f="count" type="number" min="0" step="1000" value="250000"></label>
          <label><span>Lead hero</span><input data-f="hero" type="text" value="${defaults.hero}"></label>
          <label><span>Attack %</span><input data-f="attack" type="number" min="0" step="0.1" value="${defaults.attack}"></label>
          <label><span>Lethality %</span><input data-f="lethality" type="number" min="0" step="0.1" value="${defaults.lethality}"></label>
          <label><span>Widget bonus %</span><input data-f="widget" type="number" min="0" step="0.1" value="0"></label>
          <label><span>Hero skill bonus %</span><input data-f="heroBonus" type="number" step="0.1" value="0"></label>
        </div>
      </div>`
    return `
      <div class="hi-shell">
        <div class="hi-head"><div class="hi-kicker">Hunt Impact · Bear Damage Forecast</div><h3>Damage Probability Forecast</h3><p class="hi-sub">Model thousands of Bear outcomes from troop counts, leader Attack/Lethality, lead heroes, widget bonuses, troop tier and joiner effects.</p></div>
        <div class="hi-body">
          <div class="hi-actions"><button type="button" data-action="pull">Use Rally Bonus stats</button><button type="button" data-action="simulate" class="primary">Run 10,000 Hunts</button></div>
          <div class="hi-grid">
            ${troop('infantry','Infantry',{attack:1620,lethality:1455.8,hero:'Zoe'})}
            ${troop('cavalry','Cavalry',{attack:1538.8,lethality:1342.6,hero:'Petra'})}
            ${troop('archers','Archers',{attack:1766.9,lethality:1515.2,hero:'Marlin'})}
          </div>
          <div class="hi-global">
            <label><span>Troop tier</span><select data-global="tier">${Object.keys(TIER_MULT).map(t => `<option ${t==='T10'?'selected':''}>${t}</option>`).join('')}</select></label>
            <label><span>Battle variance %</span><input data-global="variance" type="number" min="1" max="35" step="0.5" value="10.5"></label>
          </div>
          <div class="hi-joiners"><div class="hi-troop-title"><span>Joiner Skills</span><span>1–4</span></div><div class="hi-joiner-grid">
            ${[1,2,3,4].map(i => `<label><span>Joiner ${i} bonus %</span><input data-joiner="${i}" type="number" step="0.1" value="0" placeholder="0"></label>`).join('')}
          </div>
          <div class="hi-results">
            <div class="hi-metrics">
              <div class="hi-metric"><small>Expected Damage</small><b data-out="mean">—</b></div>
              <div class="hi-metric"><small>Likely Range (80%)</small><b data-out="range">—</b></div>
              <div class="hi-metric"><small>High Roll (95th)</small><b data-out="p95">—</b></div>
            </div>
            <div class="hi-chart"><div class="hi-chart-head"><div><div class="hi-kicker">Kingdom 846 Forecast</div><div class="hi-chart-title">Damage Probability Bands</div></div><div class="hi-chart-note">10,000 simulated hunts</div></div><div class="hi-bars"></div><div class="hi-axis"><span data-out="axisMin">—</span><span>Damage</span><span data-out="axisMax">—</span></div><div class="hi-range"><div>Low roll (10th)<b data-out="p10">—</b></div><div>Median result<b data-out="p50">—</b></div></div></div>
            <div class="hi-disclaimer">This is Kingdom846's independently implemented probabilistic Bear model. It is calibrated from observed Battle/Frakinator examples, but it should be treated as a forecast until additional known input/output cases are supplied for tighter calibration.</div>
          </div>
        </div>
      </div>`
  }

  function values(panel) {
    const troops = {}
    panel.querySelectorAll('[data-troop]').forEach(card => {
      const key = card.dataset.troop
      const g = f => card.querySelector(`[data-f="${f}"]`)
      troops[key] = { count:n(g('count')?.value), attack:n(g('attack')?.value), lethality:n(g('lethality')?.value), widget:n(g('widget')?.value), heroBonus:n(g('heroBonus')?.value) }
    })
    const tier = panel.querySelector('[data-global="tier"]')?.value || 'T10'
    const variance = clamp(n(panel.querySelector('[data-global="variance"]')?.value,10.5),1,35) / 100
    const joinerBonus = [...panel.querySelectorAll('[data-joiner]')].reduce((s,x)=>s+n(x.value),0)
    return { troops, tier, variance, joinerBonus }
  }

  function baseDamage(v) {
    let total = 0
    Object.entries(v.troops).forEach(([key,t]) => {
      const atk = 1 + Math.max(0,t.attack + t.widget) / 100
      const letf = 1 + Math.max(0,t.lethality + t.widget) / 100
      const hero = 1 + t.heroBonus / 100
      total += Math.max(0,t.count) * atk * letf * hero * WEIGHTS[key]
    })
    const tier = TIER_MULT[v.tier] || 1
    const join = 1 + v.joinerBonus / 100
    return total * tier * join * DAMAGE_SCALE
  }

  function simulate(panel) {
    const v = values(panel)
    const base = baseDamage(v)
    const arr = new Array(SIMULATIONS)
    for (let i=0;i<SIMULATIONS;i++) {
      const z = normalRandom()
      const tail = Math.random() < .09 ? Math.abs(normalRandom()) * v.variance * .55 : 0
      arr[i] = Math.max(0, base * (1 + z * v.variance + tail))
    }
    arr.sort((a,b)=>a-b)
    const mean = arr.reduce((s,x)=>s+x,0)/arr.length
    const q = p => arr[Math.min(arr.length-1,Math.max(0,Math.floor((arr.length-1)*p)))]
    const p10=q(.10), p50=q(.50), p90=q(.90), p95=q(.95)
    panel.querySelector('[data-out="mean"]').textContent = fmtM(mean)
    panel.querySelector('[data-out="range"]').textContent = `${fmtM(p10)}–${fmtM(p90)}`
    panel.querySelector('[data-out="p95"]').textContent = fmtM(p95)
    panel.querySelector('[data-out="p10"]').textContent = fmtM(p10)
    panel.querySelector('[data-out="p50"]').textContent = fmtM(p50)
    panel.querySelector('[data-out="axisMin"]').textContent = fmtM(arr[0])
    panel.querySelector('[data-out="axisMax"]').textContent = fmtM(arr[arr.length-1])

    const bins = 22, min=arr[0], max=arr[arr.length-1], span=Math.max(1,max-min), counts=Array(bins).fill(0)
    arr.forEach(x => { const idx=Math.min(bins-1,Math.floor((x-min)/span*bins)); counts[idx]++ })
    const maxC=Math.max(...counts,1), meanIdx=Math.min(bins-1,Math.max(0,Math.floor((mean-min)/span*bins)))
    panel.querySelector('.hi-bars').innerHTML = counts.map((c,i)=>`<div class="hi-bar ${i===meanIdx?'mean':''}" style="height:${Math.max(3,c/maxC*100)}%" title="${((c/SIMULATIONS)*100).toFixed(1)}%"></div>`).join('')
    panel.querySelector('.hi-results').style.display='block'
  }

  function pull(panel) {
    const stats = readSharedStats(); if (!stats) return
    Object.entries(stats).forEach(([key,s]) => {
      const card=panel.querySelector(`[data-troop="${key}"]`) || panel.querySelector(`[data-troop="${key==='archers'?'archers':key}"]`)
      if (!card) return
      card.querySelector('[data-f="attack"]').value=s.attack
      card.querySelector('[data-f="lethality"]').value=s.lethality
    })
  }

  function mount() {
    styles()
    const section = findImpactSection()
    if (!section) { document.getElementById(PANEL_ID)?.remove(); return }
    if (document.getElementById(PANEL_ID)) return
    // Hide the legacy impact controls but leave React mounted beneath.
    ;[...section.children].forEach((child,idx)=>{ if(idx>0) child.style.display='none' })
    const host=document.createElement('div'); host.id=PANEL_ID; host.innerHTML=template(); section.appendChild(host)
    host.querySelector('[data-action="simulate"]').addEventListener('click',()=>simulate(host))
    host.querySelector('[data-action="pull"]').addEventListener('click',()=>pull(host))
    setTimeout(()=>simulate(host),120)
  }

  const obs=new MutationObserver(()=>mount())
  obs.observe(document.documentElement,{subtree:true,childList:true})
  window.addEventListener('hashchange',()=>setTimeout(mount,80))
  document.addEventListener('DOMContentLoaded',mount)
  setInterval(mount,900)
})()
