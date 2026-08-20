(() => {
  const SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  const clean=v=>{const n=Number(String(v??'').replace(/,/g,'').replace(/[^0-9]/g,''));return Number.isFinite(n)?n:0}
  const valid=n=>n>=10000&&n<=5000000
  const loadT=()=>window.Tesseract?Promise.resolve(window.Tesseract):(window.__k846TesseractPromise||(window.__k846TesseractPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src=SRC;s.onload=()=>window.Tesseract?res(window.Tesseract):rej(new Error('Reader failed to load'));s.onerror=()=>rej(new Error('Reader failed to load'));document.head.appendChild(s)})))

  function fromLines(text){
    const lines=String(text||'').split(/\r?\n/)
    const candidates=[]
    for(const line of lines){
      const vals=(line.match(/[0-9][0-9,]{4,}/g)||[]).map(clean).filter(valid)
      if(vals.length>=3){
        const first=vals.slice(0,3)
        const spread=Math.max(...first)-Math.min(...first)
        if(spread>5000)candidates.push({vals:first,score:vals.length*10+Math.min(spread/10000,20)})
      }
    }
    candidates.sort((a,b)=>b.score-a.score)
    return candidates[0]?.vals||null
  }

  function fromWords(data){
    const words=(data?.words||[]).map(w=>({
      text:w.text||'', value:clean(w.text),
      x:(w.bbox?.x0??0), y:(w.bbox?.y0??0), y1:(w.bbox?.y1??0)
    })).filter(w=>valid(w.value))
    if(words.length<3)return null
    const groups=[]
    for(const w of words){
      const cy=(w.y+w.y1)/2
      let g=groups.find(g=>Math.abs(g.cy-cy)<=28)
      if(!g){g={cy,items:[]};groups.push(g)}
      g.items.push(w);g.cy=g.items.reduce((s,i)=>s+(i.y+i.y1)/2,0)/g.items.length
    }
    const scored=[]
    for(const g of groups){
      const items=g.items.sort((a,b)=>a.x-b.x)
      if(items.length<3)continue
      const first=items.slice(0,3).map(i=>i.value)
      const spread=Math.max(...first)-Math.min(...first)
      if(spread<5000)continue
      scored.push({vals:first,score:items.length*10+Math.min(spread/10000,20)-g.cy/10000})
    }
    scored.sort((a,b)=>b.score-a.score)
    return scored[0]?.vals||null
  }

  function fill(vals){
    const root=document.getElementById('k846-hunt-impact-import')
    if(!root||!vals||vals.length<3)return false
    const [inf,cav,arc]=vals,cap=inf+cav+arc
    const set=(p,v)=>{const el=root.querySelector(`[data-f="${p}"]`);if(el&&!Number(el.value)){el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}}
    set('troopCounts.infantry',inf)
    set('troopCounts.cavalry',cav)
    set('troopCounts.archers',arc)
    set('capacity',cap)
    const status=root.querySelector('.status')
    if(status)status.textContent=`Troops auto-filled from report: ${inf.toLocaleString()} + ${cav.toLocaleString()} + ${arc.toLocaleString()} = ${cap.toLocaleString()} rally capacity.`
    root.querySelector('[data-f="participants"]')?.dispatchEvent(new Event('change',{bubbles:true}))
    return true
  }

  async function scan(file){
    try{
      const T=await loadT()
      const r=await T.recognize(file,'eng')
      const vals=fromWords(r?.data)||fromLines(r?.data?.text)
      if(vals)fill(vals)
    }catch{}
  }

  document.addEventListener('change',e=>{
    const input=e.target
    if(!(input instanceof HTMLInputElement)||input.id!=='hi-file')return
    const file=input.files?.[0]
    if(!file)return
    setTimeout(()=>scan(file),250)
  },true)
})()
