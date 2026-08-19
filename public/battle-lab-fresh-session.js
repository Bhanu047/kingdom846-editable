(() => {
  const PROFILE_KEY = 'kingdom846.battleLab.profiles.v1'
  const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'
  const BEAR_KEYS = [
    'kingdom846.battleLab.bearConfig.v2',
    'kingdom846.battleLab.bearConfig.v3',
    'kingdom846.battleLab.bearConfig.v4',
    'kingdom846.battleLab.bearConfig.v5',
  ]
  const BEAR_V5_KEY = 'kingdom846.battleLab.bearConfig.v5'

  let resetDone = false

  function resetForFreshBattleLabVisit() {
    if (resetDone || !/battle-lab/i.test(location.hash || '')) return
    resetDone = true

    // Battle Lab starts each full page visit as a clean tactical session.
    // Previous report values and Bear selections must never silently become
    // inputs for a new calculation.
    try {
      localStorage.removeItem(PROFILE_KEY)
      localStorage.removeItem(ACTIVE_KEY)
      BEAR_KEYS.forEach((key) => sessionStorage.removeItem(key))

      sessionStorage.setItem(BEAR_V5_KEY, JSON.stringify({
        tier: 'tg5-7',
        heroes: {
          infantry: 'Other',
          cavalry: 'Other',
          archers: 'Other',
        },
      }))
    } catch {}
  }

  resetForFreshBattleLabVisit()
  window.addEventListener('hashchange', resetForFreshBattleLabVisit)
})()
