(() => {
  const SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim()
  const load=()=>window.html2canvas?Promise.resolve(window.html2canvas):(window.__k846Html2Canvas||(window.__k846Html2Canvas=new Promise((res,rej)=>{const s=document.createElement('script');s.src=SRC;s.onload=()=>window.html2canvas?res(window.html2canvas):rej(new Error('Image renderer failed to load'));s.onerror=()=>rej(new Error('Image renderer failed to load'));document.head.appendChild(s)})))
  const byHeading=text=>{const h=[...document.querySelectorAll('h2,h3')].find(x=>clean(x.textContent).toLowerCase()===text.toLowerCase());return h?.closest('section')||null}
  const toast=msg=>{let t=document.getElementById('k846-share-toast');if(!t){t=document.createElement('div');t.id='k846-share-toast';Object.assign(t.style,{position:'fixed',left:'50%',bottom:'28px',transform:'translateX(-50%)',zIndex:'2147483647',background:'#07101e',color:'#f0d36b',border:'1px solid #8b6d24',borderRadius:'10px',padding:'12px 18px',font:'600 13px Montserrat,Arial',boxShadow:'0 10px 30px #0008'});document.body.appendChild(t)}t.textContent=msg;t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',4200)}
  const download=(blob,filename)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
  function relabel(){
    const formation=document.querySelector('[data-k846-share="formation"]')
    if(formation&&clean(formation.textContent)!=='Download Formation Image')formation.textContent='Download Formation Image'
    const row=document.querySelector('[data-k846-share="dashboard"]')
    if(row){const b=[...row.querySelectorAll('button')].find(x=>/share dashboard|download dashboard/i.test(clean(x.textContent)));if(b&&clean(b.textContent)!=='Download Dashboard Image')b.textContent='Download Dashboard Image'}
  }
  let tries=0;const timer=setInterval(()=>{relabel();if(++tries>=20)clearInterval(timer)},500);relabel()
  async function renderDownload(panel,filename,button){
    if(!panel||!button)return
    const old=button.textContent;button.disabled=true;button.textContent='Preparing PNG…'
    try{const h=await load();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const canvas=await h(panel,{backgroundColor:'#06101e',scale:1.25,useCORS:true,logging:false,removeContainer:true,ignoreElements:el=>el.matches?.('.k846-share-row,[data-k846-share],button')});const blob=await new Promise(r=>canvas.toBlob(r,'image/png',.94));if(!blob)throw new Error('Could not build image');download(blob,filename);toast('PNG downloaded. You can drag it into Discord.')}catch(e){console.error('Visual download failed',e);toast('Could not create the PNG. Please try again.')}finally{button.disabled=false;button.textContent=old;relabel()}
  }
  document.addEventListener('click',e=>{
    const formation=e.target.closest('[data-k846-share="formation"]')
    if(formation){e.preventDefault();e.stopImmediatePropagation();return renderDownload(byHeading('Optimal Troop Split'),'Kingdom846-Hunt-Formation.png',formation)}
    const row=e.target.closest('[data-k846-share="dashboard"]')
    if(row){const button=e.target.closest('button');if(!button||!/download dashboard|share dashboard/i.test(clean(button.textContent)))return;e.preventDefault();e.stopImmediatePropagation();return renderDownload(byHeading('Damage Analytics Dashboard'),'Kingdom846-Hunt-Impact-Dashboard.png',button)}
  },true)
})()
