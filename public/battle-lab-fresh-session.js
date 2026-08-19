(() => {
  const PROFILE_KEY = 'kingdom846.battleLab.profiles.v1'
  const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'
  const BEAR_KEYS = [
    'kingdom846.battleLab.bearConfig.v2',
    'kingdom846.battleLab.bearConfig.v3',
    'kingdom846.battleLab.bearConfig.v4',
  ]
  const BEAR_V4_KEY = 'kingdom846.battleLab.bearConfig.v4'

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

      // Do not assume any lead hero. The player must explicitly choose a hero
      // before a hero-specific Bear modifier is allowed into the calculation.
      sessionStorage.setItem(BEAR_V4_KEY, JSON.stringify({
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
