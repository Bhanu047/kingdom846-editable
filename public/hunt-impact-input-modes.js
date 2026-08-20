(() => {
  const ROOT='k846-hunt-impact-import'
  const AUTO_FIELDS=['capacity','stats.infantry.attack','stats.infantry.lethality','troopCounts.infantry','stats.cavalry.attack','stats.cavalry.lethality','troopCounts.cavalry','stats.archers.attack','stats.archers.lethality','troopCounts.archers']
  function install(root){
    if(!root||root.dataset.inputModes==='1')return
    root.dataset.inputModes='1'
    const dialog=root.querySelector('.hi-dialog'),body=root.querySelector('.body')
    if(!dialog||!body)return
    const tabs=document.createElement('div')
    tabs.className='k846-hi-mode-tabs'
    tabs.innerHTML='<button type="button" data-hi-mode="auto" class="active">▣ Auto Fill from Report</button><button type="button" data-hi-mode="manual">⌨ Manual Fill</button>'
    body.parentElement.insertBefore(tabs,body)
    const style=document.createElement('style')
    style.textContent=`#${ROOT} .k846-hi-mode-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #3a321c;background:#09192c}#${ROOT} .k846-hi-mode-tabs button{border:0;padding:14px 8px;background:transparent;color:#83827e;font-weight:800;font-size:12px}#${ROOT} .k846-hi-mode-tabs button.active{color:#f3cf50;background:#10233b;box-shadow:inset 0 -3px #d4af37}#${ROOT}.k846-manual .drop,#${ROOT}.k846-manual .preview{display:none!important}#${ROOT}.k846-manual .values{display:block!important}#${ROOT}.k846-manual input:not([type=file]){opacity:1!important}#${ROOT}.k846-manual .status{color:#d9cda8}`
    document.head.appendChild(style)
    function mode(next){
      const manual=next==='manual'
      root.classList.toggle('k846-manual',manual)
      tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.hiMode===next))
      const values=root.querySelector('.values'); if(manual&&values)values.hidden=false
      AUTO_FIELDS.forEach(p=>{const el=root.querySelector(`[data-f="${p}"]`);if(el)el.readOnly=!manual})
      root.querySelectorAll('em').forEach(e=>{if(/AUTO/i.test(e.textContent||'')||/MANUAL/i.test(e.textContent||''))e.textContent=manual?'MANUAL':'AUTO'})
      const status=root.querySelector('.status'); if(status)status.textContent=manual?'Manual Fill: enter Rally Capacity, all Attack/Lethality values and all troop counts. Participants, Tier and True Gold are still required.':'Auto Fill: upload the battle report. Rally Capacity, Attack/Lethality and all troop counts are read from the report.'
      const first=manual?root.querySelector('[data-f="capacity"]'):null; first?.focus()
      root.querySelector('[data-f="participants"]')?.dispatchEvent(new Event('change',{bubbles:true}))
    }
    tabs.addEventListener('click',e=>{const b=e.target.closest('[data-hi-mode]');if(b)mode(b.dataset.hiMode)})
    const title=root.querySelector('header h2'); if(title)title.textContent='Hunt Impact Input'
    const p=root.querySelector('header p'); if(p)p.textContent='Choose Auto Fill from Report or Manual Fill.'
    mode('auto')
  }
  const obs=new MutationObserver(()=>install(document.getElementById(ROOT)))
  obs.observe(document.documentElement,{childList:true,subtree:true})
  setTimeout(()=>install(document.getElementById(ROOT)),100)
})()
