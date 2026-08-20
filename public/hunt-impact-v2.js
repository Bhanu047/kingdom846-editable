(() => {
  const PANEL_ID = 'k846-hunt-impact-v2'
  const STYLE_ID = 'k846-hunt-impact-v2-style'
  const REPORT_KEY = 'kingdom846.battleLab.lastReport.v1'
  const SIMULATIONS = 10000
  const INTERNAL_VARIANCE = 0.105
  const TIER_MULT = { T1:.68,T2:.72,T3:.76,T4:.80,T5:.84,T6:.88,T7:.92,T8:.96,T9:1,T10:1.05,T11:1.10,TG1:1.12,TG2:1.14,TG3:1.16,TG4:1.18,TG5:1.20,TG6:1.22,TG7:1.24,TG8:1.26 }
  const WEIGHTS = { infantry:.95,cavalry:1.02,archers:1.10 }
  const DAMAGE_SCALE = 3.62
  const HEROES = ['None','Charles','Ava','Wee & Woo','Triton','Sophia','Yang','Long Fei','Thrud','Vivian','Alcar','Margot','Rosa','Eric','Petra','Jaeger','Zoe','Hilde','Marlin','Helga','Amadeus','Jabel','Saul','Howard','Gordon','Quinn','Chenko','Diana','Amane','Yeonwoo','Fahd','Forrest','Seth','Edwin','Olive']
  const LEAD_DEFAULTS = { infantry:'Zoe', cavalry:'Petra', archers:'Marlin' }

  function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
  function fmtM(v){return `${(v/1e6).toFixed(2)}M`}
  function normalRandom(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function heroOptions(selected){return HEROES.filter(h=>h!=='None').map(h=>`<option ${h===selected?'selected':''}>${h}</option>`).join('')}
  function joinerOptions(){return HEROES.map(h=>`<option>${h}</option>`).join('')}

  function styles(){
    if(document.getElementById(STYLE_ID))return
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      #${PANEL_ID}{margin-top:18px;color:#f1e7ce;font-family:Montserrat,system-ui,sans-serif}#${PANEL_ID} *{box-sizing:border-box}
      #${PANEL_ID} .hi-shell{border:1px solid rgba(212,175,55,.18);border-radius:22px;background:linear-gradient(145deg,rgba(15,29,52,.96),rgba(6,17,33,.98));overflow:hidden}
      #${PANEL_ID} .hi-head{padding:20px;border-bottom:1px solid rgba(212,175,55,.12)}#${PANEL_ID} .hi-kicker{font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:rgba(232,199,102,.62)}
      #${PANEL_ID} h3{margin:4px 0 5px;font-family:Cinzel,serif;font-size:23px;color:#f3dfaa}#${PANEL_ID} .hi-sub{margin:0;font-size:11px;line-height:1.55;color:rgba(241,231,206,.48)}#${PANEL_ID} .hi-body{padding:18px}
      #${PANEL_ID} .hi-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}#${PANEL_ID} button{border:1px solid rgba(212,175,55,.20);border-radius:10px;background:rgba(255,255,255,.035);color:#ead89f;padding:9px 12px;font-size:10px;font-weight:800}#${PANEL_ID} button.primary{background:linear-gradient(180deg,#e5c24c,#a77b12);color:#071224}
      #${PANEL_ID} .hi-grid{display:grid;gap:10px}#${PANEL_ID} .hi-troop,#${PANEL_ID} .hi-joiners,#${PANEL_ID} .hi-march{border:1px solid rgba(212,175,55,.10);border-radius:16px;background:rgba(255,255,255,.022);padding:13px}
      #${PANEL_ID} .hi-troop-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-family:Cinzel,serif;font-size:13px;font-weight:800;color:#f0d894}
      #${PANEL_ID} .hi-fields,#${PANEL_ID} .hi-joiner-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#${PANEL_ID} label span{display:block;margin-bottom:4px;font-size:8px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;color:rgba(241,231,206,.35)}
      #${PANEL_ID} input,#${PANEL_ID} select{width:100%;border:1px solid rgba(212,175,55,.15);border-radius:9px;background:#091427;color:#f1e7ce;padding:9px 10px;font-size:12px;font-weight:700;outline:none}#${PANEL_ID} input[readonly]{opacity:.7}
      #${PANEL_ID} .hi-global{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.hi-march b{font:700 18px JetBrains Mono,monospace;color:#f0cd69}.hi-march small{display:block;color:rgba(241,231,206,.4);font-size:9px;margin-top:3px}
      #${PANEL_ID} .hi-joiners{margin-top:10px}#${PANEL_ID} .hi-results{margin-top:16px;display:none}#${PANEL_ID} .hi-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#${PANEL_ID} .hi-metric{border:1px solid rgba(212,175,55,.12);border-radius:14px;background:rgba(255,255,255,.025);padding:12px}#${PANEL_ID} .hi-metric b{display:block;font:700 18px JetBrains Mono,monospace;color:#f0cd69;margin-top:4px}#${PANEL_ID} .hi-metric small{font-size:8px;text-transform:uppercase;color:rgba(241,231,206,.32)}
      #${PANEL_ID} .hi-chart{margin-top:12px;border:1px solid rgba(212,175,55,.13);border-radius:16px;background:#071225;padding:14px}#${PANEL_ID} .hi-bars{height:170px;display:flex;align-items:end;gap:4px;padding-top:8px;border-bottom:1px solid rgba(232,199,102,.18)}#${PANEL_ID} .hi-bar{flex:1;min-width:3px;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,#f3d66a,#8c6410)}#${PANEL_ID} .hi-bar.mean{box-shadow:0 0 0 2px #f1e7ce inset}#${PANEL_ID} .hi-axis{display:flex;justify-content:space-between;margin-top:6px;font:9px JetBrains Mono,monospace;color:rgba(241,231,206,.35)}
      #${PANEL_ID} .hi-note{margin-top:10px;border:1px solid rgba(88,166,255,.12);border-radius:11px;padding:10px;font-size:9px;line-height:1.5;color:rgba(199,225,255,.48)}
      @media(max-width:640px){#${PANEL_ID} .hi-metrics{grid-template-columns:1fr}#${PANEL_ID} .hi-fields,#${PANEL_ID} .hi-joiner-grid,#${PANEL_ID} .hi-global{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s)
  }

  function findImpactSection(){const h=[...document.querySelectorAll('h1,h2,h3')].find(x=>/Impact Comparison/i.test((x.textContent||'').trim()));return h?.closest('section')||null}
  function readSharedStats(){const section=[...document.querySelectorAll('section')].find(s=>/Combat Stats/i.test(s.textContent||''));if(!section)return null;const out={};[['Infantry','infantry'],['Cavalry','cavalry'],['Archers','archers']].forEach(([label,key])=>{const card=[...section.querySelectorAll('div')].find(d=>(d.textContent||'').trim().startsWith(label)&&d.querySelectorAll('input').length>=2);if(card){const inputs=card.querySelectorAll('input');out[key]={attack:n(inputs[0]?.value),lethality:n(inputs[1]?.value)}}});return out}
  function lastReport(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null')}catch{return null}}

  function troopTemplate(key,title){return `<div class="hi-troop" data-troop="${key}"><div class="hi-troop-title"><span>${title}</span><span>${key==='archers'?'ARC':key==='cavalry'?'CAV':'INF'}</span></div><div class="hi-fields">
    <label><span>Troops from report</span><input data-f="count" type="number" min="0" step="1" value="0"></label>
    <label><span>Lead hero</span><select data-f="hero">${heroOptions(LEAD_DEFAULTS[key])}</select></label>
    <label><span>Attack %</span><input data-f="attack" type="number" min="0" step="0.1" value="0"></label>
    <label><span>Lethality %</span><input data-f="lethality" type="number" min="0" step="0.1" value="0"></label>
    <label><span>Widget ATK / LET %</span><input data-f="widget" type="number" min="0" step="0.1" value="0"></label>
  </div></div>`}

  function template(){return `<div class="hi-shell"><div class="hi-head"><div class="hi-kicker">Hunt Impact · Bear Damage Forecast</div><h3>Damage Probability Forecast</h3><p class="hi-sub">Troop counts and combat stats come from your uploaded report. Select lead heroes, widget values, troop tier and Joiner heroes, then run the forecast.</p></div><div class="hi-body">
    <div class="hi-actions"><button type="button" data-action="pull">Use Uploaded Report</button><button type="button" data-action="simulate" class="primary">Run 10,000 Hunts</button></div>
    <div class="hi-grid">${troopTemplate('infantry','Infantry')}${troopTemplate('cavalry','Cavalry')}${troopTemplate('archers','Archers')}</div>
    <div class="hi-global"><div class="hi-march"><div class="hi-kicker">March Count</div><b data-out="march">0</b><small>Auto = Infantry + Cavalry + Archers</small></div><label><span>Troop Tier</span><select data-global="tier">${Object.keys(TIER_MULT).map(t=>`<option ${t==='T10'?'selected':''}>${t}</option>`).join('')}</select></label></div>
    <div class="hi-joiners"><div class="hi-troop-title"><span>Joiner Skill Heroes</span><span>1–4</span></div><div class="hi-joiner-grid">${[1,2,3,4].map(i=>`<label><span>Joiner ${i}</span><select data-joiner="${i}">${joinerOptions()}</select></label>`).join('')}</div></div>
    <div class="hi-results"><div class="hi-metrics"><div class="hi-metric"><small>Expected Damage</small><b data-out="mean">—</b></div><div class="hi-metric"><small>Likely Range (80%)</small><b data-out="range">—</b></div><div class="hi-metric"><small>High Roll (95th)</small><b data-out="p95">—</b></div></div><div class="hi-chart"><div class="hi-kicker">Kingdom 846 Forecast · 10,000 Hunts</div><div class="hi-bars"></div><div class="hi-axis"><span data-out="axisMin">—</span><span>Damage</span><span data-out="axisMax">—</span></div></div><div class="hi-note">Battle Variance is no longer a user input. Randomness is handled internally by the simulation. Hero selectors are now part of the rally setup; verified Expedition-skill mechanics will continue to be added to the hero database as they are validated.</div></div>
  </div></div>`}

  function updateMarch(panel){let total=0;panel.querySelectorAll('[data-troop] [data-f="count"]').forEach(i=>total+=Math.max(0,n(i.value)));panel.querySelector('[data-out="march"]').textContent=Math.round(total).toLocaleString();return total}
  function pull(panel){const stats=readSharedStats()||{};const report=lastReport();['infantry','cavalry','archers'].forEach(key=>{const card=panel.querySelector(`[data-troop="${key}"]`);const s=report?.stats?.[key]||stats[key];if(s){card.querySelector('[data-f="attack"]').value=n(s.attack);card.querySelector('[data-f="lethality"]').value=n(s.lethality)}const count=report?.troopCounts?.[key];if(count!=null)card.querySelector('[data-f="count"]').value=Math.round(n(count))});updateMarch(panel);panel.querySelector('.hi-results').style.display='none'}
  function values(panel){const troops={};panel.querySelectorAll('[data-troop]').forEach(card=>{const g=f=>card.querySelector(`[data-f="${f}"]`);troops[card.dataset.troop]={count:n(g('count')?.value),attack:n(g('attack')?.value),lethality:n(g('lethality')?.value),widget:n(g('widget')?.value),hero:g('hero')?.value||''}});return {troops,tier:panel.querySelector('[data-global="tier"]')?.value||'T10',joiners:[...panel.querySelectorAll('[data-joiner]')].map(s=>s.value)}}
  function baseDamage(v){let total=0;Object.entries(v.troops).forEach(([key,t])=>{const atk=1+Math.max(0,t.attack+t.widget)/100;const letf=1+Math.max(0,t.lethality+t.widget)/100;total+=Math.max(0,t.count)*atk*letf*WEIGHTS[key]});return total*(TIER_MULT[v.tier]||1)*DAMAGE_SCALE}
  function simulate(panel){const v=values(panel);const march=updateMarch(panel);if(march<=0){alert('Upload a battle report or enter troop counts first.');return}const base=baseDamage(v);const arr=new Array(SIMULATIONS);for(let i=0;i<SIMULATIONS;i++){const z=normalRandom();const tail=Math.random()<.09?Math.abs(normalRandom())*INTERNAL_VARIANCE*.55:0;arr[i]=Math.max(0,base*(1+z*INTERNAL_VARIANCE+tail))}arr.sort((a,b)=>a-b);const mean=arr.reduce((s,x)=>s+x,0)/arr.length,q=p=>arr[Math.floor((arr.length-1)*p)],p10=q(.10),p90=q(.90),p95=q(.95);panel.querySelector('[data-out="mean"]').textContent=fmtM(mean);panel.querySelector('[data-out="range"]').textContent=`${fmtM(p10)}–${fmtM(p90)}`;panel.querySelector('[data-out="p95"]').textContent=fmtM(p95);panel.querySelector('[data-out="axisMin"]').textContent=fmtM(arr[0]);panel.querySelector('[data-out="axisMax"]').textContent=fmtM(arr[arr.length-1]);const bins=22,min=arr[0],max=arr[arr.length-1],span=Math.max(1,max-min),counts=Array(bins).fill(0);arr.forEach(x=>counts[Math.min(bins-1,Math.floor((x-min)/span*bins))]++);const maxC=Math.max(...counts,1),meanIdx=Math.min(bins-1,Math.max(0,Math.floor((mean-min)/span*bins)));panel.querySelector('.hi-bars').innerHTML=counts.map((c,i)=>`<div class="hi-bar ${i===meanIdx?'mean':''}" style="height:${Math.max(3,c/maxC*100)}%"></div>`).join('');panel.querySelector('.hi-results').style.display='block'}
  function clearResults(panel){panel.querySelector('.hi-results').style.display='none';updateMarch(panel)}
  function mount(){styles();const section=findImpactSection();if(!section){document.getElementById(PANEL_ID)?.remove();return}if(document.getElementById(PANEL_ID))return;[...section.children].forEach((child,idx)=>{if(idx>0)child.style.display='none'});const host=document.createElement('div');host.id=PANEL_ID;host.innerHTML=template();section.appendChild(host);host.querySelector('[data-action="simulate"]').addEventListener('click',()=>simulate(host));host.querySelector('[data-action="pull"]').addEventListener('click',()=>pull(host));host.addEventListener('input',()=>clearResults(host));host.addEventListener('change',()=>clearResults(host));pull(host)}

  const obs=new MutationObserver(()=>mount());obs.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('hashchange',()=>setTimeout(mount,80));window.addEventListener('k846:report-applied',()=>{const p=document.getElementById(PANEL_ID);if(p)pull(p)});document.addEventListener('DOMContentLoaded',mount);setInterval(mount,900)
})()
