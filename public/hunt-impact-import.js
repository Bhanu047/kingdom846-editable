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

  function lastNumber(line) {
    const matches = String(line || '').match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*%?/g) || []
    return matches.length ? cleanNumber(matches[matches.length - 1]) : ''
  }

  function parseBattleReport(text) {
    const normalized = String(text || '').replace(/[‐‑–—]/g, '-').replace(/\r/g, '')
    const lines = normalized.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const aliases = {
      infantry: ['infantry', 'inf'],
      cavalry: ['cavalry', 'cav'],
      archers: ['archer', 'archers', 'archery', 'arc'],
    }
    const result = {
      stats: { infantry: { attack: '', lethality: '' }, cavalry: { attack: '', lethality: '' }, archers: { attack: '', lethality: '' } },
      troopCounts: { infantry: '', cavalry: '', archers: '' },
      capacity: '', participants: '', tier: '', tg: '', raw: normalized,
    }

    for (const troop of TYPES) {
      for (const stat of ['attack', 'lethality']) {
        const statAliases = stat === 'attack' ? ['attack', 'atk'] : ['lethality', 'lethal', 'let']
        for (const line of lines) {
          const low = line.toLowerCase()
          const troopHit = aliases[troop.key].some((a) => new RegExp(`\\b${a}\\b`, 'i').test(low))
          const statHit = statAliases.some((a) => new RegExp(`\\b${a}\\b`, 'i').test(low))
          if (!troopHit || !statHit) continue
          const value = lastNumber(line)
          if (value !== '') { result.stats[troop.key][stat] = value; break }
        }
      }

      const countPatterns = [
        new RegExp(`(?:${aliases[troop.key].join('|')})[^\\n]{0,36}?(?:troops?|deployed|count|units?)[^0-9]{0,10}([0-9][0-9,]{2,})`, 'i'),
        new RegExp(`(?:troops?|deployed|count|units?)[^\\n]{0,24}?(?:${aliases[troop.key].join('|')})[^0-9]{0,10}([0-9][0-9,]{2,})`, 'i'),
      ]
      for (const pattern of countPatterns) {
        const match = normalized.match(pattern)
        if (match) { result.troopCounts[troop.key] = cleanNumber(match[1]); break }
      }
    }

    const findFirst = (patterns) => {
      for (const pattern of patterns) {
        const match = normalized.match(pattern)
        if (match) return cleanNumber(match[1])
      }
      return ''
    }

    result.capacity = findFirst([
      /rally\s*capacity[^0-9]{0,18}([0-9][0-9,]{3,})/i,
      /march\s*capacity[^0-9]{0,18}([0-9][0-9,]{3,})/i,
      /deployment\s*(?:capacity|size)[^0-9]{0,18}([0-9][0-9,]{3,})/i,
    ])
    result.participants = findFirst([
      /participants?[^0-9]{0,14}([0-9]{1,2})/i,
      /members?[^0-9]{0,14}([0-9]{1,2})/i,
      /rally\s*members?[^0-9]{0,14}([0-9]{1,2})/i,
    ])

    const tierText = normalized.toUpperCase().replace(/\s+/g, '')
    const tgRange = tierText.match(/TG(\d+)(?:-TG(\d+))?/)
    if (tgRange) {
      const level = Number(tgRange[1])
      result.tg = level
      result.tier = level >= 5 ? 'TG5-TG7' : level >= 3 ? 'TG3-TG4' : 'T7-TG2'
    } else {
      const t = tierText.match(/T(\d{1,2})/)
      if (t) result.tier = Number(t[1]) <= 6 ? 'T1-T6' : 'T7-TG2'
    }

    return result
  }

  function template() {
    return `
      <div class="hi-backdrop" data-action="close"></div>
      <section class="hi-dialog" role="dialog" aria-modal="true">
        <header class="hi-head"><div><div class="hi-eye">HUNT IMPACT · BATTLE REPORT</div><h2>Upload Battle Report</h2><p>Reads combat stats, rally data and troop counts. Review every value before applying.</p></div><button data-action="close">×</button></header>
        <div class="hi-body">
          <input id="hi-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
          <div class="hi-drop" data-action="choose"><strong>Choose Battle Report screenshot</strong><span>PNG, JPG or WEBP</span></div>
          <div class="hi-preview" hidden><img alt="Battle report preview"><div><strong class="hi-name"></strong><span class="hi-meta"></span></div></div>
          <button class="hi-read" data-action="read" disabled>Read Screenshot</button>
          <div class="hi-status"></div>
          <div class="hi-values" hidden>
            <div class="hi-title">Detected / Manual Values</div>
            <div class="hi-grid4">
              <label>Rally Capacity<input type="number" step="1000" data-field="capacity"></label>
              <label>Participants<input type="number" step="1" data-field="participants"></label>
              <label>Troop Tier<select data-field="tier"><option value="">Select</option><option>T1-T6</option><option>T7-TG2</option><option>TG3-TG4</option><option>TG5-TG7</option></select></label>
              <label>True Gold<select data-field="tg">${Array.from({length:9},(_,i)=>`<option value="${i}">TG${i}</option>`).join('')}</select></label>
            </div>
            ${TYPES.map((t) => `<div class="hi-card"><b>${t.label}</b><label>Attack %<input type="number" step="0.1" data-field="stats.${t.key}.attack"></label><label>Lethality %<input type="number" step="0.1" data-field="stats.${t.key}.lethality"></label><label>Troops<input type="number" step="1000" data-field="troopCounts.${t.key}"></label></div>`).join('')}
            <details class="hi-raw"><summary>Recognized text</summary><pre></pre></details>
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
      #${MODAL_ID} .hi-status{margin-top:9px;font-size:10px;color:rgba(241,231,206,.5)} #${MODAL_ID} .hi-title{margin:16px 0 8px;font-family:Cinzel,serif;color:#ead393;font-weight:800}
      #${MODAL_ID} .hi-grid4{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px} #${MODAL_ID} .hi-card{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;padding:12px;border:1px solid rgba(212,175,55,.12);border-radius:13px} #${MODAL_ID} .hi-card>b{grid-column:1/-1;font-family:Cinzel,serif}
      #${MODAL_ID} label{font-size:9px;text-transform:uppercase;color:rgba(241,231,206,.5)} #${MODAL_ID} input,#${MODAL_ID} select{box-sizing:border-box;width:100%;margin-top:4px;border:1px solid rgba(212,175,55,.18);border-radius:9px;background:#06111f;color:#f1e7ce;padding:9px}
      #${MODAL_ID} .hi-raw{margin-top:12px;font-size:10px;color:rgba(241,231,206,.45)} #${MODAL_ID} .hi-raw pre{white-space:pre-wrap;max-height:160px;overflow:auto;font-size:9px}
      #${MODAL_ID} footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid rgba(212,175,55,.12)} #${MODAL_ID} footer button{border-radius:10px;padding:10px 14px;font-weight:800} #${MODAL_ID} .hi-cancel{background:transparent;border:1px solid rgba(212,175,55,.18);color:#f1e7ce} #${MODAL_ID} .hi-apply{border:1px solid rgba(232,199,102,.4);background:linear-gradient(#d4af37,#ad8620);color:#071224}
      @media(max-width:640px){#${MODAL_ID}{align-items:end;padding:6px}#${MODAL_ID} .hi-dialog{border-radius:20px 20px 8px 8px}#${MODAL_ID} .hi-body{max-height:72vh}#${MODAL_ID} .hi-card{grid-template-columns:1fr 1fr}#${MODAL_ID} .hi-card label:last-child{grid-column:1/-1}}
    `; document.head.appendChild(s)
  }

  function setPath(root, path, value) {
    const el = root.querySelector(`[data-field="${path}"]`)
    if (el && value !== '' && value != null) el.value = String(value)
  }

  function open() {
    document.getElementById(MODAL_ID)?.remove(); styles()
    const root = document.createElement('div'); root.id = MODAL_ID; root.innerHTML = template(); document.body.appendChild(root); document.body.style.overflow = 'hidden'
    const file = root.querySelector('#hi-file'), drop = root.querySelector('.hi-drop'), preview = root.querySelector('.hi-preview'), read = root.querySelector('.hi-read'), apply = root.querySelector('.hi-apply'), values = root.querySelector('.hi-values'), status = root.querySelector('.hi-status')
    let selected = null, url = ''
    const close = () => { if (url) URL.revokeObjectURL(url); root.remove(); document.body.style.overflow = '' }
    const choose = (f) => { if (!f) return; selected = f; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(f); preview.querySelector('img').src = url; preview.querySelector('.hi-name').textContent = f.name; preview.querySelector('.hi-meta').textContent = `${(f.size/1024/1024).toFixed(2)} MB`; drop.hidden = true; preview.hidden = false; read.disabled = false; values.hidden = true; apply.disabled = true; status.textContent = 'Screenshot selected. Tap Read Screenshot.' }
    file.addEventListener('change', () => choose(file.files?.[0]))
    root.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action; if (!action) return
      if (action === 'close') return close()
      if (action === 'choose') { e.preventDefault(); e.stopPropagation(); return file.click() }
      if (action === 'read') {
        if (!selected) return; read.disabled = true; status.textContent = 'Reading battle report…'
        try {
          const Tesseract = await loadTesseract(); const out = await Tesseract.recognize(selected, 'eng'); const parsed = parseBattleReport(out?.data?.text || '')
          setPath(root, 'capacity', parsed.capacity); setPath(root, 'participants', parsed.participants); setPath(root, 'tier', parsed.tier); setPath(root, 'tg', parsed.tg)
          TYPES.forEach((t) => { setPath(root, `stats.${t.key}.attack`, parsed.stats[t.key].attack); setPath(root, `stats.${t.key}.lethality`, parsed.stats[t.key].lethality); setPath(root, `troopCounts.${t.key}`, parsed.troopCounts[t.key]) })
          root.querySelector('.hi-raw pre').textContent = parsed.raw
          values.hidden = false; apply.disabled = false
          const detected = [parsed.capacity, parsed.participants, parsed.tier, ...TYPES.flatMap((t)=>[parsed.stats[t.key].attack, parsed.stats[t.key].lethality, parsed.troopCounts[t.key]])].filter((v)=>v!==''&&v!=null).length
          status.textContent = `Detected ${detected} fields. Review and correct anything missing.`
        } catch (err) { status.textContent = err.message || 'Could not read screenshot.' } finally { read.disabled = false }
      }
      if (action === 'apply') {
        const detail = { source: 'hunt-impact', stats: {}, troopCounts: {} }
        TYPES.forEach((t) => {
          detail.stats[t.key] = { attack: cleanNumber(root.querySelector(`[data-field="stats.${t.key}.attack"]`)?.value), lethality: cleanNumber(root.querySelector(`[data-field="stats.${t.key}.lethality"]`)?.value) }
          detail.troopCounts[t.key] = cleanNumber(root.querySelector(`[data-field="troopCounts.${t.key}"]`)?.value)
        })
        detail.capacity = cleanNumber(root.querySelector('[data-field="capacity"]')?.value)
        detail.participants = cleanNumber(root.querySelector('[data-field="participants"]')?.value)
        detail.tier = root.querySelector('[data-field="tier"]')?.value || ''
        detail.tg = cleanNumber(root.querySelector('[data-field="tg"]')?.value)
        window.dispatchEvent(new CustomEvent('k846:report-applied', { detail }))
        close()
      }
    })
  }

  window.__k846HuntImpactImport = { open, parseBattleReport }
})()
