(() => {
  const SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim()
  const load=()=>window.html2canvas?Promise.resolve(window.html2canvas):(window.__k846Html2Canvas||(window.__k846Html2Canvas=new Promise((res,rej)=>{const s=document.createElement('script');s.src=SRC;s.onload=()=>window.html2canvas?res(window.html2canvas):rej(new Error('Image renderer failed to load'));s.onerror=()=>rej(new Error('Image renderer failed to load'));document.head.appendChild(s)})))
  const byHeading=text=>{const h=[...document.querySelectorAll('h2,h3')].find(x=>clean(x.textContent).toLowerCase()===text.toLowerCase());return h?.closest('section')||null}
  const isMobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.maxTouchPoints>1
  const toast=msg=>{let t=document.getElementById('k846-share-toast');if(!t){t=document.createElement('div');t.id='k846-share-toast';Object.assign(t.style,{position:'fixed',left:'50%',bottom:'28px',transform:'translateX(-50%)',zIndex:'2147483647',background:'#07101e',color:'#f0d36b',border:'1px solid #8b6d24',borderRadius:'10px',padding:'12px 18px',font:'600 13px Montserrat,Arial',boxShadow:'0 10px 30px #0008'});document.body.appendChild(t)}t.textContent=msg;t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',4200)}
  const download=(blob,filename)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
  async function deliver(blob,filename,title){
    const file=new File([blob],filename,{type:'image/png'})
    if(isMobile()&&navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({title,text:title,files:[file]});return
    }
    if(navigator.clipboard&&window.ClipboardItem){
      try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('Dashboard image copied. In Discord press Ctrl+V to paste it.');return}catch(_){ }
    }
    download(blob,filename);toast('Image downloaded. Drag the PNG into Discord to send it.')
  }
  async function renderPanel(panel,filename,title,button){
    if(!panel||!button)return
    const old=button.textContent;button.disabled=true;button.textContent='Building Image…'
    try{
      const h=await load();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
      const canvas=await h(panel,{backgroundColor:'#06101e',scale:1.25,useCORS:true,logging:false,removeContainer:true,ignoreElements:el=>el.matches?.('.k846-share-row,[data-k846-share],button')})
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png',.94));if(!blob)throw new Error('Could not build image')
      await deliver(blob,filename,title)
    }catch(e){if(e?.name!=='AbortError'){console.error('Visual share failed',e);toast('Could not share the image. Please try again.')}}finally{button.disabled=false;button.textContent=old}
  }
  document.addEventListener('click',e=>{
    const formation=e.target.closest('[data-k846-share="formation"]')
    if(formation){e.preventDefault();e.stopImmediatePropagation();return renderPanel(byHeading('Optimal Troop Split'),'Kingdom846-Hunt-Formation.png','Kingdom846 Hunt Formation',formation)}
    const row=e.target.closest('[data-k846-share="dashboard"]')
    if(row){const button=e.target.closest('button');if(!button||!/share dashboard/i.test(clean(button.textContent)))return;e.preventDefault();e.stopImmediatePropagation();return renderPanel(byHeading('Damage Analytics Dashboard'),'Kingdom846-Hunt-Impact-Dashboard.png','Kingdom846 Hunt Impact Dashboard',button)}
  },true)
})()
