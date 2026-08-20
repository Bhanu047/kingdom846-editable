(() => {
  const SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const clean=v=>{const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9]/g,''));return Number.isFinite(n)?n:0}
  const valid=n=>n>=10000&&n<=5000000
  const loadT=()=>window.Tesseract?Promise.resolve(window.Tesseract):(window.__k846TesseractPromise||(window.__k846TesseractPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src=SRC;s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Reader failed to load'));s.onerror=()=>rej(new Error('Reader failed to load'));document.head.appendChild(s)})))

  function pickTroopTrio(text){
    const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    const rows=[]
    for(const line of lines){
      const vals=(line.match(/[0-9][0-9,]{4,}/g)||[]).map(clean).filter(valid)
      if(vals.length>=3) rows.push(vals)
    }
    // In Kingshot Troop Power Comparison the first three large values on the troop row
    // are Infantry, Cavalry and Archer. Gear values come after them.
    for(const vals of rows){
      const trio=vals.slice(0,3)
      if(trio.every(valid)&&new Set(trio).size>=2)return trio
    }
    const all=(String(text||'').match(/[0-9][0-9,]{4,}/g)||[]).map(clean).filter(valid)
    if(all.length>=3){
      const trio=all.slice(0,3)
      if(new Set(trio).size>=2)return trio
    }
    return null
  }

  async function imageFromFile(file){
    const url=URL.createObjectURL(file)
    try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url})}
    finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
  }

  function cropBand(img,topFrac,heightFrac){
    const sy=Math.max(0,Math.floor(img.naturalHeight*topFrac))
    const sh=Math.min(img.naturalHeight-sy,Math.floor(img.naturalHeight*heightFrac))
    const scale=Math.min(3,2200/Math.max(1,img.naturalWidth))
    const c=document.createElement('canvas')
    c.width=Math.round(img.naturalWidth*scale)
    c.height=Math.round(sh*scale)
    const x=c.getContext('2d',{willReadFrequently:true})
    x.drawImage(img,0,sy,img.naturalWidth,sh,0,0,c.width,c.height)
    const d=x.getImageData(0,0,c.width,c.height)
    for(let i=0;i<d.data.length;i+=4){
      const g=d.data[i]*.299+d.data[i+1]*.587+d.data[i+2]*.114
      const q=g>150?255:(g<85?0:Math.max(0,Math.min(255,(g-85)*3.9)))
      d.data[i]=d.data[i+1]=d.data[i+2]=q
    }
    x.putImageData(d,0,0)
    return c
  }

  function fill(vals){
    const root=document.getElementById('k846-hunt-impact-import')
    if(!root||!vals||vals.length<3)return false
    const [inf,cav,arc]=vals.map(Number),cap=inf+cav+arc
    if(![inf,cav,arc].every(valid))return false
    const set=(p,v)=>{const el=root.querySelector(`[data-f="${p}"]`);if(el){el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}}
    set('troopCounts.infantry',inf)
    set('troopCounts.cavalry',cav)
    set('troopCounts.archers',arc)
    set('capacity',cap)
    const status=root.querySelector('.status')
    if(status)status.textContent=`AUTO: INF ${inf.toLocaleString()} + CAV ${cav.toLocaleString()} + ARC ${arc.toLocaleString()} = Rally ${cap.toLocaleString()}. Select Participants, Troop Tier and True Gold.`
    root.querySelector('[data-f="participants"]')?.dispatchEvent(new Event('change',{bubbles:true}))
    return true
  }

  async function scan(file){
    try{
      const T=await loadT(),img=await imageFromFile(file)
      // Kingshot mail report: Troop Power Comparison and the three troop counts are in the upper-middle band.
      // Try several nearby crops because screenshots from different phones include different top/bottom margins.
      const bands=[[.18,.28],[.22,.30],[.26,.28],[.12,.38]]
      for(const [top,height] of bands){
        const canvas=cropBand(img,top,height)
        const r=await T.recognize(canvas,'eng',{
          tessedit_char_whitelist:'0123456789,',
          preserve_interword_spaces:'1',
          tessedit_pageseg_mode:'6'
        })
        const vals=pickTroopTrio(r?.data?.text)
        if(vals&&fill(vals))return
      }
      // Last fallback: full image OCR, still take the first plausible trio.
      const r=await T.recognize(file,'eng')
      const vals=pickTroopTrio(r?.data?.text)
      if(vals)fill(vals)
    }catch(e){console.warn('Hunt Impact positional autofill failed',e)}
  }

  document.addEventListener('change',e=>{
    const input=e.target
    if(!(input instanceof HTMLInputElement)||input.id!=='hi-file')return
    const file=input.files?.[0]
    if(!file)return
    setTimeout(()=>scan(file),100)
  },true)
})()
