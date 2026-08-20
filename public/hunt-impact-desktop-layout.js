(() => {
  const ID='k846-hunt-impact-desktop-layout-style'
  function install(){
    if(document.getElementById(ID))return
    const s=document.createElement('style')
    s.id=ID
    s.textContent=`
      #k846-hunt-impact-import .hi-dialog{
        display:flex!important;
        flex-direction:column!important;
        height:min(92vh,920px)!important;
        max-height:92vh!important;
        overflow:hidden!important;
      }
      #k846-hunt-impact-import header{
        flex:0 0 auto!important;
      }
      #k846-hunt-impact-import .k846-hi-mode-tabs{
        flex:0 0 auto!important;
      }
      #k846-hunt-impact-import .body{
        flex:1 1 auto!important;
        min-height:0!important;
        max-height:none!important;
        overflow-y:auto!important;
        overscroll-behavior:contain;
        scrollbar-gutter:stable;
        padding-bottom:20px!important;
      }
      #k846-hunt-impact-import footer{
        flex:0 0 auto!important;
        position:relative!important;
        z-index:10!important;
        background:#08172a!important;
        box-shadow:0 -12px 30px rgba(2,8,20,.48)!important;
      }
      #k846-hunt-impact-import footer button{
        min-height:46px!important;
      }
      @media (min-width: 900px){
        #k846-hunt-impact-import{padding:18px!important;align-items:center!important}
        #k846-hunt-impact-import .hi-dialog{width:min(900px,94vw)!important}
        #k846-hunt-impact-import .body{padding:18px 22px 24px!important}
        #k846-hunt-impact-import footer{padding:14px 22px!important}
      }
      @media (max-height: 760px){
        #k846-hunt-impact-import .hi-dialog{height:96vh!important;max-height:96vh!important}
        #k846-hunt-impact-import header{padding:12px 16px!important}
        #k846-hunt-impact-import .k846-hi-mode-tabs button{padding:10px 8px!important}
        #k846-hunt-impact-import .body{padding-top:12px!important;padding-bottom:14px!important}
        #k846-hunt-impact-import footer{padding:10px 14px!important}
      }
    `
    document.head.appendChild(s)
  }
  install()
  document.addEventListener('DOMContentLoaded',install)
})()
