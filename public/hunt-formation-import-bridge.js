(() => {
  function formationActive() {
    const buttons = [...document.querySelectorAll('button')]
    const formation = buttons.find((b) => /hunt formation/i.test((b.textContent || '').trim()))
    const impact = buttons.find((b) => /hunt impact/i.test((b.textContent || '').trim()))
    if (!formation) return false
    const formationActiveClass = /text-gold-bright|bg-gold/.test(formation.className || '')
    const impactActiveClass = impact && /text-gold-bright|bg-gold/.test(impact.className || '')
    return formationActiveClass && !impactActiveClass
  }

  function patch() {
    const legacy = window.__k846BattleLabImport
    const formation = window.__k846HuntFormationImport
    if (!legacy?.open || !formation?.open || legacy.__formationRouted) return false
    const originalOpen = legacy.open.bind(legacy)
    legacy.open = (...args) => formationActive() ? formation.open() : originalOpen(...args)
    legacy.__formationRouted = true
    return true
  }

  if (!patch()) {
    const id = setInterval(() => { if (patch()) clearInterval(id) }, 100)
    setTimeout(() => clearInterval(id), 10000)
  }
})()
