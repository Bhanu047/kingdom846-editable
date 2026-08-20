(() => {
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim()
  const section = title => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(x => clean(x.textContent).toLowerCase() === title.toLowerCase())
    return h?.closest('section') || null
  }

  function install() {
    const api = window.K846Reports
    if (!api?.downloadImpact || api.downloadImpact.__k846ImpactGuard) return false
    const original = api.downloadImpact

    async function guardedDownloadImpact(...args) {
      // Hunt Formation analytics must never appear in a Hunt Impact export.
      document.getElementById('k846-formation-analytics')?.remove()
      document.querySelectorAll('.k846-form-intel').forEach(n => n.remove())

      const dash = section('Damage Analytics Dashboard')
      const restore = []
      const setStyle = (el, key, value) => {
        if (!el) return
        restore.push([el, key, el.style[key]])
        el.style[key] = value
      }

      if (dash) {
        setStyle(dash, 'width', '1450px')
        setStyle(dash, 'maxWidth', '1450px')
        setStyle(dash, 'minWidth', '1450px')
        setStyle(dash, 'overflow', 'visible')
        setStyle(dash, 'boxSizing', 'border-box')

        // Force the same desktop dashboard composition regardless of the device
        // used to initiate the download.
        for (const g of dash.querySelectorAll('div')) {
          const text = clean(g.textContent)
          if (text.includes('Projected Impact') && text.includes('Optimal Impact') && text.includes('Efficiency') && text.includes('Current Formation')) {
            setStyle(g, 'display', 'grid')
            setStyle(g, 'gridTemplateColumns', 'repeat(5,minmax(0,1fr))')
            setStyle(g, 'width', '100%')
          } else if (text.includes('10,000-Hunt Projection') && text.includes('Current vs Optimal Summary')) {
            setStyle(g, 'display', 'grid')
            setStyle(g, 'gridTemplateColumns', '1.35fr .65fr')
            setStyle(g, 'width', '100%')
          } else if (text.includes('Formation Sensitivity') && text.includes('Damage Range / Confidence')) {
            setStyle(g, 'display', 'grid')
            setStyle(g, 'gridTemplateColumns', 'repeat(2,minmax(0,1fr))')
            setStyle(g, 'width', '100%')
          } else if (text.includes('Percentile / Risk') && text.includes('Current Formation') && text.includes('Optimal Formation')) {
            setStyle(g, 'display', 'grid')
            setStyle(g, 'gridTemplateColumns', 'repeat(3,minmax(0,1fr))')
            setStyle(g, 'width', '100%')
          }
        }

        dash.querySelectorAll('*').forEach(el => {
          if (el.id === 'k846-formation-analytics') el.remove()
          if (el instanceof HTMLElement) {
            if (getComputedStyle(el).display === 'grid') {
              setStyle(el, 'minWidth', '0')
              setStyle(el, 'maxWidth', '100%')
            }
          }
        })
        dash.querySelectorAll('svg').forEach(svg => {
          setStyle(svg, 'width', '100%')
          setStyle(svg, 'maxWidth', '100%')
          setStyle(svg, 'height', 'auto')
          setStyle(svg, 'overflow', 'visible')
        })
      }

      try {
        return await original.apply(api, args)
      } finally {
        for (let i = restore.length - 1; i >= 0; i--) {
          const [el, key, value] = restore[i]
          if (el?.style) el.style[key] = value
        }
      }
    }

    guardedDownloadImpact.__k846ImpactGuard = true
    guardedDownloadImpact.__original = original
    api.downloadImpact = guardedDownloadImpact
    return true
  }

  if (!install()) {
    let tries = 0
    const timer = setInterval(() => {
      if (install() || ++tries > 80) clearInterval(timer)
    }, 100)
  }
})()
