import { useEffect, useRef, useState } from 'react'

function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.18
  master.connect(ctx.destination)
  const cue = (f, s, e, g, type='sine') => {
    const o = ctx.createOscillator(); const v = ctx.createGain()
    o.type = type; o.frequency.setValueAtTime(f, now + s)
    v.gain.setValueAtTime(.0001, now + s)
    v.gain.exponentialRampToValueAtTime(g, now + s + .04)
    v.gain.exponentialRampToValueAtTime(.001, now + e)
    o.connect(v); v.connect(master); o.start(now + s); o.stop(now + e + .05)
  }
  cue(48,0,1.35,.28)
  cue(196,.08,.58,.035,'triangle')
  cue(293.66,.18,.74,.04,'triangle')
  cue(392,.30,.92,.045,'triangle')
  cue(523.25,.46,1.12,.04,'sine')
}

const sparks = Array.from({length:24},(_,i)=>({
  left:`${(i*37+9)%100}%`, delay:`${(i*.31)%8}s`, dur:`${7+(i%6)}s`, size:`${1+(i%3)}px`
}))

export default function SplashScreen({ onEnter }) {
  const [opening,setOpening] = useState(false)
  const audioRef = useRef(null)

  useEffect(()=>{
    document.body.style.overflow='hidden'
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) audioRef.current = new AudioCtx()
    return ()=>{ document.body.style.overflow=''; try{audioRef.current?.close()}catch{} }
  },[])

  function enter(){
    if(opening) return
    const ctx = audioRef.current
    if(ctx){
      if(ctx.state==='suspended') ctx.resume().then(()=>playEnterSound(ctx)).catch(()=>{})
      else playEnterSound(ctx)
    }
    setOpening(true)
    setTimeout(()=>{document.body.style.overflow=''; onEnter?.()},1350)
  }

  return (
    <section className={`royal-gate ${opening?'opening':''}`}>
      <img className="gate-bg" src="/assets/splash-castle-bg.png" alt="" loading="eager" />
      <div className="sky-glow" />
      <div className="gate-vignette" />
      <div className="marble-floor" />
      <div className="blue-runner"><span /></div>

      <div className="side-arch left"/><div className="side-arch right"/>
      <div className="braziers left"><i/><b/></div><div className="braziers right"><i/><b/></div>

      <div className="spark-layer" aria-hidden="true">
        {sparks.map((s,i)=><i key={i} style={{left:s.left,animationDelay:s.delay,animationDuration:s.dur,width:s.size,height:s.size}}/>)}
      </div>

      <div className="lux-frame" aria-hidden="true">
        <span className="gem tl"/><span className="gem tr"/><span className="gem bl"/><span className="gem br"/>
      </div>

      <main className="gate-content">
        <div className="crest-zone">
          <div className="halo h1"/><div className="halo h2"/><div className="halo h3"/>
          <div className="crest-border outer"/><div className="crest-border inner"/>
          <span className="crest-jewel jt"/><span className="crest-jewel jr"/><span className="crest-jewel jb"/><span className="crest-jewel jl"/>
          <img className="real-crest" src="/assets/crest-846.png?v=luxury-v2" alt="Kingdom 846 Royal Crest" loading="eager" />
        </div>

        <div className="motto">ONE CROWN <em>◆</em> FOUR ALLIANCES <em>◆</em> ONE KINGDOM</div>
        <h1>KINGDOM 846</h1>
        <div className="divider"><span/><b>◆</b><span/></div>
        <p>WHERE LEGENDS ARE FORGED IN FIRE<br className="mobile-break"/> AND CROWNED IN GOLD</p>

        <button className="realm-button" onClick={enter} disabled={opening}>
          <span className="corner c1"/><span className="corner c2"/><span className="corner c3"/><span className="corner c4"/>
          <b>ENTER THE REALM</b>
        </button>

        <div className="footer-mark">OFFICIAL ROYAL PORTAL <span>◆</span> KINGDOM 846</div>
      </main>
      <div className="portal-flash" />

      <style>{`
        .royal-gate{position:fixed;inset:0;z-index:100;overflow:hidden;background:#02040a;color:#ecd07a;display:grid;place-items:center;isolation:isolate;font-family:Cinzel,Georgia,serif}
        .gate-bg{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;object-position:center 44%;z-index:-10;filter:brightness(.58) saturate(.88) contrast(1.08);animation:bgFloat 18s ease-in-out infinite alternate}
        .sky-glow{position:absolute;inset:0;z-index:-9;background:radial-gradient(circle at 50% 16%,rgba(255,223,139,.34),rgba(211,151,40,.12) 22%,transparent 48%),linear-gradient(180deg,rgba(2,4,9,.04),rgba(2,4,9,.35) 58%,rgba(2,4,9,.9));mix-blend-mode:screen}
        .gate-vignette{position:absolute;inset:0;z-index:-8;background:linear-gradient(90deg,rgba(0,0,0,.76),transparent 20%,transparent 80%,rgba(0,0,0,.76));box-shadow:inset 0 0 200px 55px rgba(0,0,0,.9)}
        .marble-floor{position:absolute;left:-8%;right:-8%;bottom:-8%;height:42%;z-index:-6;transform:perspective(800px) rotateX(67deg);transform-origin:bottom;background:linear-gradient(180deg,rgba(8,11,19,.05),rgba(2,4,10,.92)),repeating-linear-gradient(90deg,rgba(229,184,72,.04) 0 1px,transparent 1px 11vw)}
        .blue-runner{position:absolute;left:50%;bottom:-20%;width:min(52vw,760px);height:61%;z-index:-5;transform:translateX(-50%) perspective(760px) rotateX(58deg);transform-origin:bottom;background:linear-gradient(90deg,#8e651a 0 1.5%,#d5aa46 1.5% 2.4%,#061b49 2.4% 97.6%,#d5aa46 97.6% 98.5%,#8e651a 98.5%);box-shadow:0 0 55px rgba(1,8,25,.9)}
        .blue-runner span{position:absolute;inset:8% 7%;border:1px solid rgba(234,198,101,.35)}
        .side-arch{position:absolute;top:-5%;bottom:-4%;width:18vw;min-width:140px;z-index:-1;background:linear-gradient(90deg,#050608,#3b2509 18%,#9a6718 24%,#221507 31%,#07080b 52%,#68420d 82%,#09090b);border:1px solid rgba(220,171,66,.52);box-shadow:inset 0 0 45px #000}
        .side-arch.left{left:-7%;border-radius:0 45% 0 0}.side-arch.right{right:-7%;transform:scaleX(-1);border-radius:45% 0 0 0}
        .braziers{position:absolute;bottom:14%;width:62px;height:98px;z-index:3;opacity:.92}.braziers.left{left:8%}.braziers.right{right:8%}.braziers b{position:absolute;bottom:0;left:7px;width:48px;height:34px;background:linear-gradient(90deg,#261506,#bd7d1a,#3c2409);border:1px solid #d6a83c;clip-path:polygon(10% 0,90% 0,75% 100%,25% 100%)}
        .braziers i{position:absolute;left:18px;bottom:24px;width:28px;height:60px;border-radius:55% 55% 45% 45%;background:radial-gradient(ellipse at 50% 70%,#fff5bf 0 9%,#ffd34c 10% 28%,#f27a18 34% 58%,rgba(240,83,10,0) 68%);filter:blur(.4px) drop-shadow(0 0 18px #ff9a23);animation:fire 1.6s ease-in-out infinite alternate;transform-origin:bottom}
        .spark-layer{position:absolute;inset:0;z-index:1;pointer-events:none}.spark-layer i{position:absolute;bottom:-8px;border-radius:50%;background:#f2c95d;box-shadow:0 0 8px #f3b33a;opacity:0;animation:sparkUp linear infinite}
        .lux-frame{position:absolute;inset:14px;z-index:4;border:1px solid rgba(214,168,59,.36);box-shadow:inset 0 0 0 4px rgba(214,168,59,.05),inset 0 0 60px rgba(0,0,0,.35);pointer-events:none}.lux-frame:before{content:'';position:absolute;inset:7px;border:1px solid rgba(214,168,59,.16)}
        .gem{position:absolute;width:16px;height:16px;background:#113e85;border:2px solid #e7bd5e;transform:rotate(45deg);box-shadow:0 0 0 5px rgba(214,168,59,.08),0 0 12px rgba(229,188,87,.28)}.gem.tl{top:-7px;left:-7px}.gem.tr{top:-7px;right:-7px}.gem.bl{bottom:-7px;left:-7px}.gem.br{bottom:-7px;right:-7px}
        .gate-content{position:relative;z-index:5;width:min(92vw,980px);display:flex;flex-direction:column;align-items:center;text-align:center;padding:4vh 20px 5vh;transform:translateY(-1vh)}
        .crest-zone{position:relative;width:min(54vw,470px);height:min(45vh,410px);display:grid;place-items:center;margin-bottom:-2px}
        .real-crest{position:relative;z-index:5;max-width:88%;max-height:93%;object-fit:contain;filter:drop-shadow(0 18px 30px rgba(0,0,0,.82)) drop-shadow(0 0 20px rgba(219,166,47,.24));animation:crestIn 1.25s cubic-bezier(.16,1,.3,1) both,crestFloat 6s ease-in-out 1.25s infinite}
        .halo{position:absolute;border-radius:50%;border:1px solid rgba(235,194,83,.28);box-shadow:0 0 45px rgba(214,168,59,.08),inset 0 0 35px rgba(214,168,59,.04)}.h1{width:88%;aspect-ratio:1;animation:spin 42s linear infinite}.h2{width:72%;aspect-ratio:1;border-style:dashed;animation:spinR 31s linear infinite}.h3{width:57%;aspect-ratio:1;border-color:rgba(240,204,110,.18);animation:pulse 4.5s ease-in-out infinite}
        .crest-border{position:absolute;border-radius:22% 22% 32% 32%/16% 16% 38% 38%;pointer-events:none}.crest-border.outer{width:76%;height:76%;border:2px solid rgba(225,180,72,.55);box-shadow:0 0 0 5px rgba(9,25,56,.46),0 0 0 7px rgba(225,180,72,.18),0 0 34px rgba(225,180,72,.18)}.crest-border.inner{width:69%;height:69%;border:1px solid rgba(255,226,141,.36)}
        .crest-jewel{position:absolute;width:11px;height:11px;border-radius:50%;background:#0e4a9a;border:2px solid #f2d17b;z-index:7;box-shadow:0 0 12px rgba(37,112,207,.7),0 0 18px rgba(232,191,81,.32)}.jt{top:10%}.jr{right:8%;top:48%}.jb{bottom:10%}.jl{left:8%;top:48%}
        .motto{font-size:clamp(10px,1.1vw,14px);letter-spacing:.24em;color:#e8c763;text-shadow:0 2px 10px #000;margin-top:2px}.motto em{font-style:normal;font-size:.68em;color:#c7962b;margin:0 .45em}
        .gate-content h1{margin:.35rem 0 0;font-size:clamp(44px,7.2vw,96px);line-height:.95;letter-spacing:.035em;font-weight:700;background:linear-gradient(180deg,#fff1b4 0%,#e9c86f 25%,#b57a19 52%,#f4d981 77%,#82510d 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 10px 28px rgba(0,0,0,.5);filter:drop-shadow(0 2px 0 rgba(255,238,166,.13))}
        .divider{display:flex;align-items:center;gap:12px;width:min(76%,620px);margin:14px 0 8px;color:#d9a93d}.divider span{height:1px;flex:1;background:linear-gradient(90deg,transparent,#d9a93d,transparent)}.divider b{font-size:11px}
        .gate-content p{margin:0;color:#f2e1b1;font-size:clamp(11px,1.25vw,16px);letter-spacing:.19em;line-height:1.55;text-shadow:0 2px 10px #000}
        .realm-button{position:relative;margin-top:24px;min-width:min(430px,72vw);padding:15px 38px;border:1px solid #e2b950;clip-path:polygon(5% 0,95% 0,100% 28%,100% 72%,95% 100%,5% 100%,0 72%,0 28%);background:linear-gradient(180deg,#0b2d69,#061a47 50%,#061333);color:#f3d77c;box-shadow:0 0 0 4px rgba(8,20,49,.72),0 0 0 5px rgba(218,172,61,.3),0 14px 34px rgba(0,0,0,.62),0 0 24px rgba(217,167,44,.2);cursor:pointer;overflow:hidden;transition:.25s ease;font-family:Cinzel,Georgia,serif}
        .realm-button:before{content:'';position:absolute;top:-70%;left:-35%;width:28%;height:240%;background:linear-gradient(100deg,transparent,rgba(255,239,177,.42),transparent);transform:rotate(14deg);animation:shine 4.5s ease-in-out 1.8s infinite}.realm-button:hover{transform:translateY(-2px) scale(1.015);filter:brightness(1.08);box-shadow:0 0 0 4px rgba(8,20,49,.72),0 0 0 5px rgba(237,193,84,.48),0 18px 40px rgba(0,0,0,.68),0 0 34px rgba(232,182,59,.34)}
        .realm-button b{position:relative;z-index:2;font-size:clamp(13px,1.5vw,18px);letter-spacing:.18em;font-weight:500}.corner{position:absolute;width:12px;height:12px;border-color:#ddb34f}.c1{left:14px;top:8px;border-left:1px solid;border-top:1px solid}.c2{right:14px;top:8px;border-right:1px solid;border-top:1px solid}.c3{left:14px;bottom:8px;border-left:1px solid;border-bottom:1px solid}.c4{right:14px;bottom:8px;border-right:1px solid;border-bottom:1px solid}
        .footer-mark{margin-top:20px;font-size:9px;letter-spacing:.34em;color:rgba(242,222,170,.48)}.footer-mark span{color:#c99931;margin:0 .55em}
        .portal-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 45%,rgba(255,244,198,.8),rgba(229,173,49,.18) 28%,transparent 68%);z-index:20}
        .opening .portal-flash{animation:flash 1.15s ease-out forwards}.opening .gate-content{animation:openGate 1.35s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes bgFloat{to{transform:scale(1.035) translateY(-.7%)}}@keyframes fire{to{transform:scaleX(.78) scaleY(1.1) rotate(-2deg)}}@keyframes sparkUp{0%{transform:translateY(0);opacity:0}15%{opacity:.7}100%{transform:translateY(-105vh) translateX(24px);opacity:0}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes spinR{to{transform:rotate(-360deg)}}@keyframes pulse{50%{opacity:.4;transform:scale(1.05)}}@keyframes crestIn{from{opacity:0;transform:translateY(22px) scale(.94)}to{opacity:1;transform:none}}@keyframes crestFloat{50%{transform:translateY(-5px)}}@keyframes shine{0%,58%{left:-35%}88%,100%{left:120%}}@keyframes flash{0%{opacity:0}18%{opacity:.7}100%{opacity:0}}@keyframes openGate{35%{transform:scale(1.015)}100%{transform:scale(1.075);opacity:0}}
        .mobile-break{display:none}
        @media(max-width:767px){
          .gate-bg{object-position:center 48%;animation:none;filter:brightness(.54) saturate(.88) contrast(1.08)}
          .side-arch{width:26vw;min-width:82px;opacity:.72}.side-arch.left{left:-13%}.side-arch.right{right:-13%}
          .braziers{bottom:18%;transform:scale(.72)}.braziers.left{left:2%}.braziers.right{right:2%}
          .lux-frame{inset:9px}.gem{width:12px;height:12px}
          .gate-content{width:100%;padding:3svh 17px 4svh;transform:none}
          .crest-zone{width:min(82vw,360px);height:min(39svh,345px);margin-top:1svh}
          .real-crest{max-width:91%;max-height:95%}.crest-border.outer{width:80%;height:80%}.crest-border.inner{width:73%;height:73%}
          .motto{font-size:9px;letter-spacing:.12em;white-space:nowrap;margin-top:0}.motto em{margin:0 .2em}
          .gate-content h1{font-size:clamp(48px,15vw,70px);line-height:.9;margin-top:8px;max-width:96%}
          .divider{margin:11px 0 8px;width:82%}.gate-content p{font-size:10px;letter-spacing:.14em;line-height:1.55}.mobile-break{display:block}
          .realm-button{margin-top:19px;min-width:78vw;max-width:360px;padding:14px 24px}.realm-button b{font-size:13px;letter-spacing:.14em}
          .footer-mark{font-size:7px;letter-spacing:.22em;margin-top:16px;white-space:nowrap}
          .blue-runner{width:84vw;height:48%;bottom:-17%}
          .spark-layer i:nth-child(n+15){display:none}
        }
        @media(max-height:700px) and (max-width:767px){.crest-zone{height:33svh}.gate-content h1{font-size:12vw}.realm-button{margin-top:12px}.footer-mark{margin-top:10px}.divider{margin:7px 0 6px}}
        @media(prefers-reduced-motion:reduce){.gate-bg,.braziers i,.spark-layer i,.halo,.real-crest,.realm-button:before{animation:none!important}.real-crest{opacity:1!important;transform:none!important}}
      `}</style>
    </section>
  )
}
