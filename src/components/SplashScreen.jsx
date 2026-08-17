import { useEffect, useMemo, useRef, useState } from 'react'

function playRoyalGateSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.05)
  master.gain.exponentialRampToValueAtTime(0.001, now + 2.2)
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

  // Deep palace resonance + ceremonial brass rise.
  tone(43.65, 0, 1.85, 0.34, 'sine')
  tone(65.41, 0.02, 1.45, 0.12, 'triangle')
  tone(130.81, 0.18, 0.92, 0.05, 'triangle')
  tone(196, 0.34, 1.08, 0.045, 'triangle')
  tone(261.63, 0.52, 1.3, 0.04, 'sine')
  tone(392, 0.72, 1.55, 0.035, 'sine')

  // Metallic gate release / lock strike using filtered noise.
  try {
    const length = Math.floor(ctx.sampleRate * 0.42)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07))
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    filter.type = 'bandpass'
    filter.frequency.value = 820
    filter.Q.value = 1.7
    gain.gain.value = 0.09
    source.buffer = buffer
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(now + 0.16)
  } catch {}
}

export default function SplashScreen({ onEnter }) {
  const [opening, setOpening] = useState(false)
  const audioRef = useRef(null)
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const particles = isMobile ? 18 : 34

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
      if (ctx.state === 'suspended') ctx.resume().then(() => playRoyalGateSound(ctx)).catch(() => {})
      else playRoyalGateSound(ctx)
    }
    setOpening(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1850)
  }

  return (
    <section className={`royal-gate-welcome ${opening ? 'is-opening' : ''}`}>
      <img src="/assets/splash-castle-bg.png" alt="" className="castle-world" loading="eager" />
      <div className="world-shade" />
      <div className="blue-atmosphere" />
      <div className="gold-heaven-light" />

      <div className="gate-shell" aria-hidden="true">
        <div className="gate-panel gate-left"><i/><b/><span/></div>
        <div className="gate-panel gate-right"><i/><b/><span/></div>
      </div>

      <div className="royal-banner banner-left" aria-hidden="true"><span>846</span></div>
      <div className="royal-banner banner-right" aria-hidden="true"><span>846</span></div>
      <div className="brazier brazier-left" aria-hidden="true"><i/><b/></div>
      <div className="brazier brazier-right" aria-hidden="true"><i/><b/></div>

      <div className="ember-field" aria-hidden="true">
        {Array.from({ length: particles }).map((_, i) => (
          <span key={i} className="ember" style={{ left: `${(i * 37 + 11) % 100}%`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`, animationDuration: `${7 + (i % 7)}s`, animationDelay: `${(i * 0.29) % 8}s` }} />
        ))}
      </div>

      <div className="luxury-frame" aria-hidden="true">
        <i className="jewel tl" /><i className="jewel tr" /><i className="jewel bl" /><i className="jewel br" />
      </div>

      <main className="welcome-core">
        <div className="crest-stage">
          <div className="halo halo-a" />
          <div className="halo halo-b" />
          <div className="halo halo-c" />
          <div className="crest-glow" />
          <img src="/assets/crest-846.png?v=royal-gates-v3" alt="Kingdom 846 Royal Crest" className="crest" loading="eager" />
        </div>

        <div className="motto reveal m1">ONE CROWN <em>◆</em> FOUR ALLIANCES</div>
        <h1 className="reveal m2">KINGDOM 846</h1>
        <div className="divider reveal m3"><span />✦ ◆ ✦<span /></div>
        <p className="tagline reveal m4">Where legends are forged in fire and crowned in gold</p>
        <button className="enter-realm reveal m5" onClick={enter} disabled={opening}>
          <span className="button-gem left" />
          <b>ENTER THE REALM</b>
          <span className="button-gem right" />
        </button>
        <div className="portal-mark reveal m6">OFFICIAL ROYAL PORTAL · KINGDOM 846</div>
      </main>

      <div className="opening-light" aria-hidden="true" />

      <style>{`
        .royal-gate-welcome{position:fixed;inset:0;z-index:100;overflow:hidden;background:#01040b;color:#efd783;display:grid;place-items:center;isolation:isolate;font-family:Georgia,'Times New Roman',serif}
        .castle-world{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;object-position:center 44%;z-index:-12;filter:brightness(.42) saturate(.9) contrast(1.1);transform:scale(1.05);animation:worldDrift 20s ease-in-out infinite alternate}
        .world-shade{position:absolute;inset:0;z-index:-11;background:linear-gradient(180deg,rgba(1,5,14,.2),rgba(2,7,20,.34) 45%,rgba(1,3,9,.92)),radial-gradient(ellipse at center,transparent 28%,rgba(0,0,0,.62) 92%)}
        .blue-atmosphere{position:absolute;inset:0;z-index:-10;background:radial-gradient(ellipse at 50% 42%,rgba(18,69,151,.18),transparent 55%),linear-gradient(90deg,rgba(0,12,38,.36),transparent 30%,transparent 70%,rgba(0,12,38,.36));mix-blend-mode:screen}
        .gold-heaven-light{position:absolute;top:-18%;left:50%;width:22vw;height:72%;transform:translateX(-50%);z-index:-4;background:linear-gradient(180deg,rgba(255,239,183,.26),rgba(218,168,52,.04) 68%,transparent);filter:blur(10px);animation:lightBreathe 5s ease-in-out infinite}

        .gate-shell{position:absolute;inset:0;z-index:-3;display:flex;pointer-events:none;perspective:1400px}
        .gate-panel{position:relative;width:50%;height:100%;background:linear-gradient(90deg,#031126 0%,#082758 42%,#0b3472 76%,#071a3b 100%);border-color:rgba(221,176,70,.65);box-shadow:inset 0 0 70px rgba(0,0,0,.78),inset 0 0 0 8px rgba(216,170,69,.035);transition:transform 1.65s cubic-bezier(.16,1,.3,1),filter 1.2s ease;transform-origin:center}
        .gate-left{border-right:2px solid rgba(222,178,76,.75)}.gate-right{border-left:2px solid rgba(222,178,76,.75);transform:scaleX(-1)}
        .gate-panel:before{content:'';position:absolute;inset:5.5% 7%;border:1px solid rgba(221,176,70,.42);border-radius:52% 52% 3% 3%/18% 18% 3% 3%;box-shadow:inset 0 0 0 7px rgba(4,17,42,.8),inset 0 0 36px rgba(221,176,70,.06)}
        .gate-panel:after{content:'';position:absolute;inset:10% 12%;border:1px solid rgba(239,204,114,.15);border-radius:48% 48% 2% 2%/15% 15% 2% 2%;background:repeating-linear-gradient(90deg,rgba(235,193,83,.04) 0 1px,transparent 1px 54px)}
        .gate-panel i{position:absolute;top:5%;bottom:5%;right:5%;width:18px;background:linear-gradient(90deg,#513306,#efcc67,#78500e);box-shadow:0 0 16px rgba(224,176,58,.12)}
        .gate-panel b{position:absolute;top:11%;bottom:11%;right:10%;width:2px;background:linear-gradient(180deg,transparent,#d8a942 12%,#f3d97b 50%,#d8a942 88%,transparent);opacity:.55}
        .gate-panel span{position:absolute;top:50%;right:3.8%;width:18px;height:82px;transform:translateY(-50%);border:1px solid rgba(242,209,117,.7);background:linear-gradient(90deg,#3d2607,#d8a43a,#5c3908);box-shadow:0 0 18px rgba(232,190,83,.2)}
        .is-opening .gate-left{transform:translateX(-96%) rotateY(-7deg)}.is-opening .gate-right{transform:scaleX(-1) translateX(-96%) rotateY(-7deg)}

        .royal-banner{position:absolute;top:13%;width:8vw;min-width:74px;max-width:115px;height:48%;z-index:1;clip-path:polygon(0 0,100% 0,100% 88%,50% 100%,0 88%);background:linear-gradient(90deg,#031028,#0a2b61 48%,#041638);border:1px solid rgba(218,171,62,.42);box-shadow:0 14px 28px rgba(0,0,0,.6);transform-origin:top center;animation:bannerSway 6s ease-in-out infinite alternate}
        .banner-left{left:4.5%}.banner-right{right:4.5%;animation-delay:-2s}.royal-banner:before{content:'♛';position:absolute;top:24%;left:50%;transform:translateX(-50%);font-size:26px;color:#d8ad4c;text-shadow:0 0 12px rgba(216,170,69,.2)}.royal-banner span{position:absolute;top:44%;left:50%;transform:translateX(-50%);font-size:clamp(14px,1.35vw,23px);letter-spacing:.1em;color:#e1bd61}
        .brazier{position:absolute;bottom:15%;width:58px;height:96px;z-index:4}.brazier-left{left:8%}.brazier-right{right:8%}.brazier b{position:absolute;bottom:0;left:6px;width:48px;height:32px;background:linear-gradient(90deg,#241506,#c1841c,#392207);border:1px solid #d3a33a;clip-path:polygon(10% 0,90% 0,75% 100%,25% 100%)}.brazier i{position:absolute;left:17px;bottom:25px;width:30px;height:62px;border-radius:55% 55% 45% 45%;background:radial-gradient(ellipse at 50% 70%,#fff5c0 0 9%,#ffd24d 10% 29%,#f37817 35% 58%,rgba(240,83,10,0) 68%);filter:drop-shadow(0 0 18px #ff9820);animation:fire 1.5s ease-in-out infinite alternate;transform-origin:bottom}

        .ember-field{position:absolute;inset:0;z-index:3;pointer-events:none}.ember{position:absolute;bottom:-8px;border-radius:50%;background:#f3cd68;box-shadow:0 0 8px #e8ae33;opacity:0;animation:emberRise linear infinite}
        .luxury-frame{position:absolute;inset:14px;z-index:7;border:1px solid rgba(222,177,67,.38);box-shadow:inset 0 0 0 5px rgba(222,177,67,.035),inset 0 0 65px rgba(0,0,0,.34);pointer-events:none}.luxury-frame:after{content:'';position:absolute;inset:7px;border:1px solid rgba(222,177,67,.13)}
        .jewel{position:absolute;width:17px;height:17px;background:#0c4b9e;border:2px solid #f0cf75;transform:rotate(45deg);box-shadow:0 0 0 5px rgba(216,170,69,.06),0 0 14px rgba(31,94,188,.5)}.jewel.tl{top:-7px;left:-7px}.jewel.tr{top:-7px;right:-7px}.jewel.bl{bottom:-7px;left:-7px}.jewel.br{bottom:-7px;right:-7px}

        .welcome-core{position:relative;z-index:6;width:min(92vw,950px);display:flex;flex-direction:column;align-items:center;text-align:center;padding:3.5svh 22px 4svh}
        .crest-stage{position:relative;width:min(55vw,500px);height:min(48svh,440px);display:grid;place-items:center}
        .halo{position:absolute;border-radius:50%;border:1px solid rgba(235,196,92,.25);box-shadow:0 0 38px rgba(216,170,69,.07),inset 0 0 32px rgba(216,170,69,.035)}.halo-a{width:90%;aspect-ratio:1;animation:spin 44s linear infinite}.halo-b{width:74%;aspect-ratio:1;border-style:dashed;animation:spinR 31s linear infinite}.halo-c{width:58%;aspect-ratio:1;animation:haloPulse 4.5s ease-in-out infinite}
        .crest-glow{position:absolute;width:90%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(245,210,110,.18),rgba(212,175,55,.045) 43%,transparent 70%);filter:blur(15px);animation:haloPulse 4.8s ease-in-out infinite}
        .crest{position:relative;z-index:3;max-width:91%;max-height:95%;object-fit:contain;filter:drop-shadow(0 18px 30px rgba(0,0,0,.88)) drop-shadow(0 0 20px rgba(216,170,69,.24));animation:crestIn 1.15s cubic-bezier(.16,1,.3,1) both,crestFloat 6s ease-in-out 1.2s infinite}
        .motto{font-size:clamp(10px,1.05vw,14px);letter-spacing:.28em;color:#e8c968;text-shadow:0 2px 10px #000}.motto em{font-style:normal;font-size:.68em;color:#b98622;margin:0 .38em}
        .welcome-core h1{margin:8px 0 0;font-size:clamp(52px,7.3vw,98px);line-height:.93;letter-spacing:.025em;background:linear-gradient(180deg,#fff2b8,#eacb72 28%,#a86e17 54%,#f0d57e 77%,#794909);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 5px 15px rgba(0,0,0,.78))}
        .divider{display:flex;align-items:center;gap:12px;width:min(72%,580px);margin:13px 0 7px;color:#d5a23a}.divider span{height:1px;flex:1;background:linear-gradient(90deg,transparent,#d4a139,transparent)}
        .tagline{margin:0;font-size:clamp(12px,1.25vw,17px);font-style:italic;line-height:1.5;color:rgba(244,230,194,.86);text-shadow:0 2px 10px #000}
        .enter-realm{position:relative;margin-top:24px;min-width:min(430px,74vw);padding:16px 42px;border:1px solid #e1ba54;background:linear-gradient(180deg,#0d387f,#082153 55%,#061536);color:#f5da85;font:600 clamp(13px,1.45vw,18px) Georgia;letter-spacing:.17em;clip-path:polygon(5% 0,95% 0,100% 28%,100% 72%,95% 100%,5% 100%,0 72%,0 28%);box-shadow:0 0 0 4px rgba(3,13,34,.82),0 0 0 5px rgba(224,177,65,.3),0 15px 36px rgba(0,0,0,.68),0 0 30px rgba(224,177,65,.2);cursor:pointer;overflow:hidden;transition:.22s ease}.enter-realm:before{content:'';position:absolute;top:-70%;left:-40%;width:30%;height:240%;background:linear-gradient(100deg,transparent,rgba(255,239,176,.42),transparent);transform:rotate(14deg);animation:buttonShine 4.2s ease-in-out 1.8s infinite}.enter-realm:hover{transform:translateY(-2px) scale(1.018);filter:brightness(1.08);box-shadow:0 0 0 4px rgba(3,13,34,.82),0 0 0 5px rgba(241,200,91,.48),0 18px 42px rgba(0,0,0,.72),0 0 38px rgba(234,187,72,.34)}.enter-realm b{position:relative;z-index:2;font-weight:500}.button-gem{position:absolute;top:50%;width:8px;height:8px;background:#0a4b9e;border:1px solid #efcf78;transform:translateY(-50%) rotate(45deg);z-index:2}.button-gem.left{left:25px}.button-gem.right{right:25px}
        .portal-mark{margin-top:15px;font-size:9px;letter-spacing:.3em;color:rgba(243,223,172,.44)}
        .reveal{opacity:0;transform:translateY(12px);animation:reveal .8s cubic-bezier(.16,1,.3,1) forwards}.m1{animation-delay:.55s}.m2{animation-delay:.72s}.m3{animation-delay:.88s}.m4{animation-delay:1.03s}.m5{animation-delay:1.18s}.m6{animation-delay:1.34s}
        .opening-light{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 46%,rgba(255,244,202,.92),rgba(74,137,255,.32) 24%,rgba(220,170,55,.15) 42%,transparent 70%)}
        .is-opening .welcome-core{animation:coreAdvance 1.7s cubic-bezier(.16,1,.3,1) forwards}.is-opening .opening-light{animation:portalLight 1.7s ease-out forwards}.is-opening .royal-banner,.is-opening .brazier{animation:fadeProps 1s ease-out forwards}

        @keyframes worldDrift{to{transform:scale(1.085) translateY(-.7%)}}
        @keyframes lightBreathe{50%{opacity:.58;transform:translateX(-50%) scaleX(1.08)}}
        @keyframes bannerSway{to{transform:rotate(1.2deg)}}
        @keyframes fire{to{transform:scaleY(1.12) rotate(-2deg)}}
        @keyframes emberRise{0%{transform:translateY(0);opacity:0}14%{opacity:.85}100%{transform:translateY(-108svh);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes spinR{to{transform:rotate(-360deg)}}
        @keyframes haloPulse{50%{transform:scale(1.05);opacity:.75}}
        @keyframes crestIn{from{opacity:0;transform:translateY(22px) scale(.8)}to{opacity:1;transform:none}}
        @keyframes crestFloat{50%{transform:translateY(-6px)}}
        @keyframes reveal{to{opacity:1;transform:none}}
        @keyframes buttonShine{0%,58%{left:-40%}84%,100%{left:125%}}
        @keyframes coreAdvance{0%{transform:scale(1);opacity:1}50%{transform:scale(1.045);opacity:1}100%{transform:scale(1.13);opacity:0;filter:brightness(1.25)}}
        @keyframes portalLight{0%{opacity:0}30%{opacity:.3}62%{opacity:.88}100%{opacity:0;transform:scale(1.15)}}
        @keyframes fadeProps{to{opacity:0}}

        @media(max-width:767px){
          .castle-world{object-position:center 46%;animation:none;transform:scale(1.04)}
          .gate-panel:before{inset:4% 4%;border-radius:48% 48% 2% 2%/14% 14% 2% 2%}.gate-panel:after{inset:8% 8%}
          .royal-banner{width:17vw;min-width:54px;height:39%;top:12%;opacity:.62}.banner-left{left:1.5%}.banner-right{right:1.5%}.royal-banner:before{font-size:18px}.royal-banner span{font-size:11px}
          .brazier{transform:scale(.72);bottom:8%}.brazier-left{left:1%}.brazier-right{right:1%}
          .luxury-frame{inset:9px}.jewel{width:13px;height:13px}
          .welcome-core{width:100%;padding:2svh 14px 3svh}
          .crest-stage{width:min(88vw,390px);height:min(43svh,380px)}
          .motto{font-size:8.5px;letter-spacing:.12em;white-space:nowrap}.motto em{margin:0 .15em}
          .welcome-core h1{font-size:clamp(49px,14.8vw,72px);line-height:.9;margin-top:7px}
          .divider{width:82%;margin:10px 0 7px}
          .tagline{font-size:12px;max-width:340px}
          .enter-realm{min-width:82vw;max-width:365px;padding:14px 22px;font-size:13px;letter-spacing:.14em;margin-top:18px}
          .button-gem.left{left:18px}.button-gem.right{right:18px}
          .portal-mark{font-size:7px;letter-spacing:.19em;margin-top:13px;white-space:nowrap}
        }
        @media(prefers-reduced-motion:reduce){.castle-world,.gold-heaven-light,.royal-banner,.brazier i,.ember,.halo,.crest,.reveal,.enter-realm:before{animation:none!important}.reveal{opacity:1;transform:none}}
      `}</style>
    </section>
  )
}
