(() => {
  function activeTab() {
    const buttons = [...document.querySelectorAll('button')]
    const formation = buttons.find((b) => /hunt formation/i.test((b.textContent || '').trim()))
    const impact = buttons.find((b) => /hunt impact/i.test((b.textContent || '').trim()))
    const active = (b) => b && /text-gold-bright|bg-gold/.test(b.className || '')
    if (active(formation) && !active(impact)) return 'formation'
    if (active(impact) && !active(formation)) return 'impact'
    return null
  }

  function patch() {
    const legacy = window.__k846BattleLabImport
    const formation = window.__k846HuntFormationImport
    const impact = window.__k846HuntImpactImport
    if (!legacy?.open || !formation?.open || !impact?.open || legacy.__huntRouted) return false
    const originalOpen = legacy.open.bind(legacy)
    legacy.open = (...args) => {
      const tab = activeTab()
      if (tab === 'formation') return formation.open()
      if (tab === 'impact') return impact.open()
      return originalOpen(...args)
    }
    legacy.__huntRouted = true
    return true
  }

  if (!patch()) {
    const id = setInterval(() => { if (patch()) clearInterval(id) }, 100)
    setTimeout(() => clearInterval(id), 10000)
  }
})()
