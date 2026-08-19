(() => {
  const RESULT_ID = 'k846-bear-result-v4'

  function parsePercents(result) {
    const text = result?.textContent || ''
    const match = text.match(/INF\s+([0-9.]+)%\s*[·•]\s*CAV\s+([0-9.]+)%\s*[·•]\s*ARC\s+([0-9.]+)%/i)
    if (!match) return null
    const values = match.slice(1, 4).map(Number)
    return values.every(Number.isFinite) ? values : null
  }

  function bestIntegerComposition(percents) {
    // Continuous Bear optimum is proportional to C_i^2, so C_i is proportional
    // to sqrt(percent_i). Search the valid 1%-resolution compositions directly
    // instead of independently rounding percentages. Each troop type receives at
    // least 1%, and the displayed formation always totals exactly 100%.
    const coefficients = percents.map((value) => Math.sqrt(Math.max(0, value)))
    let bestScore = -Infinity
    let best = [1, 1, 98]

    for (let infantry = 1; infantry <= 98; infantry += 1) {
      for (let cavalry = 1; cavalry <= 99 - infantry; cavalry += 1) {
        const archers = 100 - infantry - cavalry
        if (archers < 1) continue
        const score = coefficients[0] * Math.sqrt(infantry)
          + coefficients[1] * Math.sqrt(cavalry)
          + coefficients[2] * Math.sqrt(archers)
        if (score > bestScore) {
          bestScore = score
          best = [infantry, cavalry, archers]
        }
      }
    }
    return best
  }

  function apply() {
    const result = document.getElementById(RESULT_ID)
    if (!result) return
    const percents = parsePercents(result)
    if (!percents) return
    const best = bestIntegerComposition(percents)
    const roundedLine = [...result.querySelectorAll('div')]
      .find((node) => /^Rounded formation:/i.test((node.textContent || '').trim()))
    if (roundedLine) roundedLine.textContent = `Rounded formation: ${best.join(' / ')}`
  }

  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      apply()
    })
  })
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  document.addEventListener('input', () => setTimeout(apply, 40), true)
  document.addEventListener('change', () => setTimeout(apply, 40), true)
  setTimeout(apply, 700)
})()
