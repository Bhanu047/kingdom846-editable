(() => {
  const SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const clean=v=>{const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9]/g,''));return Number.isFinite(n)?n:0}
  const valid=n=>n>=10000&&n<=5000000
  const loadT=()=>window.Tesseract?Promise.resolve(window.Tesseract):(window.__k846TesseractPromise||(window.__k846TesseractPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src=SRC;s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Reader failed to load'));s.onerror=()=>rej(new Error('Reader failed to load'));document.head.appendChild(s)})))

  async function imageFromFile(file){
    const url=URL.createObjectURL(file)
    try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url})}
    finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
  }

  function crop(img,x0,y0,x1,y1,scale=5){
    const sx=Math.floor(img.naturalWidth*x0), sy=Math.floor(img.naturalHeight*y0)
    const sw=Math.max(1,Math.floor(img.naturalWidth*(x1-x0))), sh=Math.max(1,Math.floor(img.naturalHeight*(y1-y0)))
    const c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale)
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height)
    const d=ctx.getImageData(0,0,c.width,c.height)
    for(let i=0;i<d.data.length;i+=4){const g=d.data[i]*.299+d.data[i+1]*.587+d.data[i+2]*.114;const q=g>145?255:g<70?0:Math.max(0,Math.min(255,(g-70)*3.4));d.data[i]=d.data[i+1]=d.data[i+2]=q}
    ctx.putImageData(d,0,0);return c
  }

  async function readNumber(T,canvas){
    const r=await T.recognize(canvas,'eng',{tessedit_char_whitelist:'0123456789,',tessedit_pageseg_mode:'7'})
    const raw=String(r?.data?.text||'')
    const hits=(raw.match(/\d{1,3}(?:,?\d{3})+/g)||[]).map(clean).filter(valid)
    return hits[0]||0
  }

  async function readFixedTroopRow(T,img){
    const layouts=[
      {y0:.382,y1:.406,x:[[.045,.173],[.181,.309],[.318,.446]]},
      {y0:.374,y1:.414,x:[[.035,.180],[.175,.320],[.310,.455]]},
      {y0:.365,y1:.420,x:[[.025,.185],[.165,.325],[.305,.465]]}
    ]
    for(const l of layouts){
      const vals=[]
      for(const [x0,x1] of l.x) vals.push(await readNumber(T,crop(img,x0,l.y0,x1,l.y1)))
      if(vals.every(valid)) return vals
    }
    return null
  }

  function extractCounts(text){
    const raw=String(text||'')
    const comma=(raw.match(/\d{1,3},\d{3}/g)||[]).map(clean).filter(valid)
    if(comma.length>=3)return comma.slice(0,3)
    const nums=(raw.match(/[0-9][0-9,]{4,}/g)||[]).map(clean).filter(valid)
    return nums.length>=3?nums.slice(0,3):null
  }

  function setField(root,p,v){
    const el=root?.querySelector(`[data-f="${p}"]`)
    if(!el)return false
    const value=String(v)
    const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set
    if(setter) setter.call(el,value); else el.value=value
    el.dispatchEvent(new Event('input',{bubbles:true}))
    el.dispatchEvent(new Event('change',{bubbles:true}))
    return true
  }

  function fill(vals,reason='AUTO'){
    const root=document.getElementById('k846-hunt-impact-import')
    if(!root||!vals||!vals.every(valid))return false
    const [inf,cav,arc]=vals.map(Number),cap=inf+cav+arc
    setField(root,'troopCounts.infantry',inf)
    setField(root,'troopCounts.cavalry',cav)
    setField(root,'troopCounts.archers',arc)
    setField(root,'capacity',cap)
    const status=root.querySelector('.status')
    if(status)status.textContent=`${reason}: INF ${inf.toLocaleString()} · CAV ${cav.toLocaleString()} · ARC ${arc.toLocaleString()} · Rally ${cap.toLocaleString()}. Select Participants, Troop Tier and True Gold.`
    root.querySelector('[data-f="participants"]')?.dispatchEvent(new Event('change',{bubbles:true}))
    return true
  }

  function keepApplied(vals){
    // The main importer performs a slower full-image OCR pass. Older code can finish later
    // and write blank troop values. Re-apply the verified report troop counts after those passes.
    [0,700,1800,3500,6500,10000].forEach((ms,i)=>setTimeout(()=>fill(vals,i?'AUTO VERIFIED':'AUTO'),ms))
  }

  async function scan(file){
    try{
      const T=await loadT(),img=await imageFromFile(file)
      let vals=await readFixedTroopRow(T,img)
      if(!vals){const r=await T.recognize(file,'eng');vals=extractCounts(r?.data?.text)}
      if(vals){window.__k846LastTroopAutofill=vals.slice();keepApplied(vals)}
    }catch(e){console.warn('Hunt Impact troop autofill failed',e)}
  }

  document.addEventListener('change',e=>{
    const input=e.target
    if(!(input instanceof HTMLInputElement)||input.id!=='hi-file')return
    const file=input.files?.[0];if(!file)return
    setTimeout(()=>scan(file),50)
  },true)
})()
