(() => {
  const MODAL_ID = 'k846-army-upload-modal'
  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const TROOPS = [
    { key: 'infantry', label: 'Infantry', aliases: ['infantry', 'inf'] },
    { key: 'cavalry', label: 'Cavalry', aliases: ['cavalry', 'cav'] },
    { key: 'archers', label: 'Archers', aliases: ['archer', 'archers', 'arc'] },
  ]
  // Kingshot's battle-overview report always shows both sides on the same
  // report at once — "<theirs> Label <mine>" per line — with the opponent's
  // column on the left and the account holder's own on the right (confirmed
  // against real screenshots: the number trailing the label is consistently
  // the report owner's own value). So one upload fills both "Your Troops"
  // and "Opponent Troops" in a single pass; there's no separate "opponent's
  // report" to ask for.
  const STATS = [
    { key: 'count', label: 'Troops', aliases: ['troops', 'quantity', 'count'] },
    { key: 'attack', label: 'Attack', aliases: ['attack', 'atk'] },
    { key: 'lethality', label: 'Lethality', aliases: ['lethality', 'lethal', 'let'] },
    { key: 'defense', label: 'Defense', aliases: ['defense', 'defence', 'def'] },
    { key: 'health', label: 'Health', aliases: ['health', 'hp'] },
  ]

  // Each tool this modal can fill: which section holds the intro copy (where
  // the upload button lives) and which two sections are "mine" / "opponent".
  const TOOLS = {
    mystic: { introHeading: 'Troop Composition Optimizer', sides: { mine: 'Your Troops', opponent: 'Opponent Troops' } },
    pvp: { introHeading: 'PvP Battle Simulator', sides: { mine: 'Your Army', opponent: 'Enemy Army' } },
  }

  // Number('') is 0 in JS, so a naive Number(str) can't tell "empty" from
  // "zero" — that would make every undetected field silently read as 0 and
  // count as a detected value. Strip non-numeric characters first and check
  // emptiness on what's left.
  function clean(v) { const stripped = String(v ?? '').replace(/,/g, '').replace(/[^0-9.]/g, ''); if (stripped === '' || stripped === '.') return ''; const n = Number(stripped); return Number.isFinite(n) ? n : '' }
  function hasAlias(text, aliases) { const low = String(text || '').toLowerCase(); return aliases.some((a) => new RegExp(`\\b${a}\\b`, 'i').test(low)) }
  function numbersOnLine(line) { return (String(line || '').match(/[0-9][0-9,]*(?:\.[0-9]+)?\s*%?/g) || []).map(clean).filter((v) => v !== '') }
  const isStatLine = (line) => /attack|atk|lethal|\blet\b|defen|health|\bhp\b|bonus/i.test(line)

  // Real screenshots regularly lose one side's number to OCR (colored text
  // is less reliable than plain black) — a line like "Infantry Attack
  // +1729.3%" with only the opponent's number surviving is common, not the
  // exception. Splitting on the label's position and reading numbers from
  // the "before" and "after" halves separately means a lone surviving
  // number lands on the correct side instead of getting duplicated onto
  // both (which silently fabricated a "your side" value that was never
  // actually read).
  function labelSpan(line, aliasGroups) {
    let start = Infinity, end = -Infinity
    for (const aliases of aliasGroups) {
      for (const a of aliases) {
        const m = new RegExp(`\\b${a}\\b`, 'i').exec(line)
        if (m) { start = Math.min(start, m.index); end = Math.max(end, m.index + m[0].length) }
      }
    }
    return start === Infinity ? null : { start, end }
  }
  function numsBeforeAfterLabel(line, aliasGroups) {
    const span = labelSpan(line, aliasGroups)
    if (!span) return { mine: [], theirs: [] }
    // The number trailing the label is the report owner's own value; the
    // number leading it is the opponent's — verified against real
    // screenshots, not assumed.
    return { mine: numbersOnLine(line.slice(span.end)), theirs: numbersOnLine(line.slice(0, span.start)) }
  }

  // The Mail battle-overview report's "Stat Bonuses" section is the only
  // place with clean per-troop-type + per-stat text, and it doesn't carry
  // troop counts at all. Troop counts only show up in the "Troop Power
  // Comparison" section once toggled to numbers — a bare troop-type label
  // near two large numbers (mine, theirs), no "Troops"/"count" wording on
  // the line. Ports the same >=10,000 large-count heuristic already proven
  // in hunt-impact-import.js's card-based parser, extended for two sides.
  function inferTroopCounts(lines) {
    const out = {}
    for (const troop of TROOPS) {
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        if (!hasAlias(line, troop.aliases) || isStatLine(line) || line.includes('%')) continue
        // Unlike Stat Bonuses' "<theirs> Label <mine>" layout, Troop Power
        // Comparison puts the label first with both counts after it
        // ("Infantry 245,000 198,500") — so two numbers landing on the same
        // side split as [mine, theirs] in order, while a single lone number
        // (dropped by OCR, not just visually absent) only fills the side
        // it's actually next to, never both.
        const bySide = numsBeforeAfterLabel(line, [troop.aliases])
        let mine = bySide.mine.filter((v) => v >= 10000)
        let theirs = bySide.theirs.filter((v) => v >= 10000)
        if (!mine.length && theirs.length >= 2) { mine = [theirs[0]]; theirs = [theirs[1]] }
        else if (!theirs.length && mine.length >= 2) { theirs = [mine[mine.length - 1]]; mine = [mine[0]] }
        for (let j = 1; j <= 2 && mine.length + theirs.length < 2; j += 1) {
          const next = lines[i + j] || ''
          if (isStatLine(next) || next.includes('%')) break
          for (const v of numbersOnLine(next).filter((v) => v >= 10000)) {
            if (!mine.length) mine = [v]
            else if (!theirs.length) theirs = [v]
          }
        }
        if (mine.length || theirs.length) { out[troop.key] = { mine: mine[0], theirs: theirs[0] }; break }
      }
    }
    return out
  }

  // Parses one screenshot's OCR text into BOTH sides at once.
  // Bonus Details rows show a real per-stat bonus next to a fixed
  // reference/cap number that repeats identically on every line
  // ("+222.0%" for all 12 Infantry/Cavalry/Archer stats, verified against
  // real screenshots) — when OCR can only read the constant, blindly
  // keeping it makes every stat look identical, which is worse than
  // leaving the field blank: it presents a value that was never actually
  // read as if it were real per-stat data. A value repeated across most of
  // a side's percentage fields is that constant, not a coincidence.
  function stripRepeatedConstant(side) {
    const tally = {}
    TROOPS.forEach((t) => STATS.forEach((s) => {
      if (s.key === 'count') return
      const v = side[t.key][s.key]
      if (v === undefined) return
      tally[v] = (tally[v] || 0) + 1
    }))
    TROOPS.forEach((t) => STATS.forEach((s) => {
      if (s.key === 'count') return
      const v = side[t.key][s.key]
      if (v !== undefined && tally[v] >= 4) delete side[t.key][s.key]
    }))
  }

  function parseArmyText(text) {
    const lines = String(text || '').replace(/[‐‑–—]/g, '-').split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const out = { mine: {}, opponent: {} }
    TROOPS.forEach((t) => { out.mine[t.key] = {}; out.opponent[t.key] = {} })
    for (const troop of TROOPS) {
      for (const stat of STATS) {
        for (const line of lines) {
          if (!hasAlias(line, troop.aliases) || !hasAlias(line, stat.aliases)) continue
          const { mine, theirs } = numsBeforeAfterLabel(line, [troop.aliases, stat.aliases])
          if (!mine.length && !theirs.length) continue
          // Take the number nearest the label on each side, not the
          // farthest -- a stray digit from an unrelated icon further down
          // the line (e.g. "+222.0% 5)") is noise, and the real paired
          // value always sits immediately next to its label.
          if (mine.length) out.mine[troop.key][stat.key] = mine[0]
          if (theirs.length) out.opponent[troop.key][stat.key] = theirs[theirs.length - 1]
          break
        }
      }
    }
    const counts = inferTroopCounts(lines)
    TROOPS.forEach((t) => {
      if (out.mine[t.key].count === undefined && counts[t.key]?.mine !== undefined) out.mine[t.key].count = counts[t.key].mine
      if (out.opponent[t.key].count === undefined && counts[t.key]?.theirs !== undefined) out.opponent[t.key].count = counts[t.key].theirs
    })
    stripRepeatedConstant(out.mine)
    stripRepeatedConstant(out.opponent)
    return out
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

  // Kingshot's Bonus Details numbers are small, and the "current bonus"
  // figure is rendered in a red that Tesseract reliably fails to pick up
  // at native screenshot resolution -- confirmed against real screenshots
  // where that number is completely absent from the OCR output, not just
  // garbled (a plain 2x upscale alone didn't fix it either). Two things
  // help here: upscaling (a standard mitigation for small/thin text), and
  // remapping every pixel to its darkest channel instead of a luminance
  // average. A saturated color always has at least one low RGB channel
  // even when its weighted luminance reads as "light" -- so darkest-channel
  // grayscale pulls colored ink away from a pale background more reliably
  // than luminance-based grayscale, without hardcoding this UI's palette.
  // Both are non-destructive re-renderings, not lossy thresholding, so
  // screenshots that already read fine aren't put at risk.
  function preprocessForOCR(file) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const scale = 2
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth * scale
        canvas.height = img.naturalHeight * scale
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imgData.data
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.min(d[i], d[i + 1], d[i + 2])
          d[i] = d[i + 1] = d[i + 2] = v
        }
        ctx.putImageData(imgData, 0, 0)
        URL.revokeObjectURL(img.src)
        resolve(canvas)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  function styles() {
    if (document.getElementById('k846-au-style')) return
    const s = document.createElement('style')
    s.id = 'k846-au-style'
    s.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:12px;font-family:Montserrat,system-ui}
      #${MODAL_ID} [hidden]{display:none!important}
      #${MODAL_ID} .au-backdrop{position:absolute;inset:0;background:rgba(2,8,20,.86);backdrop-filter:blur(6px)}
      #${MODAL_ID} .au-dialog{position:relative;width:min(760px,100%);max-height:92vh;overflow:hidden;border:1px solid rgba(212,175,55,.28);border-radius:22px;background:#08172a;color:#f1e7ce;box-shadow:0 25px 90px rgba(0,0,0,.6);display:flex;flex-direction:column}
      #${MODAL_ID} .au-head{display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid rgba(212,175,55,.14)}
      #${MODAL_ID} .au-eye{font-size:9px;letter-spacing:.16em;color:#d4af37;font-weight:800}
      #${MODAL_ID} h2{margin:4px 0;font-family:Cinzel,serif;color:#f6e5ad}
      #${MODAL_ID} p{margin:0;font-size:11px;color:rgba(241,231,206,.5)}
      #${MODAL_ID} .au-head button{border:0;background:transparent;color:#f1e7ce;font-size:28px;cursor:pointer}
      #${MODAL_ID} .au-body{padding:18px;overflow:auto}
      #${MODAL_ID} .au-warn{margin-bottom:14px;padding:10px 12px;border:1px solid rgba(251,191,36,.28);border-radius:12px;background:rgba(251,191,36,.05);font-size:11px;line-height:1.55;color:rgba(254,243,199,.75)}
      #${MODAL_ID} .au-warn b{color:#fde68a}
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
      #${MODAL_ID} .au-swap{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding:10px 12px;border:1px solid rgba(212,175,55,.2);border-radius:12px;background:rgba(255,255,255,.02)}
      #${MODAL_ID} .au-swap span{font-size:11px;color:rgba(241,231,206,.65)}
      #${MODAL_ID} .au-swap button{border:1px solid rgba(212,175,55,.28);border-radius:9px;padding:7px 11px;background:transparent;color:#d4af37;font-weight:800;font-size:10px;cursor:pointer;white-space:nowrap}
      #${MODAL_ID} .au-sides{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      #${MODAL_ID} .au-raw-toggle{margin-top:14px;border:1px solid rgba(212,175,55,.2);border-radius:9px;padding:7px 11px;background:transparent;color:rgba(241,231,206,.55);font-weight:700;font-size:10px;cursor:pointer}
      #${MODAL_ID} .au-raw-text{display:block;width:100%;margin-top:8px;height:160px;border:1px solid rgba(212,175,55,.2);border-radius:10px;background:rgba(0,0,0,.35);color:rgba(241,231,206,.75);font:11px/1.5 monospace;padding:10px;resize:vertical}
      #${MODAL_ID} .au-side-col h4{margin:0 0 6px;font-family:Cinzel,serif;font-size:12px;color:#ead393}
      #${MODAL_ID} .au-card{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px;padding:10px;border:1px solid rgba(212,175,59,.12);border-radius:12px}
      #${MODAL_ID} .au-card>b{grid-column:1/-1;font-family:Cinzel,serif;font-size:11px}
      #${MODAL_ID} label{font-size:8px;text-transform:uppercase;color:rgba(241,231,206,.5)}
      #${MODAL_ID} input[type=number]{box-sizing:border-box;width:100%;margin-top:3px;border:1px solid rgba(212,175,55,.18);border-radius:8px;background:#06111f;color:#f1e7ce;padding:6px}
      #${MODAL_ID} footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid rgba(212,175,55,.12)}
      #${MODAL_ID} footer button{border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
      #${MODAL_ID} .au-cancel{background:transparent;border:1px solid rgba(212,175,55,.18);color:#f1e7ce}
      #${MODAL_ID} .au-apply{border:1px solid rgba(232,199,102,.4);background:linear-gradient(#d4af37,#ad8620);color:#071224}
      @media(max-width:640px){#${MODAL_ID}{align-items:end;padding:6px}#${MODAL_ID} .au-dialog{border-radius:20px 20px 8px 8px}#${MODAL_ID} .au-sides{grid-template-columns:1fr}}
    `
    document.head.appendChild(s)
  }

  function template(mineHeading, opponentHeading) {
    const sideCard = (label) => TROOPS.map((t) => `<div class="au-card"><b>${t.label}</b>${STATS.map((s) => `<label>${s.label}<input type="number" step="0.1" data-side="${label}" data-field="${t.key}.${s.key}"></label>`).join('')}</div>`).join('')
    return `
      <div class="au-backdrop" data-action="close"></div>
      <section class="au-dialog" role="dialog" aria-modal="true">
        <header class="au-head">
          <div>
            <div class="au-eye">BATTLE REPORT IMPORT</div>
            <h2>Upload Battle Report</h2>
            <p>Fills both "${mineHeading}" and "${opponentHeading}" from the same screenshots.</p>
          </div>
          <button data-action="close">×</button>
        </header>
        <div class="au-body">
          <div class="au-warn"><b>Before you screenshot:</b> set the report to show actual troop numbers, not percentages — tap the switch icon on Troop Power Comparison if it's showing bars/percentages.</div>
          <input id="au-file" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>
          <div class="au-drop" data-action="choose" role="button" tabindex="0">
            <strong>Drag & drop screenshots here</strong>
            <span>or tap to choose — a full report is often 3-4 screens, add them all</span>
          </div>
          <div class="au-files"></div>
          <button class="au-add" data-action="choose" hidden>+ Add another screenshot</button>
          <button class="au-read" data-action="read" disabled>Scan All Screenshots</button>
          <div class="au-status"></div>
          <div class="au-values" hidden>
            <div class="au-swap"><span>Reading the report backwards? Swap which column is which.</span><button type="button" data-action="swap">Swap Sides</button></div>
            <div class="au-title">Detected Values — Review Before Applying</div>
            <div class="au-sides">
              <div class="au-side-col"><h4 data-side-label="mine">${mineHeading}</h4>${sideCard('mine')}</div>
              <div class="au-side-col"><h4 data-side-label="opponent">${opponentHeading}</h4>${sideCard('opponent')}</div>
            </div>
            <button type="button" class="au-raw-toggle" data-action="raw-toggle">Show Raw Scanned Text</button>
            <textarea class="au-raw-text" readonly hidden></textarea>
          </div>
        </div>
        <footer><button data-action="close" class="au-cancel">Cancel</button><button data-action="apply" class="au-apply" disabled>Apply Both Sides</button></footer>
      </section>`
  }

  function open() {
    const tool = Object.values(TOOLS).find((t) => findSection(t.introHeading) && findSection(t.sides.mine) && findSection(t.sides.opponent))
    if (!tool) return
    let mineHeading = tool.sides.mine
    let opponentHeading = tool.sides.opponent

    document.getElementById(MODAL_ID)?.remove()
    styles()
    const root = document.createElement('div')
    root.id = MODAL_ID
    root.innerHTML = template(mineHeading, opponentHeading)
    document.body.appendChild(root)
    document.body.style.overflow = 'hidden'

    const fileInput = root.querySelector('#au-file'), drop = root.querySelector('.au-drop'), filesList = root.querySelector('.au-files'), addBtn = root.querySelector('.au-add'), readBtn = root.querySelector('.au-read'), applyBtn = root.querySelector('.au-apply'), values = root.querySelector('.au-values'), status = root.querySelector('.au-status')
    const entries = []
    let swapped = false
    let lastParsed = null

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

    function renderValues() {
      if (!lastParsed) return
      const left = swapped ? lastParsed.opponent : lastParsed.mine
      const right = swapped ? lastParsed.mine : lastParsed.opponent
      root.querySelector('[data-side-label="mine"]').textContent = mineHeading
      root.querySelector('[data-side-label="opponent"]').textContent = opponentHeading
      TROOPS.forEach((t) => STATS.forEach((s) => {
        const mineInput = root.querySelector(`[data-side="mine"][data-field="${t.key}.${s.key}"]`)
        const oppInput = root.querySelector(`[data-side="opponent"][data-field="${t.key}.${s.key}"]`)
        if (mineInput) mineInput.value = left[t.key]?.[s.key] ?? ''
        if (oppInput) oppInput.value = right[t.key]?.[s.key] ?? ''
      }))
      const detected = TROOPS.reduce((sum, t) => sum + STATS.filter((s) => (left[t.key]?.[s.key] ?? '') !== '' || (right[t.key]?.[s.key] ?? '') !== '').length, 0)
      applyBtn.disabled = detected === 0
      status.textContent = detected ? `${detected} field${detected === 1 ? '' : 's'} detected. Review both sides below — use Swap Sides if the columns are backwards.` : 'No values detected. Review the screenshots or enter values manually on the page.'
    }

    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = '' })
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click() } })
    ;['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('au-drag') }))
    ;['dragleave', 'dragend'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('au-drag') }))
    drop.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('au-drag'); addFiles(e.dataTransfer?.files) })

    root.addEventListener('click', async (e) => {
      const removeIdx = e.target?.dataset?.remove
      if (removeIdx !== undefined) { const [rm] = entries.splice(Number(removeIdx), 1); if (rm?.url) URL.revokeObjectURL(rm.url); renderFiles(); return }

      const action = e.target.closest('[data-action]')?.dataset.action
      if (!action) return
      if (action === 'close') return close()
      if (action === 'choose') { e.preventDefault(); fileInput.click(); return }
      if (action === 'swap') { swapped = !swapped; renderValues(); return }
      if (action === 'raw-toggle') {
        const rawBox = root.querySelector('.au-raw-text'), btn = e.target.closest('[data-action]')
        const showing = !rawBox.hidden
        if (showing) { rawBox.hidden = true; btn.textContent = 'Show Raw Scanned Text'; return }
        rawBox.value = entries.map((en, i) => `--- Screenshot ${i + 1}: ${en.file.name} ---\n${en.rawText || '(not scanned yet)'}`).join('\n\n')
        rawBox.hidden = false
        btn.textContent = 'Hide Raw Scanned Text'
        return
      }
      if (action === 'read') {
        if (!entries.length) return
        readBtn.disabled = true
        values.hidden = true
        for (let i = 0; i < entries.length; i += 1) {
          status.textContent = `Reading screenshot ${i + 1} of ${entries.length}…`
          try {
            const Tesseract = await loadTesseract()
            const prepped = await preprocessForOCR(entries[i].file)
            const out = await Tesseract.recognize(prepped, 'eng')
            entries[i].rawText = out?.data?.text || ''
            entries[i].parsed = parseArmyText(entries[i].rawText)
            entries[i].status = 'ok'
            renderFiles()
          } catch (err) {
            status.textContent = `Screenshot ${i + 1} failed to read: ${err.message || 'unknown error'}`
          }
        }
        readBtn.disabled = false
        const parsedEntries = entries.filter((en) => en.parsed)
        if (!parsedEntries.length) { status.textContent = 'Could not read any of these screenshots. Try clearer images or enter values manually.'; return }
        let mine = {}, opponent = {}
        for (const en of parsedEntries) { mine = mergeArmyStats(mine, en.parsed.mine); opponent = mergeArmyStats(opponent, en.parsed.opponent) }
        lastParsed = { mine, opponent }
        swapped = false
        values.hidden = false
        renderValues()
        values.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      if (action === 'apply') {
        const readSide = (side) => { const s = {}; TROOPS.forEach((t) => { s[t.key] = {}; STATS.forEach((st) => { s[t.key][st.key] = clean(root.querySelector(`[data-side="${side}"][data-field="${t.key}.${st.key}"]`)?.value) }) }); return s }
        try {
          const mineStats = readSide('mine'), oppStats = readSide('opponent')
          const noTroopCounts = TROOPS.every((t) => mineStats[t.key].count === '') && TROOPS.every((t) => oppStats[t.key].count === '')
          const appliedMine = applyToSide(mineHeading, mineStats)
          const appliedOpp = applyToSide(opponentHeading, oppStats)
          close()
          const toast = document.createElement('div')
          const warn = noTroopCounts
          toast.textContent = warn
            ? 'Warning: Troops counts weren’t detected. Attack/Lethality/Defense/Health come from Stat Bonuses, but Troops only comes from Troop Power Comparison switched to numbers (not the % bars) — upload that section too, or fill in Troops by hand.'
            : `Applied ${appliedMine} values to ${mineHeading}, ${appliedOpp} to ${opponentHeading}.`
          Object.assign(toast.style, { position: 'fixed', left: '50%', bottom: '26px', zIndex: 10070, transform: 'translateX(-50%)', maxWidth: '90vw', padding: '11px 15px', borderRadius: '10px', font: '700 11px Montserrat, sans-serif', color: warn ? '#fde68a' : '#f6e5ad', background: warn ? 'rgba(120,53,15,.95)' : 'rgba(10,24,43,.98)', border: `1px solid ${warn ? 'rgba(251,191,36,.4)' : 'rgba(212,175,55,.34)'}` })
          document.body.appendChild(toast)
          setTimeout(() => toast.remove(), warn ? 6000 : 3200)
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
    s.textContent = `.k846-au-upload-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;max-width:360px;margin-top:.8rem;border:1px solid rgba(226,199,125,.35);border-radius:.75rem;padding:.7rem 1rem;background:linear-gradient(180deg,rgba(226,181,48,.2),rgba(173,134,32,.14));color:#f2dfaa;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}.k846-au-upload-caption{max-width:360px;margin-top:.45rem;font-size:10px;line-height:1.5;color:rgba(241,231,206,.4)}.k846-au-upload-caption b{color:rgba(253,230,138,.75)}`
    document.head.appendChild(s)
  }

  function injectButtons() {
    styleUploadButton()
    for (const tool of Object.values(TOOLS)) {
      const section = findSection(tool.introHeading)
      if (!section || !findSection(tool.sides.mine) || !findSection(tool.sides.opponent)) continue
      if (section.querySelector('[data-k846-au]')) continue
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'k846-au-upload-btn'
      btn.dataset.k846Au = tool.introHeading
      btn.textContent = 'Upload Battle Report'
      btn.addEventListener('click', (e) => { e.preventDefault(); open() })
      const caption = document.createElement('div')
      caption.className = 'k846-au-upload-caption'
      caption.innerHTML = '<b>Upload both sections</b>: Stat Bonuses (for Attack/Lethality/Defense/Health) and Troop Power Comparison switched to numbers, not bars — tap the switch icon top-right (for Troops). PNG, JPG or WEBP, multiple screenshots allowed.'
      const p = section.querySelector('p')
      if (p) { p.insertAdjacentElement('afterend', caption); p.insertAdjacentElement('afterend', btn) } else { section.appendChild(btn); section.appendChild(caption) }
    }
  }

  let timer = null
  const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(injectButtons, 200) })
  obs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
  document.addEventListener('DOMContentLoaded', injectButtons)
  window.addEventListener('hashchange', () => setTimeout(injectButtons, 250))
  setTimeout(injectButtons, 400)
})()
