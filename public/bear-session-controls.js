(() => {
  const STORAGE_KEY = 'kingdom846.battleLab.profiles.v1'
  const SESSION_KEY = 'kingdom846.battleLab.bearCapacity.session'
  const DEFAULT_CAPACITY = 750000
  const CARD_ID = 'k846-bear-session-controls'

  function isBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function buttonByText(text) {
    return [...document.querySelectorAll('button')].find((button) => (button.textContent || '').includes(text))
  }

  function sectionByText(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text))
  }

  function nativeSet(input, value) {
    if (!input) return
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function profileCapacityInput() {
    const profile = sectionByText('Player Profile')
    if (!profile) return null
    const label = [...profile.querySelectorAll('label')].find((node) => /march capacity/i.test(node.textContent || ''))
    return label?.querySelector('input') || null
  }

  function hideProfileCapacity() {
    const profile = sectionByText('Player Profile')
    if (!profile) return
    const label = [...profile.querySelectorAll('label')].find((node) => /march capacity/i.test(node.textContent || ''))
    if (label) label.style.display = 'none'
  }

  function resetPersistedCapacity() {
    try {
      const profiles = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (!Array.isArray(profiles) || !profiles.length) return
      let changed = false
      for (const profile of profiles) {
        if (profile && profile.capacity !== DEFAULT_CAPACITY) {
          profile.capacity = DEFAULT_CAPACITY
          changed = true
        }
      }
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
    } catch {}
  }

  function combatValue(troopName, statLabel) {
    const stats = sectionByText('Combat Report Stats')
    if (!stats) return '—'
    const card = [...stats.querySelectorAll('div')].find((node) => {
      const text = node.textContent || ''
      return text.includes(troopName) && /Attack/i.test(text) && /Lethality/i.test(text) && node.querySelectorAll('input[type="number"]').length >= 4
    })
    if (!card) return '—'
    const inputs = [...card.querySelectorAll('input[type="number"]')].slice(0, 4)
    const index = statLabel === 'Attack' ? 0 : 1
    const value = Number(inputs[index]?.value)
    return Number.isFinite(value) ? `${value.toFixed(2)}%` : '—'
  }

  function findBearSettings() {
    const bearButton = buttonByText('Bear Optimizer')
    if (!bearButton) return null
    const modules = bearButton.closest('section')
    const workspace = modules?.nextElementSibling
    const right = workspace?.lastElementChild
    if (!right) return null
    return [...right.querySelectorAll('section')].find((section) => (section.textContent || '').includes('Optimizer Settings')) || null
  }

  function syncCapacity(value) {
    const number = Math.max(1, Math.floor(Number(value) || DEFAULT_CAPACITY))
    sessionStorage.setItem(SESSION_KEY, String(number))
    nativeSet(profileCapacityInput(), number)
    return number
  }

  function inject() {
    if (!isBattleLab()) return
    hideProfileCapacity()
    const settings = findBearSettings()
    if (!settings || document.getElementById(CARD_ID)) return

    const current = Number(sessionStorage.getItem(SESSION_KEY)) || DEFAULT_CAPACITY
    syncCapacity(current)

    const minimumLabels = [...settings.querySelectorAll('label')].filter((label) => /(?:INF|CAV|ARC) minimum/i.test(label.textContent || ''))
    const minimumContainer = minimumLabels[0]?.parentElement
    if (minimumContainer) minimumContainer.style.display = 'none'

    const infoBox = [...settings.querySelectorAll('div')].find((node) => /Use stats from the same hero\/gear setup/i.test(node.textContent || ''))
    const controls = document.createElement('div')
    controls.id = CARD_ID
    controls.innerHTML = `
      <div style="margin-top:18px;padding:14px;border:1px solid rgba(212,175,55,.18);border-radius:14px;background:rgba(212,175,55,.035)">
        <label style="display:block">
          <span style="display:block;margin-bottom:6px;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(241,231,206,.55)">Current March Capacity</span>
          <input data-bear-capacity type="number" min="1" step="1000" value="${current}" style="width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.22);border-radius:12px;background:rgba(3,12,26,.75);padding:11px 12px;color:#f1e7ce;font:700 14px Montserrat,system-ui,sans-serif;outline:none">
          <small style="display:block;margin-top:6px;color:rgba(241,231,206,.42);font-size:10px;line-height:1.5">Enter the capacity currently shown in Kingshot after any Deployment Capacity or Pet buffs. This value is used for this Bear session and is not part of your saved player profile.</small>
        </label>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px" data-bear-stat-summary>
        ${['Infantry','Cavalry','Archers'].map((troop) => `
          <div style="padding:10px;border:1px solid rgba(212,175,55,.10);border-radius:11px;background:rgba(255,255,255,.02)">
            <div style="font-size:10px;font-weight:800;color:rgba(241,231,206,.65);margin-bottom:6px">${troop}</div>
            <div style="font-size:9px;color:rgba(241,231,206,.38)">ATK <b style="color:#f0cd69">${combatValue(troop, 'Attack')}</b></div>
            <div style="margin-top:3px;font-size:9px;color:rgba(241,231,206,.38)">LET <b style="color:#f0cd69">${combatValue(troop, 'Lethality')}</b></div>
          </div>`).join('')}
      </div>
      <button type="button" data-bear-advanced style="margin-top:12px;width:100%;border:1px solid rgba(212,175,55,.14);border-radius:10px;background:rgba(255,255,255,.025);padding:9px 11px;color:rgba(241,231,206,.58);font:700 10px Montserrat,system-ui,sans-serif;cursor:pointer">Advanced Settings · Minimum Troop Constraints</button>
      <div style="margin-top:9px;font-size:10px;line-height:1.5;color:rgba(147,197,253,.55)">Lead-hero modifiers will be added only after each Bear hero effect is validated.</div>`

    if (infoBox) settings.insertBefore(controls, infoBox)
    else settings.appendChild(controls)

    controls.querySelector('[data-bear-capacity]')?.addEventListener('input', (event) => syncCapacity(event.target.value))
    controls.querySelector('[data-bear-advanced]')?.addEventListener('click', (event) => {
      if (!minimumContainer) return
      const open = minimumContainer.style.display === 'none'
      minimumContainer.style.display = open ? '' : 'none'
      event.currentTarget.textContent = `${open ? 'Hide' : 'Advanced Settings ·'} Minimum Troop Constraints`
    })
  }

  function removeCard() {
    document.getElementById(CARD_ID)?.remove()
  }

  resetPersistedCapacity()

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (!button) return
    const text = button.textContent || ''
    if (text.includes('Bear Optimizer')) setTimeout(inject, 80)
    else if (['Mystic Trials','Battle Simulator','Hero Synergy','Formation Optimizer'].some((name) => text.includes(name))) removeCard()

    if (/Save profile/i.test(text)) {
      setTimeout(resetPersistedCapacity, 80)
    }
  }, true)

  window.addEventListener('hashchange', () => setTimeout(inject, 300))
  setTimeout(inject, 700)
})()
