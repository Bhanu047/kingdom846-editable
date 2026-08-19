(() => {
  const GRAPH_ID = 'k846-bear-ratio-graph'
  const TROOPS = [
    { key: 'infantry', label: 'Infantry', short: 'INF', accent: '#d6b24c' },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV', accent: '#8fb6e8' },
    { key: 'archers', label: 'Archers', short: 'ARC', accent: '#d98b72' },
  ]

  function onBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function optimalSection() {
    return [...document.querySelectorAll('section')].find((section) => {
      const text = section.textContent || ''
      return text.includes('Recommended March') && text.includes('Optimal Split')
    }) || null
  }

  function cardPercent(section, troop) {
    if (!section) return null
    const candidates = [...section.querySelectorAll('div')].filter((node) => {
      if (node.closest(`#${GRAPH_ID}`)) return false
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
      return text.includes(troop.label) && /\d+(?:\.\d+)?%/.test(text)
    })

    candidates.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    for (const node of candidates) {
      const match = (node.textContent || '').match(/([0-9]+(?:\.[0-9]+)?)%/)
      const value = Number(match?.[1])
      if (Number.isFinite(value) && value >= 0 && value <= 100) return value
    }
    return null
  }

  function readRatios(section) {
    const values = TROOPS.map((troop) => ({ ...troop, percent: cardPercent(section, troop) }))
    if (values.some((item) => item.percent == null)) return null
    const total = values.reduce((sum, item) => sum + item.percent, 0)
    if (!Number.isFinite(total) || total <= 0) return null
    return values.map((item) => ({ ...item, normalized: (item.percent / total) * 100 }))
  }

  function graphHtml(values) {
    const stacked = values.map((item) => `
      <div title="${item.label} ${item.percent.toFixed(1)}%" style="width:${item.normalized.toFixed(4)}%;height:100%;background:${item.accent};min-width:${item.normalized > 0 ? '2px' : '0'}"></div>
    `).join('')

    const rows = values.map((item) => `
      <div style="display:grid;grid-template-columns:58px 1fr 58px;align-items:center;gap:10px">
        <div style="font:800 10px Montserrat,system-ui,sans-serif;letter-spacing:.12em;color:rgba(241,231,206,.64)">${item.short}</div>
        <div style="height:11px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.055);border:1px solid rgba(212,175,55,.08)">
          <div style="height:100%;width:${Math.max(0, Math.min(100, item.percent)).toFixed(2)}%;border-radius:999px;background:${item.accent};box-shadow:0 0 18px ${item.accent}33;transition:width .35s ease"></div>
        </div>
        <div style="text-align:right;font:800 12px 'JetBrains Mono',monospace;color:#f1e7ce">${item.percent.toFixed(1)}%</div>
      </div>
    `).join('')

    return `
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font:800 9px Montserrat,system-ui,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:rgba(212,175,55,.55)">Formation Ratio</div>
          <div style="margin-top:3px;font:700 16px Cinzel,serif;color:#f1e7ce">Bear Composition Graph</div>
        </div>
        <div style="font:600 9px Montserrat,system-ui,sans-serif;color:rgba(241,231,206,.34)">Calculated from the current Bear recommendation</div>
      </div>

      <div style="margin-top:14px;height:18px;display:flex;overflow:hidden;border-radius:999px;border:1px solid rgba(212,175,55,.14);background:rgba(3,12,26,.78)" aria-label="Bear formation ratio stacked graph">
        ${stacked}
      </div>

      <div style="margin-top:14px;display:grid;gap:10px">
        ${rows}
      </div>

      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:12px">
        ${values.map((item) => `
          <div style="display:flex;align-items:center;gap:6px;font:700 9px Montserrat,system-ui,sans-serif;color:rgba(241,231,206,.48)">
            <span style="width:8px;height:8px;border-radius:999px;background:${item.accent};box-shadow:0 0 10px ${item.accent}44"></span>
            ${item.label} ${item.percent.toFixed(1)}%
          </div>
        `).join('')}
      </div>
    `
  }

  function render() {
    if (!onBattleLab()) {
      document.getElementById(GRAPH_ID)?.remove()
      return
    }

    const section = optimalSection()
    if (!section) {
      document.getElementById(GRAPH_ID)?.remove()
      return
    }

    const values = readRatios(section)
    if (!values) return

    let graph = document.getElementById(GRAPH_ID)
    if (!graph) {
      graph = document.createElement('div')
      graph.id = GRAPH_ID
      graph.style.cssText = 'margin-top:16px;padding:15px;border:1px solid rgba(212,175,55,.15);border-radius:16px;background:linear-gradient(145deg,rgba(212,175,55,.035),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.025)'

      const formationArea = [...section.querySelectorAll('div')].find((node) => {
        if (node.closest(`#${GRAPH_ID}`)) return false
        const text = node.textContent || ''
        return text.includes('Infantry') && text.includes('Cavalry') && text.includes('Archers') && node.querySelectorAll('input').length === 0
      })
      if (formationArea?.parentElement) formationArea.insertAdjacentElement('afterend', graph)
      else section.appendChild(graph)
    }

    const signature = values.map((item) => item.percent.toFixed(2)).join('|')
    if (graph.dataset.signature === signature) return
    graph.dataset.signature = signature
    graph.innerHTML = graphHtml(values)
  }

  let queued = false
  const observer = new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      render()
    })
  })

  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
  window.addEventListener('hashchange', () => setTimeout(render, 150))
  document.addEventListener('input', () => setTimeout(render, 40), true)
  document.addEventListener('click', () => setTimeout(render, 80), true)
  setTimeout(render, 700)
})()
