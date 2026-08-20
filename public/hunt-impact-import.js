(() => {
  const MODAL_ID='k846-hunt-impact-import'
  const TESSERACT_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const TYPES=[['infantry','Infantry'],['cavalry','Cavalry'],['archers','Archers']]
  const num=v=>{const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:''}
  const loadT=()=>window.Tesseract?Promise.resolve(window.Tesseract):(window.__k846TesseractPromise||(window.__k846TesseractPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src=TESSERACT_SRC;s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Reader failed to load'));s.onerror=()=>rej(new Error('Reader failed to load'));document.head.appendChild(s)})))
  const norm=t=>String(t||'').replace(/[‐‑–—]/g,'-').replace(/\r/g,'').replace(/[|¦]/g,'I')
  const allNums=line=>(String(line||'').match(/[0-9][0-9,]*(?:\.[0-9]+)?/g)||[]).map(num).filter(v=>v!=='')

  function largeCounts(text){
    const raw=String(text||'')
    const comma=(raw.match(/\d{1,3},\d{3}/g)||[]).map(num).filter(v=>v>=10000&&v<=5000000)
    if(comma.length>=3)return comma
    return (raw.match(/[0-9][0-9,]{4,}/g)||[]).map(num).filter(v=>v>=10000&&v<=5000000)
  }

  function inferCounts(text){
    const vals=largeCounts(text)
    if(vals.length<3)return null

    // Kingshot Troop Power Comparison row:
    // INF, CAV, ARC are the first three troop-card counts; three gear counts follow.
    // Example: 566,244 531,248 281,118 250,000 250,000 250,000.
    for(let i=0;i<=vals.length-6;i++){
      const trio=vals.slice(i,i+3),gear=vals.slice(i+3,i+6)
      const troopSpread=Math.max(...trio)-Math.min(...trio)
      const gearSpread=Math.max(...gear)-Math.min(...gear)
      if(trio.every(v=>v>=50000)&&troopSpread>=10000&&gear.every(v=>v>=50000)&&gearSpread<=Math.max(2500,Math.max(...gear)*.02)){
        return{infantry:trio[0],cavalry:trio[1],archers:trio[2],capacity:trio[0]+trio[1]+trio[2]}
      }
    }

    // If OCR only catches the three troop counts, use the first plausible distinct trio.
    for(let i=0;i<=vals.length-3;i++){
      const trio=vals.slice(i,i+3),spread=Math.max(...trio)-Math.min(...trio)
      if(trio.every(v=>v>=50000)&&spread>=10000&&new Set(trio).size>=2){
        return{infantry:trio[0],cavalry:trio[1],archers:trio[2],capacity:trio[0]+trio[1]+trio[2]}
      }
    }
    return null
  }

  function parse(text){
    const raw=norm(text),lines=raw.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)
    const out={stats:{infantry:{attack:'',lethality:''},cavalry:{attack:'',lethality:''},archers:{attack:'',lethality:''}},troopCounts:{infantry:'',cavalry:'',archers:''},capacity:'',raw}
    const aliases={infantry:['infantry','inf'],cavalry:['cavalry','cav'],archers:['archer','archers','archery','arc']}
    for(const [k] of TYPES){
      for(const stat of ['attack','lethality']){
        for(const line of lines){
          const l=line.toLowerCase();if(!aliases[k].some(a=>l.includes(a)))continue
          if(stat==='attack'&&!/(attack|atk)/i.test(l))continue
          if(stat==='lethality'&&!/(lethality|lethal|\blet\b)/i.test(l))continue
          const ns=allNums(line);if(ns.length){out.stats[k][stat]=ns[ns.length-1];break}
        }
      }
      for(let i=0;i<lines.length;i++){
        const l=lines[i].toLowerCase();if(!aliases[k].some(a=>l.includes(a)))continue
        if(/attack|lethality|defen|health|bonus|damage/i.test(l))continue
        for(let j=0;j<3;j++){const v=allNums(lines[i+j]||'').find(x=>x>=10000);if(v){out.troopCounts[k]=v;break}}
        if(out.troopCounts[k])break
      }
    }
    for(const re of [/rall[yli]\s*(?:capacity|size)[^0-9]{0,35}([0-9][0-9,]{4,})/i,/march\s*(?:capacity|size)[^0-9]{0,35}([0-9][0-9,]{4,})/i,/(?:total\s*)?(?:troops?|deployed)[^0-9]{0,25}([0-9][0-9,]{5,})/i]){const m=raw.match(re);if(m){out.capacity=num(m[1]);break}}
    const inferred=inferCounts(raw)
    if(inferred){for(const [k] of TYPES)if(!out.troopCounts[k])out.troopCounts[k]=inferred[k];if(!out.capacity)out.capacity=inferred.capacity}
    const known=TYPES.map(([k])=>Number(out.troopCounts[k])||0)
    if(!out.capacity&&known.every(Boolean))out.capacity=known.reduce((a,b)=>a+b,0)
    const vals=TYPES.map(([k])=>Number(out.troopCounts[k])||0),present=vals.filter(Boolean)
    if(out.capacity&&present.length===2){const miss=TYPES.find(([k])=>!out.troopCounts[k]);const rem=Number(out.capacity)-present.reduce((a,b)=>a+b,0);if(miss&&rem>=10000)out.troopCounts[miss[0]]=rem}
    return out
  }

  async function enhance(file){const u=URL.createObjectURL(file);try{const img=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=u});const c=document.createElement('canvas'),s=Math.min(2.4,2400/Math.max(1,img.naturalWidth));c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const g=d.data[i]*.299+d.data[i+1]*.587+d.data[i+2]*.114,q=g>145?Math.min(255,g*1.22+22):Math.max(0,g*.72-12);d.data[i]=d.data[i+1]=d.data[i+2]=q}x.putImageData(d,0,0);return c}finally{URL.revokeObjectURL(u)}}
  const pOpts=()=>'<option value="">Select</option>'+Array.from({length:15},(_,i)=>`<option>${i+1}</option>`).join('')
  const tpl=()=>`<div class="hi-backdrop" data-a="close"></div><section class="hi-dialog"><header><div><div class="eye">HUNT IMPACT · BATTLE REPORT</div><h2>Upload Battle Report</h2><p>Report values auto-fill. You only select Participants, Troop Tier and True Gold.</p></div><button data-a="close">×</button></header><div class="body"><input id="hi-file" type="file" accept="image/*" hidden><div class="drop" data-a="choose"><b>Choose Battle Report screenshot</b><span>PNG, JPG or WEBP</span></div><div class="preview" hidden><img><div><b class="name"></b><span class="meta"></span></div></div><div class="status"></div><div class="values" hidden><div class="note">AUTO FROM REPORT: Rally Capacity, Attack, Lethality and all troop counts.</div><div class="grid"><label>Rally Capacity <em>AUTO</em><input data-f="capacity" readonly></label><label>Participants <em>SELECT</em><select data-f="participants">${pOpts()}</select></label><label>Troop Tier <em>SELECT</em><select data-f="tier"><option value="">Select</option><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></select></label><label>True Gold <em>SELECT</em><select data-f="tg"><option value="">Select</option>${Array.from({length:9},(_,i)=>`<option value="${i}">TG${i}</option>`).join('')}</select></label></div>${TYPES.map(([k,l])=>`<div class="card"><b>${l}</b><label>Attack % <em>AUTO</em><input data-f="stats.${k}.attack" readonly></label><label>Lethality % <em>AUTO</em><input data-f="stats.${k}.lethality" readonly></label><label>Troops <em>AUTO</em><input data-f="troopCounts.${k}" readonly></label></div>`).join('')}</div></div><footer><button data-a="close">Cancel</button><button class="apply" data-a="apply" disabled>Apply to Hunt Impact</button></footer></section>`
  function style(){if(document.getElementById('hi-style-v2'))return;const s=document.createElement('style');s.id='hi-style-v2';s.textContent=`#${MODAL_ID}{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:10px;font-family:Montserrat,system-ui}#${MODAL_ID} .hi-backdrop{position:absolute;inset:0;background:rgba(2,8,20,.9)}#${MODAL_ID} .hi-dialog{position:relative;width:min(760px,100%);max-height:94vh;overflow:hidden;border:1px solid #6d5a24;border-radius:20px;background:#08172a;color:#f1e7ce}#${MODAL_ID} header{display:flex;justify-content:space-between;padding:18px;border-bottom:1px solid #3a321c}#${MODAL_ID} header button{background:none;border:0;color:#fff;font-size:28px}#${MODAL_ID} .eye,#${MODAL_ID} em{color:#d4af37;font-style:normal;font-size:10px}#${MODAL_ID} h2{margin:4px 0;font-family:Cinzel,serif}#${MODAL_ID} p{margin:0;color:#a9a9a9;font-size:11px}#${MODAL_ID} .body{padding:16px;max-height:72vh;overflow:auto}#${MODAL_ID} .drop{min-height:150px;display:grid;place-items:center;border:1px dashed #8d742b;border-radius:15px;cursor:pointer;text-align:center}#${MODAL_ID} .drop span{display:block;color:#777;font-size:10px}#${MODAL_ID} .preview{display:flex;gap:12px;align-items:center}#${MODAL_ID} .preview[hidden]{display:none}#${MODAL_ID} .preview img{width:90px;height:70px;object-fit:cover;border-radius:10px}#${MODAL_ID} .status{margin:10px 0;color:#c8c0a6;font-size:11px}#${MODAL_ID} .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}#${MODAL_ID} .card{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;padding:12px;border:1px solid #302b1d;border-radius:12px}#${MODAL_ID} .card>b{grid-column:1/-1}#${MODAL_ID} label{display:block;font-size:10px;color:#9c978a}#${MODAL_ID} input,#${MODAL_ID} select{box-sizing:border-box;width:100%;margin-top:5px;padding:10px;border:1px solid #43391f;border-radius:9px;background:#06111f;color:#f1e7ce}#${MODAL_ID} input[readonly]{opacity:.9}#${MODAL_ID} footer{display:flex;justify-content:flex-end;gap:8px;padding:14px;border-top:1px solid #3a321c}#${MODAL_ID} footer button{padding:10px 14px;border-radius:10px}.apply{background:linear-gradient(#d4af37,#ad8620);color:#071224;font-weight:900}.apply:disabled{opacity:.35}@media(max-width:640px){#${MODAL_ID}{align-items:end}#${MODAL_ID} .card{grid-template-columns:1fr 1fr}#${MODAL_ID} .card label:last-child{grid-column:1/-1}}`;document.head.appendChild(s)}
  const set=(r,p,v)=>{const e=r.querySelector(`[data-f="${p}"]`);if(e)e.value=v??''},get=(r,p)=>r.querySelector(`[data-f="${p}"]`)?.value??''
  function ready(root,btn,status){const miss=['capacity',...TYPES.flatMap(([k])=>[`stats.${k}.attack`,`stats.${k}.lethality`,`troopCounts.${k}`])].filter(p=>!Number(get(root,p)));const sel=['participants','tier','tg'].filter(p=>get(root,p)==='');btn.disabled=!!(miss.length||sel.length);status.textContent=miss.length?`Could not auto-fill ${miss.length} report value${miss.length>1?'s':''}. Upload a full, clear battle report screenshot.`:sel.length?'Report auto-fill complete. Select Participants, Troop Tier and True Gold.':'Ready to apply.'}
  function open(){document.getElementById(MODAL_ID)?.remove();style();const root=document.createElement('div');root.id=MODAL_ID;root.innerHTML=tpl();document.body.appendChild(root);document.body.style.overflow='hidden';const file=root.querySelector('#hi-file'),drop=root.querySelector('.drop'),preview=root.querySelector('.preview'),status=root.querySelector('.status'),values=root.querySelector('.values'),apply=root.querySelector('.apply');let chosen,url='';const close=()=>{if(url)URL.revokeObjectURL(url);root.remove();document.body.style.overflow=''};async function read(){status.textContent='Reading report and autofilling…';try{const T=await loadT(),a=await T.recognize(chosen,'eng');let p=parse(a?.data?.text||'');try{const c=await enhance(chosen),b=await T.recognize(c,'eng'),q=parse(b?.data?.text||'');for(const [k] of TYPES){p.stats[k].attack=p.stats[k].attack||q.stats[k].attack;p.stats[k].lethality=p.stats[k].lethality||q.stats[k].lethality;p.troopCounts[k]=p.troopCounts[k]||q.troopCounts[k]}p.capacity=p.capacity||q.capacity;if((!p.capacity||TYPES.some(([k])=>!p.troopCounts[k]))){const z=inferCounts(`${p.raw}\n${q.raw}`);if(z){for(const [k] of TYPES)p.troopCounts[k]=p.troopCounts[k]||z[k];p.capacity=p.capacity||z.capacity}}}catch{}set(root,'capacity',p.capacity);for(const [k] of TYPES){set(root,`stats.${k}.attack`,p.stats[k].attack);set(root,`stats.${k}.lethality`,p.stats[k].lethality);set(root,`troopCounts.${k}`,p.troopCounts[k])}values.hidden=false;ready(root,apply,status)}catch(e){status.textContent=e.message||'Could not read report.'}}
    root.addEventListener('change',()=>!values.hidden&&ready(root,apply,status));root.addEventListener('click',e=>{const a=e.target.closest('[data-a]')?.dataset.a;if(a==='close')return close();if(a==='choose')return file.click();if(a==='apply'){ready(root,apply,status);if(apply.disabled)return;const d={source:'hunt-impact',stats:{},troopCounts:{},capacity:num(get(root,'capacity')),participants:num(get(root,'participants')),tier:get(root,'tier'),tg:num(get(root,'tg'))};for(const [k] of TYPES){d.stats[k]={attack:num(get(root,`stats.${k}.attack`)),lethality:num(get(root,`stats.${k}.lethality`))};d.troopCounts[k]=num(get(root,`troopCounts.${k}`))}window.dispatchEvent(new CustomEvent('k846:report-applied',{detail:d}));close()}});file.addEventListener('change',()=>{chosen=file.files?.[0];if(!chosen)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(chosen);preview.querySelector('img').src=url;preview.querySelector('.name').textContent=chosen.name;preview.querySelector('.meta').textContent=`${(chosen.size/1024/1024).toFixed(2)} MB`;drop.hidden=true;preview.hidden=false;values.hidden=true;apply.disabled=true;read()})}
  window.__k846HuntImpactImport={open,parseBattleReport:parse}
})()
