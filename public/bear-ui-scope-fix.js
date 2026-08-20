(() => {
  const MODAL_ID = 'k846-battle-import-modal'
  const DEFAULT_RALLY_VALUES = ['580.4', '611.5', '567.9', '553.5', '977.5', '1196.6']
  let defaultsChecked = false

  function text(node) { return (node?.textContent || '').replace(/\s+/g, ' ').trim() }

  function simplifyImportModal() {
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return
    const capacity = modal.querySelector('.k846-import-capacity')
    if (capacity) capacity.style.setProperty('display', 'none', 'important')
    const detected = modal.querySelector('.k846-import-detected')
    if (detected) {
      const title = detected.querySelector('.k846-import-section-title')
      if (title) {
        const span = title.querySelector('span')
        const em = title.querySelector('em')
        if (span) span.textContent = 'Report Values'
        if (em) em.textContent = 'REVIEW BEFORE APPLYING'
      }
    }
  }

  function findCombatStatsSection() {
    return [...document.querySelectorAll('section')].find((section) => {
      const t = text(section)
      return /Rally Bonus Input/i.test(t) && /Combat Stats/i.test(t)
    }) || null
  }

  function activeBearTab() {
    const formationHeading = [...document.querySelectorAll('h2,h3')].find((node) => /^Optimal Troop Split$/i.test(text(node)))
    if (formationHeading) return 'formation'
    const impactHeading = [...document.querySelectorAll('h2,h3')].find((node) => /Impact Comparison|Damage Probability Forecast/i.test(text(node)))
    if (impactHeading) return 'impact'
    return 'formation'
  }

  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!setter) return
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function clearBuiltInFormationDefaults(section, isFormation) {
    if (defaultsChecked || !isFormation || !section) return
    const rallyInputs = [...section.querySelectorAll('input[type="number"]')].slice(0, 6)
    if (rallyInputs.length !== 6) return
    const values = rallyInputs.map((input) => String(input.value || '').trim())
    const stillBuiltInDefaults = values.every((value, index) => value === DEFAULT_RALLY_VALUES[index])
    defaultsChecked = true
    if (stillBuiltInDefaults) rallyInputs.forEach((input) => setReactInput(input, '0'))
  }

  function scopeBearControls() {
    const section = findCombatStatsSection()
    if (!section) return
    const isFormation = activeBearTab() === 'formation'
    const impactOnlyLabels = [/^(March|Rally) capacity$/i, /^Participants$/i, /^True Gold$/i]
    const labels = [...section.querySelectorAll('label')]
    labels.forEach((label) => {
      const span = label.querySelector('span')
      const labelText = text(span || label).replace(/%$/, '').trim()
      if (/^March capacity$/i.test(labelText) && span) span.textContent = 'Rally Capacity'
      const currentText = text(span || label).replace(/%$/, '').trim()
      const isImpactOnly = impactOnlyLabels.some((pattern) => pattern.test(currentText))
      if (isImpactOnly && isFormation) label.style.setProperty('display', 'none', 'important')
      else label.style.removeProperty('display')
    })
    [...section.querySelectorAll('div')].forEach((grid) => {
      const directLabels = [...grid.children].filter((child) => child.tagName === 'LABEL')
      if (!directLabels.length) return
      const visible = directLabels.some((label) => getComputedStyle(label).display !== 'none')
      if (!visible && isFormation) grid.style.setProperty('display', 'none', 'important')
      else grid.style.removeProperty('display')
    })
    clearBuiltInFormationDefaults(section, isFormation)
  }

  function readFormationPercentages(panel) {
    const cards = [...panel.querySelectorAll('div')]
    const get = (name) => {
      const card = cards.find((node) => new RegExp(`\\b${name}\\b`, 'i').test(text(node)) && /%/.test(text(node)))
      if (!card) return 0
      const match = text(card).match(/([0-9]+(?:\.[0-9]+)?)%/)
      return match ? Number(match[1]) : 0
    }
    return { inf: get('Infantry'), cav: get('Cavalry'), arc: get('Archers') }
  }

  function renderFormationDonut() {
    if (activeBearTab() !== 'formation') return
    const heading = [...document.querySelectorAll('h2,h3')].find((node) => /^Optimal Troop Split$/i.test(text(node)))
    const panel = heading?.closest('section')
    if (!panel) return

    const terrainTitle = [...panel.querySelectorAll('div')].find((node) => /^Formation Terrain$/i.test(text(node)))
    const terrainBox = terrainTitle?.closest('.mt-5') || terrainTitle?.parentElement?.parentElement
    if (terrainBox) terrainBox.style.setProperty('display', 'none', 'important')

    const p = readFormationPercentages(panel)
    const total = p.inf + p.cav + p.arc
    if (!total) return
    const inf = p.inf / total * 100
    const cav = p.cav / total * 100
    const arc = Math.max(0, 100 - inf - cav)

    let host = panel.querySelector('#k846-formation-donut')
    if (!host) {
      host = document.createElement('div')
      host.id = 'k846-formation-donut'
      host.className = 'mt-5 overflow-hidden rounded-2xl border border-gold/20 bg-[#07101e] p-5'
      if (terrainBox) terrainBox.insertAdjacentElement('afterend', host)
      else panel.appendChild(host)
    }

    const infEnd = inf
    const cavEnd = inf + cav
    host.innerHTML = `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(224,185,92,.6)">Formation Share</div>
        <div style="font-family:Cinzel,serif;font-size:20px;font-weight:700;color:#f4ead2;margin-top:4px">Optimal Distribution</div>
      </div>
      <div style="display:flex;justify-content:center">
        <div style="width:min(72vw,290px);aspect-ratio:1;border-radius:50%;padding:28px;background:conic-gradient(#d8b45b 0 ${infEnd}%,#7e9fd1 ${infEnd}% ${cavEnd}%,#b9d8a3 ${cavEnd}% 100%);box-shadow:0 0 38px rgba(216,180,91,.12)">
          <div style="width:100%;height:100%;border-radius:50%;background:#07101e;border:1px solid rgba(216,180,91,.2);display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,234,210,.45)">Best Formation</div>
            <div style="font-family:JetBrains Mono,monospace;font-size:clamp(24px,7vw,36px);font-weight:800;color:#f4d879;margin-top:5px">${Math.round(p.inf)} / ${Math.round(p.cav)} / ${Math.round(p.arc)}</div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px;text-align:center">
        <div><div style="color:#d8b45b;font-weight:800">${p.inf.toFixed(1)}%</div><div style="font-size:9px;text-transform:uppercase;color:rgba(244,234,210,.45)">Infantry</div></div>
        <div><div style="color:#9db9e3;font-weight:800">${p.cav.toFixed(1)}%</div><div style="font-size:9px;text-transform:uppercase;color:rgba(244,234,210,.45)">Cavalry</div></div>
        <div><div style="color:#c7e5b4;font-weight:800">${p.arc.toFixed(1)}%</div><div style="font-size:9px;text-transform:uppercase;color:rgba(244,234,210,.45)">Archers</div></div>
      </div>`
  }

  function run() {
    simplifyImportModal()
    scopeBearControls()
    renderFormationDonut()
  }

  document.addEventListener('click', () => requestAnimationFrame(() => requestAnimationFrame(run)), true)
  const observer = new MutationObserver(run)
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] })
  window.addEventListener('hashchange', run)
  setTimeout(run, 0)
})()
