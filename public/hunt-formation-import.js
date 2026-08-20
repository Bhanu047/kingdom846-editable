(() => {
  const MODAL_ID = 'k846-hunt-formation-import'
  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const TYPES = [
    { key: 'infantry', label: 'Infantry', short: 'INF' },
    { key: 'cavalry', label: 'Cavalry', short: 'CAV' },
    { key: 'archers', label: 'Archers', short: 'ARC' },
  ]

  function cleanNumber(value) {
    const n = Number(String(value ?? '').replace(/,/g, '').replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) ? n : ''
  }

  function parseRallyBonus(text) {
    const normalized = String(text || '').replace(/[‐‑–—]/g, '-').replace(/\r/g, '')
    const lines = normalized.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const aliases = {
      infantry: ['infantry', 'inf'],
      cavalry: ['cavalry', 'cav'],
      archers: ['archer', 'archers', 'arc'],
    }
    const stats = { infantry: { attack: '', lethality: '' }, cavalry: { attack: '', lethality: '' }, archers: { attack: '', lethality: '' } }
    for (const troop of TYPES) {
      for (const stat of ['attack', 'lethality']) {
        for (const line of lines) {
          const low = line.toLowerCase()
          if (!aliases[troop.key].some((a) => low.includes(a)) || !low.includes(stat)) continue
          const nums = line.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*%?/g) || []
          if (nums.length) { stats[troop.key][stat] = cleanNumber(nums[nums.length - 1]); break }
        }
      }
    }
    return stats
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

  function template() {
    return `
      <div class="hf-backdrop" data-action="close"></div>
      <section class="hf-dialog" role="dialog" aria-modal="true">
        <header class="hf-head"><div><div class="hf-eye">HUNT FORMATION · RALLY BONUS</div><h2>Upload Rally Bonus</h2><p>Only Attack and Lethality are used for formation.</p></div><button data-action="close">×</button></header>
        <div class="hf-body">
          <input id="hf-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
          <div class="hf-drop" data-action="choose" role="button" tabindex="0"><strong>Choose Rally Bonus screenshot</strong><span>PNG, JPG or WEBP</span></div>
          <div class="hf-preview" hidden><img alt="Rally Bonus preview"><div><strong class="hf-name"></strong><span class="hf-meta"></span><button type="button" class="hf-replace" data-action="choose">Choose another screenshot</button></div></div>
          <button class="hf-read" data-action="read" disabled>Read Screenshot</button>
          <div class="hf-status"></div>
          <div class="hf-values" hidden>
            <div class="hf-title">Detected Values</div>
            ${TYPES.map((t) => `<div class="hf-card"><b>${t.label}</b><label>Attack %<input type="number" step="0.1" data-field="${t.key}.attack"></label><label>Lethality %<input type="number" step="0.1" data-field="${t.key}.lethality"></label></div>`).join('')}
          </div>
        </div>
        <footer><button data-action="close" class="hf-cancel">Cancel</button><button data-action="apply" class="hf-apply" disabled>Apply to Hunt Formation</button></footer>
      </section>`
  }

  function styles() {
    if (document.getElementById('hf-style')) return
    const s = document.createElement('style'); s.id = 'hf-style'; s.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:12px;font-family:Montserrat,system-ui}
      #${MODAL_ID} [hidden]{display:none!important}
      #${MODAL_ID} .hf-backdrop{position:absolute;inset:0;background:rgba(2,8,20,.86);backdrop-filter:blur(6px)}
      #${MODAL_ID} .hf-dialog{position:relative;width:min(680px,100%);max-height:92vh;overflow:hidden;border:1px solid rgba(212,175,55,.28);border-radius:22px;background:#08172a;color:#f1e7ce;box-shadow:0 25px 90px rgba(0,0,0,.6)}
      #${MODAL_ID} .hf-head{display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid rgba(212,175,55,.14)}
      #${MODAL_ID} .hf-eye{font-size:9px;letter-spacing:.16em;color:#d4af37;font-weight:800} #${MODAL_ID} h2{margin:4px 0;font-family:Cinzel,serif;color:#f6e5ad} #${MODAL_ID} p{margin:0;font-size:11px;color:rgba(241,231,206,.5)}
      #${MODAL_ID} .hf-head button{border:0;background:transparent;color:#f1e7ce;font-size:28px}
      #${MODAL_ID} .hf-body{padding:18px;max-height:66vh;overflow:auto}
      #${MODAL_ID} .hf-drop{display:grid;place-items:center;gap:6px;min-height:150px;border:1.5px dashed rgba(212,175,55,.4);border-radius:16px;background:rgba(212,175,55,.04);cursor:pointer;text-align:center} #${MODAL_ID} .hf-drop span{font-size:10px;color:rgba(241,231,206,.4)}
      #${MODAL_ID} .hf-preview{display:flex;gap:12px;align-items:center;border:1px solid rgba(212,175,55,.14);border-radius:14px;padding:10px} #${MODAL_ID} .hf-preview img{width:86px;height:64px;object-fit:cover;border-radius:9px} #${MODAL_ID} .hf-preview div{display:flex;flex-direction:column;gap:4px;min-width:0} #${MODAL_ID} .hf-preview span{font-size:10px;color:rgba(241,231,206,.4)} #${MODAL_ID} .hf-replace{border:0;background:transparent;color:#d4af37;text-align:left;padding:0;font-size:10px;font-weight:700}
      #${MODAL_ID} .hf-read{width:100%;margin-top:10px;border:1px solid rgba(232,199,102,.4);border-radius:11px;padding:11px;background:linear-gradient(#d4af37,#ad8620);font-weight:900;color:#071224} #${MODAL_ID} .hf-read:disabled,#${MODAL_ID} .hf-apply:disabled{opacity:.4}
      #${MODAL_ID} .hf-status{margin-top:9px;font-size:10px;color:rgba(241,231,206,.5)} #${MODAL_ID} .hf-title{margin:16px 0 8px;font-family:Cinzel,serif;color:#ead393;font-weight:800}
      #${MODAL_ID} .hf-card{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;padding:12px;border:1px solid rgba(212,175,55,.12);border-radius:13px} #${MODAL_ID} .hf-card>b{grid-column:1/-1;font-family:Cinzel,serif} #${MODAL_ID} label{font-size:9px;text-transform:uppercase;color:rgba(241,231,206,.5)} #${MODAL_ID} input{box-sizing:border-box;width:100%;margin-top:4px;border:1px solid rgba(212,175,55,.18);border-radius:9px;background:#06111f;color:#f1e7ce;padding:9px}
      #${MODAL_ID} footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid rgba(212,175,55,.12)} #${MODAL_ID} footer button{border-radius:10px;padding:10px 14px;font-weight:800} #${MODAL_ID} .hf-cancel{background:transparent;border:1px solid rgba(212,175,55,.18);color:#f1e7ce} #${MODAL_ID} .hf-apply{border:1px solid rgba(232,199,102,.4);background:linear-gradient(#d4af37,#ad8620);color:#071224}
      @media(max-width:640px){#${MODAL_ID}{align-items:end;padding:6px}#${MODAL_ID} .hf-dialog{border-radius:20px 20px 8px 8px}#${MODAL_ID} .hf-body{max-height:68vh}}
    `; document.head.appendChild(s)
  }

  function open() {
    document.getElementById(MODAL_ID)?.remove(); styles()
    const root = document.createElement('div'); root.id = MODAL_ID; root.innerHTML = template(); document.body.appendChild(root); document.body.style.overflow = 'hidden'
    const file = root.querySelector('#hf-file'), drop = root.querySelector('.hf-drop'), preview = root.querySelector('.hf-preview'), read = root.querySelector('.hf-read'), apply = root.querySelector('.hf-apply'), values = root.querySelector('.hf-values'), status = root.querySelector('.hf-status')
    let selected = null, url = ''
    const close = () => { if (url) URL.revokeObjectURL(url); root.remove(); document.body.style.overflow = '' }
    const choose = (f) => {
      if (!f) return
      if (!/^image\/(png|jpeg|webp)$/i.test(f.type || '')) { status.textContent = 'Choose a PNG, JPG or WEBP screenshot.'; return }
      selected = f
      if (url) URL.revokeObjectURL(url)
      url = URL.createObjectURL(f)
      preview.querySelector('img').src = url
      preview.querySelector('.hf-name').textContent = f.name
      preview.querySelector('.hf-meta').textContent = `${(f.size/1024/1024).toFixed(2)} MB`
      drop.hidden = true
      preview.hidden = false
      read.disabled = false
      values.hidden = true
      apply.disabled = true
      status.textContent = 'Screenshot selected. Tap Read Screenshot.'
    }
    file.addEventListener('change', () => choose(file.files?.[0]))
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click() } })
    root.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action; if (!action) return
      if (action === 'close') return close()
      if (action === 'choose') { e.preventDefault(); file.click(); return }
      if (action === 'read') {
        if (!selected) { status.textContent = 'Choose a Rally Bonus screenshot first.'; return }
        read.disabled = true; status.textContent = 'Reading Rally Bonus…'
        try {
          const Tesseract = await loadTesseract(); const out = await Tesseract.recognize(selected, 'eng'); const stats = parseRallyBonus(out?.data?.text || '')
          TYPES.forEach((t) => ['attack','lethality'].forEach((k) => { const input = root.querySelector(`[data-field="${t.key}.${k}"]`); input.value = stats[t.key][k] ?? '' }))
          values.hidden = false
          const detected = TYPES.reduce((sum, t) => sum + ['attack','lethality'].filter((k) => Number(stats[t.key][k]) > 0).length, 0)
          apply.disabled = detected === 0
          status.textContent = detected ? `${detected}/6 values detected. Review them, then apply.` : 'No formation values detected. Please use a clearer Rally Bonus screenshot.'
        } catch (err) { status.textContent = err.message || 'Could not read screenshot.' } finally { read.disabled = false }
      }
      if (action === 'apply') {
        const stats = { infantry:{}, cavalry:{}, archers:{} }
        TYPES.forEach((t) => ['attack','lethality'].forEach((k) => { stats[t.key][k] = cleanNumber(root.querySelector(`[data-field="${t.key}.${k}"]`)?.value) }))
        window.dispatchEvent(new CustomEvent('k846:report-applied', { detail: { source: 'hunt-formation', stats } }))
        close()
      }
    })
  }

  window.__k846HuntFormationImport = { open, parseRallyBonus }
})()
