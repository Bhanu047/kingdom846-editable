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

  function formationText() {
    const panel = getPanelByHeading('Optimal Troop Split')
    if (!panel) return ''
    const values = [...panel.querySelectorAll('.font-mono')].map(el => clean(el.textContent)).filter(v => /%$/.test(v))
    if (values.length >= 3) {
      const nums = values.slice(0, 3).map(v => Math.round(parseFloat(v) || 0))
      return `Kingdom846 Hunt Formation\nINF ${nums[0]}% · CAV ${nums[1]}% · ARC ${nums[2]}%\n${location.origin}/#/battle-lab`
    }
    const donut = [...panel.querySelectorAll('*')].map(el => clean(el.textContent)).find(v => /^\d+\/\d+\/\d+$/.test(v))
    return donut ? `Kingdom846 Hunt Formation\nINF/CAV/ARC ${donut}\n${location.origin}/#/battle-lab` : ''
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
    const lines = [
      'Kingdom846 Hunt Impact — Damage Analytics',
      current && `Projected Impact: ${current}`,
      optimal && `Optimal Impact: ${optimal}`,
      efficiency && `Efficiency: ${efficiency}`,
      gain && `Potential Gain: ${gain}`,
      formation && `Current Formation (INF/CAV/ARC): ${formation}`,
      `${location.origin}/#/battle-lab`,
    ].filter(Boolean)
    return lines.join('\n')
  }

  async function shareText(title, text, button) {
    if (!text) return
    const original = button.textContent
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: `${location.origin}/#/battle-lab` })
        button.textContent = 'Shared'
      } else {
        await navigator.clipboard.writeText(text)
        button.textContent = 'Copied'
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(text)
        button.textContent = 'Copied'
      } catch {}
    }
    setTimeout(() => { button.textContent = original }, 1400)
  }

  function addFormationShare() {
    const panel = getPanelByHeading('Optimal Troop Split')
    if (!panel || panel.querySelector('[data-k846-share="formation"]')) return
    const existingCopy = [...panel.querySelectorAll('button')].find(b => /copy hunt formation/i.test(clean(b.textContent)))
    if (!existingCopy) return
    const share = document.createElement('button')
    share.type = 'button'
    share.className = `${BTN_CLASS} secondary`
    share.dataset.k846Share = 'formation'
    share.textContent = 'Share Hunt Formation'
    share.addEventListener('click', () => shareText('Kingdom846 Hunt Formation', formationText(), share))
    existingCopy.insertAdjacentElement('afterend', share)
  }

  function addDashboardShare() {
    const panel = getPanelByHeading('Damage Analytics Dashboard')
    if (!panel || panel.querySelector('[data-k846-share="dashboard"]')) return
    const projected = findKpi(panel, 'Projected Impact')
    if (!projected) return
    const row = document.createElement('div')
    row.className = 'k846-share-row'
    row.dataset.k846Share = 'dashboard'

    const share = document.createElement('button')
    share.type = 'button'
    share.className = BTN_CLASS
    share.textContent = 'Share Dashboard'
    share.addEventListener('click', () => shareText('Kingdom846 Hunt Impact', dashboardText(), share))

    const copy = document.createElement('button')
    copy.type = 'button'
    copy.className = `${BTN_CLASS} secondary`
    copy.textContent = 'Copy Dashboard Summary'
    copy.addEventListener('click', async () => {
      const original = copy.textContent
      try { await navigator.clipboard.writeText(dashboardText()); copy.textContent = 'Copied' } catch {}
      setTimeout(() => { copy.textContent = original }, 1400)
    })

    row.append(share, copy)
    const title = [...panel.querySelectorAll('h3')].find(h => /damage analytics dashboard/i.test(clean(h.textContent)))
    const anchor = title?.parentElement || panel
    anchor.insertAdjacentElement('beforeend', row)
  }

  function sync() {
    ensureStyles()
    addFormationShare()
    addDashboardShare()
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
