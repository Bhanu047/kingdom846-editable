import { useEffect, useMemo, useRef, useState } from 'react'

function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.18
  master.connect(ctx.destination)

  const tone = (freq, start, end, gain, type = 'sine') => {
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now + start)
    amp.gain.setValueAtTime(0.0001, now + start)
    amp.gain.exponentialRampToValueAtTime(gain, now + start + 0.04)
    amp.gain.exponentialRampToValueAtTime(0.001, now + end)
    osc.connect(amp)
    amp.connect(master)
    osc.start(now + start)
    osc.stop(now + end + 0.05)
  }

  tone(54, 0, 1.2, 0.28)
  tone(196, 0.08, 0.54, 0.04, 'triangle')
  tone(293.66, 0.18, 0.7, 0.045, 'triangle')
  tone(392, 0.3, 0.9, 0.05, 'triangle')
  tone(523.25, 0.44, 1.08, 0.04, 'sine')
}

export default function SplashScreen({ onEnter }) {
  const [opening, setOpening] = useState(false)
  const audioRef = useRef(null)
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const particles = isMobile ? 18 : 34
  const rays = isMobile ? 4 : 7

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) audioRef.current = new AudioCtx()
    return () => {
      document.body.style.overflow = ''
      try { audioRef.current?.close() } catch {}
    }
  }, [])

  function enter() {
    if (opening) return
    const ctx = audioRef.current
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().then(() => playEnterSound(ctx)).catch(() => {})
      else playEnterSound(ctx)
    }
    setOpening(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1250)
  }

  return (
    <section className={`cinematic-welcome ${opening ? 'is-opening' : ''}`}>
      <img src="/assets/splash-castle-bg.png" alt="" className="castle" loading="eager" />
      <div className="castle-shade" />
      <div className="gold-bloom" />

      <div className="ray-field" aria-hidden="true">
        {Array.from({ length: rays }).map((_, i) => (
          <span key={i} className="ray" style={{ left: `${42 + i * (16 / Math.max(1, rays - 1))}%`, animationDelay: `${i * 0.4}s` }} />
        ))}
      </div>

      <div className="ember-field" aria-hidden="true">
        {Array.from({ length: particles }).map((_, i) => (
          <span key={i} className="ember" style={{ left: `${(i * 37 + 9) % 100}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, animationDuration: `${7 + (i % 7)}s`, animationDelay: `${(i * 0.29) % 8}s` }} />
        ))}
      </div>

      <div className="luxury-frame" aria-hidden="true">
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      </div>

      <main className="welcome-stack">
        <div className="crest-stage">
          <div className="ring ring-a" />
          <div className="ring ring-b" />
          <div className="ring ring-c" />
          <div className="crest-light" />
          <img src="/assets/crest-846.png?v=clean-portal" alt="Kingdom 846 Royal Crest" className="crest" loading="eager" />
        </div>

        <div className="kicker reveal r1">ONE CROWN · FOUR ALLIANCES</div>
        <h1 className="reveal r2">KINGDOM 846</h1>
        <div className="ornament reveal r3"><span />✦ ◆ ✦<span /></div>
        <p className="tagline reveal r4">Where legends are forged in fire and crowned in gold</p>

        <button className="enter-button reveal r5" onClick={enter} disabled={opening}>
          <span>ENTER THE REALM</span>
        </button>

        <div className="portal-mark reveal r6">OFFICIAL ROYAL PORTAL · KINGDOM 846</div>
      </main>

      <div className="portal-flash" aria-hidden="true" />

      <style>{`
        .cinematic-welcome{position:fixed;inset:0;z-index:100;overflow:hidden;background:#02040a;display:grid;place-items:center;color:#efd47e;isolation:isolate;font-family:Georgia,'Times New Roman',serif}
        .castle{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;object-position:center 46%;z-index:-10;filter:brightness(.58) saturate(.88) contrast(1.07);transform:scale(1.04);animation:castleMove 20s ease-in-out infinite alternate}
        .castle-shade{position:absolute;inset:0;z-index:-9;background:linear-gradient(180deg,rgba(2,4,9,.28),rgba(2,4,9,.18) 35%,rgba(2,4,9,.58) 72%,rgba(2,4,9,.96)),radial-gradient(ellipse at center,transparent 34%,rgba(0,0,0,.58) 92%)}
        .gold-bloom{position:absolute;inset:0;z-index:-8;background:radial-gradient(circle at 50% 24%,rgba(255,224,142,.24),rgba(211,151,40,.08) 29%,transparent 48%);mix-blend-mode:screen;animation:bloom 5s ease-in-out infinite}
        .ray-field,.ember-field{position:absolute;inset:0;pointer-events:none}.ray-field{z-index:-6}.ember-field{z-index:2}
        .ray{position:absolute;top:14%;width:2px;height:62%;transform:rotate(6deg);transform-origin:top;background:linear-gradient(180deg,rgba(255,232,156,.22),rgba(223,177,65,.04) 60%,transparent);filter:blur(.35px);opacity:.16;animation:rayPulse 5.4s ease-in-out infinite}
        .ember{position:absolute;bottom:-8px;border-radius:50%;background:radial-gradient(circle,#fff3ae 0%,#e8c45d 32%,rgba(212,175,55,0) 76%);box-shadow:0 0 9px rgba(232,199,102,.55);opacity:0;animation:emberRise linear infinite}
        .luxury-frame{position:absolute;inset:16px;z-index:3;border:1px solid rgba(217,171,67,.32);box-shadow:inset 0 0 0 5px rgba(217,171,67,.03),inset 0 0 52px rgba(0,0,0,.3);pointer-events:none}.luxury-frame:after{content:'';position:absolute;inset:7px;border:1px solid rgba(217,171,67,.12)}
        .corner{position:absolute;width:24px;height:24px;border-color:rgba(236,194,87,.6)}.corner.tl{top:12px;left:12px;border-left:1px solid;border-top:1px solid}.corner.tr{top:12px;right:12px;border-right:1px solid;border-top:1px solid}.corner.bl{bottom:12px;left:12px;border-left:1px solid;border-bottom:1px solid}.corner.br{bottom:12px;right:12px;border-right:1px solid;border-bottom:1px solid}
        .welcome-stack{position:relative;z-index:5;width:min(92vw,860px);display:flex;flex-direction:column;align-items:center;text-align:center;padding:4svh 22px 5svh;transform:translateY(-1svh)}
        .crest-stage{position:relative;width:min(58vw,440px);height:min(43svh,390px);display:grid;place-items:center}
        .ring{position:absolute;border-radius:50%;border:1px solid rgba(232,193,91,.22);box-shadow:0 0 34px rgba(214,168,59,.07),inset 0 0 28px rgba(214,168,59,.03)}.ring:after{content:'';position:absolute;inset:8px;border-radius:inherit;border:1px dashed rgba(239,205,112,.13)}
        .ring-a{width:88%;aspect-ratio:1;animation:spin 34s linear infinite}.ring-b{width:72%;aspect-ratio:1;animation:spinR 24s linear infinite}.ring-c{width:56%;aspect-ratio:1;border-style:dashed;animation:ringPulse 4.4s ease-in-out infinite}
        .crest-light{position:absolute;width:88%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(232,199,102,.17),rgba(212,175,55,.05) 38%,transparent 70%);filter:blur(15px);animation:ringPulse 4.8s ease-in-out infinite}
        .crest{position:relative;z-index:3;max-width:88%;max-height:92%;object-fit:contain;filter:drop-shadow(0 18px 28px rgba(0,0,0,.82)) drop-shadow(0 0 18px rgba(212,175,55,.22));animation:crestIn 1.15s cubic-bezier(.16,1,.3,1) both,crestFloat 5.5s ease-in-out 1.2s infinite}
        .kicker{margin-top:4px;font-size:clamp(10px,1.15vw,13px);font-weight:600;letter-spacing:.36em;color:#e8c866;text-transform:uppercase;text-shadow:0 2px 10px #000}
        .welcome-stack h1{margin:9px 0 0;font-size:clamp(50px,7.2vw,92px);line-height:.94;letter-spacing:.035em;font-weight:700;background:linear-gradient(180deg,#fff1b5 0%,#e9c86c 27%,#b77818 55%,#f1d57b 78%,#80500b 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 5px 15px rgba(0,0,0,.72))}
        .ornament{display:flex;align-items:center;gap:12px;width:min(74%,540px);margin:13px 0 6px;font-size:13px;letter-spacing:.32em;color:#d4a338}.ornament span{height:1px;flex:1;background:linear-gradient(90deg,transparent,#d4a338,transparent)}
        .tagline{margin:0;max-width:620px;font-size:clamp(13px,1.35vw,17px);font-style:italic;line-height:1.55;color:rgba(244,230,194,.82);text-shadow:0 2px 10px #000}
        .enter-button{position:relative;margin-top:25px;min-width:min(320px,70vw);padding:15px 36px;border:1px solid #e1b84f;border-radius:8px;background:linear-gradient(180deg,#efd57c 0%,#e6c35f 30%,#c99625 100%);color:#101525;font:700 clamp(12px,1.35vw,15px) Georgia;letter-spacing:.18em;text-transform:uppercase;box-shadow:0 12px 30px -8px rgba(212,175,55,.65),inset 0 1px 0 rgba(255,255,255,.42);cursor:pointer;overflow:hidden;transition:transform .22s ease,filter .22s ease,box-shadow .22s ease}
        .enter-button:before{content:'';position:absolute;top:-70%;left:-45%;width:34%;height:240%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:rotate(14deg);animation:buttonShine 4s ease-in-out 1.8s infinite}.enter-button span{position:relative;z-index:2}.enter-button:hover{transform:translateY(-2px) scale(1.02);filter:brightness(1.06);box-shadow:0 16px 36px -8px rgba(212,175,55,.82),inset 0 1px 0 rgba(255,255,255,.48)}
        .portal-mark{margin-top:14px;font-size:9px;letter-spacing:.28em;color:rgba(244,224,173,.38)}
        .reveal{opacity:0;transform:translateY(12px);animation:reveal .8s cubic-bezier(.16,1,.3,1) forwards}.r1{animation-delay:.55s}.r2{animation-delay:.72s}.r3{animation-delay:.88s}.r4{animation-delay:1.02s}.r5{animation-delay:1.18s}.r6{animation-delay:1.34s}
        .portal-flash{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 42%,rgba(255,239,183,.68),rgba(219,166,51,.18) 30%,transparent 64%)}
        .is-opening .welcome-stack{animation:portalOut 1.25s cubic-bezier(.16,1,.3,1) forwards}.is-opening .portal-flash{animation:flash 1.05s ease-out forwards}
        @keyframes castleMove{to{transform:scale(1.08) translateY(-.7%)}}
        @keyframes bloom{50%{opacity:.68}}
        @keyframes rayPulse{50%{opacity:.42}}
        @keyframes emberRise{0%{transform:translateY(0);opacity:0}14%{opacity:.8}100%{transform:translateY(-108svh);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes spinR{to{transform:rotate(-360deg)}}
        @keyframes ringPulse{50%{transform:scale(1.05);opacity:.75}}
        @keyframes crestIn{from{opacity:0;transform:translateY(22px) scale(.78)}to{opacity:1;transform:none}}
        @keyframes crestFloat{50%{transform:translateY(-6px)}}
        @keyframes reveal{to{opacity:1;transform:none}}
        @keyframes buttonShine{0%,58%{left:-45%}82%,100%{left:125%}}
        @keyframes portalOut{to{transform:scale(1.07);opacity:0;filter:brightness(1.3)}}
        @keyframes flash{0%{opacity:0}22%{opacity:.58}100%{opacity:0}}
        @media(max-width:767px){
          .castle{object-position:center 47%;animation:none;transform:scale(1.03)}
          .luxury-frame{inset:9px}.corner{width:18px;height:18px}
          .welcome-stack{width:100%;padding:2.6svh 16px 3svh;transform:none}
          .crest-stage{width:min(84vw,360px);height:min(38svh,335px)}
          .ring-a{width:84%}.ring-b{width:69%}.ring-c{width:54%}
          .kicker{font-size:9px;letter-spacing:.22em;white-space:nowrap}
          .welcome-stack h1{font-size:clamp(46px,14.5vw,68px);margin-top:8px}
          .ornament{width:80%;margin:11px 0 6px;font-size:11px}
          .tagline{font-size:13px;max-width:330px}
          .enter-button{min-width:min(260px,74vw);margin-top:21px;padding:14px 28px;font-size:12px}
          .portal-mark{font-size:7px;letter-spacing:.2em;margin-top:12px;white-space:nowrap}
        }
        @media(prefers-reduced-motion:reduce){.castle,.gold-bloom,.ray,.ember,.ring,.crest,.reveal,.enter-button:before{animation:none!important}.reveal{opacity:1;transform:none}}
      `}</style>
    </section>
  )
}
