(() => {
  const CARD_ID = 'k846-mystic-report-upload-card'
  const MODULE_NAMES = ['Bear Optimizer', 'Mystic Trials', 'Battle Simulator', 'Hero Synergy', 'Formation Optimizer']

  function buttonByText(text) {
    return [...document.querySelectorAll('button')].find((button) => (button.textContent || '').includes(text))
  }

  function removeCard() {
    document.getElementById(CARD_ID)?.remove()
  }

  function openBattleReportImporter() {
    const importButton = [...document.querySelectorAll('button')].find((button) => (button.textContent || '').trim() === 'Import')
    if (importButton) importButton.click()
  }

  function injectCard() {
    if (!/battle-lab/i.test(location.hash || '')) return
    const mysticButton = buttonByText('Mystic Trials')
    if (!mysticButton) return

    const moduleSection = mysticButton.closest('section')
    const workspace = moduleSection?.nextElementSibling
    const moduleColumn = workspace?.lastElementChild
    if (!moduleColumn || document.getElementById(CARD_ID)) return

    const card = document.createElement('section')
    card.id = CARD_ID
    card.className = 'panel panel-glow mb-6 overflow-hidden p-0'
    card.innerHTML = `
      <div style="padding:20px 22px;border-bottom:1px solid rgba(212,175,55,.12);background:linear-gradient(135deg,rgba(212,175,55,.08),transparent)">
        <div style="font-size:10px;font-weight:800;letter-spacing:.16em;color:rgba(232,199,102,.68);text-transform:uppercase">Mystic Trials · Battle Report Import</div>
        <h2 style="margin:5px 0 6px;font-family:Cinzel,serif;font-size:21px;color:#f6e5ad">Upload your Mystic Trial battle report</h2>
        <p style="margin:0;font-size:12px;line-height:1.65;color:rgba(241,231,206,.58)">Before taking the screenshot, open <b style="color:#f1e7ce">Troop Power Comparison</b> and tap the switch icon shown below. Make sure the report displays the <b style="color:#f0cd69">actual Infantry, Cavalry and Archer troop numbers</b> — <b style="color:#ffb3a7">not troop percentages</b>. Then upload the battle report.</p>
      </div>
      <div style="padding:18px 22px">
        <div style="overflow:hidden;border:1px solid rgba(212,175,55,.18);border-radius:14px;background:rgba(255,255,255,.025)">
          <img src="/assets/mystic-trial-troop-toggle.webp" alt="Troop Power Comparison switch icon highlighted" style="display:block;width:100%;height:auto" />
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding:12px 13px;border:1px solid rgba(251,191,36,.17);border-radius:12px;background:rgba(251,191,36,.045);font-size:11px;line-height:1.55;color:rgba(254,243,199,.72)">
          <span style="font-size:16px;line-height:1">⚠</span>
          <span><b style="color:#fde68a">Required view:</b> troop counts/numbers. If your screenshot still shows values such as 50.00%, 15.00%, 35.00%, switch the view before uploading.</span>
        </div>
        <button type="button" data-mystic-report-upload style="width:100%;margin-top:14px;border:1px solid rgba(212,175,55,.42);border-radius:12px;padding:12px 16px;background:linear-gradient(135deg,rgba(212,175,55,.24),rgba(212,175,55,.10));color:#f7df93;font-weight:800;font-size:12px;cursor:pointer">Upload Battle Report</button>
      </div>`

    card.querySelector('[data-mystic-report-upload]')?.addEventListener('click', openBattleReportImporter)
    moduleColumn.prepend(card)
  }

  function syncForModule(text) {
    if (text.includes('Mystic Trials')) setTimeout(injectCard, 60)
    else removeCard()
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button')
    if (!button) return
    const text = button.textContent || ''
    if (MODULE_NAMES.some((name) => text.includes(name))) syncForModule(text)
  }, true)

  window.addEventListener('hashchange', () => {
    removeCard()
    setTimeout(() => {
      const mysticButton = buttonByText('Mystic Trials')
      if (mysticButton?.className?.includes('border-gold/45')) injectCard()
    }, 250)
  })

  setTimeout(() => {
    const mysticButton = buttonByText('Mystic Trials')
    if (mysticButton?.className?.includes('border-gold/45')) injectCard()
  }, 700)
})()
