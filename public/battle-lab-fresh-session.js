(() => {
  const PROFILE_KEY = 'kingdom846.battleLab.profiles.v1'
  const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'
  const BEAR_KEYS = [
    'kingdom846.battleLab.bearConfig.v2',
    'kingdom846.battleLab.bearConfig.v3',
    'kingdom846.battleLab.bearConfig.v4',
    'kingdom846.battleLab.bearConfig.v5',
    'kingdom846.battleLab.bearConfig.v6',
  ]
  const BEAR_V6_KEY = 'kingdom846.battleLab.bearConfig.v6'

  let resetDone = false

  function resetForFreshBattleLabVisit() {
    if (resetDone || !/battle-lab/i.test(location.hash || '')) return
    resetDone = true

    try {
      localStorage.removeItem(PROFILE_KEY)
      localStorage.removeItem(ACTIVE_KEY)
      BEAR_KEYS.forEach((key) => sessionStorage.removeItem(key))

      sessionStorage.setItem(BEAR_V6_KEY, JSON.stringify({
        tier: 'tg5-7',
        heroes: {
          infantry: 'Other',
          cavalry: 'Other',
          archers: 'Other',
        },
        widgets: {
          infantry: 0,
          cavalry: 0,
          archers: 0,
        },
      }))
    } catch {}
  }

  resetForFreshBattleLabVisit()
  window.addEventListener('hashchange', resetForFreshBattleLabVisit)
})()
