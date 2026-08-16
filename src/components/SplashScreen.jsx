import { useEffect, useMemo, useRef, useState } from 'react'

function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination)
  const boom = ctx.createOscillator(), boomGain = ctx.createGain()
  boom.type = 'sine'; boom.frequency.setValueAtTime(56, now); boom.frequency.exponentialRampToValueAtTime(30, now + 1)
  boomGain.gain.setValueAtTime(0.0001, now); boomGain.gain.exponentialRampToValueAtTime(0.28, now + 0.04); boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
  boom.connect(boomGain); boomGain.connect(master); boom.start(now); boom.stop(now + 1.25)
  ;[[392,.08,.42],[523.25,.16,.50],[659.25,.26,.58]].forEach(([freq,start,dur]) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'triangle'; osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, now + start); gain.gain.exponentialRampToValueAtTime(0.045, now + start + .05); gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
    osc.connect(gain); gain.connect(master); osc.start(now + start); osc.stop(now + start + dur)
  })
}

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const audioCtxRef = useRef(null)
  const isMobile = useMemo(() => typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)), [])
  const particleCount = isMobile ? 14 : 34
  const rayCount = isMobile ? 4 : 8

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) audioCtxRef.current = new AudioCtx()
    return () => { document.body.style.overflow = ''; try { audioCtxRef.current?.close() } catch {} }
  }, [])

  function enter() {
    if (fading) return
    const ctx = audioCtxRef.current
    if (ctx) { if (ctx.state !== 'running') ctx.resume().then(() => playEnterSound(ctx)).catch(() => {}); else playEnterSound(ctx) }
    setFading(true)
    setTimeout(() => { document.body.style.overflow = ''; onEnter?.() }, 1000)
  }

  return (
    <div className={`royal-welcome fixed inset-0 z-[100] overflow-hidden ${fading ? 'splash-fade-out' : ''}`} style={{ background: '#050711' }}>
      <img src="./assets/splash-castle-bg.png" alt="" loading="eager" className="royal-welcome-bg absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,17,.72)_0%,rgba(5,7,17,.30)_38%,rgba(5,7,17,.65)_72%,rgba(5,7,17,.96)_100%)]" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(212,175,55,.13), transparent 48%)' }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: rayCount }).map((_, i) => <span key={i} className="royal-ray" style={{ transform: `translateX(-50%) rotate(${(i * (180 / Math.max(1, rayCount - 1))) - 90}deg)`, animationDelay: `${i * .32}s` }} />)}
        {Array.from({ length: particleCount }).map((_, i) => <span key={`e${i}`} className="royal-ember" style={{ left: `${(i * 37 + 11) % 100}%`, animationDuration: `${7 + (i % 7)}s`, animationDelay: `${(i * .27) % 8}s` }} />)}
      </div>

      <div className="absolute inset-3 rounded-xl border border-gold/20 md:inset-5 pointer-events-none">
        <div className="absolute inset-1.5 rounded-lg border border-gold/10" />
        <span className="absolute left-4 top-4 h-8 w-8 border-l border-t border-gold/55" /><span className="absolute right-4 top-4 h-8 w-8 border-r border-t border-gold/55" />
        <span className="absolute bottom-4 left-4 h-8 w-8 border-b border-l border-gold/55" /><span className="absolute bottom-4 right-4 h-8 w-8 border-b border-r border-gold/55" />
      </div>

      <main className="relative z-10 mx-auto flex h-[100svh] w-full max-w-5xl flex-col items-center justify-center px-5 py-5 text-center sm:px-8">
        <div className="royal-crest-stage relative flex shrink-0 items-center justify-center">
          <div className="royal-halo absolute rounded-full" />
          <div className="royal-ring royal-ring-one absolute rounded-full" />
          <div className="royal-ring royal-ring-two absolute rounded-full" />
          {!isMobile && [0,1].map(i => <div key={i} className="royal-shockwave absolute rounded-full" style={{ animationDelay: `${.7 + i * 1.6}s` }} />)}
          <img src="./assets/crest-846.png?v=20260816-transparent" alt="Kingdom 846 Royal Crest" loading="eager" className="royal-crest relative block object-contain" />
        </div>

        <div className="royal-copy royal-copy-1 mt-2 max-w-[92vw] text-[9px] font-semibold uppercase tracking-[.30em] text-gold-bright sm:text-[11px] sm:tracking-[.38em]">One Crown · Four Alliances</div>
        <h1 className="royal-title royal-copy royal-copy-2 mt-2 max-w-[94vw] font-decorative font-black gradient-gold">KINGDOM 846</h1>
        <div className="royal-copy royal-copy-3 mt-2 text-xs tracking-[.45em] text-gold/75 sm:text-sm">✦ ◆ ✦</div>
        <p className="royal-tagline royal-copy royal-copy-4 mt-2 max-w-[88vw] font-serif italic text-parchment/80">Where legends are forged in fire and crowned in gold</p>
        <button onClick={enter} className="royal-enter mt-4 min-w-[210px] px-8 py-3 text-xs font-bold uppercase tracking-[.16em] text-ink sm:mt-5 sm:min-w-[240px] sm:text-sm"><span className="relative z-10">Enter the Realm</span></button>
        <div className="royal-copy royal-copy-5 mt-3 max-w-[90vw] text-[8px] uppercase tracking-[.22em] text-parchment/35 sm:text-[9px] sm:tracking-[.28em]">Official Royal Portal · Kingdom 846</div>
      </main>

      <style>{`
        .royal-welcome-bg{z-index:0;animation:royal-bg-zoom 22s ease-in-out infinite alternate;transform:scale(1.04)}
        @keyframes royal-bg-zoom{to{transform:scale(1.09) translate3d(-.8%,-.5%,0)}}
        .royal-ray{position:absolute;z-index:1;top:24%;left:50%;width:1px;height:100vh;transform-origin:top center;background:linear-gradient(to bottom,rgba(232,199,102,.15),rgba(212,175,55,.025) 44%,transparent 74%);opacity:.2;animation:royal-ray-breathe 5.5s ease-in-out infinite}
        @keyframes royal-ray-breathe{50%{opacity:.42}}
        .royal-ember{position:absolute;z-index:2;bottom:-8px;width:2px;height:2px;border-radius:50%;background:#e8c766;box-shadow:0 0 7px rgba(232,199,102,.65);opacity:0;animation:royal-ember-rise linear infinite}
        @keyframes royal-ember-rise{0%{transform:translateY(0);opacity:0}15%{opacity:.72}100%{transform:translateY(-105vh);opacity:0}}
        .royal-crest-stage{width:clamp(150px,22vw,280px);height:clamp(205px,30vh,400px);max-height:38svh}
        .royal-crest{width:auto;height:auto;max-width:100%;max-height:100%;opacity:0;transform:translateY(18px) scale(.82);filter:drop-shadow(0 12px 22px rgba(0,0,0,.72)) drop-shadow(0 0 12px rgba(212,175,55,.22));animation:royal-crest-in 1.1s cubic-bezier(.16,1,.3,1) .12s forwards,royal-crest-float 5s ease-in-out 1.4s infinite}
        @keyframes royal-crest-in{to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes royal-crest-float{50%{transform:translateY(-5px);filter:drop-shadow(0 16px 26px rgba(0,0,0,.72)) drop-shadow(0 0 19px rgba(232,199,102,.30))}}
        .royal-halo{width:92%;aspect-ratio:1;background:radial-gradient(circle,rgba(232,199,102,.18),rgba(212,175,55,.05) 48%,transparent 72%);filter:blur(15px);animation:royal-halo 4s ease-in-out infinite}
        @keyframes royal-halo{50%{transform:scale(1.06);opacity:.8}}
        .royal-ring{width:88%;aspect-ratio:1;border:1px solid rgba(212,175,55,.18)}
        .royal-ring::after{content:'';position:absolute;inset:8px;border-radius:inherit;border:1px dashed rgba(232,199,102,.15)}
        .royal-ring-one{animation:royal-spin 30s linear infinite}.royal-ring-two{width:74%;animation:royal-spin-reverse 22s linear infinite}
        @keyframes royal-spin{to{transform:rotate(360deg)}}@keyframes royal-spin-reverse{to{transform:rotate(-360deg)}}
        .royal-shockwave{width:38%;aspect-ratio:1;border:1px solid rgba(232,199,102,.24);opacity:0;animation:royal-wave 4.6s ease-out infinite}
        @keyframes royal-wave{20%{opacity:.3}100%{transform:scale(2.8);opacity:0}}
        .royal-title{font-size:clamp(2rem,6.2vw,4.6rem);line-height:1.02;letter-spacing:clamp(.02em,.8vw,.08em);text-shadow:0 0 26px rgba(212,175,55,.30),0 3px 16px rgba(0,0,0,.9);white-space:normal;overflow-wrap:normal}
        .royal-tagline{font-size:clamp(.82rem,2.2vw,1.05rem);line-height:1.3}
        .royal-copy{opacity:0;transform:translateY(10px);animation:royal-copy-in .75s cubic-bezier(.16,1,.3,1) forwards}.royal-copy-1{animation-delay:.58s}.royal-copy-2{animation-delay:.74s}.royal-copy-3{animation-delay:.9s}.royal-copy-4{animation-delay:1.02s}.royal-copy-5{animation-delay:1.34s}
        @keyframes royal-copy-in{to{opacity:1;transform:translateY(0)}}
        .royal-enter{position:relative;overflow:hidden;border-radius:8px;border:1px solid #9c7a24;background:linear-gradient(180deg,#f1d77d,#e8c766 35%,#d4af37);box-shadow:0 9px 25px -8px rgba(212,175,55,.72),inset 0 1px 0 rgba(255,255,255,.45);opacity:0;transform:translateY(12px);animation:royal-button-in .75s cubic-bezier(.16,1,.3,1) 1.18s forwards;transition:.2s ease}
        .royal-enter::before{content:'';position:absolute;top:-60%;left:-45%;width:35%;height:220%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.62),transparent);transform:rotate(14deg);animation:royal-button-shine 3.8s ease-in-out 1.8s infinite}
        .royal-enter:hover{transform:translateY(-2px);filter:brightness(1.07);box-shadow:0 14px 34px -8px rgba(212,175,55,.84)}
        @keyframes royal-button-in{to{opacity:1;transform:translateY(0)}}@keyframes royal-button-shine{0%,55%{left:-45%}82%,100%{left:125%}}
        @media(max-width:767px){.royal-welcome-bg{animation:none;transform:scale(1.02)}.royal-crest-stage{width:clamp(145px,44vw,190px);height:clamp(205px,29svh,270px);max-height:31svh}.royal-title{font-size:clamp(1.85rem,10.2vw,3rem);letter-spacing:.025em}.royal-ring{width:92%}.royal-ring-two{width:78%}}
        @media(max-height:720px){.royal-crest-stage{height:190px;width:140px}.royal-title{font-size:clamp(1.7rem,8vw,2.6rem)}.royal-tagline{font-size:.78rem}.royal-enter{margin-top:.7rem;padding-top:.65rem;padding-bottom:.65rem}.royal-copy-5{margin-top:.45rem}}
        @media(min-width:1200px){.royal-crest-stage{width:270px;height:385px}.royal-title{font-size:4.4rem}}
        @media(prefers-reduced-motion:reduce){.royal-welcome-bg,.royal-ray,.royal-ember,.royal-halo,.royal-ring,.royal-shockwave,.royal-crest,.royal-copy,.royal-enter,.royal-enter::before{animation:none!important;opacity:1!important;transform:none!important}}
      `}</style>
    </div>
  )
}
