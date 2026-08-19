(() => {
  const STORAGE_KEY = 'kingdom846.battleLab.profiles.v1'
  const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'
  const MODAL_ID = 'k846-battle-import-modal'
  const SIDE_ID = 'k846-import-side-choice'
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

  function textHasAlias(text, aliases) {
    const low = String(text || '').toLowerCase()
    return aliases.some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(low))
  }

  function valuesOnLine(line) {
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
      if (!textHasAlias(line, troop.aliases) || !textHasAlias(line, stat.aliases)) continue
      const numbers = valuesOnLine(line)
      if (numbers.length) return numbers
    }
    return []
  }

  function detectTwoSided(raw) {
    let hits = 0
    for (const troop of TYPES) {
      for (const stat of STATS) {
        if (statLineValues(raw, troop, stat).length >= 2) hits += 1
      }
    }
    return hits >= 2
  }

  function ensureSideChoice(modal) {
    if (!modal || modal.querySelector(`#${SIDE_ID}`)) return
    const raw = rawText(modal)
    if (!detectTwoSided(raw)) return
    const detected = modal.querySelector('.k846-import-detected')
    const title = detected?.querySelector('.k846-import-section-title')
    if (!detected || !title) return

    const choice = document.createElement('div')
    choice.id = SIDE_ID
    choice.style.cssText = 'margin:12px 0 14px;padding:12px 13px;border:1px solid rgba(96,165,250,.22);border-radius:12px;background:rgba(59,130,246,.055);color:rgba(219,234,254,.78);font:600 11px/1.5 Montserrat,system-ui,sans-serif'
    choice.innerHTML = `
      <div style="font-weight:800;color:#dbeafe;margin-bottom:8px">Which side of the battle report is yours?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(96,165,250,.26);border-radius:9px;background:rgba(59,130,246,.07);cursor:pointer">
          <input type="radio" name="k846-report-side" value="left" checked> <span><b style="color:#bfdbfe">Left side</b><br><small style="opacity:.7">Usually blue / first value</small></span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(248,113,113,.24);border-radius:9px;background:rgba(239,68,68,.055);cursor:pointer">
          <input type="radio" name="k846-report-side" value="right"> <span><b style="color:#fecaca">Right side</b><br><small style="opacity:.7">Usually red / second value</small></span>
        </label>
      </div>
      <div style="margin-top:8px;font-size:10px;opacity:.72">Battle Lab detected two stat columns. Pick your side before applying.</div>`
    title.insertAdjacentElement('afterend', choice)
  }

  function selectedSide(modal) {
    return modal?.querySelector('input[name="k846-report-side"]:checked')?.value || 'left'
  }

  function modalValues(modal) {
    const values = { capacity: null, infantry: {}, cavalry: {}, archers: {} }
    modal.querySelectorAll('[data-field]').forEach((input) => {
      const value = clean(input.value)
      if (value == null) return
      if (input.dataset.field === 'capacity') values.capacity = value
      else {
        const [troop, stat] = input.dataset.field.split('.')
        if (values[troop]) values[troop][stat] = value
      }
    })

    const raw = rawText(modal)
    if (detectTwoSided(raw)) {
      const side = selectedSide(modal)
      for (const troop of TYPES) {
        for (const stat of STATS) {
          const numbers = statLineValues(raw, troop, stat)
          if (numbers.length >= 2) {
            values[troop.key][stat.key] = side === 'right' ? numbers[numbers.length - 1] : numbers[0]
          }
        }
      }
    }
    return values
  }

  function findSection(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text))
  }

  function labelInput(section, labelText) {
    const label = [...(section?.querySelectorAll('label') || [])].find((node) => new RegExp(labelText, 'i').test(node.textContent || ''))
    return label?.querySelector('input') || null
  }

  function currentProfileFromPage() {
    const profileSection = findSection('Player Profile')
    const statsSection = findSection('Combat Report Stats')
    const name = labelInput(profileSection, '^Player name')?.value || 'My Player'
    const kingdom = labelInput(profileSection, '^Kingdom')?.value || '846'
    const capacity = clean(labelInput(profileSection, 'March capacity')?.value) || 750000
    const stats = {
      infantry: { attack: 300, lethality: 250, defense: 300, health: 250 },
      cavalry: { attack: 300, lethality: 250, defense: 300, health: 250 },
      archers: { attack: 300, lethality: 250, defense: 300, health: 250 },
    }

    for (const troop of TYPES) {
      const card = [...(statsSection?.querySelectorAll('div') || [])].find((node) => {
        const text = node.textContent || ''
        return text.includes(troop.label) && /Attack/i.test(text) && /Lethality/i.test(text) && node.querySelectorAll('input[type="number"]').length >= 4
      })
      const inputs = card ? [...card.querySelectorAll('input[type="number"]')].slice(0, 4) : []
      STATS.forEach((stat, index) => {
        const value = clean(inputs[index]?.value)
        if (value != null) stats[troop.key][stat.key] = value
      })
    }

    return {
      id: '',
      name,
      kingdom,
      capacity,
      stats,
      sources: { heroes: 0, heroGear: 0, widgets: 0, pets: 0, petSkills: 0, charms: 0, academy: 0, warAcademy: 0, governorGear: 0 },
      updatedAt: new Date().toISOString(),
    }
  }

  function loadProfiles() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function saveImported(values) {
    const profiles = loadProfiles()
    const activeId = localStorage.getItem(ACTIVE_KEY) || ''
    let index = profiles.findIndex((item) => item.id === activeId)
    const pageProfile = currentProfileFromPage()
    let profile = index >= 0 ? { ...pageProfile, ...profiles[index], stats: { ...pageProfile.stats, ...(profiles[index].stats || {}) }, sources: { ...pageProfile.sources, ...(profiles[index].sources || {}) } } : pageProfile

    if (!profile.id) profile.id = globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    if (values.capacity != null && values.capacity > 0) profile.capacity = values.capacity
    profile.stats = profile.stats || pageProfile.stats

    for (const troop of TYPES) {
      profile.stats[troop.key] = { ...(profile.stats[troop.key] || {}) }
      for (const stat of STATS) {
        const value = clean(values[troop.key]?.[stat.key])
        if (value != null) profile.stats[troop.key][stat.key] = value
      }
    }
    profile.updatedAt = new Date().toISOString()

    if (index >= 0) profiles[index] = profile
    else profiles.push(profile)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
    localStorage.setItem(ACTIVE_KEY, profile.id)
  }

  function toast(message, tone = 'ok') {
    const node = document.createElement('div')
    node.textContent = message
    Object.assign(node.style, {
      position: 'fixed', left: '50%', bottom: '26px', zIndex: 10050, transform: 'translateX(-50%)',
      maxWidth: '92vw', padding: '11px 15px', borderRadius: '10px', font: '700 11px Montserrat, sans-serif',
      color: tone === 'error' ? '#ffd5d5' : '#f6e5ad', background: tone === 'error' ? 'rgba(91,18,24,.98)' : 'rgba(10,24,43,.98)',
      border: `1px solid ${tone === 'error' ? 'rgba(255,120,120,.3)' : 'rgba(212,175,55,.34)'}`, boxShadow: '0 14px 40px rgba(0,0,0,.45)'
    })
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 2200)
  }

  function applyAndRefresh(modal) {
    const values = modalValues(modal)
    const importedCount = TYPES.reduce((total, troop) => total + STATS.filter((stat) => clean(values[troop.key]?.[stat.key]) != null).length, 0)
    if (!importedCount) throw new Error('No combat stat values were found. Review the detected values or use Manual Entry.')
    saveImported(values)
    toast(`Applied ${importedCount} combat stats. Refreshing Battle Lab…`)
    setTimeout(() => window.location.reload(), 450)
  }

  // Add a side selector whenever OCR reveals a two-column battle report.
  const observer = new MutationObserver(() => {
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return
    ensureSideChoice(modal)
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] })

  // Intercept Apply before the older DOM-input handoff runs.
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.(`#${MODAL_ID} [data-action="apply"]`)
    if (!button || button.disabled) return
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    try {
      applyAndRefresh(modal)
    } catch (error) {
      toast(error.message || 'Unable to apply imported stats.', 'error')
    }
  }, true)
})()
