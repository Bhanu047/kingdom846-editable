(() => {
  const PANEL_ID = 'k846-hunt-impact-v2'
  let armed = false
  let lastPanel = null

  function panel() {
    return document.getElementById(PANEL_ID)
  }

  function hideResults(root) {
    const results = root?.querySelector('.hi-results')
    if (results) results.style.display = 'none'
  }

  function resetOutputs(root) {
    root?.querySelectorAll('[data-out]').forEach((node) => {
      node.textContent = '—'
    })
    const bars = root?.querySelector('.hi-bars')
    if (bars) bars.innerHTML = ''
  }

  function markDirty(root) {
    armed = false
    hideResults(root)
    resetOutputs(root)
  }

  function bind(root) {
    if (!root || root.dataset.runGateBound === '1') return
    root.dataset.runGateBound = '1'
    lastPanel = root

    // The legacy simulator auto-runs 120ms after mount. Keep that result hidden
    // until the user explicitly presses Run 10,000 Hunts.
    hideResults(root)
    setTimeout(() => {
      if (!armed) {
        hideResults(root)
        resetOutputs(root)
      }
    }, 180)

    const run = root.querySelector('[data-action="simulate"]')
    run?.addEventListener('click', () => {
      armed = true
      // Let the original simulator run first, then reveal its fresh output.
      setTimeout(() => {
        if (!armed) return
        const results = root.querySelector('.hi-results')
        if (results) results.style.display = 'block'
      }, 0)
    }, true)

    const pull = root.querySelector('[data-action="pull"]')
    pull?.addEventListener('click', () => markDirty(root), true)

    root.addEventListener('input', (event) => {
      if (event.target?.matches?.('input,select')) markDirty(root)
    }, true)
    root.addEventListener('change', (event) => {
      if (event.target?.matches?.('input,select')) markDirty(root)
    }, true)
  }

  function sync() {
    const root = panel()
    if (!root) {
      armed = false
      lastPanel = null
      return
    }
    if (root !== lastPanel) armed = false
    bind(root)
    if (!armed) hideResults(root)
  }

  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', sync)
  window.addEventListener('hashchange', () => setTimeout(sync, 60))
  setInterval(sync, 300)
})()
