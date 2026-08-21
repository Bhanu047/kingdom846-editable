(() => {
  const MODAL_ID = 'k846-army-upload-modal'
  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const TROOPS = [
    { key: 'infantry', label: 'Infantry', aliases: ['infantry', 'inf'] },
    { key: 'cavalry', label: 'Cavalry', aliases: ['cavalry', 'cav'] },
    { key: 'archers', label: 'Archers', aliases: ['archer', 'archers', 'arc'] },
  ]
  // Kingshot's comparison reports (Battle Overview, Stat Bonuses, the toggled
  // Troop Power Comparison) show BOTH sides on one line: "<mine>% Label <theirs>%".
  // A single-value line (a report screen with only one side's numbers) still
  // works — we just use whichever one number is there.
  const STATS = [
    { key: 'count', label: 'Troops', aliases: ['troops', 'quantity', 'count'] },
    { key: 'attack', label: 'Attack', aliases: ['attack', 'atk'] },
    { key: 'lethality', label: 'Lethality', aliases: ['lethality', 'lethal', 'let'] },
    { key: 'defense', label: 'Defense', aliases: ['defense', 'defence', 'def'] },
    { key: 'health', label: 'Health', aliases: ['health', 'hp'] },
  ]

  // Two configurations this same modal can fill, picked by which tool is on screen.
  const TOOLS = {
    mystic: { match: () => !!findSection('Your Troops') && !!findSection('Opponent Troops'), sides: { mine: 'Your Troops', opponent: 'Opponent Troops' } },
    pvp: { match: () => !!findSection('Your Army') && !!findSection('Enemy Army'), sides: { mine: 'Your Army', opponent: 'Enemy Army' } },
  }

  function clean(v) { const n = Number(String(v ?? '').replace(/,/g, '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : '' }
  function hasAlias(text, aliases) { const low = String(text || '').toLowerCase(); return aliases.some((a) => new RegExp(`\\b${a}\\b`, 'i').test(low)) }
  function numbersOnLine(line) { return (String(line || '').match(/[0-9][0-9,]*(?:\.[0-9]+)?\s*%?/g) || []).map(clean).filter((v) => v !== '') }

  function parseArmyText(text, side) {
    const lines = String(text || '').replace(/[‐‑–—]/g, '-').split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const stats = {}
    TROOPS.forEach((t) => { stats[t.key] = {} })
    for (const troop of TROOPS) {
      for (const stat of STATS) {
        for (const line of lines) {
          if (!hasAlias(line, troop.aliases) || !hasAlias(line, stat.aliases)) continue
          const nums = numbersOnLine(line)
          if (!nums.length) continue
          // One number on the line: use it. Two (a side-by-side comparison
          // report): pick the one on the requested side of the label.
          const candidate = nums.length === 1 ? nums[0] : (side === 'right' ? nums[nums.length - 1] : nums[0])
          if (candidate !== undefined) { stats[troop.key][stat.key] = candidate; break }
        }
      }
    }
    return stats
  }

  function mergeArmyStats(a, b) {
    const out = {}
    TROOPS.forEach((t) => { out[t.key] = { ...(a?.[t.key] || {}) }; STATS.forEach((s) => { if ((out[t.key][s.key] === undefined || out[t.key][s.key] === '') && b?.[t.key]?.[s.key] !== undefined) out[t.key][s.key] = b[t.key][s.key] }) })
    return out
  }

  function findSection(text) {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find((x) => (x.textContent || '').trim().toLowerCase() === text.toLowerCase())
    return h?.closest('section') || null
  }

  function setNativeInput(input, value) {
    if (!input || value === '' || value == null) return
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function troopCardInputs(section, troopLabel) {
    const exact = new RegExp('^' + troopLabel + '$', 'i')
    for (const el of section?.querySelectorAll('div,h3,h4,strong,span') || []) {
      if (!exact.test((el.textContent || '').trim())) continue
      let p = el
      for (let i = 0; i < 6 && p && p !== section; i += 1, p = p.parentElement) {
        const inputs = [...p.querySelectorAll('input[type="number"]')]
        if (inputs.length >= 5) return inputs
      }
    }
    return []
  }

  function applyToSide(sideHeading, stats) {
    const section = findSection(sideHeading)
    if (!section) throw new Error(`Could not find the "${sideHeading}" panel on screen.`)
    let applied = 0
    for (const troop of TROOPS) {
      const inputs = troopCardInputs(section, troop.label)
      if (!inputs.length) continue
      STATS.forEach((stat, i) => {
        const v = clean(stats[troop.key]?.[stat.key])
        if (v !== '') { setNativeInput(inputs[i], v); applied += 1 }
      })
    }
    return applied
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract)
    if (window.__k846TesseractPromise) return window.__k846TesseractPromise
    window.__k846TesseractPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = TESSERACT_SRC
      s.async = true
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Screenshot reader did not load.')))
      s.onerror = () => reject(new Error('Unable to load screenshot reader.'))
      document.head.appendChild(s)
    })
    return window.__k846TesseractPromise
  }

  function styles() {
    if (document.getElementById('k846-au-style')) return
    const s = document.createElement('style')
    s.id = 'k846-au-style'
    s.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:12px;font-family:Montserrat,system-ui}
      #${MODAL_ID} [hidden]{display:none!important}
      #${MODAL_ID} .au-backdrop{position:absolute;inset:0;background:rgba(2,8,20,.86);backdrop-filter:blur(6px)}
      #${MODAL_ID} .au-dialog{position:relative;width:min(720px,100%);max-height:92vh;overflow:hidden;border:1px solid rgba(212,175,55,.28);border-radius:22px;background:#08172a;color:#f1e7ce;box-shadow:0 25px 90px rgba(0,0,0,.6);display:flex;flex-direction:column}
      #${MODAL_ID} .au-head{display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid rgba(212,175,55,.14)}
      #${MODAL_ID} .au-eye{font-size:9px;letter-spacing:.16em;color:#d4af37;font-weight:800}
      #${MODAL_ID} h2{margin:4px 0;font-family:Cinzel,serif;color:#f6e5ad}
      #${MODAL_ID} p{margin:0;font-size:11px;color:rgba(241,231,206,.5)}
      #${MODAL_ID} .au-head button{border:0;background:transparent;color:#f1e7ce;font-size:28px;cursor:pointer}
      #${MODAL_ID} .au-body{padding:18px;overflow:auto}
      #${MODAL_ID} .au-drop{display:grid;place-items:center;align-content:center;gap:8px;min-height:140px;border:1.5px dashed rgba(212,175,55,.46);border-radius:16px;background:rgba(212,175,55,.04);cursor:pointer;text-align:center}
      #${MODAL_ID} .au-drop.au-drag{border-color:#f0d17a;background:rgba(212,175,55,.12)}
      #${MODAL_ID} .au-drop span{font-size:10px;color:rgba(241,231,206,.4)}
      #${MODAL_ID} .au-files{display:grid;gap:8px;margin-top:10px}
      #${MODAL_ID} .au-file{display:flex;align-items:center;gap:10px;border:1px solid rgba(212,175,55,.14);border-radius:12px;padding:8px 10px}
      #${MODAL_ID} .au-file img{width:52px;height:40px;object-fit:cover;border-radius:7px}
      #${MODAL_ID} .au-file span{flex:1;min-width:0;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${MODAL_ID} .au-file b{font-size:9px;text-transform:uppercase;letter-spacing:.06em}
      #${MODAL_ID} .au-file b.ok{color:#7fe0a0}
      #${MODAL_ID} .au-file b.pending{color:rgba(241,231,206,.4)}
      #${MODAL_ID} .au-file button{border:0;background:transparent;color:#e8896f;font-size:16px;cursor:pointer;padding:0 4px}
      #${MODAL_ID} .au-add{margin-top:8px;border:1px solid rgba(212,175,55,.24);border-radius:10px;padding:8px;background:transparent;color:#d4af37;font-weight:800;font-size:11px;cursor:pointer;width:100%}
      #${MODAL_ID} .au-read{width:100%;margin-top:14px;border:1px solid rgba(232,199,102,.4);border-radius:11px;padding:11px;background:linear-gradient(#d4af37,#ad8620);font-weight:900;color:#071224;cursor:pointer}
      #${MODAL_ID} .au-read:disabled,#${MODAL_ID} .au-apply:disabled{opacity:.4;cursor:not-allowed}
      #${MODAL_ID} .au-status{margin-top:9px;font-size:10px;color:rgba(241,231,206,.5)}
      #${MODAL_ID} .au-title{margin:16px 0 8px;font-family:Cinzel,serif;color:#ead393;font-weight:800}
      #${MODAL_ID} .au-side{margin-top:14px;padding:14px;border:1px solid rgba(232,199,102,.3);border-radius:14px;background:rgba(212,175,55,.05)}
      #${MODAL_ID} .au-side .au-title{margin:0 0 6px}
      #${MODAL_ID} .au-side-hint{margin:0 0 10px;font-size:10px;line-height:1.55;color:rgba(241,231,206,.5)}
      #${MODAL_ID} .au-side-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #${MODAL_ID} .au-side-btn{border:1px solid rgba(212,175,55,.24);border-radius:10px;padding:10px;background:transparent;color:#f1e7ce;font-weight:800;font-size:11px;cursor:pointer}
      #${MODAL_ID} .au-side-btn.active{border-color:#f0d17a;background:linear-gradient(#d4af37,#ad8620);color:#071224}
      #${MODAL_ID} .au-card{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px;padding:12px;border:1px solid rgba(212,175,59,.12);border-radius:13px}
      #${MODAL_ID} .au-card>b{grid-column:1/-1;font-family:Cinzel,serif}
      #${MODAL_ID} label{font-size:9px;text-transform:uppercase;color:rgba(241,231,206,.5)}
      #${MODAL_ID} input[type=number]{box-sizing:border-box;width:100%;margin-top:4px;border:1px solid rgba(212,175,55,.18);border-radius:9px;background:#06111f;color:#f1e7ce;padding:8px}
      #${MODAL_ID} footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid rgba(212,175,55,.12)}
      #${MODAL_ID} footer button{border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
      #${MODAL_ID} .au-cancel{background:transparent;border:1px solid rgba(212,175,55,.18);color:#f1e7ce}
      #${MODAL_ID} .au-apply{border:1px solid rgba(232,199,102,.4);background:linear-gradient(#d4af37,#ad8620);color:#071224}
      @media(max-width:640px){#${MODAL_ID}{align-items:end;padding:6px}#${MODAL_ID} .au-dialog{border-radius:20px 20px 8px 8px}#${MODAL_ID} .au-card{grid-template-columns:repeat(2,1fr)}}
    `
    document.head.appendChild(s)
  }

  function template(sideHeading, otherHeading) {
    return `
      <div class="au-backdrop" data-action="close"></div>
      <section class="au-dialog" role="dialog" aria-modal="true">
        <header class="au-head">
          <div>
            <div class="au-eye">BATTLE REPORT IMPORT</div>
            <h2>Upload — ${sideHeading}</h2>
            <p>Add every screenshot of this report (a full report is often 3-4 screens). This fills "${sideHeading}", not "${otherHeading}".</p>
          </div>
          <button data-action="close">×</button>
        </header>
        <div class="au-body">
          <input id="au-file" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>
          <div class="au-drop" data-action="choose" role="button" tabindex="0">
            <strong>Drag & drop screenshots here</strong>
            <span>or tap to choose — PNG, JPG or WEBP, multiple allowed</span>
          </div>
          <div class="au-files"></div>
          <button class="au-add" data-action="choose" hidden>+ Add another screenshot</button>
          <button class="au-read" data-action="read" disabled>Scan All Screenshots</button>
          <div class="au-status"></div>
          <div class="au-side" hidden>
            <div class="au-title">Which column is "${sideHeading}"?</div>
            <p class="au-side-hint">Kingshot's battle-overview report shows both sides on the same lines (e.g. one number, then "Infantry Attack", then another number). Pick which one is "${sideHeading}" — you can switch back and forth to compare before applying.</p>
            <div class="au-side-btns">
              <button type="button" class="au-side-btn" data-side="left">Left column</button>
              <button type="button" class="au-side-btn" data-side="right">Right column</button>
            </div>
          </div>
          <div class="au-values" hidden>
            <div class="au-title">Detected Values — Review Before Applying</div>
            ${TROOPS.map((t) => `<div class="au-card"><b>${t.label}</b>${STATS.map((s) => `<label>${s.label}<input type="number" step="0.1" data-field="${t.key}.${s.key}"></label>`).join('')}</div>`).join('')}
          </div>
        </div>
        <footer><button data-action="close" class="au-cancel">Cancel</button><button data-action="apply" class="au-apply" disabled>Apply to ${sideHeading}</button></footer>
      </section>`
  }

  function open(sideKey) {
    const tool = Object.values(TOOLS).find((t) => t.match())
    if (!tool) return
    const sideHeading = sideKey === 'mine' ? tool.sides.mine : tool.sides.opponent
    const otherHeading = sideKey === 'mine' ? tool.sides.opponent : tool.sides.mine

    document.getElementById(MODAL_ID)?.remove()
    styles()
    const root = document.createElement('div')
    root.id = MODAL_ID
    root.innerHTML = template(sideHeading, otherHeading)
    document.body.appendChild(root)
    document.body.style.overflow = 'hidden'

    const fileInput = root.querySelector('#au-file'), drop = root.querySelector('.au-drop'), filesList = root.querySelector('.au-files'), addBtn = root.querySelector('.au-add'), readBtn = root.querySelector('.au-read'), applyBtn = root.querySelector('.au-apply'), values = root.querySelector('.au-values'), status = root.querySelector('.au-status'), sideBlock = root.querySelector('.au-side')
    const entries = []
    let currentSide = null

    function applySide(side) {
      currentSide = side
      root.querySelectorAll('.au-side-btn').forEach((b) => b.classList.toggle('active', b.dataset.side === side))
      let merged = {}
      for (const entry of entries) {
        if (!entry.rawText) continue
        merged = mergeArmyStats(merged, parseArmyText(entry.rawText, side))
      }
      TROOPS.forEach((t) => STATS.forEach((s) => { const input = root.querySelector(`[data-field="${t.key}.${s.key}"]`); if (input) input.value = merged[t.key]?.[s.key] ?? '' }))
      values.hidden = false
      const detected = TROOPS.reduce((sum, t) => sum + STATS.filter((s) => merged[t.key]?.[s.key] !== undefined && merged[t.key][s.key] !== '').length, 0)
      applyBtn.disabled = detected === 0
      status.textContent = detected ? `${detected}/${TROOPS.length * STATS.length} values detected using the ${side} column. Review them below — switch columns above if these look wrong.` : `No values detected in the ${side} column. Try the other column, or enter values manually on the page.`
    }
    const close = () => { entries.forEach((e) => e.url && URL.revokeObjectURL(e.url)); root.remove(); document.body.style.overflow = '' }

    function renderFiles() {
      filesList.innerHTML = entries.map((e, i) => `<div class="au-file"><img src="${e.url}"><span>${e.file.name}</span><b class="${e.status === 'ok' ? 'ok' : 'pending'}">${e.status === 'ok' ? 'read' : 'pending'}</b><button type="button" data-remove="${i}">×</button></div>`).join('')
      addBtn.hidden = entries.length === 0
      drop.hidden = entries.length > 0
      readBtn.disabled = entries.length === 0
    }

    function addFiles(fileList) {
      for (const f of fileList || []) {
        if (!/^image\/(png|jpeg|webp)$/i.test(f.type || '')) continue
        entries.push({ file: f, url: URL.createObjectURL(f), status: 'pending' })
      }
      renderFiles()
      status.textContent = entries.length ? `${entries.length} screenshot${entries.length === 1 ? '' : 's'} ready. Tap Scan All Screenshots.` : ''
    }

    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = '' })
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click() } })
    ;['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('au-drag') }))
    ;['dragleave', 'dragend'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('au-drag') }))
    drop.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('au-drag'); addFiles(e.dataTransfer?.files) })

    root.addEventListener('click', async (e) => {
      const removeIdx = e.target?.dataset?.remove
      if (removeIdx !== undefined) { const [rm] = entries.splice(Number(removeIdx), 1); if (rm?.url) URL.revokeObjectURL(rm.url); renderFiles(); return }

      const sideBtn = e.target.closest('.au-side-btn')
      if (sideBtn) { applySide(sideBtn.dataset.side); return }

      const action = e.target.closest('[data-action]')?.dataset.action
      if (!action) return
      if (action === 'close') return close()
      if (action === 'choose') { e.preventDefault(); fileInput.click(); return }
      if (action === 'read') {
        if (!entries.length) return
        readBtn.disabled = true
        values.hidden = true
        sideBlock.hidden = true
        for (let i = 0; i < entries.length; i += 1) {
          status.textContent = `Reading screenshot ${i + 1} of ${entries.length}…`
          try {
            const Tesseract = await loadTesseract()
            const out = await Tesseract.recognize(entries[i].file, 'eng')
            entries[i].rawText = out?.data?.text || ''
            entries[i].status = 'ok'
            renderFiles()
          } catch (err) {
            status.textContent = `Screenshot ${i + 1} failed to read: ${err.message || 'unknown error'}`
          }
        }
        readBtn.disabled = false
        const anyRead = entries.some((e) => e.rawText)
        if (!anyRead) { status.textContent = 'Could not read any of these screenshots. Try clearer images or enter values manually.'; return }
        sideBlock.hidden = false
        status.textContent = 'Screenshots read. Answer the question above to fill in the values.'
        sideBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      if (action === 'apply') {
        const stats = {}
        TROOPS.forEach((t) => { stats[t.key] = {}; STATS.forEach((s) => { stats[t.key][s.key] = clean(root.querySelector(`[data-field="${t.key}.${s.key}"]`)?.value) }) })
        try {
          const applied = applyToSide(sideHeading, stats)
          close()
          const toast = document.createElement('div')
          toast.textContent = `Applied ${applied} values to ${sideHeading}.`
          Object.assign(toast.style, { position: 'fixed', left: '50%', bottom: '26px', zIndex: 10070, transform: 'translateX(-50%)', padding: '11px 15px', borderRadius: '10px', font: '700 11px Montserrat, sans-serif', color: '#f6e5ad', background: 'rgba(10,24,43,.98)', border: '1px solid rgba(212,175,55,.34)' })
          document.body.appendChild(toast)
          setTimeout(() => toast.remove(), 2800)
        } catch (err) {
          status.textContent = err.message || 'Could not apply detected values.'
        }
      }
    })
  }

  function styleUploadButton() {
    if (document.getElementById('k846-au-btn-style')) return
    const s = document.createElement('style')
    s.id = 'k846-au-btn-style'
    s.textContent = `.k846-au-upload-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:.6rem;border:1px solid rgba(226,199,125,.3);border-radius:.7rem;padding:.6rem .9rem;background:rgba(226,181,48,.08);color:#f2dfaa;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}`
    document.head.appendChild(s)
  }

  function injectButtons() {
    styleUploadButton()
    for (const tool of Object.values(TOOLS)) {
      if (!tool.match()) continue
      for (const sideKey of ['mine', 'opponent']) {
        const heading = sideKey === 'mine' ? tool.sides.mine : tool.sides.opponent
        const section = findSection(heading)
        if (!section || section.querySelector(`[data-k846-au="${sideKey}-${heading}"]`)) continue
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'k846-au-upload-btn'
        btn.dataset.k846Au = `${sideKey}-${heading}`
        btn.textContent = `Upload ${heading} Screenshot`
        btn.addEventListener('click', (e) => { e.preventDefault(); open(sideKey) })
        const p = section.querySelector('p')
        if (p) p.insertAdjacentElement('afterend', btn)
        else section.appendChild(btn)
      }
    }
  }

  let timer = null
  const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(injectButtons, 200) })
  obs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', injectButtons)
  window.addEventListener('hashchange', () => setTimeout(injectButtons, 250))
  setTimeout(injectButtons, 400)
})()
