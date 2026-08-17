import { useEffect, useMemo, useRef, useState } from 'react'

function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.22
  master.connect(ctx.destination)

  const boom = ctx.createOscillator()
  const boomGain = ctx.createGain()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(58, now)
  boom.frequency.exponentialRampToValueAtTime(30, now + 1.1)
  boomGain.gain.setValueAtTime(0.0001, now)
  boomGain.gain.exponentialRampToValueAtTime(0.34, now + 0.04)
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35)
  boom.connect(boomGain); boomGain.connect(master); boom.start(now); boom.stop(now + 1.4)

  ;[[392, .08, .48], [523.25, .16, .54], [659.25, .25, .62], [783.99, .38, .74]].forEach(([freq, start, dur], i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = i === 3 ? 'sine' : 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, now + start)
    gain.gain.exponentialRampToValueAtTime(i === 3 ? 0.08 : 0.055, now + start + .05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
    osc.connect(gain); gain.connect(master); osc.start(now + start); osc.stop(now + start + dur)
  })
}

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const audioCtxRef = useRef(null)
  const isMobile = useMemo(() => typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)), [])
  const particleCount = isMobile ? 18 : 46
  const rayCount = isMobile ? 4 : 8

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) audioCtxRef.current = new AudioCtx()
    return () => {
      document.body.style.overflow = ''
      try { audioCtxRef.current?.close() } catch {}
    }
  }, [])

  function enter() {
    if (fading) return
    const ctx = audioCtxRef.current
    if (ctx) {
      if (ctx.state !== 'running') ctx.resume().then(() => playEnterSound(ctx)).catch(() => {})
      else playEnterSound(ctx)
    }
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1200)
  }

  return (
    <div className={`royal-welcome fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'splash-fade-out' : ''}`} style={{ background: '#050711' }}>
      <img
        src="./assets/splash-castle-bg.png"
        alt=""
        loading="eager"
        className="royal-welcome-bg absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: 1 }}
      />
      <div className="absolute inset-0" style={{ zIndex: 2, background: 'linear-gradient(180deg, rgba(5,7,17,.72) 0%, rgba(5,7,17,.28) 34%, rgba(5,7,17,.52) 70%, rgba(5,7,17,.96) 100%)' }} />
      <div className="absolute inset-0" style={{ zIndex: 3, background: 'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,.13) 0%, rgba(14,18,32,.18) 35%, rgba(5,7,17,.80) 82%)' }} />

      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 4, pointerEvents: 'none' }}>
        {Array.from({ length: rayCount }).map((_, i) => (
          <span key={`ray-${i}`} className="royal-ray" style={{ transform: `translateX(-50%) rotate(${(i * (180 / Math.max(1, rayCount - 1))) - 90}deg)`, animationDelay: `${i * .32}s` }} />
        ))}
      </div>

      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 5, pointerEvents: 'none' }}>
        {Array.from({ length: particleCount }).map((_, i) => (
          <span
            key={`ember-${i}`}
            className="royal-ember"
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              width: `${1 + (i % 4)}px`,
              height: `${1 + (i % 4)}px`,
              animationDuration: `${7 + (i % 8)}s`,
              animationDelay: `${(i * .27) % 9}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-3 rounded-xl border border-gold/20 md:inset-5" style={{ zIndex: 7, pointerEvents: 'none', boxShadow: 'inset 0 0 45px rgba(212,175,55,.035)' }}>
        <div className="absolute inset-1.5 rounded-lg border border-gold/10" />
        <span className="absolute left-4 top-4 h-8 w-8 border-l border-t border-gold/55" />
        <span className="absolute right-4 top-4 h-8 w-8 border-r border-t border-gold/55" />
        <span className="absolute bottom-4 left-4 h-8 w-8 border-b border-l border-gold/55" />
        <span className="absolute bottom-4 right-4 h-8 w-8 border-b border-r border-gold/55" />
      </div>

      <main className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 text-center" style={{ zIndex: 10 }}>
        <div className="royal-crest-stage relative flex items-center justify-center">
          <div className="royal-halo absolute rounded-full" />
          <div className="royal-ring royal-ring-one absolute rounded-full" />
          <div className="royal-ring royal-ring-two absolute rounded-full" />
          {!isMobile && [0, 1, 2].map((i) => <div key={i} className="royal-shockwave absolute rounded-full" style={{ animationDelay: `${.5 + i * 1.35}s` }} />)}
          <img
            src="./assets/crest-846.png?v=20260816-transparent"
            alt="Kingdom 846 Royal Crest"
            loading="eager"
            className="royal-crest relative w-auto object-contain"
            style={{ maxHeight: isMobile ? '34vh' : '43vh', maxWidth: isMobile ? '76vw' : '440px' }}
          />
        </div>

        <div className="royal-copy royal-copy-1 mt-3 text-[10px] font-semibold uppercase tracking-[.42em] text-gold-bright sm:text-xs">One Crown · Four Alliances</div>
        <h1 className="royal-copy royal-copy-2 mt-2 font-decorative text-4xl font-black tracking-[.08em] gradient-gold sm:text-5xl md:text-6xl" style={{ textShadow: '0 0 28px rgba(212,175,55,.36), 0 3px 18px rgba(0,0,0,.9)' }}>KINGDOM 846</h1>
        <div className="royal-copy royal-copy-3 mt-3 text-sm tracking-[.55em] text-gold/75">✦ ◆ ✦</div>
        <p className="royal-copy royal-copy-4 mt-3 font-serif text-sm italic text-parchment/75 sm:text-base">Where legends are forged in fire and crowned in gold</p>
        <button onClick={enter} className="royal-enter mt-6 min-w-52 px-9 py-3 text-xs font-bold uppercase tracking-[.18em] text-ink sm:text-sm">
          <span className="relative z-10">Enter the Realm</span>
        </button>
        <div className="royal-copy royal-copy-5 mt-3 text-[9px] uppercase tracking-[.28em] text-parchment/35">Official Royal Portal · Kingdom 846</div>
      </main>

      <style>{`
        .royal-welcome-bg { animation: royal-bg-zoom 22s ease-in-out infinite alternate; transform: scale(1.05); }
        @keyframes royal-bg-zoom { from { transform: scale(1.05) translate3d(0,0,0); } to { transform: scale(1.11) translate3d(-1.2%,-.8%,0); } }
        .royal-ray { position:absolute; top:26%; left:50%; width:2px; height:105vh; transform-origin:top center; background:linear-gradient(to bottom,rgba(232,199,102,.16),rgba(212,175,55,.03) 42%,transparent 72%); filter:blur(.3px); opacity:.25; animation:royal-ray-breathe 5.5s ease-in-out infinite; }
        @keyframes royal-ray-breathe { 0%,100% { opacity:.11; } 50% { opacity:.42; } }
        .royal-ember { position:absolute; bottom:-12px; border-radius:9999px; background:radial-gradient(circle,#fff4b0 0%,#e8c766 32%,rgba(212,175,55,0) 76%); box-shadow:0 0 9px rgba(232,199,102,.58); opacity:0; animation:royal-ember-rise linear infinite; }
        @keyframes royal-ember-rise { 0% { transform:translate3d(0,0,0) scale(.6); opacity:0; } 15% { opacity:.8; } 70% { opacity:.45; } 100% { transform:translate3d(${isMobile ? '18px' : '42px'},-108vh,0) scale(1.2); opacity:0; } }
        .royal-crest-stage { width:min(78vw,460px); min-height:${isMobile ? '34vh' : '43vh'}; }
        .royal-halo { width:88%; aspect-ratio:1; background:radial-gradient(circle,rgba(232,199,102,.20) 0%,rgba(212,175,55,.08) 35%,transparent 70%); filter:blur(16px); animation:royal-halo 4s ease-in-out infinite; }
        @keyframes royal-halo { 0%,100% { opacity:.55; transform:scale(.93); } 50% { opacity:1; transform:scale(1.07); } }
        .royal-ring { width:78%; aspect-ratio:1; border:1px solid rgba(212,175,55,.22); box-shadow:0 0 28px rgba(212,175,55,.09),inset 0 0 28px rgba(212,175,55,.04); }
        .royal-ring::after { content:''; position:absolute; inset:8px; border-radius:inherit; border:1px dashed rgba(232,199,102,.18); }
        .royal-ring-one { animation:royal-spin 30s linear infinite; }
        .royal-ring-two { width:66%; border-style:dashed; border-color:rgba(232,199,102,.16); animation:royal-spin-reverse 20s linear infinite; }
        @keyframes royal-spin { to { transform:rotate(360deg); } }
        @keyframes royal-spin-reverse { to { transform:rotate(-360deg); } }
        .royal-shockwave { width:30%; aspect-ratio:1; border:1px solid rgba(232,199,102,.28); opacity:0; animation:royal-wave 4.1s ease-out infinite; }
        @keyframes royal-wave { 0% { transform:scale(.6); opacity:0; } 20% { opacity:.35; } 100% { transform:scale(3.3); opacity:0; } }
        .royal-crest { opacity:0; transform:translateY(28px) scale(.72); filter:drop-shadow(0 14px 24px rgba(0,0,0,.72)) drop-shadow(0 0 16px rgba(212,175,55,.25)); animation:royal-crest-in 1.35s cubic-bezier(.16,1,.3,1) .12s forwards, royal-crest-float 5s ease-in-out 1.6s infinite; }
        @keyframes royal-crest-in { to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes royal-crest-float { 0%,100% { transform:translateY(0); filter:drop-shadow(0 14px 24px rgba(0,0,0,.72)) drop-shadow(0 0 12px rgba(212,175,55,.23)); } 50% { transform:translateY(-7px); filter:drop-shadow(0 18px 28px rgba(0,0,0,.74)) drop-shadow(0 0 24px rgba(232,199,102,.38)); } }
        .royal-copy { opacity:0; transform:translateY(13px); animation:royal-copy-in .85s cubic-bezier(.16,1,.3,1) forwards; }
        .royal-copy-1 { animation-delay:.7s; } .royal-copy-2 { animation-delay:.88s; } .royal-copy-3 { animation-delay:1.04s; } .royal-copy-4 { animation-delay:1.18s; } .royal-copy-5 { animation-delay:1.58s; }
        @keyframes royal-copy-in { to { opacity:1; transform:translateY(0); } }
        .royal-enter { position:relative; overflow:hidden; border-radius:8px; border:1px solid #9c7a24; background:linear-gradient(180deg,#f1d77d 0%,#e8c766 30%,#d4af37 100%); box-shadow:0 10px 28px -8px rgba(212,175,55,.72),inset 0 1px 0 rgba(255,255,255,.45); opacity:0; transform:translateY(15px); animation:royal-button-in .8s cubic-bezier(.16,1,.3,1) 1.38s forwards; transition:transform .2s ease,filter .2s ease,box-shadow .2s ease; }
        .royal-enter::before { content:''; position:absolute; top:-60%; left:-45%; width:35%; height:220%; background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent); transform:rotate(14deg); animation:royal-button-shine 3.6s ease-in-out 2s infinite; }
        .royal-enter:hover { transform:translateY(-2px) scale(1.025); filter:brightness(1.08); box-shadow:0 15px 36px -8px rgba(212,175,55,.88),inset 0 1px 0 rgba(255,255,255,.5); }
        @keyframes royal-button-in { to { opacity:1; transform:translateY(0); } }
        @keyframes royal-button-shine { 0%,55% { left:-45%; } 82%,100% { left:125%; } }
        @media (max-width:767px) { .royal-welcome-bg { animation:none; transform:scale(1.04); } .royal-ring { width:72%; } .royal-ring-two { width:61%; } }
        @media (prefers-reduced-motion:reduce) { .royal-welcome-bg,.royal-ray,.royal-ember,.royal-halo,.royal-ring,.royal-shockwave,.royal-crest,.royal-copy,.royal-enter,.royal-enter::before { animation:none !important; opacity:1 !important; transform:none !important; } }
      `}</style>
    </div>
  )
}
