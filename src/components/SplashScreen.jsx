import { useEffect, useRef, useState } from 'react'

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function playRoyalCue() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioRef.current || new AudioCtx()
      audioRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()
      const now = ctx.currentTime
      const master = ctx.createGain()
      master.gain.value = .18
      master.connect(ctx.destination)
      ;[[55,0,1.15,'sine'],[392,.08,.5,'triangle'],[523.25,.18,.58,'triangle'],[659.25,.3,.7,'triangle']].forEach(([freq,start,dur,type]) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.type = type; osc.frequency.value = freq
        gain.gain.setValueAtTime(.0001, now + start)
        gain.gain.exponentialRampToValueAtTime(freq === 55 ? .3 : .05, now + start + .04)
        gain.gain.exponentialRampToValueAtTime(.001, now + start + dur)
        osc.connect(gain); gain.connect(master); osc.start(now + start); osc.stop(now + start + dur)
      })
    } catch {}
  }

  function enter() {
    if (fading) return
    playRoyalCue()
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1100)
  }

  return (
    <div className={`royal-welcome fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'portal-opening' : ''}`}>
      <img src="/assets/splash-castle-bg.png" alt="" loading="eager" className="welcome-bg absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,12,.58),rgba(3,5,12,.25)_38%,rgba(3,5,12,.78)_100%)]" />
      <div className="welcome-glow absolute inset-0" />
      <div className="welcome-frame absolute inset-3 rounded-2xl border border-gold/20 sm:inset-5" />

      <main className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 text-center">
        <div className="crest-wrap relative flex items-center justify-center">
          <div className="crest-halo absolute rounded-full" />
          <img src="/assets/crest-846.png?v=welcome-hotfix" alt="Kingdom 846 Royal Crest" loading="eager" className="welcome-crest relative object-contain" />
        </div>
        <div className="mt-3 text-[10px] font-semibold uppercase tracking-[.32em] text-gold-bright sm:text-xs">One Crown · Four Alliances</div>
        <h1 className="mt-2 font-decorative text-[clamp(2rem,10vw,4.5rem)] font-black leading-none gradient-gold">KINGDOM 846</h1>
        <div className="mt-3 text-xs tracking-[.5em] text-gold/75">✦ ◆ ✦</div>
        <p className="mt-3 max-w-lg font-serif text-sm italic text-parchment/80 sm:text-base">Where legends are forged in fire and crowned in gold</p>
        <button type="button" onClick={enter} disabled={fading} className="welcome-enter mt-6 min-w-[220px] rounded-lg border border-[#9c7a24] px-8 py-3 text-xs font-bold uppercase tracking-[.17em] text-ink sm:text-sm">Enter the Realm</button>
        <div className="mt-4 text-[8px] uppercase tracking-[.24em] text-parchment/35 sm:text-[9px]">Official Royal Portal · Kingdom 846</div>
      </main>

      <style>{`
        .royal-welcome{background:#03050b;isolation:isolate}.welcome-bg{z-index:-3;transform:scale(1.04);animation:bgmove 16s ease-in-out infinite alternate}.welcome-glow{z-index:-1;background:radial-gradient(circle at 50% 34%,rgba(232,199,102,.18),transparent 38%);pointer-events:none}.welcome-frame{pointer-events:none;box-shadow:inset 0 0 50px rgba(212,175,55,.035)}.crest-wrap{width:min(58vw,280px);height:min(37vh,360px)}.welcome-crest{max-width:100%;max-height:100%;filter:brightness(1.08) saturate(1.08) drop-shadow(0 12px 20px rgba(0,0,0,.7)) drop-shadow(0 0 15px rgba(212,175,55,.28));animation:crestfloat 5s ease-in-out infinite}.crest-halo{width:90%;aspect-ratio:1;background:radial-gradient(circle,rgba(232,199,102,.18),transparent 68%);filter:blur(14px);animation:halo 4s ease-in-out infinite}.welcome-enter{background:linear-gradient(180deg,#f1d77d,#e8c766 35%,#d4af37);box-shadow:0 10px 28px -8px rgba(212,175,55,.72),inset 0 1px rgba(255,255,255,.4);transition:.2s ease}.welcome-enter:hover{transform:translateY(-2px);filter:brightness(1.08)}.portal-opening{animation:fadeout 1.1s ease forwards}@keyframes bgmove{to{transform:scale(1.09)}}@keyframes crestfloat{50%{transform:translateY(-6px)}}@keyframes halo{50%{opacity:.65;transform:scale(1.08)}}@keyframes fadeout{to{opacity:0;visibility:hidden}}@media(max-width:767px){.welcome-bg{animation:none;object-position:center}.crest-wrap{width:min(68vw,230px);height:min(34svh,300px)}.welcome-frame{inset:10px}.welcome-enter{margin-top:1.25rem}}@media(max-height:700px){.crest-wrap{height:27svh}.welcome-enter{margin-top:.8rem;padding-top:.65rem;padding-bottom:.65rem}}@media(prefers-reduced-motion:reduce){.welcome-bg,.welcome-crest,.crest-halo{animation:none!important}}
      `}</style>
    </div>
  )
}
