(() => {
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  const section = title => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(x => clean(x.textContent) === clean(title))
    return h?.closest('section') || null
  }
  const remember = (el, saved) => {
    if (!el || saved.has(el)) return
    saved.set(el, el.getAttribute('style'))
  }
  const leafMatch = (root, phrase) => {
    const q = clean(phrase)
    const all = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div')]
      .filter(el => clean(el.textContent).includes(q))
      .sort((a,b) => a.childElementCount - b.childElementCount)
    return all[0] || null
  }
  const lca = nodes => {
    if (!nodes.length || nodes.some(n => !n)) return null
    let p = nodes[0]
    while (p) {
      if (nodes.every(n => p.contains(n))) return p
      p = p.parentElement
    }
    return null
  }
  const forceGrid = (root, labels, template, saved) => {
    const nodes = labels.map(x => leafMatch(root, x))
    const common = lca(nodes)
    if (!common) return
    remember(common, saved)
    Object.assign(common.style, {
      display: 'grid',
      gridTemplateColumns: template,
      width: '100%',
      maxWidth: '100%',
      minWidth: '0',
      gap: '14px',
      overflow: 'visible',
      boxSizing: 'border-box'
    })
    for (const child of common.children) {
      remember(child, saved)
      child.style.minWidth = '0'
      child.style.maxWidth = '100%'
      child.style.width = 'auto'
      child.style.boxSizing = 'border-box'
      child.style.overflow = 'hidden'
    }
  }
  function prepareDashboard(dash, saved) {
    remember(dash, saved)
    Object.assign(dash.style, {
      width: '100%',
      maxWidth: '100%',
      minWidth: '0',
      overflow: 'hidden',
      boxSizing: 'border-box'
    })

    // Formation analytics must never appear in Hunt Impact export.
    const formation = dash.querySelector('#k846-formation-analytics')
    let detached = null
    if (formation?.parentNode) {
      detached = { node: formation, parent: formation.parentNode, next: formation.nextSibling }
      formation.remove()
    }

    // Remove fixed/min widths inherited from the responsive live dashboard.
    dash.querySelectorAll('*').forEach(el => {
      remember(el, saved)
      el.style.minWidth = '0'
      el.style.maxWidth = '100%'
      el.style.boxSizing = 'border-box'
    })
    dash.querySelectorAll('svg,canvas').forEach(el => {
      remember(el, saved)
      el.style.width = '100%'
      el.style.maxWidth = '100%'
      el.style.height = 'auto'
      el.style.display = 'block'
    })

    // Rebuild the exact desktop analytics rows used by the approved dashboard.
    forceGrid(dash,
      ['current vs optimal damage distribution', 'current vs optimal summary'],
      'minmax(0,1.55fr) minmax(0,.65fr)', saved)
    forceGrid(dash,
      ['formation sensitivity', 'damage range / confidence'],
      'repeat(2,minmax(0,1fr))', saved)
    forceGrid(dash,
      ['percentile / risk', 'optimal formation'],
      'minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1.1fr)', saved)

    return detached
  }
  function restore(saved, detached) {
    for (const [el, style] of [...saved.entries()].reverse()) {
      if (!el?.isConnected) continue
      if (style == null) el.removeAttribute('style')
      else el.setAttribute('style', style)
    }
    if (detached?.parent?.isConnected) {
      if (detached.next?.parentNode === detached.parent) detached.parent.insertBefore(detached.node, detached.next)
      else detached.parent.appendChild(detached.node)
    }
  }
  function install() {
    if (!window.K846Reports?.downloadImpact || window.K846Reports.__impactLayoutFixed) return false
    const original = window.K846Reports.downloadImpact
    window.K846Reports.downloadImpact = function(...args) {
      const dash = section('Damage Analytics Dashboard')
      if (!dash) return original.apply(this, args)
      const saved = new Map()
      const detached = prepareDashboard(dash, saved)
      let result
      try {
        // The original exporter clones the dashboard synchronously before its first await.
        result = original.apply(this, args)
      } finally {
        restore(saved, detached)
      }
      return result
    }
    window.K846Reports.__impactLayoutFixed = true
    return true
  }
  let tries = 0
  const timer = setInterval(() => {
    if (install() || ++tries > 80) clearInterval(timer)
  }, 100)
  install()
})()
