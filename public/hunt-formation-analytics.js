(() => {
  const ID = 'k846-formation-analytics'
  const STYLE_ID = 'k846-formation-analytics-style'
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim()
  const num = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const TYPES = ['infantry', 'cavalry', 'archers']
  const COLORS = { infantry: '#78a9f3', cavalry: '#e3ba41', archers: '#dc6a5e' }
  const WEIGHTS = { infantry: 1 / 3, cavalry: 1, archers: 4 / 3 }
  const HERO = {
    Alcar: { infantry: 2.80, cavalry: 1.10, archers: 1.10 },
    Margot: { infantry: 1, cavalry: 1.50, archers: 1 },
    Thrud: { infantry: 1.15, cavalry: 1.00, archers: 1.15 },
    Rosa: { infantry: 1, cavalry: 1, archers: 1.30 },
    Vivian: { infantry: 1, cavalry: 1, archers: 1.15 },
    Yang: { infantry: 1, cavalry: 1, archers: 1.35 },
  }

  function section(title) {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(x => clean(x.textContent).toLowerCase() === title.toLowerCase())
    return h?.closest('section') || null
  }
  function controlValue(c) {
    if (!c) return ''
    if (c.tagName === 'SELECT') return clean(c.options[c.selectedIndex]?.text || c.value)
    return clean(c.value)
  }
  function troopBlock(root, name) {
    const exact = new RegExp('^' + name + '$', 'i')
    const nodes = [...root.querySelectorAll('div,span,strong,h3,h4')].filter(n => exact.test(clean(n.textContent)))
    for (const node of nodes) {
      let p = node
      for (let i = 0; i < 6 && p && p !== root; i++, p = p.parentElement) {
        const cs = p.querySelectorAll('input,select')
        if (cs.length === 3) return p
      }
    }
    return null
  }
  function troopInput(root, name) {
    const b = troopBlock(root, name)
    if (!b) return { attack: 0, lethality: 0, hero: 'None' }
    const cs = [...b.querySelectorAll('input,select')]
    return { attack: num(controlValue(cs[0])), lethality: num(controlValue(cs[1])), hero: controlValue(cs[2]) || 'None' }
  }
  function tierValue(root) {
    for (const lab of root.querySelectorAll('label')) {
      const t = clean(lab.querySelector('span')?.textContent || lab.textContent)
      if (/^Troop Tier$/i.test(t)) return controlValue(lab.querySelector('select,input')) || 'T10'
    }
    return 'T10'
  }
  function pct(root, name) {
    const text = clean(root.textContent)
    const m = text.match(new RegExp(name + '\\s*([0-9.]+)%', 'i'))
    return m ? num(m[1]) : 0
  }
  function attackFactor(s) { return (1 + Math.max(0, s.attack) / 100) * (1 + Math.max(0, s.lethality) / 100) }
  function heroMultipliers(inputs) {
    const out = { infantry: 1, cavalry: 1, archers: 1 }
    TYPES.forEach(slot => {
      const m = HERO[inputs[slot].hero] || { infantry: 1, cavalry: 1, archers: 1 }
      TYPES.forEach(t => out[t] *= m[t])
    })
    return out
  }
  function coefficients(inputs, tier) {
    const hm = heroMultipliers(inputs)
    const postT6 = !/^T1-T6$/i.test(tier)
    const arcMult = 1.1 * (postT6 ? 1.1 : 1)
    return {
      infantry: attackFactor(inputs.infantry) * WEIGHTS.infantry * hm.infantry,
      cavalry: attackFactor(inputs.cavalry) * WEIGHTS.cavalry * hm.cavalry,
      archers: attackFactor(inputs.archers) * WEIGHTS.archers * arcMult * hm.archers,
    }
  }
  function normalize(r) {
    const s = TYPES.reduce((a, k) => a + Math.max(0, r[k] || 0), 0) || 1
    return Object.fromEntries(TYPES.map(k => [k, Math.max(0, r[k] || 0) / s]))
  }
  function score(coeff, ratio) {
    const r = normalize(ratio)
    return TYPES.reduce((s, k) => s + coeff[k] * Math.sqrt(r[k]), 0)
  }
  function shiftRatio(opt, target, delta) {
    const r = { ...opt }
    r[target] = clamp(r[target] + delta / 100, 0, 1)
    const others = TYPES.filter(k => k !== target)
    const rem = 1 - r[target]
    const base = others.reduce((s, k) => s + opt[k], 0)
    if (base > 0) others.forEach(k => r[k] = rem * opt[k] / base)
    else others.forEach(k => r[k] = rem / 2)
    return r
  }
  function smoothPath(points) {
    if (!points.length) return ''
    if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
    let d = `M${points[0][0]},${points[0][1]}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
    }
    return d
  }
  function styles() {
    if (document.getElementById(STYLE_ID)) return
    const s = document.createElement('style')
    s.id = STYLE_ID
    s.textContent = `
      #${ID}{margin-top:1rem;display:grid;gap:1rem}.k846-fa-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.k846-fa-card{border:1px solid rgba(226,199,125,.16);background:#07101e;border-radius:1rem;padding:1rem}.k846-fa-label{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:rgba(244,236,211,.42);font-weight:800}.k846-fa-value{margin-top:.3rem;font:800 1.15rem JetBrains Mono,monospace;color:#f5d778}.k846-fa-stack{height:18px;display:flex;overflow:hidden;border:1px solid rgba(226,199,125,.18);background:#111b2a;margin-top:.85rem}.k846-fa-stack>span{height:100%;display:block}.k846-fa-legend{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.6rem;font-size:10px;font-weight:800}.k846-fa-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:1rem}.k846-fa-title{font:700 15px Cinzel,serif;color:#f4eddc}.k846-fa-sub{margin-top:.2rem;font-size:10px;color:rgba(244,236,211,.42)}.k846-fa-svg{width:100%;margin-top:.65rem}.k846-fa-strength{display:grid;gap:.85rem;margin-top:1rem}.k846-fa-strength-row{display:grid;grid-template-columns:80px 1fr 48px;gap:.65rem;align-items:center;font-size:10px}.k846-fa-track{height:9px;background:rgba(255,255,255,.05);overflow:hidden;border-radius:99px}.k846-fa-fill{height:100%;border-radius:99px}.k846-fa-note{font-size:10px;line-height:1.55;color:rgba(244,236,211,.46)}
      @media(max-width:900px){.k846-fa-grid{grid-template-columns:1fr}.k846-fa-kpis{grid-template-columns:1fr}.k846-fa-strength-row{grid-template-columns:72px 1fr 42px}}
    `
    document.head.appendChild(s)
  }
  function hideOldDonut(out) {
    const title = [...out.querySelectorAll('div')].find(x => clean(x.textContent) === 'Optimal Distribution')
    if (!title) return
    let p = title
    while (p && p !== out) {
      const c = String(p.className || '')
      if (c.includes('rounded-2xl') && c.includes('border')) { p.style.display = 'none'; return }
      p = p.parentElement
    }
  }
  function render() {
    styles()
    const input = section('Rally Bonus Report'), out = section('Optimal Troop Split')
    if (!input || !out) return
    const pi = pct(out, 'Infantry'), pc = pct(out, 'Cavalry'), pa = pct(out, 'Archers')
    if (!(pi + pc + pa > 99)) { document.getElementById(ID)?.remove(); return }
    const inputs = {
      infantry: troopInput(input, 'Infantry'),
      cavalry: troopInput(input, 'Cavalry'),
      archers: troopInput(input, 'Archers'),
    }
    const tier = tierValue(input)
    const sig = JSON.stringify({ inputs, tier, pi, pc, pa })
    const old = document.getElementById(ID)
    if (old?.dataset.sig === sig) return
    old?.remove()
    hideOldDonut(out)

    const opt = normalize({ infantry: pi / 100, cavalry: pc / 100, archers: pa / 100 })
    const coeff = coefficients(inputs, tier)
    const optScore = score(coeff, opt)
    const balancedScore = score(coeff, { infantry: 1/3, cavalry: 1/3, archers: 1/3 })
    const gain = balancedScore > 0 ? (optScore / balancedScore - 1) * 100 : 0
    const maxCoeff = Math.max(...Object.values(coeff), 1e-9)
    const strength = Object.fromEntries(TYPES.map(k => [k, coeff[k] / maxCoeff * 100]))

    const deltas = [-20,-15,-10,-5,0,5,10,15,20]
    const curves = Object.fromEntries(TYPES.map(k => [k, deltas.map(d => ({ d, v: optScore > 0 ? score(coeff, shiftRatio(opt, k, d)) / optScore * 100 : 0 }))]))
    const vals = TYPES.flatMap(k => curves[k].map(p => p.v))
    const yMin = Math.max(0, Math.floor(Math.min(...vals) - 2))
    const yMax = 101
    const W=680,H=260,L=48,R=18,T=20,B=40
    const x=d=>L+(d+20)/40*(W-L-R)
    const y=v=>H-B-(v-yMin)/Math.max(.001,yMax-yMin)*(H-T-B)
    const paths = Object.fromEntries(TYPES.map(k => [k, smoothPath(curves[k].map(p => [x(p.d), y(p.v)]))]))

    const root = document.createElement('div')
    root.id = ID
    root.dataset.sig = sig
    root.innerHTML = `
      <div class="k846-fa-kpis">
        <div class="k846-fa-card"><div class="k846-fa-label">Best Formation · INF / CAV / ARC</div><div class="k846-fa-value">${Math.round(pi)} / ${Math.round(pc)} / ${Math.round(pa)}</div></div>
        <div class="k846-fa-card"><div class="k846-fa-label">Troop Tier</div><div class="k846-fa-value">${tier}</div></div>
        <div class="k846-fa-card"><div class="k846-fa-label">Optimization Gain vs 33/33/34</div><div class="k846-fa-value">+${gain.toFixed(2)}%</div></div>
      </div>
      <div class="k846-fa-card">
        <div class="k846-fa-title">Optimal Distribution</div>
        <div class="k846-fa-sub">Recommended deployment generated by the live Hunt Formation model.</div>
        <div class="k846-fa-stack"><span style="width:${pi}%;background:${COLORS.infantry}"></span><span style="width:${pc}%;background:${COLORS.cavalry}"></span><span style="width:${pa}%;background:${COLORS.archers}"></span></div>
        <div class="k846-fa-legend"><div style="color:${COLORS.infantry}">INF ${pi.toFixed(2)}%</div><div style="color:${COLORS.cavalry};text-align:center">CAV ${pc.toFixed(2)}%</div><div style="color:${COLORS.archers};text-align:right">ARC ${pa.toFixed(2)}%</div></div>
      </div>
      <div class="k846-fa-grid">
        <div class="k846-fa-card">
          <div class="k846-fa-title">Formation Response Curve</div>
          <div class="k846-fa-sub">Relative effectiveness as each troop share moves ±20 percentage points from the calculated optimum.</div>
          <svg class="k846-fa-svg" viewBox="0 0 ${W} ${H}" aria-label="Formation response curve">
            ${[0,.25,.5,.75,1].map(t=>`<line x1="${L}" x2="${W-R}" y1="${T+t*(H-T-B)}" y2="${T+t*(H-T-B)}" stroke="rgba(226,199,125,.09)"/>`).join('')}
            <line x1="${x(0)}" x2="${x(0)}" y1="${T}" y2="${H-B}" stroke="rgba(245,215,120,.55)" stroke-dasharray="5 5"/>
            <path d="${paths.infantry}" fill="none" stroke="${COLORS.infantry}" stroke-width="3"/>
            <path d="${paths.cavalry}" fill="none" stroke="${COLORS.cavalry}" stroke-width="3"/>
            <path d="${paths.archers}" fill="none" stroke="${COLORS.archers}" stroke-width="3"/>
            ${[-20,-10,0,10,20].map(d=>`<text x="${x(d)}" y="${H-12}" text-anchor="middle" fill="rgba(244,236,211,.46)" font-size="10">${d>0?'+':''}${d}%</text>`).join('')}
            <text x="${x(0)}" y="14" text-anchor="middle" fill="#f5d778" font-size="10" font-weight="700">OPTIMAL</text>
          </svg>
          <div class="k846-fa-legend"><div style="color:${COLORS.infantry}">● Infantry</div><div style="color:${COLORS.cavalry};text-align:center">● Cavalry</div><div style="color:${COLORS.archers};text-align:right">● Archers</div></div>
        </div>
        <div class="k846-fa-card">
          <div class="k846-fa-title">Troop Combat Strength</div>
          <div class="k846-fa-sub">Relative formation coefficient after Attack, Lethality, troop weighting, tier and selected lead-hero effects.</div>
          <div class="k846-fa-strength">
            ${TYPES.map(k=>`<div class="k846-fa-strength-row"><b style="color:${COLORS[k]}">${k==='infantry'?'INF':k==='cavalry'?'CAV':'ARC'}</b><div class="k846-fa-track"><div class="k846-fa-fill" style="width:${strength[k].toFixed(1)}%;background:${COLORS[k]}"></div></div><span style="color:${COLORS[k]};font-family:JetBrains Mono,monospace">${strength[k].toFixed(0)}</span></div>`).join('')}
          </div>
          <div class="k846-fa-note" style="margin-top:1rem">100 represents the strongest troop coefficient in this specific report. This is a relative optimization metric, not fabricated Bear damage.</div>
        </div>
      </div>
    `
    const copy = [...out.querySelectorAll('button')].find(b => /copy hunt formation/i.test(clean(b.textContent)))
    if (copy) copy.insertAdjacentElement('beforebegin', root)
    else out.appendChild(root)
  }

  let timer
  const sync = () => { clearTimeout(timer); timer = setTimeout(render, 120) }
  new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] })
  document.addEventListener('change', sync, true)
  document.addEventListener('input', sync, true)
  document.addEventListener('DOMContentLoaded', sync)
  setTimeout(render, 400)
})()
