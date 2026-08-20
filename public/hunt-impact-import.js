(() => {
  const MODAL_ID = 'k846-hunt-impact-import'
  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const TYPES = [
    { key: 'infantry', label: 'Infantry', short: 'INF' },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV' },
    { key: 'archers', label: 'Archers', short: 'ARC' },
  ]

  const cleanNumber = (value) => {
    const n = Number(String(value ?? '').replace(/,/g, '').replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) ? n : ''
  }

  const isLargeCount = (value) => Number.isFinite(Number(value)) && Number(value) >= 10000

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract)
    if (window.__k846TesseractPromise) return window.__k846TesseractPromise
    window.__k846TesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = TESSERACT_SRC
      script.async = true
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Screenshot reader did not load.'))
      script.onerror = () => reject(new Error('Unable to load screenshot reader.'))
      document.head.appendChild(script)
    })
    return window.__k846TesseractPromise
  }

  function numbersIn(line) {
    return (String(line || '').match(/[0-9][0-9,]*(?:\.[0-9]+)?/g) || []).map(cleanNumber).filter((v) => v !== '')
  }

  function lastNumber(line) {
    const values = numbersIn(line)
    return values.length ? values[values.length - 1] : ''
  }

  function firstLargeNumber(line) {
    return numbersIn(line).find(isLargeCount) ?? ''
  }

  function normalizeOCR(text) {
    return String(text || '')
      .replace(/[‐‑–—]/g, '-')
      .replace(/\r/g, '')
      .replace(/[|¦]/g, 'I')
  }

  function parseBattleReport(text) {
    const normalized = normalizeOCR(text)
    const lines = normalized.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const aliases = {
      infantry: ['infantry', 'infantry troops', 'inf'],
      cavalry: ['cavalry', 'cavalry troops', 'cav'],
      archers: ['archer', 'archers', 'archery', 'archer troops', 'arc'],
    }
    const result = {
      stats: { infantry: { attack: '', lethality: '' }, cavalry: { attack: '', lethality: '' }, archers: { attack: '', lethality: '' } },
      troopCounts: { infantry: '', cavalry: '', archers: '' },
      capacity: '', raw: normalized,
    }

    const statWords = /attack|atk|lethality|lethal|\blet\b|defen|health|bonus|damage/i

    for (const troop of TYPES) {
      for (const stat of ['attack', 'lethality']) {
        const statAliases = stat === 'attack' ? ['attack', 'atk'] : ['lethality', 'lethal', 'let']
        for (const line of lines) {
          const low = line.toLowerCase()
          const troopHit = aliases[troop.key].some((a) => low.includes(a))
          const statHit = statAliases.some((a) => new RegExp(`\\b${a}\\b`, 'i').test(low))
          if (!troopHit || !statHit) continue
          const value = lastNumber(line)
          if (value !== '') { result.stats[troop.key][stat] = value; break }
        }
      }

      // Battle reports often place the troop total on the same line as the troop name,
      // or on the immediately following line. Accept large integer counts even when OCR
      // misses the literal word "Troops", but never use combat-stat rows as troop counts.
      for (let i = 0; i < lines.length && result.troopCounts[troop.key] === ''; i += 1) {
        const low = lines[i].toLowerCase()
        if (!aliases[troop.key].some((a) => low.includes(a))) continue
        for (let offset = 0; offset <= 2; offset += 1) {
          const candidateLine = lines[i + offset] || ''
          if (offset === 0 && statWords.test(candidateLine)) continue
          const candidate = firstLargeNumber(candidateLine)
          if (candidate !== '') { result.troopCounts[troop.key] = candidate; break }
        }
      }

      if (result.troopCounts[troop.key] === '') {
        const nameGroup = aliases[troop.key].map((x) => x.replace(/\s+/g, '\\s*')).join('|')
        const patterns = [
          new RegExp(`(?:${nameGroup})[^\\n]{0,55}?(?:troops?|deployed|count|units?|soldiers?)[^0-9]{0,16}([0-9][0-9,]{3,})`, 'i'),
          new RegExp(`(?:troops?|deployed|count|units?|soldiers?)[^\\n]{0,35}?(?:${nameGroup})[^0-9]{0,16}([0-9][0-9,]{3,})`, 'i'),
          new RegExp(`(?:${nameGroup})[^0-9\\n]{0,24}([0-9][0-9,]{4,})`, 'i'),
        ]
        for (const pattern of patterns) {
          const match = normalized.match(pattern)
          if (match) { result.troopCounts[troop.key] = cleanNumber(match[1]); break }
        }
      }
    }

    const capacityPatterns = [
      /rall[yli]\s*(?:capacity|capacit[yli]|size)[^0-9]{0,28}([0-9][0-9,]{4,})/i,
      /march\s*(?:capacity|capacit[yli]|size)[^0-9]{0,28}([0-9][0-9,]{4,})/i,
      /(?:rally|march)[^\n]{0,25}?([0-9][0-9,]{5,})/i,
      /(?:total\s*)?(?:troops?|deployed|deployment)[^0-9]{0,24}([0-9][0-9,]{5,})/i,
    ]
    for (const pattern of capacityPatterns) {
      const match = normalized.match(pattern)
      if (match) { result.capacity = cleanNumber(match[1]); break }
    }

    // In Kingshot battle reports the three troop totals equal the rally/deployed total.
    // Use that identity as a safe fallback and also recover one missing troop count when possible.
    const values = TYPES.map((t) => Number(result.troopCounts[t.key]) || 0)
    const known = values.filter((v) => v > 0)
    if (!result.capacity && known.length === 3) result.capacity = values.reduce((a, b) => a + b, 0)
    if (result.capacity && known.length === 2) {
      const missing = TYPES.find((t) => !result.troopCounts[t.key])
      const remainder = Number(result.capacity) - known.reduce((a, b) => a + b, 0)
      if (missing && remainder >= 10000) result.troopCounts[missing.key] = remainder
    }

    return result
  }

  function mergeParsed(a, b) {
    const out = {
      stats: { infantry: {}, cavalry: {}, archers: {} },
      troopCounts: {},
      capacity: a.capacity || b.capacity || '',
      raw: [a.raw, b.raw].filter(Boolean).join('\n\n--- ENHANCED OCR ---\n'),
    }
    TYPES.forEach((t) => {
      out.stats[t.key].attack = a.stats[t.key].attack || b.stats[t.key].attack || ''
      out.stats[t.key].lethality = a.stats[t.key].lethality || b.stats[t.key].lethality || ''
      out.troopCounts[t.key] = a.troopCounts[t.key] || b.troopCounts[t.key] || ''
    })
    const vals = TYPES.map((t) => Number(out.troopCounts[t.key]) || 0)
    if (!out.capacity && vals.every((v) => v > 0)) out.capacity = vals.reduce((s, v) => s + v, 0)
    if (out.capacity && vals.filter((v) => v > 0).length === 2) {
      const missing = TYPES.find((t) => !out.troopCounts[t.key])
      const remainder = Number(out.capacity) - vals.reduce((s, v) => s + v, 0)
      if (missing && remainder >= 10000) out.troopCounts[missing.key] = remainder
    }
    return out
  }

  async function enhancedCanvas(file) {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = url
      })
      const maxWidth = 2400
      const scale = Math.min(2.2, maxWidth / Math.max(1, img.naturalWidth))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < data.data.length; i += 4) {
        const gray = data.data[i] * .299 + data.data[i + 1] * .587 + data.data[i + 2] * .114
        const boosted = gray > 145 ? Math.min(255, gray * 1.18 + 18) : Math.max(0, gray * .78 - 8)
        data.data[i] = boosted
        data.data[i + 1] = boosted
        data.data[i + 2] = boosted
      }
      ctx.putImageData(data, 0, 0)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  function participantOptions() {
    return '<option value="">Select</option>' + Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')
  }

  function template() {
    return `
      <div class="hi-backdrop" data-action="close"></div>
      <section class="hi-dialog" role="dialog" aria-modal="true">
        <header class="hi-head"><div><div class="hi-eye">HUNT IMPACT · BATTLE REPORT</div><h2>Upload Battle Report</h2><p>Combat stats, rally capacity and troop totals auto-fill from the report. You select participants, troop tier and True Gold.</p></div><button data-action="close">×</button></header>
        <div class="hi-body">
          <input id="hi-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
          <div class="hi-drop" data-action="choose"><strong>Choose Battle Report screenshot</strong><span>PNG, JPG or WEBP</span></div>
          <div class="hi-preview" hidden><img alt="Battle report preview"><div><strong class="hi-name"></strong><span class="hi-meta"></span></div></div>
          <button class="hi-read" data-action="read" disabled>Read Screenshot</button>
          <div class="hi-status"></div>
          <div class="hi-values" hidden>
            <div class="hi-title">Report Values</div>
            <div class="hi-note"><b>AUTO FROM REPORT</b> Rally Capacity, Attack, Lethality and INF/CAV/ARC troops. <b>YOU SELECT</b> Participants, Troop Tier and True Gold.</div>
            <div class="hi-grid4">
              <label><span>Rally Capacity <em>AUTO</em></span><input type="number" step="1000" placeholder="Auto-detected" data-field="capacity"></label>
              <label><span>Participants <em>SELECT</em></span><select data-field="participants">${participantOptions()}</select></label>
              <label><span>Troop Tier <em>SELECT</em></span><select data-field="tier"><option value="">Select</option><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></select></label>
              <label><span>True Gold <em>SELECT</em></span><select data-field="tg"><option value="">Select</option>${Array.from({length:9},(_,i)=>`<option value="${i}">TG${i}</option>`).join('')}</select></label>
            </div>
            ${TYPES.map((t) => `<div class="hi-card"><b>${t.label}</b><label><span>Attack % <em>AUTO</em></span><input type="number" step="0.1" placeholder="Auto-detected" data-field="stats.${t.key}.attack"></label><label><span>Lethality % <em>AUTO</em></span><input type="number" step="0.1" placeholder="Auto-detected" data-field="stats.${t.key}.lethality"></label><label><span>Troops <em>AUTO</em></span><input type="number" step="1000" placeholder="Auto-detected" data-field="troopCounts.${t.key}"></label></div>`).join('')}
          </div>
        </div>
        <footer><button data-action="close" class="hi-cancel">Cancel</button><button data-action="apply" class="hi-apply" disabled>Apply to Hunt Impact</button></footer>
      </section>`
  }

  function styles() {
    if (document.getElementById('hi-style')) return
    const s = document.createElement('style'); s.id = 'hi-style'; s.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:12px;font-family:Montserrat,system-ui}
      #${MODAL_ID} .hi-backdrop{position:absolute;inset:0;background:rgba(2,8,20,.88);backdrop-filter:blur(6px)}
      #${MODAL_ID} .hi-dialog{position:relative;width:min(760px,100%);max-height:94vh;overflow:hidden;border:1px solid rgba(212,175,55,.28);border-radius:22px;background:#08172a;color:#f1e7ce;box-shadow:0 25px 90px rgba(0,0,0,.6)}
      #${MODAL_ID} .hi-head{display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid rgba(212,175,55,.14)}
      #${MODAL_ID} .hi-eye{font-size:9px;letter-spacing:.16em;color:#d4af37;font-weight:800} #${MODAL_ID} h2{margin:4px 0;font-family:Cinzel,serif;color:#f6e5ad} #${MODAL_ID} p{margin:0;font-size:11px;color:rgba(241,231,206,.5)} #${MODAL_ID} .hi-head button{border:0;background:transparent;color:#f1e7ce;font-size:28px}
      #${MODAL_ID} .hi-body{padding:18px;max-height:70vh;overflow:auto} #${MODAL_ID} .hi-drop{display:grid;place-items:center;gap:6px;min-height:150px;border:1.5px dashed rgba(212,175,55,.4);border-radius:16px;background:rgba(212,175,55,.04);cursor:pointer;text-align:center} #${MODAL_ID} .hi-drop span{font-size:10px;color:rgba(241,231,206,.4)}
      #${MODAL_ID} .hi-preview{display:flex;gap:12px;align-items:center;border:1px solid rgba(212,175,55,.14);border-radius:14px;padding:10px} #${MODAL_ID} .hi-preview[hidden]{display:none!important} #${MODAL_ID} .hi-preview img{width:86px;height:64px;object-fit:cover;border-radius:9px} #${MODAL_ID} .hi-preview div{display:flex;flex-direction:column;gap:4px} #${MODAL_ID} .hi-preview span{font-size:10px;color:rgba(241,231,206,.4)}
      #${MODAL_ID} .hi-read{width:100%;margin-top:10px;border:1px solid rgba(232,199,102,.4);border-radius:11px;padding:11px;background:linear-gradient(#d4af37,#ad8620);font-weight:900;color:#071224} #${MODAL_ID} .hi-read:disabled,#${MODAL_ID} .hi-apply:disabled{opacity:.4}
      #${MODAL_ID} .hi-status{margin-top:9px;font-size:10px;color:rgba(241,231,206,.58)} #${MODAL_ID} .hi-title{margin:16px 0 8px;font-family:Cinzel,serif;color:#ead393;font-weight:800}
      #${MODAL_ID} .hi-note{margin-bottom:10px;padding:10px;border:1px solid rgba(93,158,224,.2);border-radius:10px;background:rgba(93,158,224,.05);font-size:10px;line-height:1.5;color:rgba(241,231,206,.6)} #${MODAL_ID} .hi-note b{color:#ead393}
      #${MODAL_ID} .hi-grid4{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px} #${MODAL_ID} .hi-card{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;padding:12px;border:1px solid rgba(212,175,55,.12);border-radius:13px} #${MODAL_ID} .hi-card>b{grid-column:1/-1;font-family:Cinzel,serif}
      #${MODAL_ID} label{font-size:9px;text-transform:uppercase;color:rgba(241,231,206,.5)} #${MODAL_ID} label>span{display:flex;justify-content:space-between;gap:5px} #${MODAL_ID} em{font-style:normal;font-size:8px;color:#d4af37} #${MODAL_ID} input,#${MODAL_ID} select{box-sizing:border-box;width:100%;margin-top:4px;border:1px solid rgba(212,175,55,.18);border-radius:9px;background:#06111f;color:#f1e7ce;padding:9px}
      #${MODAL_ID} footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid rgba(212,175,55,.12)} #${MODAL_ID} footer button{border-radius:10px;padding:10px 14px;font-weight:800} #${MODAL_ID} .hi-cancel{background:transparent;border:1px solid rgba(212,175,55,.18);color:#f1e7ce} #${MODAL_ID} .hi-apply{border:1px solid rgba(232,199,102,.4);background:linear-gradient(#d4af37,#ad8620);color:#071224}
      @media(max-width:640px){#${MODAL_ID}{align-items:end;padding:6px}#${MODAL_ID} .hi-dialog{border-radius:20px 20px 8px 8px}#${MODAL_ID} .hi-body{max-height:72vh}#${MODAL_ID} .hi-card{grid-template-columns:1fr 1fr}#${MODAL_ID} .hi-card label:last-child{grid-column:1/-1}}
    `; document.head.appendChild(s)
  }

  function setPath(root, path, value) {
    const el = root.querySelector(`[data-field="${path}"]`)
    if (el && value !== '' && value != null) el.value = String(value)
  }

  function getPath(root, path) {
    return root.querySelector(`[data-field="${path}"]`)?.value ?? ''
  }

  function updateApplyState(root, apply, status) {
    const autoPaths = ['capacity', ...TYPES.flatMap((t) => [`stats.${t.key}.attack`, `stats.${t.key}.lethality`, `troopCounts.${t.key}`])]
    const missingAuto = autoPaths.filter((path) => cleanNumber(getPath(root, path)) === '')
    const missingSelect = ['participants', 'tier', 'tg'].filter((path) => getPath(root, path) === '')
    apply.disabled = missingAuto.length > 0 || missingSelect.length > 0
    if (missingAuto.length) {
      status.textContent = `Missing ${missingAuto.length} report value${missingAuto.length === 1 ? '' : 's'}. Correct only the fields OCR could not read.`
    } else if (missingSelect.length) {
      status.textContent = `Report auto-fill complete. Select ${missingSelect.map((x) => x === 'tg' ? 'True Gold' : x === 'tier' ? 'Troop Tier' : 'Participants').join(', ')}.`
    } else {
      status.textContent = 'Ready. Review the values, then apply to Hunt Impact.'
    }
  }

  function open() {
    document.getElementById(MODAL_ID)?.remove(); styles()
    const root = document.createElement('div'); root.id = MODAL_ID; root.innerHTML = template(); document.body.appendChild(root); document.body.style.overflow = 'hidden'
    const file = root.querySelector('#hi-file'), drop = root.querySelector('.hi-drop'), preview = root.querySelector('.hi-preview'), read = root.querySelector('.hi-read'), apply = root.querySelector('.hi-apply'), values = root.querySelector('.hi-values'), status = root.querySelector('.hi-status')
    let selected = null, url = ''
    const close = () => { if (url) URL.revokeObjectURL(url); root.remove(); document.body.style.overflow = '' }
    const choose = (f) => { if (!f) return; selected = f; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(f); preview.querySelector('img').src = url; preview.querySelector('.hi-name').textContent = f.name; preview.querySelector('.hi-meta').textContent = `${(f.size/1024/1024).toFixed(2)} MB`; drop.hidden = true; preview.hidden = false; read.disabled = false; values.hidden = true; apply.disabled = true; status.textContent = 'Screenshot selected. Tap Read Screenshot.' }
    file.addEventListener('change', () => choose(file.files?.[0]))
    root.addEventListener('input', () => values.hidden || updateApplyState(root, apply, status))
    root.addEventListener('change', () => values.hidden || updateApplyState(root, apply, status))
    root.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action; if (!action) return
      if (action === 'close') return close()
      if (action === 'choose') { e.preventDefault(); e.stopPropagation(); return file.click() }
      if (action === 'read') {
        if (!selected) return
        read.disabled = true
        status.textContent = 'Reading battle report…'
        try {
          const Tesseract = await loadTesseract()
          const first = await Tesseract.recognize(selected, 'eng')
          let parsed = parseBattleReport(first?.data?.text || '')
          try {
            status.textContent = 'Improving troop and rally detection…'
            const canvas = await enhancedCanvas(selected)
            const second = await Tesseract.recognize(canvas, 'eng')
            parsed = mergeParsed(parsed, parseBattleReport(second?.data?.text || ''))
          } catch {}

          setPath(root, 'capacity', parsed.capacity)
          TYPES.forEach((t) => {
            setPath(root, `stats.${t.key}.attack`, parsed.stats[t.key].attack)
            setPath(root, `stats.${t.key}.lethality`, parsed.stats[t.key].lethality)
            setPath(root, `troopCounts.${t.key}`, parsed.troopCounts[t.key])
          })
          // Participants, Troop Tier and True Gold are deliberately never OCR-filled.
          values.hidden = false
          updateApplyState(root, apply, status)
        } catch (err) {
          status.textContent = err.message || 'Could not read screenshot.'
        } finally {
          read.disabled = false
        }
      }
      if (action === 'apply') {
        updateApplyState(root, apply, status)
        if (apply.disabled) return
        const detail = { source: 'hunt-impact', stats: {}, troopCounts: {} }
        TYPES.forEach((t) => {
          detail.stats[t.key] = {
            attack: cleanNumber(getPath(root, `stats.${t.key}.attack`)),
            lethality: cleanNumber(getPath(root, `stats.${t.key}.lethality`)),
          }
          detail.troopCounts[t.key] = cleanNumber(getPath(root, `troopCounts.${t.key}`))
        })
        detail.capacity = cleanNumber(getPath(root, 'capacity'))
        detail.participants = cleanNumber(getPath(root, 'participants'))
        detail.tier = getPath(root, 'tier')
        detail.tg = cleanNumber(getPath(root, 'tg'))
        window.dispatchEvent(new CustomEvent('k846:report-applied', { detail }))
        close()
      }
    })
  }

  window.__k846HuntImpactImport = { open, parseBattleReport }
})()
