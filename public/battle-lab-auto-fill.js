(() => {
  const MODAL_ID = 'k846-battle-import-modal'
  let lastRaw = ''
  let timer = null

  function setInput(modal, path, value) {
    if (value == null || value === '') return false
    const input = modal.querySelector(`[data-field="${path}"]`)
    if (!input) return false
    const next = String(value)
    if (input.value === next) return false
    input.value = next
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.dataset.autoDetected = 'true'
    return true
  }

  function syncFromRecognizedText() {
    const modal = document.getElementById(MODAL_ID)
    if (!modal) return
    const raw = modal.querySelector('.k846-import-raw pre')?.textContent || ''
    if (!raw.trim() || raw === lastRaw) return

    const parser = window.__k846BattleLabImport?.parseReportText
    if (typeof parser !== 'function') return

    const parsed = parser(raw)
    const result = parsed?.result || {}
    let filled = 0

    filled += setInput(modal, 'capacity', result.capacity) ? 1 : 0
    ;['infantry', 'cavalry', 'archers'].forEach((troop) => {
      ;['attack', 'lethality', 'defense', 'health'].forEach((stat) => {
        filled += setInput(modal, `${troop}.${stat}`, result?.[troop]?.[stat]) ? 1 : 0
      })
    })

    const detected = modal.querySelector('.k846-import-detected')
    if (detected) detected.hidden = false

    const apply = modal.querySelector('[data-action="apply"]')
    const populated = [...modal.querySelectorAll('.k846-import-detected [data-field]')]
      .filter((input) => input.dataset.field !== 'capacity' && input.value !== '').length
    if (apply) apply.disabled = populated === 0

    const status = modal.querySelector('.k846-import-progress span')
    if (status && populated > 0) {
      status.textContent = `Report read. ${populated} combat values detected automatically — review before applying.`
    }

    lastRaw = raw
  }

  const observer = new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(syncFromRecognizedText, 60)
  })

  function attach() {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden'],
    })
    syncFromRecognizedText()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true })
  else attach()
})()
