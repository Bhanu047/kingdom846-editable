(() => {
  const UPLOAD_ID = 'k846-hunt-report-upload'
  const COMPASS_ID = 'k846-hunt-formation-compass'

  function onBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function findCombatSection() {
    if (!onBattleLab()) return null
    const heading = [...document.querySelectorAll('h1,h2,h3')].find((node) => /^combat\s+stats$/i.test((node.textContent || '').trim()))
    return heading?.closest('section') || null
  }

  function setReactInput(input, value) {
    if (!input || value === '' || value == null || !Number.isFinite(Number(value))) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (setter) setter.call(input, String(value))
    else input.value = String(value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function ensureUploadButton() {
    const section = findCombatSection()
    const existing = document.getElementById(UPLOAD_ID)
    if (!section) {
      existing?.remove()
      return
    }
    if (existing && section.contains(existing)) return
    existing?.remove()

    const wrap = document.createElement('div')
    wrap.id = UPLOAD_ID
    wrap.className = 'mt-4 rounded-2xl border border-gold/20 bg-gold/[0.035] p-4'
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(232,199,102,.62)">Rally Bonus Report</div>
          <div style="margin-top:3px;font-family:Cinzel,serif;font-size:15px;font-weight:800;color:#f1e7ce">Upload Screenshot</div>
          <div style="margin-top:3px;font-size:10px;line-height:1.45;color:rgba(241,231,206,.42)">Upload your Kingshot Rally Bonus screenshot. Review the detected values before applying them.</div>
        </div>
        <button type="button" data-k846-upload style="border:1px solid rgba(232,199,102,.42);border-radius:12px;background:linear-gradient(180deg,#efd56d,#b88c20);color:#091426;font-family:Cinzel,serif;font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;padding:11px 15px;cursor:pointer;white-space:nowrap">Upload Report</button>
      </div>`
    wrap.querySelector('[data-k846-upload]')?.addEventListener('click', () => {
      if (window.__k846BattleLabImport?.open) window.__k846BattleLabImport.open()
      else alert('Report reader is still loading. Please try again in a moment.')
    })

    const firstTroop = section.querySelector('.mt-4.space-y-3') || section.children[2]
    if (firstTroop) section.insertBefore(wrap, firstTroop)
    else section.appendChild(wrap)
  }

  function readImportValues(modal) {
    const read = (name) => {
      const raw = modal.querySelector(`[data-field="${name}"]`)?.value
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return {
      infantryAttack: read('infantry.attack'),
      infantryLethality: read('infantry.lethality'),
      cavalryAttack: read('cavalry.attack'),
      cavalryLethality: read('cavalry.lethality'),
      archersAttack: read('archers.attack'),
      archersLethality: read('archers.lethality'),
      capacity: read('capacity'),
    }
  }

  function applyImportToHunt(values) {
    const section = findCombatSection()
    if (!section) return
    const inputs = [...section.querySelectorAll('input[type="number"]')]
    const ordered = [
      values.infantryAttack,
      values.infantryLethality,
      values.cavalryAttack,
      values.cavalryLethality,
      values.archersAttack,
      values.archersLethality,
    ]
    ordered.forEach((value, index) => setReactInput(inputs[index], value))
    if (values.capacity != null) setReactInput(inputs[6], values.capacity)
  }

  document.addEventListener('click', (event) => {
    const apply = event.target?.closest?.('#k846-battle-import-modal [data-action="apply"]')
    if (!apply) return
    const modal = document.getElementById('k846-battle-import-modal')
    if (!modal) return
    const values = readImportValues(modal)
    requestAnimationFrame(() => applyImportToHunt(values))
  }, true)

  function point(cx, cy, angle, radius) {
    const rad = angle * Math.PI / 180
    return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius }
  }

  function polygonPoints(values, radius, cx = 180, cy = 180) {
    const angles = [-90, 30, 150]
    return values.map((value, index) => {
      const p = point(cx, cy, angles[index], radius * Math.max(0.08, value / 100))
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    }).join(' ')
  }

  function createCompass(best) {
    const [inf, cav, arc] = best
    const max = Math.max(inf, cav, arc)
    const leader = max === inf ? 'Infantry' : max === cav ? 'Cavalry' : 'Archers'
    const polygon = polygonPoints(best, 118)
    const typical = polygonPoints([10, 10, 80], 118)
    return `
      <div class="overflow-hidden rounded-2xl border border-gold/20 bg-[radial-gradient(circle_at_50%_25%,rgba(212,175,55,.09),transparent_42%),#07101e] p-4 md:p-5">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <div style="font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(232,199,102,.6)">Royal Tactical Readout</div>
            <div style="margin-top:3px;font-family:Cinzel,serif;font-size:19px;font-weight:800;color:#f1e7ce">Formation Compass</div>
            <div style="margin-top:4px;font-size:10px;color:rgba(241,231,206,.42)">A Kingdom846 view of your optimal Bear formation.</div>
          </div>
          <div style="border:1px solid rgba(232,199,102,.24);border-radius:999px;background:rgba(212,175,55,.07);padding:7px 11px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:800;color:#f0cd69">${inf}/${cav}/${arc}</div>
        </div>
        <div style="margin-top:14px;display:grid;gap:14px;grid-template-columns:minmax(0,1fr)">
          <div style="border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(0,0,0,.12));padding:8px">
            <svg viewBox="0 0 360 360" style="display:block;width:100%;height:auto;max-height:390px" role="img" aria-label="Kingdom846 Formation Compass">
              <defs>
                <radialGradient id="k846CompassGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#d4af37" stop-opacity=".26"/><stop offset="100%" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
                <linearGradient id="k846CompassFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0cd69" stop-opacity=".72"/><stop offset="100%" stop-color="#8da7d6" stop-opacity=".32"/></linearGradient>
              </defs>
              <circle cx="180" cy="180" r="150" fill="url(#k846CompassGlow)"/>
              <circle cx="180" cy="180" r="118" fill="none" stroke="#d4af37" stroke-opacity=".20" stroke-width="1"/>
              <circle cx="180" cy="180" r="82" fill="none" stroke="#d4af37" stroke-opacity=".14" stroke-width="1" stroke-dasharray="4 6"/>
              <circle cx="180" cy="180" r="46" fill="none" stroke="#d4af37" stroke-opacity=".12" stroke-width="1" stroke-dasharray="3 6"/>
              <line x1="180" y1="180" x2="180" y2="62" stroke="#d4af37" stroke-opacity=".28"/>
              <line x1="180" y1="180" x2="282.2" y2="239" stroke="#d4af37" stroke-opacity=".28"/>
              <line x1="180" y1="180" x2="77.8" y2="239" stroke="#d4af37" stroke-opacity=".28"/>
              <polygon points="${typical}" fill="none" stroke="#b85b5b" stroke-opacity=".68" stroke-width="2" stroke-dasharray="5 5"/>
              <polygon points="${polygon}" fill="url(#k846CompassFill)" stroke="#f0cd69" stroke-width="3"/>
              ${[[-90,inf],[30,cav],[150,arc]].map(([angle,value]) => { const p = point(180,180,angle,118*Math.max(.08,value/100)); return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="#f0cd69" stroke="#07101e" stroke-width="3"/>` }).join('')}
              <circle cx="180" cy="180" r="8" fill="#07101e" stroke="#f0cd69" stroke-width="2"/>
              <text x="180" y="36" text-anchor="middle" fill="#f1e7ce" font-size="13" font-family="Cinzel,serif" font-weight="800">INFANTRY ${inf}%</text>
              <text x="316" y="267" text-anchor="end" fill="#f1e7ce" font-size="13" font-family="Cinzel,serif" font-weight="800">CAVALRY ${cav}%</text>
              <text x="44" y="267" fill="#f1e7ce" font-size="13" font-family="Cinzel,serif" font-weight="800">ARCHERS ${arc}%</text>
              <text x="180" y="334" text-anchor="middle" fill="#9d8952" font-size="9" font-family="Montserrat,sans-serif">DASHED = 10/10/80 REFERENCE</text>
            </svg>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
            ${[['INF',inf],['CAV',cav],['ARC',arc]].map(([label,value]) => `<div style="border:1px solid rgba(212,175,55,.13);border-radius:12px;background:rgba(255,255,255,.025);padding:11px;text-align:center"><div style="font-size:9px;font-weight:800;letter-spacing:.13em;color:rgba(241,231,206,.38)">${label}</div><div style="margin-top:3px;font-family:JetBrains Mono,monospace;font-size:18px;font-weight:900;color:#f0cd69">${value}%</div></div>`).join('')}
          </div>
        </div>
        <div style="margin-top:12px;border:1px solid rgba(212,175,55,.11);border-radius:12px;background:rgba(0,0,0,.16);padding:11px 12px;font-size:11px;line-height:1.55;color:rgba(241,231,206,.54)">Primary force: <strong style="color:#f1e7ce">${leader}</strong>. The solid royal shape is your recommended formation; the dashed outline is the common 10/10/80 reference.</div>
      </div>`
  }

  function ensureCompass() {
    const svg = document.querySelector('svg[aria-label="Ternary Hunt Formation efficiency map"]')
    const existing = document.getElementById(COMPASS_ID)
    if (!svg) {
      existing?.remove()
      return
    }
    const original = svg.parentElement?.parentElement
    if (!original) return
    const match = (original.textContent || '').match(/Best\s+(\d+)\/(\d+)\/(\d+)/i)
    if (!match) return
    const best = [Number(match[1]), Number(match[2]), Number(match[3])]
    const key = best.join('/')
    original.style.display = 'none'

    let compass = existing
    if (!compass || compass.previousElementSibling !== original) {
      existing?.remove()
      compass = document.createElement('div')
      compass.id = COMPASS_ID
      original.insertAdjacentElement('afterend', compass)
    }
    if (compass.dataset.best !== key) {
      compass.dataset.best = key
      compass.innerHTML = createCompass(best)
    }
  }

  function sync() {
    ensureUploadButton()
    ensureCompass()
  }

  const observer = new MutationObserver(() => requestAnimationFrame(sync))
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
  window.addEventListener('hashchange', () => setTimeout(sync, 60))
  document.addEventListener('DOMContentLoaded', sync)
  setInterval(sync, 900)
})()
