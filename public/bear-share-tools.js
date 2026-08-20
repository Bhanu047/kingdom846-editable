(() => {
  const STYLE_ID = 'k846-bear-share-style'
  const BTN_CLASS = 'k846-share-btn'

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .${BTN_CLASS}{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;width:100%;margin-top:1rem;border:1px solid rgba(226,199,125,.35);border-radius:.75rem;padding:.8rem 1rem;background:linear-gradient(180deg,rgba(226,181,48,.98),rgba(173,134,32,.98));color:#071224;font-weight:900;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18)}
      .${BTN_CLASS}:active{transform:translateY(1px)}
      .${BTN_CLASS}.secondary{background:rgba(226,181,48,.08);color:#f2dfaa;border-color:rgba(226,199,125,.22)}
      .k846-share-row{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-top:1rem}
      .k846-share-row .${BTN_CLASS}{margin-top:0}
      @media(max-width:640px){.k846-share-row{grid-template-columns:1fr}}
    `
    document.head.appendChild(style)
  }

  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim()

  function getPanelByHeading(text) {
    const headings = [...document.querySelectorAll('h2,h3')]
    const heading = headings.find(h => clean(h.textContent).toLowerCase() === text.toLowerCase())
    return heading?.closest('section') || null
  }

  function findKpi(panel, label) {
    if (!panel) return ''
    const nodes = [...panel.querySelectorAll('div')]
    const labelNode = nodes.find(el => clean(el.textContent).toLowerCase() === label.toLowerCase())
    if (!labelNode) return ''
    const card = labelNode.parentElement
    const values = card ? [...card.children].map(x => clean(x.textContent)).filter(Boolean) : []
    return values.find(v => v.toLowerCase() !== label.toLowerCase()) || ''
  }

  function dashboardText() {
    const panel = getPanelByHeading('Damage Analytics Dashboard')
    if (!panel) return ''
    const current = findKpi(panel, 'Projected Impact')
    const optimal = findKpi(panel, 'Optimal Impact')
    const efficiency = findKpi(panel, 'Efficiency')
    const gain = findKpi(panel, 'Potential Gain')
    const formation = findKpi(panel, 'Current Formation')
    if (!current && !optimal) return ''
    return [
      'Kingdom846 Hunt Impact — Damage Analytics',
      current && `Projected Impact: ${current}`,
      optimal && `Optimal Impact: ${optimal}`,
      efficiency && `Efficiency: ${efficiency}`,
      gain && `Potential Gain: ${gain}`,
      formation && `Current Formation (INF/CAV/ARC): ${formation}`,
      `${location.origin}/#/battle-lab`,
    ].filter(Boolean).join('\n')
  }

  function addFormationDownload() {
    const panel = getPanelByHeading('Optimal Troop Split')
    if (!panel || panel.querySelector('[data-k846-share="formation"]')) return
    const existingCopy = [...panel.querySelectorAll('button')].find(b => /copy hunt formation/i.test(clean(b.textContent)))
    if (!existingCopy) return
    const download = document.createElement('button')
    download.type = 'button'
    download.className = `${BTN_CLASS} secondary`
    download.dataset.k846Share = 'formation'
    download.textContent = 'Download Formation Report'
    existingCopy.insertAdjacentElement('afterend', download)
  }

  function addDashboardControls() {
    const panel = getPanelByHeading('Damage Analytics Dashboard')
    if (!panel || panel.querySelector('[data-k846-share="dashboard"]')) return
    const projected = findKpi(panel, 'Projected Impact')
    if (!projected) return

    const row = document.createElement('div')
    row.className = 'k846-share-row'
    row.dataset.k846Share = 'dashboard'

    const download = document.createElement('button')
    download.type = 'button'
    download.className = BTN_CLASS
    download.textContent = 'Download Dashboard'

    const copy = document.createElement('button')
    copy.type = 'button'
    copy.className = `${BTN_CLASS} secondary`
    copy.textContent = 'Copy Dashboard Summary'
    copy.addEventListener('click', async (event) => {
      event.stopPropagation()
      const original = copy.textContent
      try {
        await navigator.clipboard.writeText(dashboardText())
        copy.textContent = 'Copied'
      } catch {}
      setTimeout(() => { copy.textContent = original }, 1400)
    })

    row.append(download, copy)
    const title = [...panel.querySelectorAll('h3')].find(h => /damage analytics dashboard/i.test(clean(h.textContent)))
    const anchor = title?.parentElement || panel
    anchor.insertAdjacentElement('beforeend', row)
  }

  function sync() {
    ensureStyles()
    addFormationDownload()
    addDashboardControls()
  }

  let timer
  const observer = new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(sync, 80)
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', sync)
  window.addEventListener('hashchange', () => setTimeout(sync, 120))
  setTimeout(sync, 300)
})()
