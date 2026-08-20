(() => {
  const UPLOAD_ID = 'k846-hunt-report-upload'
  const DONUT_ID = 'k846-hunt-formation-donut'
  const DEFAULTS = ['580.4', '611.5', '567.9', '553.5', '977.5', '1196.6']
  let clearedDefaults = false

  function text(node) {
    return (node?.textContent || '').replace(/\s+/g, ' ').trim()
  }

  function onBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function isFormation() {
    return !![...document.querySelectorAll('h1,h2,h3')].find((node) => /^Optimal Troop Split$/i.test(text(node)))
  }

  function findCombatSection() {
    if (!onBattleLab()) return null
    const heading = [...document.querySelectorAll('h1,h2,h3')].find((node) => /^Combat Stats$/i.test(text(node)))
    return heading?.closest('section') || null
  }

  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (setter) setter.call(input, String(value))
    else input.value = String(value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function ensureUploadButton() {
    const section = findCombatSection()
    const existing = document.getElementById(UPLOAD_ID)
    if (!section || !isFormation()) {
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
          <div style="margin-top:3px;font-size:10px;line-height:1.45;color:rgba(241,231,206,.42)">Upload your Kingshot Rally Bonus screenshot. Only Attack and Lethality are applied to Hunt Formation.</div>
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

  function scopeFormationInputs() {
    const section = findCombatSection()
    if (!section) return
    const formation = isFormation()

    const labels = [...section.querySelectorAll('label')]
    labels.forEach((label) => {
      const labelText = text(label).replace(/%$/, '').trim()
      const impactOnly = /^(March|Rally) capacity\b/i.test(labelText) || /^Participants\b/i.test(labelText) || /^True Gold\b/i.test(labelText)
      if (impactOnly && formation) label.style.setProperty('display', 'none', 'important')
      else label.style.removeProperty('display')
    })

    [...section.querySelectorAll('div')].forEach((node) => {
      const directLabels = [...node.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const visible = directLabels.some((label) => getComputedStyle(label).display !== 'none')
      if (!visible && formation) node.style.setProperty('display', 'none', 'important')
      else node.style.removeProperty('display')
    })

    if (formation && !clearedDefaults) {
      const inputs = [...section.querySelectorAll('input[type="number"]')].slice(0, 6)
      if (inputs.length === 6) {
        const current = inputs.map((input) => String(input.value || '').trim())
        if (current.every((value, i) => value === DEFAULTS[i])) inputs.forEach((input) => setReactInput(input, ''))
        clearedDefaults = true
      }
    }
  }

  function readImportValues(modal) {
    const read = (name) => {
      const raw = modal.querySelector(`[data-field="${name}"]`)?.value
      const n = Number(raw)
      return Number.isFinite(n) ? n : null
    }
    return [
      read('infantry.attack'), read('infantry.lethality'),
      read('cavalry.attack'), read('cavalry.lethality'),
      read('archers.attack'), read('archers.lethality'),
    ]
  }

  document.addEventListener('click', (event) => {
    const apply = event.target?.closest?.('#k846-battle-import-modal [data-action="apply"]')
    if (!apply || !isFormation()) return
    const modal = document.getElementById('k846-battle-import-modal')
    const section = findCombatSection()
    if (!modal || !section) return
    const values = readImportValues(modal)
    const inputs = [...section.querySelectorAll('input[type="number"]')].slice(0, 6)
    values.forEach((value, index) => {
      if (value != null && inputs[index]) setReactInput(inputs[index], value)
    })
  }, true)

  function findFormationPanel() {
    const heading = [...document.querySelectorAll('h1,h2,h3')].find((node) => /^Optimal Troop Split$/i.test(text(node)))
    return heading?.closest('section') || null
  }

  function readBest(panel) {
    const badgeMatch = text(panel).match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})\b/)
    if (badgeMatch) return [Number(badgeMatch[1]), Number(badgeMatch[2]), Number(badgeMatch[3])]

    const values = []
    for (const name of ['Infantry', 'Cavalry', 'Archers']) {
      const card = [...panel.querySelectorAll('div')].find((node) => new RegExp(`\\b${name}\\b`, 'i').test(text(node)) && /\d+(?:\.\d+)?%/.test(text(node)))
      const match = text(card).match(/(\d+(?:\.\d+)?)%/)
      values.push(match ? Math.round(Number(match[1])) : 0)
    }
    if (values.some(Boolean)) {
      values[2] = Math.max(0, 100 - values[0] - values[1])
      return values
    }
    return null
  }

  function hideOldFormationVisuals(panel) {
    const oldCompass = document.getElementById('k846-hunt-formation-compass')
    if (oldCompass) oldCompass.style.setProperty('display', 'none', 'important')

    const ternary = panel.querySelector('svg[aria-label="Ternary Hunt Formation efficiency map"]')
    if (ternary) {
      const box = ternary.parentElement?.parentElement
      if (box) box.style.setProperty('display', 'none', 'important')
    }

    const radar = panel.querySelector('svg[aria-label="Kingdom846 Formation Compass"]')
    if (radar) {
      const box = radar.closest('#k846-hunt-formation-compass') || radar.parentElement?.parentElement
      if (box) box.style.setProperty('display', 'none', 'important')
    }
  }

  function renderDonut() {
    const panel = findFormationPanel()
    const existing = document.getElementById(DONUT_ID)
    if (!panel || !isFormation()) {
      existing?.remove()
      return
    }

    hideOldFormationVisuals(panel)
    const best = readBest(panel)
    if (!best) return
    const [inf, cav, arc] = best
    const key = best.join('/')

    let host = existing
    if (!host || !panel.contains(host)) {
      existing?.remove()
      host = document.createElement('div')
      host.id = DONUT_ID
      host.className = 'mt-5 overflow-hidden rounded-2xl border border-gold/20 bg-[#07101e] p-5'
      const cardsWrap = panel.querySelector('.mt-4.space-y-3')
      if (cardsWrap) cardsWrap.insertAdjacentElement('afterend', host)
      else panel.appendChild(host)
    }
    if (host.dataset.best === key) return
    host.dataset.best = key

    const infEnd = inf
    const cavEnd = inf + cav
    host.innerHTML = `
      <div style="text-align:center">
        <div style="font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(232,199,102,.60)">Formation Share</div>
        <div style="margin-top:4px;font-family:Cinzel,serif;font-size:20px;font-weight:800;color:#f1e7ce">Optimal Distribution</div>
      </div>
      <div style="display:flex;justify-content:center;margin-top:18px">
        <div style="width:min(72vw,290px);aspect-ratio:1;border-radius:50%;padding:28px;background:conic-gradient(#d8b45b 0 ${infEnd}%,#7e9fd1 ${infEnd}% ${cavEnd}%,#b9d8a3 ${cavEnd}% 100%);box-shadow:0 0 38px rgba(216,180,91,.12)">
          <div style="width:100%;height:100%;border-radius:50%;background:#07101e;border:1px solid rgba(216,180,91,.2);display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,234,210,.45)">Best Formation</div>
            <div style="font-family:JetBrains Mono,monospace;font-size:clamp(24px,7vw,36px);font-weight:900;color:#f4d879;margin-top:5px">${inf} / ${cav} / ${arc}</div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px;text-align:center">
        <div><div style="color:#d8b45b;font-weight:900">${inf}%</div><div style="font-size:9px;text-transform:uppercase;color:rgba(244,234,210,.45)">Infantry</div></div>
        <div><div style="color:#9db9e3;font-weight:900">${cav}%</div><div style="font-size:9px;text-transform:uppercase;color:rgba(244,234,210,.45)">Cavalry</div></div>
        <div><div style="color:#c7e5b4;font-weight:900">${arc}%</div><div style="font-size:9px;text-transform:uppercase;color:rgba(244,234,210,.45)">Archers</div></div>
      </div>`
  }

  function sync() {
    if (!onBattleLab()) return
    ensureUploadButton()
    scopeFormationInputs()
    renderDonut()
  }

  const observer = new MutationObserver(() => requestAnimationFrame(sync))
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] })
  window.addEventListener('hashchange', () => setTimeout(sync, 60))
  document.addEventListener('DOMContentLoaded', sync)
  document.addEventListener('click', () => requestAnimationFrame(() => requestAnimationFrame(sync)), true)
  setInterval(sync, 700)
})()
