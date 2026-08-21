(() => {
  const STYLE_ID = 'k846-mp-share-style'
  const BTN = 'k846-mp-share-btn'
  const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim()

  function styles() {
    if (document.getElementById(STYLE_ID)) return
    const s = document.createElement('style')
    s.id = STYLE_ID
    s.textContent = `.${BTN}{display:inline-flex;align-items:center;justify-content:center;width:100%;margin-top:1rem;border:1px solid rgba(226,199,125,.35);border-radius:.75rem;padding:.8rem 1rem;background:linear-gradient(180deg,rgba(226,181,48,.98),rgba(173,134,32,.98));color:#071224;font-weight:900;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}.k846-mp-row{margin:1rem 0 .25rem}.k846-mp-row .${BTN}{margin-top:0}`
    document.head.appendChild(s)
  }

  function panel(title) {
    const h = [...document.querySelectorAll('h2,h3')].find((x) => clean(x.textContent).toLowerCase() === title.toLowerCase())
    return h ? { heading: h, section: h.closest('section') } : null
  }

  function makeDownloadBtn(label, run) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = BTN
    b.textContent = label
    b.onclick = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const fn = window.K846Reports?.[run]
      if (!fn) return
      const old = b.textContent
      b.disabled = true
      b.textContent = 'Preparing Official Report…'
      try { await fn() } finally { b.disabled = false; b.textContent = old }
    }
    return b
  }

  function addMystic() {
    const found = panel('All Trials Ranked')
    if (!found?.section || found.section.querySelector('[data-k846-report-btn="mystic"]')) return
    const row = document.createElement('div')
    row.className = 'k846-mp-row'
    row.dataset.k846ReportBtn = 'mystic'
    row.appendChild(makeDownloadBtn('Download Stat Source Report', 'downloadMystic'))
    found.section.appendChild(row)
  }

  function addPvp() {
    const found = panel('Battle Outcome')
    if (!found?.section || found.section.querySelector('[data-k846-report-btn="pvp"]')) return
    const row = document.createElement('div')
    row.className = 'k846-mp-row'
    row.dataset.k846ReportBtn = 'pvp'
    row.appendChild(makeDownloadBtn('Download Battle Report', 'downloadPvp'))
    found.section.appendChild(row)
  }

  function sync() {
    styles()
    addMystic()
    addPvp()
  }

  let timer = null
  const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(sync, 180) })
  obs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', sync)
  window.addEventListener('hashchange', () => setTimeout(sync, 200))
  setTimeout(sync, 350)
})()
