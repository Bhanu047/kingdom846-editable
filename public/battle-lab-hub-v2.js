(() => {
  const HUB_ID = 'k846-battle-lab-hub-v2'
  const HERO_ID = 'k846-battle-lab-tool-hero-v2'
  const STYLE_ID = 'k846-battle-lab-hub-v2-style'
  const REQUEST_KEY = 'kingdom846.battleLab.requestedModule'

  const svg = (body, accent = '#d4af37') => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020817"/><stop offset=".55" stop-color="#071426"/><stop offset="1" stop-color="#020611"/></linearGradient><radialGradient id="r"><stop stop-color="${accent}" stop-opacity=".25"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="880" cy="210" r="330" fill="url(#r)"/><g fill="none" stroke="${accent}" stroke-opacity=".28">${body}</g><g fill="${accent}" fill-opacity=".12">${body}</g></svg>`)}`

  const TOOLS = {
    bear: {
      label: 'Bear', source: 'Bear Optimizer', icon: '◎', blurb: 'Optimize Bear Hunt troop ratios and rally setup.',
      image: svg('<path d="M240 470c80-180 250-280 390-210 70 34 118 104 144 180l-74 70-118-20-95 54-137-26z" stroke-width="12"/><circle cx="390" cy="246" r="70" stroke-width="12"/><circle cx="590" cy="246" r="70" stroke-width="12"/><ellipse cx="490" cy="345" rx="185" ry="150" stroke-width="14"/><circle cx="430" cy="330" r="18"/><circle cx="550" cy="330" r="18"/><path d="M452 390q38 34 76 0" stroke-width="12"/><path d="M170 610h850M205 560h760" stroke-width="5"/>')
    },
    mystic: {
      label: 'Mystic', source: 'Mystic Trials', icon: '✦', blurb: 'Analyze Mystic Trials and tactical progression.',
      image: svg('<circle cx="720" cy="330" r="205" stroke-width="8"/><circle cx="720" cy="330" r="145" stroke-width="5"/><path d="M720 115l65 145 155 70-155 70-65 145-65-145-155-70 155-70z" stroke-width="8"/><path d="M720 190l40 90 95 50-95 50-40 90-40-90-95-50 95-50z" stroke-width="7"/><path d="M250 545h700M320 595h560" stroke-width="5"/>', '#a970ff')
    },
    battle: {
      label: 'Battle', source: 'Battle Simulator', icon: '⚔', blurb: 'Compare combat stats and battle outcomes.',
      image: svg('<path d="M320 125l410 410M760 125L350 535" stroke-width="34"/><path d="M285 90l110 25-85 85zM795 90l-110 25 85 85z" stroke-width="10"/><path d="M280 565h520M225 610h630" stroke-width="6"/><path d="M125 510l110-155 110 155M845 510l110-155 110 155" stroke-width="9"/>', '#d8a24d')
    },
    formation: {
      label: 'Formation', source: 'Formation Optimizer', icon: '▦', blurb: 'Build and compare troop formations.',
      image: svg('<path d="M220 155h760v420H220z" stroke-width="8"/><path d="M410 155v420M600 155v420M790 155v420M220 295h760M220 435h760" stroke-width="4"/><g stroke-width="9"><circle cx="315" cy="225" r="30"/><circle cx="505" cy="365" r="30"/><circle cx="695" cy="225" r="30"/><circle cx="885" cy="365" r="30"/><circle cx="505" cy="505" r="30"/><circle cx="695" cy="505" r="30"/></g><path d="M315 225L505 365 695 225 885 365M505 365v140M695 225v280" stroke-width="7"/>', '#6ea6ff')
    },
  }

  let current = 'hub'
  let busy = false

  function isBattleLab() { return /battle-lab/i.test(location.hash || '') }
  function sectionsByText(text) { return [...document.querySelectorAll('section')].find(s => (s.textContent || '').includes(text)) || null }
  function mainHero() { return [...document.querySelectorAll('section')].find(s => [...s.querySelectorAll('h1')].some(h => /Battle Lab/i.test(h.textContent || ''))) || null }
  function tabs() { const b = [...document.querySelectorAll('button')].find(b => /Bear Optimizer/i.test(b.textContent || '')); return b?.closest('section') || null }
  function stats() { return sectionsByText('Combat Report Stats') }
  function contentGrid() { return stats()?.parentElement || null }
  function policy() { return sectionsByText('Battle Lab model policy') }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return
    const s = document.createElement('style'); s.id = STYLE_ID
    s.textContent = `
      #${HUB_ID}{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:18px}
      .k846-hub-card{position:relative;min-height:330px;overflow:hidden;border-radius:24px;border:1px solid rgba(212,175,55,.32);background:#061225;text-align:left;box-shadow:0 18px 42px rgba(0,0,0,.3);isolation:isolate}
      .k846-hub-card:before{content:'';position:absolute;inset:0;background-image:var(--bg);background-size:cover;background-position:center;z-index:-3;transition:transform .35s ease,filter .35s ease}
      .k846-hub-card:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,8,20,.08),rgba(2,8,20,.18) 42%,rgba(2,8,20,.94));z-index:-2}
      .k846-hub-card:hover:before{transform:scale(1.045);filter:brightness(1.08)}
      .k846-hub-inner{position:absolute;left:0;right:0;bottom:0;padding:24px}.k846-hub-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;border:1px solid rgba(232,199,102,.4);background:rgba(3,12,29,.7);color:#e8c766;font-size:23px}.k846-hub-name{display:block;margin-top:12px;font-family:Cinzel,serif;font-size:30px;font-weight:800;color:#f2e6ca}.k846-hub-copy{display:block;margin-top:5px;color:rgba(242,230,202,.6);font-size:13px}.k846-beta{position:absolute;right:16px;top:16px;border:1px solid rgba(252,211,77,.38);background:rgba(111,75,8,.3);color:#fde8a7;border-radius:999px;padding:5px 10px;font-size:9px;font-weight:800;letter-spacing:.14em;backdrop-filter:blur(8px)}
      #${HERO_ID}{position:relative;min-height:230px;overflow:hidden;border-radius:24px;border:1px solid rgba(212,175,55,.3);margin-bottom:22px;background:#061225;isolation:isolate}#${HERO_ID}:before{content:'';position:absolute;inset:0;background-image:var(--bg);background-size:cover;background-position:center;z-index:-3}#${HERO_ID}:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,8,20,.94),rgba(2,8,20,.58) 60%,rgba(2,8,20,.18));z-index:-2}.k846-tool-content{min-height:230px;display:flex;flex-direction:column;justify-content:flex-end;padding:24px}.k846-back{align-self:flex-start;margin-bottom:auto;border:1px solid rgba(212,175,55,.3);background:rgba(3,12,29,.72);color:#ead9b4;border-radius:12px;padding:9px 12px;font-size:11px;font-weight:700}.k846-tool-title{font-family:Cinzel,serif;font-size:36px;font-weight:800;color:#f2e6ca}.k846-tool-sub{margin-top:5px;color:rgba(242,230,202,.62);font-size:13px}
      @media(max-width:760px){#${HUB_ID}{grid-template-columns:1fr;gap:14px}.k846-hub-card{min-height:245px;border-radius:20px}.k846-hub-inner{padding:19px}.k846-hub-name{font-size:26px}#${HERO_ID},.k846-tool-content{min-height:195px}.k846-tool-content{padding:18px}.k846-tool-title{font-size:30px}}
    `
    document.head.appendChild(s)
  }

  function sourceButton(key) { const label = TOOLS[key]?.source; return [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes(label)) || null }

  function ensureHub() {
    let hub = document.getElementById(HUB_ID); if (hub) return hub
    const t = tabs(); if (!t) return null
    hub = document.createElement('section'); hub.id = HUB_ID; hub.setAttribute('aria-label','Battle Lab tools')
    Object.entries(TOOLS).forEach(([key, tool]) => {
      const b = document.createElement('button'); b.type='button'; b.className='k846-hub-card'; b.style.setProperty('--bg',`url("${tool.image}")`)
      b.innerHTML=`<span class="k846-beta">BETA</span><span class="k846-hub-inner"><span class="k846-hub-icon">${tool.icon}</span><span class="k846-hub-name">${tool.label}</span><span class="k846-hub-copy">${tool.blurb}</span></span>`
      b.addEventListener('click',()=>openTool(key)); hub.appendChild(b)
    })
    t.insertAdjacentElement('afterend',hub); return hub
  }

  function ensureToolHero(key) {
    const tool=TOOLS[key]; let h=document.getElementById(HERO_ID)
    if(!h){h=document.createElement('section');h.id=HERO_ID;contentGrid()?.insertAdjacentElement('beforebegin',h)}
    h.style.setProperty('--bg',`url("${tool.image}")`)
    h.innerHTML=`<div class="k846-tool-content"><button class="k846-back" type="button">← Battle Lab</button><div class="k846-tool-title">${tool.label}</div><div class="k846-tool-sub">${tool.blurb} · BETA</div></div>`
    h.querySelector('.k846-back')?.addEventListener('click',showHub); return h
  }

  function showHub() {
    if(!isBattleLab()) return; current='hub'; installStyles(); const h=ensureHub()
    if(mainHero()) mainHero().style.display=''; if(tabs()) tabs().style.display='none'; if(h) h.style.display='grid'; if(contentGrid()) contentGrid().style.display='none'; if(policy()) policy().style.display='none'; const th=document.getElementById(HERO_ID); if(th) th.style.display='none';
    try{sessionStorage.removeItem(REQUEST_KEY)}catch{}; window.scrollTo({top:0,behavior:'smooth'})
  }

  function openTool(key) {
    if(!TOOLS[key]||!isBattleLab()) return; current=key; installStyles(); const b=sourceButton(key); if(b && !(b.className||'').includes('border-gold/45')) b.click(); const h=ensureHub(); const th=ensureToolHero(key)
    if(mainHero()) mainHero().style.display='none'; if(tabs()) tabs().style.display='none'; if(h) h.style.display='none'; if(contentGrid()) contentGrid().style.display='grid'; if(policy()) policy().style.display=''; if(th) th.style.display='block'; try{sessionStorage.removeItem(REQUEST_KEY)}catch{}; setTimeout(()=>th?.scrollIntoView({behavior:'smooth',block:'start'}),60)
  }

  function requested(){let r='';try{r=sessionStorage.getItem(REQUEST_KEY)||''}catch{};if(TOOLS[r]){openTool(r);return true}return false}
  function render(){if(busy||!isBattleLab())return;busy=true;try{installStyles();if(!tabs()||!stats())return;ensureHub();if(current==='hub'){if(!requested())showHub()}else openTool(current)}finally{busy=false}}

  const obs=new MutationObserver(()=>requestAnimationFrame(render));obs.observe(document.documentElement,{subtree:true,childList:true})
  document.addEventListener('click',e=>{const b=e.target?.closest?.('aside button');if(!b)return;const t=b.textContent||'';if(/Mystic Trials/i.test(t))setTimeout(()=>openTool('mystic'),140);else if(/Battle Lab/i.test(t))setTimeout(showHub,140)},true)
  window.addEventListener('hashchange',()=>{current='hub';setTimeout(render,180)});setTimeout(render,450)
})()
