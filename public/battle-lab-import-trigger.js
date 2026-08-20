(() => {
  const BUTTON_ID = 'k846-combat-report-import-trigger'

  function isBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function findStatsSection() {
    if (!isBattleLab()) return null
    const headings = [...document.querySelectorAll('h1,h2,h3')]
    const heading = headings.find((node) => /combat\s+report\s+stats/i.test((node.textContent || '').trim()))
    return heading?.closest('section') || null
  }

  function ensureButton() {
    const existing = document.getElementById(BUTTON_ID)
    const section = findStatsSection()
    if (!section) {
      existing?.remove()
      return
    }
    if (existing && section.contains(existing)) return
    existing?.remove()

    const button = document.createElement('button')
    button.id = BUTTON_ID
    button.type = 'button'
    button.textContent = 'Import'
    button.setAttribute('aria-label', 'Import Combat Report')
    button.style.cssText = [
      'width:100%',
      'margin:14px 0 6px',
      'border:1px solid rgba(232,199,102,.45)',
      'border-radius:12px',
      'background:linear-gradient(180deg,#f3d96b,#c79b21)',
      'color:#0b1424',
      'font-family:Cinzel,serif',
      'font-size:13px',
      'font-weight:800',
      'letter-spacing:.12em',
      'text-transform:uppercase',
      'padding:12px 16px',
      'box-shadow:0 8px 28px rgba(212,175,55,.16)',
      'cursor:pointer'
    ].join(';')

    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (window.__k846BattleLabImport?.open) window.__k846BattleLabImport.open()
    })

    const description = [...section.querySelectorAll('p')].find((node) => /percentages from the report/i.test(node.textContent || ''))
    if (description) description.insertAdjacentElement('afterend', button)
    else section.insertBefore(button, section.children[2] || null)
  }

  const observer = new MutationObserver(ensureButton)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', () => setTimeout(ensureButton, 50))
  document.addEventListener('DOMContentLoaded', ensureButton)
  setInterval(ensureButton, 800)
})()
