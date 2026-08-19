(() => {
  const ID = 'k846-bear-ratio-graph-v2'
  const TROOPS = [
    { label: 'Infantry', short: 'INF', color: '#d6b24c' },
    { label: 'Cavalry', short: 'CAV', color: '#8fb6e8' },
    { label: 'Archers', short: 'ARC', color: '#d98b72' },
  ]

  function resultSection() {
    return [...document.querySelectorAll('section')].find((section) => {
      const text = section.textContent || ''
      return text.includes('Optimal Split') && (text.includes('Recommended Bear Ratio') || text.includes('Recommended March'))
    }) || null
  }

  function troopPercent(section, troop) {
    const candidates = [...section.querySelectorAll('div')]
      .filter((node) => !node.closest(`#${ID}`))
      .filter((node) => {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
        return text.includes(troop.label) && /\b\d+(?:\.\d+)?%\b/.test(text)
      })
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)

    for (const node of candidates) {
      const matches = [...(node.textContent || '').matchAll(/([0-9]+(?:\.[0-9]+)?)%/g)]
      for (const match of matches) {
        const value = Number(match[1])
        if (Number.isFinite(value) && value >= 0 && value <= 100) return value
      }
    }
    return null
  }

  function values(section) {
    const rows = TROOPS.map((troop) => ({ ...troop, percent: troopPercent(section, troop) }))
    if (rows.some((row) => row.percent == null)) return null
    const total = rows.reduce((sum, row) => sum + row.percent, 0)
    if (!total) return null
    return rows.map((row) => ({ ...row, normalized: row.percent / total * 100 }))
  }

  function html(rows) {
    return `
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font:800 9px Montserrat,system-ui,sans-serif;letter-spacing:.15em;color:rgba(212,175,55,.55)">BEAR FORMATION</div>
          <div style="margin-top:3px;font:700 18px Cinzel,serif;color:#f1e7ce">Recommended Ratio Graph</div>
        </div>
        <div style="font:600 10px 'JetBrains Mono',monospace;color:rgba(241,231,206,.45)">${rows.map((row) => `${row.short} ${row.percent.toFixed(1)}%`).join(' · ')}</div>
      </div>

      <div style="margin-top:14px;height:22px;display:flex;overflow:hidden;border-radius:999px;background:rgba(2,12,26,.75);border:1px solid rgba(212,175,55,.14)">
        ${rows.map((row) => `<div title="${row.label} ${row.percent.toFixed(1)}%" style="height:100%;width:${row.normalized.toFixed(4)}%;background:${row.color};min-width:${row.normalized > 0 ? '2px' : '0'}"></div>`).join('')}
      </div>

      <div style="margin-top:15px;display:grid;gap:11px">
        ${rows.map((row) => `
          <div style="display:grid;grid-template-columns:46px minmax(0,1fr) 58px;align-items:center;gap:10px">
            <div style="font:800 10px Montserrat,system-ui,sans-serif;letter-spacing:.12em;color:rgba(241,231,206,.62)">${row.short}</div>
            <div style="height:12px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.055)">
              <div style="height:100%;width:${Math.min(100, Math.max(0, row.percent)).toFixed(2)}%;border-radius:999px;background:${row.color};transition:width .3s ease"></div>
            </div>
            <div style="text-align:right;font:800 12px 'JetBrains Mono',monospace;color:#f1e7ce">${row.percent.toFixed(1)}%</div>
          </div>`).join('')}
      </div>`
  }

  function render() {
    if (!/battle-lab/i.test(location.hash || '')) {
      document.getElementById(ID)?.remove()
      return
    }
    const section = resultSection()
    if (!section) return
    const rows = values(section)
    if (!rows) return

    let graph = document.getElementById(ID)
    if (!graph) {
      graph = document.createElement('div')
      graph.id = ID
      graph.style.cssText = 'margin-top:16px;padding:16px;border-radius:16px;border:1px solid rgba(212,175,55,.16);background:linear-gradient(145deg,rgba(212,175,55,.045),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.025)'

      const gain = [...section.querySelectorAll('div')].find((node) => /Modeled gain/i.test(node.textContent || ''))
      if (gain) {
        const grid = gain.closest('.grid') || gain.parentElement
        grid?.insertAdjacentElement('beforebegin', graph)
      } else {
        section.appendChild(graph)
      }
    }

    const signature = rows.map((row) => row.percent.toFixed(2)).join('|')
    if (graph.dataset.signature !== signature) {
      graph.dataset.signature = signature
      graph.innerHTML = html(rows)
    }
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
  document.addEventListener('input', () => setTimeout(render, 30), true)
  document.addEventListener('change', () => setTimeout(render, 30), true)
  document.addEventListener('click', () => setTimeout(render, 70), true)
  window.addEventListener('hashchange', () => setTimeout(render, 150))
  setTimeout(render, 650)
})()
