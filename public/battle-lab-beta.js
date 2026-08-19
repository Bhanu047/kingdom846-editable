(() => {
  const TOOL_LABELS = ['Bear Optimizer', 'Mystic Trials', 'Battle Simulator', 'Hero Synergy', 'Formation Optimizer']

  function isBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function markAllBeta() {
    if (!isBattleLab()) return
    TOOL_LABELS.forEach((label) => {
      const button = [...document.querySelectorAll('button')].find((node) => (node.textContent || '').includes(label))
      if (!button) return
      const badge = [...button.querySelectorAll('span')].find((node) => /^(live|beta)$/i.test((node.textContent || '').trim()))
      if (!badge) return
      badge.textContent = 'BETA'
      badge.className = 'rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100/75'
    })
  }

  function render() {
    if (!isBattleLab()) return
    markAllBeta()
  }

  const observer = new MutationObserver(() => requestAnimationFrame(render))
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  document.addEventListener('click', () => setTimeout(render, 60), true)
  window.addEventListener('hashchange', () => setTimeout(render, 120))
  setTimeout(render, 500)
})()
