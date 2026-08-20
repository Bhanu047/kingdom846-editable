(() => {
  const STORAGE_KEY = 'kingdom846.battleLab.profiles.v1'
  const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'
  const MODAL_ID = 'k846-battle-import-modal'

  const TYPES = [
    { key: 'infantry', label: 'Infantry', aliases: ['infantry', 'inf'] },
    { key: 'cavalry', label: 'Cavalry', aliases: ['cavalry', 'cav'] },
    { key: 'archers', label: 'Archers', aliases: ['archer', 'archers', 'arc'] },
  ]
  const STATS = [
    { key: 'attack', aliases: ['attack', 'atk'] },
    { key: 'lethality', aliases: ['lethality', 'lethal'] },
    { key: 'defense', aliases: ['defense', 'defence', 'def'] },
    { key: 'health', aliases: ['health', 'hp'] },
  ]

  function clean(value) {
    const number = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
    return Number.isFinite(number) ? number : null
  }

  function hasAlias(text, aliases) {
    const low = String(text || '').toLowerCase()
    return aliases.some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(low))
  }

  function numbersOnLine(line) {
    return (String(line || '').match(/[+-]?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*%?/g) || [])
      .map(clean)
      .filter((value) => value != null)
  }

  function rawText(modal) {
    return modal?.querySelector('.k846-import-raw pre')?.textContent || ''
  }

  function statLineValues(raw, troop, stat) {
    const lines = String(raw || '').split(/\n+/).map((line) => line.trim()).filter(Boolean)
    for (const line of lines) {
      if (!hasAlias(line, troop.aliases) || !hasAlias(line, stat.aliases)) continue
      const values = numbersOnLine(line)
      if (values.length) return values
    }
    return []
  }

  function readModalValues(modal) {
    const values = { capacity: null, infantry: {}, cavalry: {}, archers: {} }

    modal.querySelectorAll('[data-field]').forEach((input) => {
      const value = clean(input.value)
      if (value == null) return
      if (input.dataset.field === 'capacity') {
        values.capacity = value
        return
      }
      const [troop, stat] = input.dataset.field.split('.')
      if (values[troop]) values[troop][stat] = value
    })

    const side = modal.querySelector('input[name="k846-report-side"]:checked')?.value
    const raw = rawText(modal)
    if (side && raw) {
      for (const troop of TYPES) {
        for (const stat of STATS) {
          const detected = statLineValues(raw, troop, stat)
          if (detected.length >= 2) {
            values[troop.key][stat.key] = side === 'right' ? detected[detected.length - 1] : detected[0]
          }
        }
      }
    }

    return values
  }

  function findSection(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text)) || null
  }

  function nativeSet(input, value) {
    if (!input || value == null) return
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function troopCard(section, troop) {
    if (!section) return null
    const candidates = [...section.querySelectorAll('div')].filter((node) => {
      const text = node.textContent || ''
      const inputCount = node.querySelectorAll('input[type="number"]').length
      return text.includes(troop.label) && /Attack/i.test(text) && /Lethality/i.test(text) && inputCount >= 2
    })
    candidates.sort((a, b) => {
      const countDiff = a.querySelectorAll('input[type="number"]').length - b.querySelectorAll('input[type="number"]').length
      if (countDiff) return countDiff
      return (a.textContent || '').length - (b.textContent || '').length
    })
    return candidates[0] || null
  }

  function applyToReact(values) {
    const statsSection = findSection('Combat Stats')
    if (!statsSection) throw new Error('Hunt Formation combat stats are not visible.')

    for (const troop of TYPES) {
      const card = troopCard(statsSection, troop)
      const inputs = card ? [...card.querySelectorAll('input[type="number"]')].slice(0, 2) : []
      nativeSet(inputs[0], clean(values[troop.key]?.attack))
      nativeSet(inputs[1], clean(values[troop.key]?.lethality))
    }

    if (values.capacity != null) {
      const capacityLabel = [...statsSection.querySelectorAll('label')].find((label) => /march capacity/i.test(label.textContent || ''))
      nativeSet(capacityLabel?.querySelector('input[type="number"]'), values.capacity)
    }
  }

  function pageIdentity() {
    return { player: 'My Player', kingdom: '846' }
  }

  function saveToLocalProfile(values) {
    let profiles = []
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      profiles = Array.isArray(parsed) ? parsed : []
    } catch {}

    const activeId = localStorage.getItem(ACTIVE_KEY) || ''
    let index = profiles.findIndex((profile) => profile?.id === activeId)
    const identity = pageIdentity()
    const baseStats = {
      infantry: { attack: 300, lethality: 250, defense: 300, health: 250 },
      cavalry: { attack: 300, lethality: 250, defense: 300, health: 250 },
      archers: { attack: 300, lethality: 250, defense: 300, health: 250 },
    }

    const existing = index >= 0 ? profiles[index] : null
    const profile = {
      ...(existing || {}),
      id: existing?.id || globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: existing?.name || identity.player,
      kingdom: existing?.kingdom || identity.kingdom,
      capacity: values.capacity || existing?.capacity || 750000,
      stats: {
        infantry: { ...baseStats.infantry, ...(existing?.stats?.infantry || {}) },
        cavalry: { ...baseStats.cavalry, ...(existing?.stats?.cavalry || {}) },
        archers: { ...baseStats.archers, ...(existing?.stats?.archers || {}) },
      },
      sources: existing?.sources || { heroes: 0, heroGear: 0, widgets: 0, pets: 0, petSkills: 0, charms: 0, academy: 0, warAcademy: 0, governorGear: 0 },
      updatedAt: new Date().toISOString(),
    }

    for (const troop of TYPES) {
      for (const stat of STATS) {
        const value = clean(values[troop.key]?.[stat.key])
        if (value != null) profile.stats[troop.key][stat.key] = value
      }
    }

    if (index >= 0) profiles[index] = profile
    else profiles.push(profile)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
    localStorage.setItem(ACTIVE_KEY, profile.id)
    return profile
  }

  function toast(message, tone = 'ok') {
    const node = document.createElement('div')
    node.textContent = message
    Object.assign(node.style, {
      position: 'fixed', left: '50%', bottom: '26px', zIndex: 10070, transform: 'translateX(-50%)',
      maxWidth: '92vw', padding: '11px 15px', borderRadius: '10px', font: '700 11px Montserrat, sans-serif',
      color: tone === 'error' ? '#ffd5d5' : '#f6e5ad', background: tone === 'error' ? 'rgba(91,18,24,.98)' : 'rgba(10,24,43,.98)',
      border: `1px solid ${tone === 'error' ? 'rgba(255,120,120,.3)' : 'rgba(212,175,55,.34)'}`, boxShadow: '0 14px 40px rgba(0,0,0,.45)'
    })
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 2600)
  }

  function countValues(values) {
    return TYPES.reduce((total, troop) => total + STATS.filter((stat) => clean(values[troop.key]?.[stat.key]) != null).length, 0)
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.(`#${MODAL_ID} [data-action="apply"]`)
    if (!button || button.disabled) return
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()

    try {
      const values = readModalValues(modal)
      const count = countValues(values)
      if (!count) throw new Error('No combat stats were found. Review the detected values or use Manual Entry.')

      saveToLocalProfile(values)
      applyToReact(values)

      const closeButton = modal.querySelector('[data-action="close"]')
      if (closeButton) setTimeout(() => closeButton.click(), 0)
      else {
        modal.remove()
        document.body.style.overflow = ''
      }

      toast(`Applied ${count} report values to Hunt Formation.`)
      setTimeout(() => findSection('Combat Stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    } catch (error) {
      toast(error.message || 'Unable to apply imported stats.', 'error')
    }
  }, true)
})()
