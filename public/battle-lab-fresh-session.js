(() => {
  const PROFILE_KEY = 'kingdom846.battleLab.profiles.v1'
  const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'
  const BEAR_KEYS = [
    'kingdom846.battleLab.bearConfig.v2',
    'kingdom846.battleLab.bearConfig.v3',
    'kingdom846.battleLab.bearConfig.v4',
  ]

  let resetDone = false

  function resetForFreshBattleLabVisit() {
    if (resetDone || !/battle-lab/i.test(location.hash || '')) return
    resetDone = true

    // Battle Lab no longer exposes persistent player profiles. Start each full
    // page visit with a clean tactical session so old report values cannot
    // silently appear before the player imports or enters current stats.
    try {
      localStorage.removeItem(PROFILE_KEY)
      localStorage.removeItem(ACTIVE_KEY)
      BEAR_KEYS.forEach((key) => sessionStorage.removeItem(key))
    } catch {}
  }

  resetForFreshBattleLabVisit()
  window.addEventListener('hashchange', resetForFreshBattleLabVisit)
})()
