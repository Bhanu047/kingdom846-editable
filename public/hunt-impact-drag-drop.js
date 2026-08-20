(() => {
  const ROOT = 'k846-hunt-impact-import'
  const STYLE = 'k846-hi-dnd-style'

  function ensureStyle(){
    if(document.getElementById(STYLE)) return
    const s=document.createElement('style')
    s.id=STYLE
    s.textContent=`
      #${ROOT} .drop{transition:border-color .16s ease,background .16s ease,box-shadow .16s ease,transform .16s ease}
      #${ROOT} .drop.k846-drag-active{border-color:#f3cf50!important;background:rgba(212,175,55,.10)!important;box-shadow:0 0 0 3px rgba(212,175,55,.12),0 12px 30px rgba(0,0,0,.22);transform:scale(1.006)}
      #${ROOT} .drop.k846-drag-active b{color:#f3cf50}
      #${ROOT} .drop .k846-dnd-hint{display:block;margin-top:8px;color:#b9a96c;font-size:11px;font-weight:700;letter-spacing:.04em}
    `
    document.head.appendChild(s)
  }

  function firstImageFile(dt){
    if(!dt) return null
    const files=[...(dt.files||[])]
    const direct=files.find(f=>/^image\//i.test(f.type)||/\.(png|jpe?g|webp)$/i.test(f.name||''))
    if(direct) return direct
    for(const item of [...(dt.items||[])]){
      if(item.kind==='file'){
        const f=item.getAsFile?.()
        if(f && (/^image\//i.test(f.type)||/\.(png|jpe?g|webp)$/i.test(f.name||''))) return f
      }
    }
    return null
  }

  async function imageFromUrl(dt){
    const raw=(dt?.getData?.('text/uri-list')||dt?.getData?.('text/plain')||'').split(/\r?\n/).find(x=>/^https?:\/\//i.test(x.trim()))?.trim()
    if(!raw) return null
    try{
      const res=await fetch(raw,{mode:'cors',credentials:'omit'})
      if(!res.ok) return null
      const blob=await res.blob()
      if(!/^image\//i.test(blob.type)) return null
      const ext=(blob.type.split('/')[1]||'png').replace('jpeg','jpg')
      return new File([blob],`discord-report.${ext}`,{type:blob.type,lastModified:Date.now()})
    }catch{return null}
  }

  function assignFile(input,file){
    if(!input||!file) return false
    try{
      const bag=new DataTransfer()
      bag.items.add(file)
      input.files=bag.files
      input.dispatchEvent(new Event('change',{bubbles:true}))
      return true
    }catch{
      return false
    }
  }

  function install(root){
    if(!root||root.dataset.dragDrop==='1') return
    const drop=root.querySelector('.drop')
    const input=root.querySelector('#hi-file')
    if(!drop||!input) return
    root.dataset.dragDrop='1'
    ensureStyle()

    if(!drop.querySelector('.k846-dnd-hint')){
      const hint=document.createElement('span')
      hint.className='k846-dnd-hint'
      hint.textContent='Desktop: drag & drop a report image here'
      drop.appendChild(hint)
    }

    let depth=0
    const active=on=>drop.classList.toggle('k846-drag-active',on)
    const stop=e=>{e.preventDefault();e.stopPropagation()}

    drop.addEventListener('dragenter',e=>{stop(e);depth++;active(true);if(e.dataTransfer)e.dataTransfer.dropEffect='copy'})
    drop.addEventListener('dragover',e=>{stop(e);active(true);if(e.dataTransfer)e.dataTransfer.dropEffect='copy'})
    drop.addEventListener('dragleave',e=>{stop(e);depth=Math.max(0,depth-1);if(!depth)active(false)})
    drop.addEventListener('drop',async e=>{
      stop(e);depth=0;active(false)
      const status=root.querySelector('.status')
      let file=firstImageFile(e.dataTransfer)
      if(!file){
        if(status) status.textContent='Reading dropped image…'
        file=await imageFromUrl(e.dataTransfer)
      }
      if(!file){
        if(status) status.textContent='Drop a PNG, JPG or WEBP report image. If dragging from Discord browser does not provide a file, save/open the image and drag the downloaded image.'
        return
      }
      if(!assignFile(input,file)){
        if(status) status.textContent='The browser blocked this dropped file. Use the file picker for this image.'
      }
    })
  }

  const observer=new MutationObserver(()=>install(document.getElementById(ROOT)))
  observer.observe(document.documentElement,{childList:true,subtree:true})
  document.addEventListener('DOMContentLoaded',()=>install(document.getElementById(ROOT)))
  setTimeout(()=>install(document.getElementById(ROOT)),100)
})()
