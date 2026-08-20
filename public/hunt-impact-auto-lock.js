(() => {
  const MODAL_ID = 'k846-hunt-impact-import'
  const AUTO_FIELDS = [
    'capacity',
    'stats.infantry.attack', 'stats.infantry.lethality', 'troopCounts.infantry',
    'stats.cavalry.attack', 'stats.cavalry.lethality', 'troopCounts.cavalry',
    'stats.archers.attack', 'stats.archers.lethality', 'troopCounts.archers',
  ]

  function lockAutoFields(root) {
    AUTO_FIELDS.forEach((path) => {
      const input = root.querySelector(`[data-field="${path}"]`)
      if (!input) return
      input.readOnly = true
      input.setAttribute('aria-readonly', 'true')
      input.tabIndex = -1
      input.classList.add('hi-auto-locked')
    })
  }

  function limitParticipants(root) {
    const select = root.querySelector('[data-field="participants"]')
    if (!select) return
    ;[...select.options].forEach((option) => {
      const value = Number(option.value)
      if (Number.isFinite(value) && value > 15) option.remove()
    })
  }

  function improveCopy(root) {
    const note = root.querySelector('.hi-note')
    if (note) note.innerHTML = '<b>AUTO FROM REPORT</b> Rally Capacity, Attack, Lethality and INF/CAV/ARC troops are detected automatically and cannot be edited. <b>YOU SELECT</b> Participants (max 15), Troop Tier and True Gold.'

    const capacityLabel = root.querySelector('[data-field="capacity"]')?.closest('label')?.querySelector('span')
    if (capacityLabel) capacityLabel.innerHTML = 'Rally Capacity <em>AUTO · LOCKED</em>'

    const headCopy = root.querySelector('.hi-head p')
    if (headCopy) headCopy.textContent = 'Upload the report once. Combat stats, rally capacity and troop totals are detected automatically. You only select Participants, Troop Tier and True Gold.'
  }

  function styleLockedFields() {
    if (document.getElementById('hi-auto-lock-style')) return
    const style = document.createElement('style')
    style.id = 'hi-auto-lock-style'
    style.textContent = `
      #${MODAL_ID} .hi-auto-locked{
        cursor:not-allowed!important;
        user-select:none!important;
        opacity:.9;
        background:rgba(4,14,28,.82)!important;
        border-color:rgba(212,175,55,.12)!important;
        color:#eadfbf!important;
      }
      #${MODAL_ID} .hi-auto-locked:focus{outline:none!important;box-shadow:none!important}
    `
    document.head.appendChild(style)
  }

  function rewriteStatus(root) {
    const status = root.querySelector('.hi-status')
    if (!status) return
    const text = status.textContent || ''
    if (/Missing \d+ report value/i.test(text) || /Correct only the fields OCR/i.test(text)) {
      status.textContent = 'Could not detect every required report value automatically. Upload a clearer/full battle report screenshot and try again.'
    } else if (/Review the values, then apply/i.test(text)) {
      status.textContent = 'All report values detected automatically. Complete the 3 selections, then apply to Hunt Impact.'
    }
  }

  function setup(root) {
    styleLockedFields()
    lockAutoFields(root)
    limitParticipants(root)
    improveCopy(root)
    rewriteStatus(root)

    const file = root.querySelector('#hi-file')
    if (file && !file.dataset.autoReadBound) {
      file.dataset.autoReadBound = '1'
      file.addEventListener('change', () => {
        window.setTimeout(() => {
          const read = root.querySelector('[data-action="read"]')
          if (read && !read.disabled) read.click()
        }, 80)
      })
    }

    const observer = new MutationObserver(() => {
      lockAutoFields(root)
      limitParticipants(root)
      rewriteStatus(root)
    })
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] })
  }

  const pageObserver = new MutationObserver(() => {
    const root = document.getElementById(MODAL_ID)
    if (root && !root.dataset.autoLockReady) {
      root.dataset.autoLockReady = '1'
      setup(root)
    }
  })

  pageObserver.observe(document.documentElement, { childList: true, subtree: true })
})()
