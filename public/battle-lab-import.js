(() => {
  const MODAL_ID = 'k846-battle-import-modal'
  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const TYPES = [
    { key: 'infantry', label: 'Infantry', short: 'INF' },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV' },
    { key: 'archers', label: 'Archers', short: 'ARC' },
  ]
  const STATS = [
    { key: 'attack', label: 'Attack' },
    { key: 'lethality', label: 'Lethality' },
    { key: 'defense', label: 'Defense' },
    { key: 'health', label: 'Health' },
  ]

  function onBattleLab() {
    return /battle-lab/i.test(location.hash || '')
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function modalTemplate() {
    const fields = TYPES.map((troop) => `
      <div class="k846-import-troop" data-troop="${troop.key}">
        <div class="k846-import-troop-head"><span>${troop.short}</span>${troop.label}</div>
        <div class="k846-import-stat-grid">
          ${STATS.map((stat) => `
            <label>
              <span>${stat.label}</span>
              <div class="k846-import-input-wrap"><input inputmode="decimal" type="number" min="0" step="0.01" data-field="${troop.key}.${stat.key}" placeholder="—"><b>%</b></div>
            </label>`).join('')}
        </div>
      </div>`).join('')

    return `
      <div class="k846-import-backdrop" data-action="close"></div>
      <section class="k846-import-dialog" role="dialog" aria-modal="true" aria-labelledby="k846-import-title">
        <header class="k846-import-head">
          <div>
            <div class="k846-import-eyebrow">KINGDOM 846 · BATTLE LAB</div>
            <h2 id="k846-import-title">Import Combat Stats</h2>
            <p>Upload a Kingshot battle-report screenshot or enter the values manually.</p>
          </div>
          <button class="k846-import-close" type="button" data-action="close" aria-label="Close">×</button>
        </header>

        <div class="k846-import-tabs">
          <button type="button" class="active" data-tab="screenshot">▣ Screenshot Import</button>
          <button type="button" data-tab="manual">⌨ Manual Entry</button>
        </div>

        <div class="k846-import-body">
          <div data-panel="screenshot">
            <input id="k846-import-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
            <div class="k846-import-drop" tabindex="0" role="button">
              <div class="k846-import-upload-icon">⇧</div>
              <strong>Drop your battle report screenshot here</strong>
              <span>or tap to choose a picture</span>
              <small>PNG, JPG or WEBP · max 8 MB</small>
            </div>
            <div class="k846-import-preview" hidden>
              <img alt="Battle report preview">
              <div>
                <strong class="k846-import-file-name"></strong>
                <span class="k846-import-file-meta"></span>
                <button type="button" data-action="replace-image">Choose another picture</button>
              </div>
            </div>
            <button type="button" class="k846-import-analyze" data-action="analyze" disabled>✦ Read Screenshot</button>
            <div class="k846-import-progress" hidden><div></div><span>Preparing image…</span></div>
            <div class="k846-import-note">The image is processed in your browser for text recognition. Review detected values before applying them.</div>
          </div>

          <div data-panel="manual" hidden>
            <div class="k846-import-note manual">Enter the values exactly as shown in your Kingshot report.</div>
          </div>

          <div class="k846-import-detected" hidden>
            <div class="k846-import-section-title"><span>Detected / Manual Values</span><em>Review before applying</em></div>
            <label class="k846-import-capacity"><span>March Capacity <small>(optional)</small></span><input inputmode="numeric" type="number" min="1" step="1000" data-field="capacity" placeholder="e.g. 750000"></label>
            <div class="k846-import-fields">${fields}</div>
            <details class="k846-import-raw" hidden><summary>Show recognized text</summary><pre></pre></details>
          </div>
        </div>

        <footer class="k846-import-footer">
          <button type="button" class="k846-import-json" data-action="json-restore">Restore JSON backup</button>
          <div class="k846-import-footer-actions">
            <button type="button" class="k846-import-cancel" data-action="close">Cancel</button>
            <button type="button" class="k846-import-apply" data-action="apply" disabled>Apply to Profile</button>
          </div>
        </footer>
      </section>`
  }

  function injectStyles() {
    if (document.getElementById('k846-battle-import-style')) return
    const style = document.createElement('style')
    style.id = 'k846-battle-import-style'
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:18px;font-family:Montserrat,system-ui,sans-serif}
      #${MODAL_ID} .k846-import-backdrop{position:absolute;inset:0;background:rgba(2,8,20,.82);backdrop-filter:blur(7px)}
      #${MODAL_ID} .k846-import-dialog{position:relative;width:min(760px,100%);max-height:min(90vh,900px);overflow:hidden;border:1px solid rgba(222,184,76,.28);border-radius:24px;background:linear-gradient(145deg,rgba(12,28,50,.99),rgba(4,14,29,.99));box-shadow:0 30px 100px rgba(0,0,0,.62),0 0 50px rgba(212,175,55,.07);color:#f1e7ce}
      #${MODAL_ID} .k846-import-head{display:flex;justify-content:space-between;gap:16px;padding:24px 26px 18px;border-bottom:1px solid rgba(212,175,55,.12);background:radial-gradient(circle at 10% 0%,rgba(212,175,55,.10),transparent 42%)}
      #${MODAL_ID} .k846-import-eyebrow{font-size:10px;font-weight:800;letter-spacing:.18em;color:rgba(232,199,102,.62)}
      #${MODAL_ID} h2{margin:5px 0 4px;font-family:Cinzel,serif;font-size:25px;color:#f6e5ad}
      #${MODAL_ID} .k846-import-head p{margin:0;font-size:12px;line-height:1.55;color:rgba(241,231,206,.5)}
      #${MODAL_ID} .k846-import-close{border:0;background:transparent;color:rgba(241,231,206,.6);font-size:32px;line-height:1;cursor:pointer;padding:0 4px;align-self:flex-start}
      #${MODAL_ID} .k846-import-tabs{display:grid;grid-template-columns:1fr 1fr;padding:0 26px;border-bottom:1px solid rgba(212,175,55,.10)}
      #${MODAL_ID} .k846-import-tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:rgba(241,231,206,.42);padding:15px 8px 13px;font-weight:800;font-size:12px;cursor:pointer}
      #${MODAL_ID} .k846-import-tabs button.active{color:#f0cd69;border-bottom-color:#d4af37}
      #${MODAL_ID} .k846-import-body{padding:22px 26px;overflow:auto;max-height:calc(90vh - 250px)}
      #${MODAL_ID} .k846-import-drop{display:flex;min-height:200px;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1.5px dashed rgba(232,199,102,.38);border-radius:18px;background:linear-gradient(180deg,rgba(212,175,55,.035),rgba(255,255,255,.018));cursor:pointer;text-align:center;transition:.2s}
      #${MODAL_ID} .k846-import-drop:hover,#${MODAL_ID} .k846-import-drop.drag{border-color:rgba(240,205,105,.75);background:rgba(212,175,55,.07);transform:translateY(-1px)}
      #${MODAL_ID} .k846-import-upload-icon{display:grid;width:52px;height:52px;place-items:center;border-radius:16px;border:1px solid rgba(232,199,102,.22);background:rgba(212,175,55,.08);font-size:27px;color:#f0cd69}
      #${MODAL_ID} .k846-import-drop strong{font-family:Cinzel,serif;font-size:14px;color:#f2dfaa}
      #${MODAL_ID} .k846-import-drop span{font-size:12px;color:rgba(241,231,206,.46)}
      #${MODAL_ID} .k846-import-drop small{margin-top:8px;font-size:10px;color:rgba(241,231,206,.28)}
      #${MODAL_ID} .k846-import-preview{display:flex;align-items:center;gap:14px;border:1px solid rgba(212,175,55,.14);border-radius:16px;padding:12px;background:rgba(255,255,255,.025)}
      #${MODAL_ID} .k846-import-preview img{width:92px;height:72px;object-fit:cover;border-radius:10px;border:1px solid rgba(212,175,55,.16)}
      #${MODAL_ID} .k846-import-preview div{min-width:0;display:flex;flex:1;flex-direction:column;gap:4px}
      #${MODAL_ID} .k846-import-preview strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#f1e7ce}
      #${MODAL_ID} .k846-import-preview span{font-size:10px;color:rgba(241,231,206,.38)}
      #${MODAL_ID} .k846-import-preview button{align-self:flex-start;border:0;background:transparent;padding:2px 0;color:#e8c766;font-size:10px;font-weight:700;cursor:pointer}
      #${MODAL_ID} .k846-import-analyze{width:100%;margin-top:12px;border:1px solid rgba(232,199,102,.35);border-radius:12px;background:linear-gradient(180deg,#d4af37,#ad8620);color:#0b1424;font-weight:900;padding:11px 15px;cursor:pointer}
      #${MODAL_ID} .k846-import-analyze:disabled{opacity:.38;cursor:not-allowed}
      #${MODAL_ID} .k846-import-progress{margin-top:12px;border-radius:10px;background:rgba(255,255,255,.035);padding:10px 12px}
      #${MODAL_ID} .k846-import-progress div{height:4px;width:0;border-radius:99px;background:#d4af37;transition:width .2s}
      #${MODAL_ID} .k846-import-progress span{display:block;margin-top:7px;font-size:10px;color:rgba(241,231,206,.45)}
      #${MODAL_ID} .k846-import-note{margin-top:12px;border:1px solid rgba(88,166,255,.12);border-radius:12px;background:rgba(88,166,255,.035);padding:10px 12px;font-size:10px;line-height:1.55;color:rgba(199,225,255,.55)}
      #${MODAL_ID} .k846-import-note.manual{margin-top:0;margin-bottom:14px}
      #${MODAL_ID} .k846-import-section-title{display:flex;align-items:end;justify-content:space-between;gap:8px;margin:20px 0 10px;padding-top:18px;border-top:1px solid rgba(212,175,55,.10)}
      #${MODAL_ID} .k846-import-section-title span{font-family:Cinzel,serif;font-size:13px;font-weight:800;color:#ead393}
      #${MODAL_ID} .k846-import-section-title em{font-style:normal;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:rgba(241,231,206,.30)}
      #${MODAL_ID} .k846-import-capacity{display:block;margin-bottom:12px}
      #${MODAL_ID} .k846-import-capacity>span,#${MODAL_ID} .k846-import-stat-grid label>span{display:block;margin-bottom:5px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(241,231,206,.42)}
      #${MODAL_ID} .k846-import-capacity small{font-size:8px;color:rgba(241,231,206,.25)}
      #${MODAL_ID} input[type=number]{box-sizing:border-box;width:100%;border:1px solid rgba(212,175,55,.16);border-radius:10px;background:rgba(0,0,0,.23);padding:9px 10px;color:#f1e7ce;font-weight:700;outline:none}
      #${MODAL_ID} input[type=number]:focus{border-color:rgba(232,199,102,.5);box-shadow:0 0 0 2px rgba(212,175,55,.08)}
      #${MODAL_ID} .k846-import-fields{display:grid;gap:10px}
      #${MODAL_ID} .k846-import-troop{border:1px solid rgba(212,175,55,.10);border-radius:14px;background:rgba(255,255,255,.02);padding:12px}
      #${MODAL_ID} .k846-import-troop-head{display:flex;gap:8px;align-items:center;margin-bottom:9px;font-family:Cinzel,serif;font-size:12px;font-weight:800}
      #${MODAL_ID} .k846-import-troop-head span{border:1px solid rgba(212,175,55,.18);border-radius:7px;background:rgba(212,175,55,.06);padding:3px 6px;color:#d9b84c;font-family:JetBrains Mono,monospace;font-size:9px}
      #${MODAL_ID} .k846-import-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      #${MODAL_ID} .k846-import-input-wrap{position:relative}
      #${MODAL_ID} .k846-import-input-wrap input{padding-right:24px}
      #${MODAL_ID} .k846-import-input-wrap b{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:10px;color:rgba(232,199,102,.45)}
      #${MODAL_ID} .k846-import-raw{margin-top:12px;border:1px solid rgba(212,175,55,.10);border-radius:12px;padding:9px 11px;background:rgba(0,0,0,.16)}
      #${MODAL_ID} .k846-import-raw summary{cursor:pointer;font-size:10px;color:rgba(241,231,206,.48)}
      #${MODAL_ID} .k846-import-raw pre{max-height:140px;overflow:auto;white-space:pre-wrap;font:9px/1.45 JetBrains Mono,monospace;color:rgba(241,231,206,.40)}
      #${MODAL_ID} .k846-import-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 26px 18px;border-top:1px solid rgba(212,175,55,.10);background:rgba(0,0,0,.12)}
      #${MODAL_ID} .k846-import-footer-actions{display:flex;gap:8px}
      #${MODAL_ID} .k846-import-footer button{border-radius:10px;padding:9px 13px;font-size:10px;font-weight:800;cursor:pointer}
      #${MODAL_ID} .k846-import-json{border:0;background:transparent!important;color:rgba(241,231,206,.38)}
      #${MODAL_ID} .k846-import-cancel{border:1px solid rgba(212,175,55,.16);background:rgba(255,255,255,.035);color:rgba(241,231,206,.65)}
      #${MODAL_ID} .k846-import-apply{border:1px solid rgba(232,199,102,.38);background:linear-gradient(180deg,#d4af37,#a98220);color:#071224}
      #${MODAL_ID} .k846-import-apply:disabled{opacity:.38;cursor:not-allowed}
      @media(max-width:640px){
        #${MODAL_ID}{padding:8px;align-items:end}
        #${MODAL_ID} .k846-import-dialog{max-height:94vh;border-radius:22px 22px 12px 12px}
        #${MODAL_ID} .k846-import-head{padding:18px 18px 14px}
        #${MODAL_ID} h2{font-size:20px}
        #${MODAL_ID} .k846-import-tabs{padding:0 14px}
        #${MODAL_ID} .k846-import-tabs button{font-size:10px}
        #${MODAL_ID} .k846-import-body{padding:16px 16px;max-height:calc(94vh - 230px)}
        #${MODAL_ID} .k846-import-stat-grid{grid-template-columns:repeat(2,1fr)}
        #${MODAL_ID} .k846-import-footer{padding:12px 16px;align-items:stretch;flex-direction:column-reverse}
        #${MODAL_ID} .k846-import-footer-actions{display:grid;grid-template-columns:1fr 1.35fr}
        #${MODAL_ID} .k846-import-json{text-align:left;padding-left:0}
      }
    `
    document.head.appendChild(style)
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract)
    if (window.__k846TesseractPromise) return window.__k846TesseractPromise
    window.__k846TesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = TESSERACT_SRC
      script.async = true
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('OCR library did not load.'))
      script.onerror = () => reject(new Error('Unable to load screenshot reader. Check your connection and try again.'))
      document.head.appendChild(script)
    })
    return window.__k846TesseractPromise
  }

  function cleanNumber(value) {
    if (value == null) return ''
    const n = Number(String(value).replace(/,/g, '').replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) ? n : ''
  }

  function parseReportText(text) {
    const normalized = String(text || '')
      .replace(/[|]/g, 'I')
      .replace(/[‐‑–—]/g, '-')
      .replace(/\r/g, '')
    const lines = normalized.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const lower = normalized.toLowerCase().replace(/\s+/g, ' ')
    const result = { capacity: '' }
    TYPES.forEach(({ key }) => { result[key] = { attack: '', lethality: '', defense: '', health: '' } })

    const aliases = {
      infantry: ['infantry', 'inf'],
      cavalry: ['cavalry', 'cav'],
      archers: ['archers', 'archer', 'arc'],
    }
    const statAliases = {
      attack: ['attack', 'atk'],
      lethality: ['lethality', 'lethal', 'let'],
      defense: ['defense', 'defence', 'def'],
      health: ['health', 'hp'],
    }

    for (const troop of TYPES) {
      for (const stat of STATS) {
        let found = ''
        for (const line of lines) {
          const low = line.toLowerCase()
          const troopHit = aliases[troop.key].some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(low))
          const statHit = statAliases[stat.key].some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(low))
          if (!troopHit || !statHit) continue
          const matches = line.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*%?/g) || []
          if (matches.length) { found = cleanNumber(matches[matches.length - 1]); break }
        }

        if (found === '') {
          const troopPattern = aliases[troop.key].join('|')
          const statPattern = statAliases[stat.key].join('|')
          const patterns = [
            new RegExp(`(?:${troopPattern})[\\s\\S]{0,45}?(?:${statPattern})[^0-9]{0,12}([0-9][0-9,]*(?:\\.[0-9]+)?)`, 'i'),
            new RegExp(`(?:${statPattern})[\\s\\S]{0,35}?(?:${troopPattern})[^0-9]{0,12}([0-9][0-9,]*(?:\\.[0-9]+)?)`, 'i'),
          ]
          for (const pattern of patterns) {
            const match = normalized.match(pattern)
            if (match) { found = cleanNumber(match[1]); break }
          }
        }
        result[troop.key][stat.key] = found
      }
    }

    const capacityPatterns = [
      /march\s*(?:capacity|size)[^0-9]{0,15}([0-9][0-9,]{3,})/i,
      /deployment\s*(?:capacity|size)[^0-9]{0,15}([0-9][0-9,]{3,})/i,
      /troops?\s*(?:capacity|deployed|total)[^0-9]{0,15}([0-9][0-9,]{3,})/i,
    ]
    for (const pattern of capacityPatterns) {
      const match = normalized.match(pattern)
      if (match) { result.capacity = cleanNumber(match[1]); break }
    }

    return { result, raw: normalized }
  }

  function setField(modal, path, value) {
    const input = modal.querySelector(`[data-field="${path}"]`)
    if (input && value !== '' && value != null) input.value = value
  }

  function fillDetected(modal, parsed) {
    setField(modal, 'capacity', parsed.result.capacity)
    TYPES.forEach((troop) => STATS.forEach((stat) => setField(modal, `${troop.key}.${stat.key}`, parsed.result[troop.key]?.[stat.key])))
    const raw = modal.querySelector('.k846-import-raw')
    raw.hidden = !parsed.raw
    if (parsed.raw) raw.querySelector('pre').textContent = parsed.raw
    modal.querySelector('.k846-import-detected').hidden = false
    modal.querySelector('[data-action="apply"]').disabled = false
  }

  function getValues(modal) {
    const values = { capacity: '' }
    TYPES.forEach((troop) => { values[troop.key] = {} })
    modal.querySelectorAll('[data-field]').forEach((input) => {
      const value = cleanNumber(input.value)
      if (input.dataset.field === 'capacity') values.capacity = value
      else {
        const [troop, stat] = input.dataset.field.split('.')
        values[troop][stat] = value
      }
    })
    return values
  }

  function setReactInput(input, value) {
    if (!input || value === '' || value == null) return
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function findSectionByText(text) {
    return [...document.querySelectorAll('section')].find((section) => (section.textContent || '').includes(text))
  }

  function applyValuesToBattleLab(values) {
    const profileSection = findSectionByText('Player Profile')
    if (profileSection && values.capacity !== '') {
      const capacityLabel = [...profileSection.querySelectorAll('label')].find((label) => /march capacity/i.test(label.textContent || ''))
      setReactInput(capacityLabel?.querySelector('input'), values.capacity)
    }

    const statsSection = findSectionByText('Combat Report Stats')
    if (!statsSection) throw new Error('Combat stats panel is not visible. Open Battle Lab and try again.')

    for (const troop of TYPES) {
      const card = [...statsSection.querySelectorAll('div')]
        .filter((el) => el.querySelectorAll(':scope > div').length > 0)
        .find((el) => {
          const text = el.textContent || ''
          return text.includes(troop.label) && /Attack/i.test(text) && /Lethality/i.test(text) && el.querySelectorAll('input[type="number"]').length >= 4
        })
      const inputs = card ? [...card.querySelectorAll('input[type="number"]')].slice(0, 4) : []
      STATS.forEach((stat, index) => setReactInput(inputs[index], values[troop.key]?.[stat.key]))
    }
  }

  function toast(message, tone = 'ok') {
    const node = document.createElement('div')
    node.textContent = message
    Object.assign(node.style, {
      position: 'fixed', left: '50%', bottom: '26px', zIndex: 10001, transform: 'translateX(-50%)',
      maxWidth: '90vw', padding: '10px 14px', borderRadius: '10px', font: '700 11px Montserrat, sans-serif',
      color: tone === 'error' ? '#ffd5d5' : '#f6e5ad', background: tone === 'error' ? 'rgba(91,18,24,.96)' : 'rgba(10,24,43,.96)',
      border: `1px solid ${tone === 'error' ? 'rgba(255,120,120,.28)' : 'rgba(212,175,55,.32)'}`, boxShadow: '0 14px 40px rgba(0,0,0,.4)'
    })
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 2600)
  }

  function openModal() {
    document.getElementById(MODAL_ID)?.remove()
    injectStyles()
    const modal = document.createElement('div')
    modal.id = MODAL_ID
    modal.innerHTML = modalTemplate()
    document.body.appendChild(modal)
    document.body.style.overflow = 'hidden'

    const fileInput = modal.querySelector('#k846-import-file')
    const drop = modal.querySelector('.k846-import-drop')
    const preview = modal.querySelector('.k846-import-preview')
    const analyzeButton = modal.querySelector('[data-action="analyze"]')
    const progress = modal.querySelector('.k846-import-progress')
    let selectedFile = null
    let objectUrl = ''

    const close = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      modal.remove()
      document.body.style.overflow = ''
    }

    const selectTab = (tab) => {
      modal.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab))
      modal.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab })
      const detected = modal.querySelector('.k846-import-detected')
      if (tab === 'manual') {
        detected.hidden = false
        modal.querySelector('[data-action="apply"]').disabled = false
      }
    }

    const setFile = (file) => {
      if (!file) return
      if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return toast('Use a PNG, JPG, or WEBP screenshot.', 'error')
      if (file.size > 8 * 1024 * 1024) return toast('Screenshot must be 8 MB or smaller.', 'error')
      selectedFile = file
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(file)
      preview.querySelector('img').src = objectUrl
      preview.querySelector('.k846-import-file-name').textContent = file.name
      preview.querySelector('.k846-import-file-meta').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`
      drop.hidden = true
      preview.hidden = false
      analyzeButton.disabled = false
      modal.querySelector('.k846-import-detected').hidden = true
      modal.querySelector('[data-action="apply"]').disabled = true
    }

    drop.addEventListener('click', () => fileInput.click())
    drop.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') fileInput.click() })
    ;['dragenter', 'dragover'].forEach((name) => drop.addEventListener(name, (event) => { event.preventDefault(); drop.classList.add('drag') }))
    ;['dragleave', 'drop'].forEach((name) => drop.addEventListener(name, (event) => { event.preventDefault(); drop.classList.remove('drag') }))
    drop.addEventListener('drop', (event) => setFile(event.dataTransfer?.files?.[0]))
    fileInput.addEventListener('change', () => setFile(fileInput.files?.[0]))

    modal.addEventListener('click', async (event) => {
      const tab = event.target.closest('[data-tab]')?.dataset.tab
      if (tab) return selectTab(tab)
      const action = event.target.closest('[data-action]')?.dataset.action
      if (!action) return
      if (action === 'close') return close()
      if (action === 'replace-image') return fileInput.click()
      if (action === 'json-restore') {
        close()
        const jsonInput = [...document.querySelectorAll('input[type="file"]')].find((input) => /json/i.test(input.accept || ''))
        if (jsonInput) jsonInput.click()
        else toast('JSON restore input was not found.', 'error')
        return
      }
      if (action === 'analyze') {
        if (!selectedFile) return
        analyzeButton.disabled = true
        progress.hidden = false
        const bar = progress.querySelector('div')
        const status = progress.querySelector('span')
        bar.style.width = '5%'
        status.textContent = 'Loading screenshot reader…'
        try {
          const Tesseract = await loadTesseract()
          const output = await Tesseract.recognize(selectedFile, 'eng', {
            logger(message) {
              if (message.status === 'recognizing text') {
                const pct = Math.max(8, Math.round((message.progress || 0) * 100))
                bar.style.width = `${pct}%`
                status.textContent = `Reading battle report… ${pct}%`
              } else if (message.status) {
                status.textContent = message.status.replace(/_/g, ' ')
              }
            },
          })
          bar.style.width = '100%'
          status.textContent = 'Report read. Review the detected values below.'
          fillDetected(modal, parseReportText(output?.data?.text || ''))
        } catch (error) {
          toast(error.message || 'Could not read this screenshot. Use Manual Entry instead.', 'error')
          status.textContent = 'Screenshot reading failed. You can switch to Manual Entry.'
        } finally {
          analyzeButton.disabled = false
        }
        return
      }
      if (action === 'apply') {
        try {
          applyValuesToBattleLab(getValues(modal))
          close()
          toast('Stats applied. Review them, then save the player profile.')
          setTimeout(() => findSectionByText('Combat Report Stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
        } catch (error) {
          toast(error.message || 'Unable to apply imported stats.', 'error')
        }
      }
    })
  }

  document.addEventListener('click', (event) => {
    if (!onBattleLab()) return
    const button = event.target.closest('button')
    if (!button) return
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim()
    if (!/^Import$/i.test(text)) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    openModal()
  }, true)

  window.__k846BattleLabImport = { open: openModal, parseReportText }
})()
