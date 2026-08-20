(() => {
  const LEGACY_KEY = 'kingdom846.battleLab.lastReport.v1'
  const FORMATION_KEY = 'kingdom846.battleLab.formationReport.v1'
  const IMPACT_KEY = 'kingdom846.battleLab.impactReport.v1'
  const MODAL_ID = 'k846-battle-import-modal'

  function txt(node){ return (node?.textContent || '').replace(/\s+/g,' ').trim() }
  function activeTab(){
    const buttons = [...document.querySelectorAll('button')]
    const impact = buttons.find(b => /^Hunt Impact$/i.test(txt(b)))
    if (impact && (String(impact.className).includes('bg-gold/15') || String(impact.className).includes('text-gold-bright'))) return 'impact'
    return 'formation'
  }
  function parse(key){ try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
  function write(key, value){ if(value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key) }

  function scopedReport(report, mode){
    if(!report) return null
    if(mode === 'impact') return report
    return {
      savedAt: report.savedAt,
      stats: {
        infantry: { attack: report.stats?.infantry?.attack, lethality: report.stats?.infantry?.lethality },
        cavalry: { attack: report.stats?.cavalry?.attack, lethality: report.stats?.cavalry?.lethality },
        archers: { attack: report.stats?.archers?.attack, lethality: report.stats?.archers?.lethality },
      }
    }
  }

  function activate(mode){
    const report = parse(mode === 'impact' ? IMPACT_KEY : FORMATION_KEY)
    write(LEGACY_KEY, report)
    if(report) window.dispatchEvent(new CustomEvent('k846:report-applied', { detail: report }))
  }

  function relabelModal(){
    const modal = document.getElementById(MODAL_ID)
    if(!modal) return
    const mode = activeTab()
    modal.dataset.k846BearMode = mode
    const headings = [...modal.querySelectorAll('h1,h2,h3,div,span')]
    const title = headings.find(n => /Detected \/ Manual Values|Detected Combat Values|Report Values/i.test(txt(n)) && txt(n).length < 80)
    if(title) title.textContent = mode === 'impact' ? 'Battle Report Values' : 'Rally Bonus Values'
    const capWrap = modal.querySelector('.k846-import-capacity')
    if(capWrap) capWrap.style.setProperty('display', mode === 'impact' ? '' : 'none', 'important')
  }

  document.addEventListener('click', (event) => {
    const tabButton = event.target?.closest?.('button')
    if(tabButton && /^Hunt (Formation|Impact)$/i.test(txt(tabButton))){
      const mode = /Impact/i.test(txt(tabButton)) ? 'impact' : 'formation'
      setTimeout(() => activate(mode), 0)
      setTimeout(relabelModal, 30)
    }

    const apply = event.target?.closest?.(`#${MODAL_ID} [data-action="apply"]`)
    if(apply){
      const mode = activeTab()
      setTimeout(() => {
        const current = parse(LEGACY_KEY)
        if(!current) return
        const saved = scopedReport(current, mode)
        write(mode === 'impact' ? IMPACT_KEY : FORMATION_KEY, saved)
        write(LEGACY_KEY, saved)
        window.dispatchEvent(new CustomEvent('k846:report-applied', { detail: saved }))
      }, 80)
    }
  }, true)

  const observer = new MutationObserver(relabelModal)
  observer.observe(document.documentElement, { childList:true, subtree:true })
  window.addEventListener('hashchange', () => setTimeout(() => activate(activeTab()), 50))
  setTimeout(() => activate(activeTab()), 0)
})()
