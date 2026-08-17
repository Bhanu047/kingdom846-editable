import { useEffect, useMemo, useRef, useState } from 'react'

function playLivingRoyalSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.2, now + 0.05)
  master.gain.exponentialRampToValueAtTime(0.001, now + 2.35)
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

  tone(49, 0, 1.85, 0.3)
  tone(98, 0.06, 1.45, 0.08, 'triangle')
  tone(196, 0.2, 0.9, 0.045, 'triangle')
  tone(293.66, 0.38, 1.1, 0.04, 'triangle')
  tone(392, 0.62, 1.36, 0.035, 'sine')
  tone(523.25, 0.86, 1.65, 0.03, 'sine')

  try {
    const length = Math.floor(ctx.sampleRate * 0.36)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08))
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    filter.type = 'bandpass'
    filter.frequency.value = 640
    filter.Q.value = 1.3
    gain.gain.value = 0.055
    source.buffer = buffer
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(now + 0.18)
  } catch {}
}

export default function SplashScreen({ onEnter }) {
  const [opening, setOpening] = useState(false)
  const audioRef = useRef(null)
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const particles = isMobile ? 16 : 30

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
      if (ctx.state === 'suspended') ctx.resume().then(() => playLivingRoyalSound(ctx)).catch(() => {})
      else playLivingRoyalSound(ctx)
    }
    setOpening(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1500)
  }

  return (
    <section className={`living-royal ${opening ? 'is-opening' : ''}`}>
      <img src="/assets/splash-castle-bg.png" alt="" className="castle-layer" loading="eager" />
      <div className="world-shade" />
      <div className="blue-depth" />
      <div className="gold-ray ray-a" />
      <div className="gold-ray ray-b" />

      <div className="banner banner-left" aria-hidden="true"><span>846</span></div>
      <div className="banner banner-right" aria-hidden="true"><span>846</span></div>
      <div className="brazier brazier-left" aria-hidden="true"><i/><b/></div>
      <div className="brazier brazier-right" aria-hidden="true"><i/><b/></div>

      <div className="particle-field" aria-hidden="true">
        {Array.from({ length: particles }).map((_, i) => (
          <span key={i} className="particle" style={{ left: `${(i * 41 + 7) % 100}%`, animationDelay: `${(i * 0.31) % 7}s`, animationDuration: `${8 + (i % 6)}s`, width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px` }} />
        ))}
      </div>

      <div className="lux-frame" aria-hidden="true">
        <i className="jewel tl"/><i className="jewel tr"/><i className="jewel bl"/><i className="jewel br"/>
      </div>

      <main className="royal-content">
        <div className="crest-stage">
          <div className="halo halo-a"/><div className="halo halo-b"/><div className="halo halo-c"/>
          <div className="crest-aura"/>
          <div className="travel-glint"/>
          <img src="/assets/crest-846.png?v=living-royal-final" alt="Kingdom 846 Royal Crest" className="crest" loading="eager" />
        </div>

        <div className="kicker reveal r1">ONE CROWN · FOUR ALLIANCES</div>
        <h1 className="reveal r2">KINGDOM 846</h1>
        <div className="ornament reveal r3"><span/>✦ ◆ ✦<span/></div>
        <p className="tagline reveal r4">Where legends are forged in fire and crowned in gold</p>
        <button className="enter-button reveal r5" onClick={enter} disabled={opening}>
          <b>ENTER THE REALM</b>
        </button>
        <div className="portal-mark reveal r6">OFFICIAL ROYAL PORTAL · KINGDOM 846</div>
      </main>

      <div className="portal-flash" aria-hidden="true" />

      <style>{`
        .living-royal{position:fixed;inset:0;z-index:100;overflow:hidden;background:#01040b;color:#efd783;display:grid;place-items:center;isolation:isolate;font-family:Georgia,'Times New Roman',serif}
        .castle-layer{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;object-position:center 45%;z-index:-12;filter:brightness(.47) saturate(.9) contrast(1.08);transform:scale(1.045);animation:castleDrift 22s ease-in-out infinite alternate}
        .world-shade{position:absolute;inset:0;z-index:-11;background:linear-gradient(180deg,rgba(1,5,14,.18),rgba(2,7,20,.28) 44%,rgba(1,3,9,.9)),radial-gradient(ellipse at center,transparent 32%,rgba(0,0,0,.6) 92%)}
        .blue-depth{position:absolute;inset:0;z-index:-10;background:radial-gradient(ellipse at 50% 40%,rgba(18,70,155,.18),transparent 54%),linear-gradient(90deg,rgba(0,15,42,.33),transparent 30%,transparent 70%,rgba(0,15,42,.33));mix-blend-mode:screen}
        .gold-ray{position:absolute;top:-18%;width:18vw;height:78%;z-index:-7;background:linear-gradient(180deg,rgba(255,238,181,.22),rgba(219,169,53,.03) 68%,transparent);filter:blur(11px);opacity:.34;animation:rayMove 8s ease-in-out infinite alternate}.ray-a{left:30%;transform:rotate(8deg)}.ray-b{right:29%;transform:rotate(-8deg);animation-delay:-3s}

        .banner{position:absolute;top:13%;width:8vw;min-width:72px;max-width:112px;height:47%;z-index:1;clip-path:polygon(0 0,100% 0,100% 88%,50% 100%,0 88%);background:linear-gradient(90deg,#031028,#0a2c62 48%,#041638);border:1px solid rgba(218,171,62,.42);box-shadow:0 14px 28px rgba(0,0,0,.6);transform-origin:top center;animation:bannerSway 7s ease-in-out infinite alternate}.banner-left{left:4.6%}.banner-right{right:4.6%;animation-delay:-2.5s}.banner:before{content:'♛';position:absolute;top:24%;left:50%;transform:translateX(-50%);font-size:24px;color:#d8ad4c;text-shadow:0 0 12px rgba(216,170,69,.2)}.banner span{position:absolute;top:44%;left:50%;transform:translateX(-50%);font-size:clamp(14px,1.35vw,22px);letter-spacing:.1em;color:#e1bd61}
        .brazier{position:absolute;bottom:15%;width:58px;height:96px;z-index:4}.brazier-left{left:8%}.brazier-right{right:8%}.brazier b{position:absolute;bottom:0;left:6px;width:48px;height:32px;background:linear-gradient(90deg,#241506,#c1841c,#392207);border:1px solid #d3a33a;clip-path:polygon(10% 0,90% 0,75% 100%,25% 100%)}.brazier i{position:absolute;left:17px;bottom:25px;width:30px;height:62px;border-radius:55% 55% 45% 45%;background:radial-gradient(ellipse at 50% 70%,#fff5c0 0 9%,#ffd24d 10% 29%,#f37817 35% 58%,rgba(240,83,10,0) 68%);filter:drop-shadow(0 0 18px #ff9820);animation:fire 1.5s ease-in-out infinite alternate;transform-origin:bottom}

        .particle-field{position:absolute;inset:0;z-index:3;pointer-events:none}.particle{position:absolute;bottom:-8px;border-radius:50%;background:#f3cd68;box-shadow:0 0 8px #e8ae33;opacity:0;animation:particleRise linear infinite}
        .lux-frame{position:absolute;inset:14px;z-index:7;border:1px solid rgba(222,177,67,.38);box-shadow:inset 0 0 0 5px rgba(222,177,67,.035),inset 0 0 65px rgba(0,0,0,.34);pointer-events:none}.lux-frame:after{content:'';position:absolute;inset:7px;border:1px solid rgba(222,177,67,.13)}
        .jewel{position:absolute;width:17px;height:17px;background:#0c4b9e;border:2px solid #f0cf75;transform:rotate(45deg);box-shadow:0 0 0 5px rgba(216,170,69,.06),0 0 14px rgba(31,94,188,.5)}.jewel.tl{top:-7px;left:-7px}.jewel.tr{top:-7px;right:-7px}.jewel.bl{bottom:-7px;left:-7px}.jewel.br{bottom:-7px;right:-7px}

        .royal-content{position:relative;z-index:6;width:min(92vw,930px);display:flex;flex-direction:column;align-items:center;text-align:center;padding:3.4svh 22px 4svh}
        .crest-stage{position:relative;width:min(55vw,500px);height:min(48svh,440px);display:grid;place-items:center;perspective:900px}
        .halo{position:absolute;border-radius:50%;border:1px solid rgba(235,196,92,.24);box-shadow:0 0 38px rgba(216,170,69,.07),inset 0 0 32px rgba(216,170,69,.035)}.halo-a{width:90%;aspect-ratio:1;animation:spin 46s linear infinite}.halo-b{width:74%;aspect-ratio:1;border-style:dashed;animation:spinR 33s linear infinite}.halo-c{width:58%;aspect-ratio:1;animation:haloPulse 4.8s ease-in-out infinite}
        .crest-aura{position:absolute;width:90%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(245,210,110,.18),rgba(212,175,55,.045) 43%,transparent 70%);filter:blur(15px);animation:haloPulse 5.1s ease-in-out infinite}
        .travel-glint{position:absolute;z-index:4;top:8%;bottom:8%;left:-22%;width:16%;background:linear-gradient(100deg,transparent,rgba(255,243,195,.25),transparent);transform:rotate(9deg);filter:blur(1px);animation:crestGlint 6.8s ease-in-out 1.4s infinite;pointer-events:none}
        .crest{position:relative;z-index:3;max-width:91%;max-height:95%;object-fit:contain;filter:drop-shadow(0 18px 28px rgba(0,0,0,.84)) drop-shadow(0 0 18px rgba(212,175,55,.2));animation:crestIn 1.15s cubic-bezier(.16,1,.3,1) both,crestFloat 6.2s ease-in-out 1.2s infinite;transform-style:preserve-3d}

        .kicker{font-size:clamp(10px,1.1vw,13px);font-weight:600;letter-spacing:.34em;color:#e8c866;text-transform:uppercase;text-shadow:0 2px 10px #000}.royal-content h1{margin:8px 0 0;font-size:clamp(50px,7vw,92px);line-height:.94;letter-spacing:.03em;font-weight:700;background:linear-gradient(180deg,#fff1b5 0%,#e9c86c 27%,#b77818 55%,#f1d57b 78%,#80500b 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 5px 15px rgba(0,0,0,.72))}.ornament{display:flex;align-items:center;gap:12px;width:min(74%,540px);margin:13px 0 6px;font-size:13px;letter-spacing:.32em;color:#d4a338}.ornament span{height:1px;flex:1;background:linear-gradient(90deg,transparent,#d4a338,transparent)}.tagline{margin:0;max-width:620px;font-size:clamp(13px,1.3vw,17px);font-style:italic;line-height:1.55;color:rgba(244,230,194,.84);text-shadow:0 2px 10px #000}
        .enter-button{position:relative;margin-top:24px;min-width:min(340px,72vw);padding:15px 38px;border:1px solid #e2b950;border-radius:8px;background:linear-gradient(180deg,#0d3479,#071d4e 52%,#051334);color:#f4d77c;font:700 clamp(12px,1.35vw,15px) Georgia;letter-spacing:.18em;text-transform:uppercase;box-shadow:0 0 0 4px rgba(4,13,35,.8),0 0 0 5px rgba(216,170,69,.28),0 14px 34px rgba(0,0,0,.62),0 0 26px rgba(216,170,69,.18);cursor:pointer;overflow:hidden;transition:transform .22s ease,filter .22s ease,box-shadow .22s ease}.enter-button:before{content:'';position:absolute;top:-70%;left:-45%;width:34%;height:240%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:rotate(14deg);animation:buttonShine 4.5s ease-in-out 1.9s infinite}.enter-button b{position:relative;z-index:2}.enter-button:hover{transform:translateY(-2px) scale(1.018);filter:brightness(1.08);box-shadow:0 0 0 4px rgba(4,13,35,.8),0 0 0 5px rgba(239,196,86,.46),0 16px 38px rgba(0,0,0,.66),0 0 34px rgba(239,196,86,.3)}
        .portal-mark{margin-top:14px;font-size:9px;letter-spacing:.28em;color:rgba(244,224,173,.4)}
        .reveal{opacity:0;transform:translateY(12px);animation:reveal .8s cubic-bezier(.16,1,.3,1) forwards}.r1{animation-delay:.55s}.r2{animation-delay:.72s}.r3{animation-delay:.88s}.r4{animation-delay:1.02s}.r5{animation-delay:1.18s}.r6{animation-delay:1.34s}
        .portal-flash{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 40%,rgba(255,239,183,.7),rgba(70,129,225,.22) 34%,transparent 68%)}
        .is-opening .royal-content{animation:royalPush 1.5s cubic-bezier(.16,1,.3,1) forwards}.is-opening .portal-flash{animation:flash 1.15s ease-out forwards}.is-opening .banner{animation:bannerExit 1.5s ease-in forwards}

        @keyframes castleDrift{to{transform:scale(1.08) translateY(-.6%)}}
        @keyframes rayMove{to{opacity:.56;transform:translateY(1.2%) rotate(6deg)}}
        @keyframes bannerSway{to{transform:rotate(1.4deg)}}
        @keyframes fire{to{transform:scaleY(1.12) rotate(-2deg)}}
        @keyframes particleRise{0%{transform:translateY(0);opacity:0}14%{opacity:.82}100%{transform:translateY(-108svh);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes spinR{to{transform:rotate(-360deg)}}
        @keyframes haloPulse{50%{transform:scale(1.045);opacity:.76}}
        @keyframes crestIn{from{opacity:0;transform:translateY(24px) scale(.82)}to{opacity:1;transform:none}}
        @keyframes crestFloat{0%,100%{transform:translateY(0) rotateX(0deg)}50%{transform:translateY(-6px) rotateX(1.2deg)}}
        @keyframes crestGlint{0%,58%{left:-22%;opacity:0}70%{opacity:1}100%{left:112%;opacity:0}}
        @keyframes buttonShine{0%,60%{left:-45%}84%,100%{left:125%}}
        @keyframes reveal{to{opacity:1;transform:none}}
        @keyframes royalPush{0%{transform:scale(1);opacity:1}45%{transform:scale(1.035);opacity:1;filter:brightness(1.12)}100%{transform:scale(1.16);opacity:0;filter:brightness(1.5)}}
        @keyframes bannerExit{to{opacity:0;transform:translateY(-12px) scale(.98)}}
        @keyframes flash{0%{opacity:0}22%{opacity:.62}100%{opacity:0}}

        @media(max-width:767px){
          .castle-layer{object-position:center 47%;animation:none;transform:scale(1.03)}
          .gold-ray{width:28vw}.banner{width:18vw;min-width:58px;opacity:.72}.banner-left{left:2.5%}.banner-right{right:2.5%}.brazier-left{left:3%}.brazier-right{right:3%}
          .lux-frame{inset:9px}.jewel{width:13px;height:13px}
          .royal-content{width:100%;padding:2.6svh 14px 3svh}.crest-stage{width:min(90vw,390px);height:min(42svh,370px)}
          .kicker{font-size:8.5px;letter-spacing:.14em;white-space:nowrap}.royal-content h1{font-size:clamp(48px,14.5vw,70px);margin-top:7px}.ornament{width:82%;margin:10px 0 6px;font-size:11px}.tagline{font-size:12.5px;max-width:330px}.enter-button{min-width:80vw;max-width:360px;margin-top:19px;padding:14px 20px;font-size:12px}.portal-mark{font-size:7px;letter-spacing:.18em;margin-top:12px;white-space:nowrap}
        }
        @media(prefers-reduced-motion:reduce){.castle-layer,.gold-ray,.banner,.brazier i,.particle,.halo,.crest-aura,.crest,.travel-glint,.enter-button:before,.reveal{animation:none!important}.reveal{opacity:1;transform:none}}
      `}</style>
    </section>
  )
}
