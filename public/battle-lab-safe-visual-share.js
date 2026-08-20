(() => {
  const SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim()
  const load=()=>window.html2canvas?Promise.resolve(window.html2canvas):(window.__k846Html2Canvas||(window.__k846Html2Canvas=new Promise((res,rej)=>{const s=document.createElement('script');s.src=SRC;s.onload=()=>window.html2canvas?res(window.html2canvas):rej(new Error('Image renderer failed to load'));s.onerror=()=>rej(new Error('Image renderer failed to load'));document.head.appendChild(s)})))
  const byHeading=text=>{const h=[...document.querySelectorAll('h2,h3')].find(x=>clean(x.textContent).toLowerCase()===text.toLowerCase());return h?.closest('section')||null}

  async function renderPanel(panel,filename,title,button){
    if(!panel||!button)return
    const old=button.textContent
    button.disabled=true
    button.textContent='Building Image…'
    try{
      const h=await load()
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
      const canvas=await h(panel,{backgroundColor:'#06101e',scale:1.5,useCORS:true,logging:false,removeContainer:true,ignoreElements:el=>el.matches?.('.k846-share-row,[data-k846-share],button')})
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png',.96))
      if(!blob)throw new Error('Could not build image')
      const file=new File([blob],filename,{type:'image/png'})
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({title,text:title,files:[file]})
      }else{
        const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)
      }
    }catch(e){if(e?.name!=='AbortError')console.error('Visual share failed',e)}
    finally{button.disabled=false;button.textContent=old}
  }

  document.addEventListener('click',e=>{
    const formation=e.target.closest('[data-k846-share="formation"]')
    if(formation){
      e.preventDefault();e.stopImmediatePropagation()
      return renderPanel(byHeading('Optimal Troop Split'),'Kingdom846-Hunt-Formation.png','Kingdom846 Hunt Formation',formation)
    }
    const row=e.target.closest('[data-k846-share="dashboard"]')
    if(row){
      const button=e.target.closest('button')
      if(!button||!/share dashboard/i.test(clean(button.textContent)))return
      e.preventDefault();e.stopImmediatePropagation()
      return renderPanel(byHeading('Damage Analytics Dashboard'),'Kingdom846-Hunt-Impact-Dashboard.png','Kingdom846 Hunt Impact Dashboard',button)
    }
  },true)
})()
