import { useState, useEffect, useRef, useMemo } from 'react'

// Generate fanfare using Web Audio API oscillators
function playFanfare(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.3
  master.connect(ctx.destination)
  const delay = ctx.createDelay()
  delay.delayTime.value = 0.15
  const delayGain = ctx.createGain()
  delayGain.gain.value = 0.25
  delay.connect(delayGain)
  delayGain.connect(ctx.destination)
  delayGain.connect(delay)
  master.connect(delay)

  function note(freq, start, dur, vol = 0.15, type = 'sawtooth') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, now + start)
    gain.gain.linearRampToValueAtTime(vol, now + start + 0.02)
    gain.gain.setValueAtTime(vol, now + start + dur - 0.1)
    gain.gain.linearRampToValueAtTime(0, now + start + dur)
    osc.connect(gain); gain.connect(master)
    osc.start(now + start); osc.stop(now + start + dur)
  }
  function drum(start, vol = 0.4) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, now + start)
    osc.frequency.exponentialRampToValueAtTime(40, now + start + 0.3)
    gain.gain.setValueAtTime(vol, now + start)
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.3)
    osc.connect(gain); gain.connect(master)
    osc.start(now + start); osc.stop(now + start + 0.3)
  }
  drum(0, 0.4)
  note(523.25, 0.0, 0.4, 0.12)
  note(659.25, 0.12, 0.4, 0.10)
  note(783.99, 0.24, 0.5, 0.10)
  note(1046.50, 0.36, 0.6, 0.08)
  note(523.25, 0.6, 1.5, 0.10)
  note(659.25, 0.6, 1.5, 0.08)
  note(783.99, 0.6, 1.5, 0.08)
  note(1046.50, 0.6, 1.5, 0.06)
  note(1046.50, 1.8, 0.4, 0.05, 'sine')
  note(1318.51, 1.9, 0.4, 0.04, 'sine')
}

// Generate enter sound
function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.35
  master.connect(ctx.destination)

  function note(freq, start, dur, vol = 0.15, type = 'sawtooth') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type; osc.frequency.value = freq
    gain.gain.setValueAtTime(0, now + start)
    gain.gain.linearRampToValueAtTime(vol, now + start + 0.02)
    gain.gain.setValueAtTime(vol, now + start + dur - 0.1)
    gain.gain.linearRampToValueAtTime(0, now + start + dur)
    osc.connect(gain); gain.connect(master)
    osc.start(now + start); osc.stop(now + start + dur)
  }
  function drum(start, vol = 0.4) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, now + start)
    osc.frequency.exponentialRToValueAtTime(40, now + start + 0.3)
    gain.gain.setValueAtTime(vol, now + start)
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.3)
    osc.connect(gain); gain.connect(master)
    osc.start(now + start); osc.stop(now + start + 0.3)
  }
  drum(0, 0.5)
  note(523.25, 0.0, 0.4, 0.12)
  note(659.25, 0.08, 0.4, 0.10)
  note(783.99, 0.16, 0.5, 0.10)
  note(523.25, 0.4, 1.0, 0.10)
  note(659.25, 0.4, 1.0, 0.08)
  note(783.99, 0.4, 1.0, 0.08)
  note(1046.50, 0.4, 1.0, 0.06)
  note(1046.50, 1.0, 0.4, 0.05, 'sine')
  note(1318.51, 1.1, 0.4, 0.04, 'sine')
}

// Easter egg: special victory fanfare
function playVictoryFanfare(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.35
  master.connect(ctx.destination)
  function note(freq, start, dur, vol = 0.15, type = 'sawtooth') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type; osc.frequency.value = freq
    gain.gain.setValueAtTime(0, now + start)
    gain.gain.linearRampToValueAtTime(vol, now + start + 0.02)
    gain.gain.setValueAtTime(vol, now + start + dur - 0.1)
    gain.gain.linearRampToValueAtTime(0, now + start + dur)
    osc.connect(gain); gain.connect(master)
    osc.start(now + start); osc.stop(now + start + dur)
  }
  // Victory melody
  note(659.25, 0, 0.3, 0.12)  // E5
  note(659.25, 0.3, 0.3, 0.12)  // E5
  note(659.25, 0.6, 0.3, 0.12)  // E5
  note(523.25, 0.9, 0.6, 0.14)  // C5
  note(659.25, 1.5, 0.6, 0.14)  // E5
  note(783.99, 2.1, 1.2, 0.14)  // G5
  note(1046.50, 2.1, 1.2, 0.08) // C6
  note(1318.51, 3.3, 0.8, 0.06, 'sine') // E6
}

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const [eggMessage, setEggMessage] = useState(null)
  const [eggEffect, setEggEffect] = useState(null)
  const audioCtxRef = useRef(null)
  const crestClicksRef = useRef(0)
  const titleHoldsRef = useRef(0)
  const konamiRef = useRef([])

  // Detect mobile for performance
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  }, [])

  // Particle count: 12 on mobile, 30 on desktop
  const particleCount = isMobile ? 12 : 30
  const rayCount = isMobile ? 0 : 6

  // Precompute particle data
  const particles = useMemo(() => 
    Array.from({ length: particleCount }).map((_, i) => ({
      left: (i * (100 / particleCount) + 2) % 100,
      delay: (i * 0.3) % 10,
      dur: 8 + (i % 6),
      size: 2 + (i % 3),
    }))
  , [particleCount])

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) {
      audioCtxRef.current = new AudioCtx()
      const ctx = audioCtxRef.current
      if (ctx.state === 'running') {
        playFanfare(ctx)
      } else {
        ctx.resume().then(() => {
          if (ctx.state === 'running') playFanfare(ctx)
        }).catch(() => {})
      }
    }

    // Easter egg: Konami code
    const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
    const onKey = (e) => {
      konamiRef.current.push(e.key)
      if (konamiRef.current.length > konami.length) konamiRef.current.shift()
      if (konamiRef.current.join(',').toLowerCase() === konami.join(',').toLowerCase()) {
        triggerEgg('konami')
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const triggerEgg = (type) => {
    const ctx = audioCtxRef.current
    const messages = {
      konami: { msg: 'You found the Royal Secret! The Crown acknowledges you.', effect: 'gold-flash', sound: 'victory' },
      '846': { msg: '8 Battles Won. The Crown Remembers.', effect: 'crest-spin', sound: 'fanfare' },
      crest: { msg: '846 — Forged in 8 battles, crowned in glory.', effect: 'gold-confetti', sound: 'victory' },
      title: { msg: 'True heirs seek the crown. You are one.', effect: 'title-glow', sound: 'fanfare' },
    }
    const egg = messages[type]
    if (!egg) return

    setEggMessage(egg.msg)
    setEggEffect(egg.effect)

    if (ctx) {
      if (ctx.state !== 'running') ctx.resume().then(() => {
        if (egg.sound === 'victory') playVictoryFanfare(ctx)
        else playFanfare(ctx)
      }).catch(() => {})
      else {
        if (egg.sound === 'victory') playVictoryFanfare(ctx)
        else playFanfare(ctx)
      }
    }

    setTimeout(() => { setEggMessage(null); setEggEffect(null) }, 5000)
  }

  const onCrestClick = () => {
    crestClicksRef.current++
    if (crestClicksRef.current >= 5) {
      crestClicksRef.current = 0
      triggerEgg('crest')
    }
  }

  const onTitleHold = () => {
    titleHoldsRef.current++
    if (titleHoldsRef.current >= 2) {
      titleHoldsRef.current = 0
      triggerEgg('title')
    }
  }

  const enter = () => {
    if (fading) return
    const ctx = audioCtxRef.current
    if (ctx) {
      if (ctx.state !== 'running') {
        ctx.resume().then(() => playEnterSound(ctx)).catch(() => {})
      } else {
        playEnterSound(ctx)
      }
    }
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1500)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'splash-fade-out' : ''} ${eggEffect === 'gold-flash' ? 'egg-gold-flash' : ''}`}
      style={{ background: '#060810', contain: isMobile ? 'strict' : 'none' }}
    >
      {/* Cinematic throne room background */}
      <img
        src="./assets/royal-bg.jpg"
        alt=""
        loading="eager"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 1,
          animation: isMobile ? 'none' : 'bg-zoom 20s ease-in-out infinite alternate',
          willChange: isMobile ? 'auto' : 'transform',
        }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(6,8,16,0.3) 0%, rgba(6,8,16,0.75) 70%, rgba(6,8,16,0.92) 100%)',
      }} />

      {/* God rays - desktop only */}
      {rayCount > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          {Array.from({ length: rayCount }).map((_, i) => {
            const angle = (i * (360 / rayCount)) - 90
            return (
              <div key={i} style={{
                position: 'absolute', top: '25%', left: '50%',
                width: '1px', height: '100vh',
                background: 'linear-gradient(to bottom, rgba(232,199,102,0.1), transparent 60%)',
                transformOrigin: 'top center',
                transform: `translateX(-50%) rotate(${angle}deg)`,
                animation: `ray-flicker 5s ease-in-out ${i * 0.4}s infinite`,
                willChange: 'opacity',
              }} />
            )
          })}
        </div>
      )}

      {/* Gold border frame */}
      <div style={{
        position: 'absolute', inset: '16px', zIndex: 15, pointerEvents: 'none',
        border: '1px solid rgba(212,175,55,0.2)', borderRadius: '6px',
        animation: 'frame-glow 5s ease-in-out infinite',
      }}>
        <div style={{ position: 'absolute', inset: '5px', border: '1px solid rgba(212,175,55,0.08)', borderRadius: '3px' }} />
      </div>

      {/* Floating gold particles - fewer on mobile */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((p, i) => (
          <span key={i} style={{
            position: 'absolute', bottom: '-10px', left: `${p.left}%`,
            width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%',
            background: i % 3 === 0 ? '#D4AF37' : '#E8C766',
            boxShadow: `0 0 ${4 + p.size}px rgba(212,175,55,0.5)`,
            opacity: 0,
            animation: `ember-rise ${p.dur}s linear ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          }} />
        ))}
      </div>

      {/* Rotating ring behind crest - desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute', zIndex: 5, pointerEvents: 'none',
          top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(28vh, 280px)', height: 'min(28vh, 280px)',
          borderRadius: '50%', border: '1px solid rgba(212,175,55,0.12)',
          animation: 'spin-cw 25s linear infinite',
          willChange: 'transform',
        }}>
          <div style={{
            position: 'absolute', inset: '15px', borderRadius: '50%',
            border: '1px solid rgba(212,175,55,0.06)',
          }} />
        </div>
      )}

      {/* Glow halo behind crest */}
      <div style={{
        position: 'absolute', zIndex: 5, pointerEvents: 'none',
        top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(25vh, 250px)', height: 'min(25vh, 250px)', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(140,43,58,0.05) 40%, transparent 65%)',
        animation: 'halo-pulse 5s ease-in-out infinite',
        willChange: 'transform, opacity',
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', textAlign: 'center', gap: '0.6rem' }}>

        {/* Royal Crest Image - click 5x for easter egg */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={onCrestClick}
        >
          <img
            src="./assets/crest-846.png"
            alt="Kingdom 846 Royal Crest"
            loading="eager"
            style={{
              maxHeight: isMobile ? '25vh' : '35vh',
              maxWidth: '70vw',
              width: 'auto', height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 35px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(212,175,55,0.2))',
              animation: eggEffect === 'crest-spin' ? 'crest-spin-fast 2s ease-in-out' : 'crest-float 7s ease-in-out infinite',
              position: 'relative', zIndex: 2,
              willChange: 'transform',
            }}
          />
        </div>

        {/* Eyebrow */}
        <p style={{
          fontSize: 'clamp(10px, 1.5vw, 13px)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.45em', color: '#D4AF37', opacity: 0.7, marginBottom: '0.25rem',
          textShadow: '0 0 12px rgba(212,175,55,0.4)', paddingLeft: '0.45em',
        }}>One Crown · Four Alliances</p>

        {/* Title - hold/click for easter egg */}
        <h1
          onClick={onTitleHold}
          style={{
            fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
            fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, margin: 0, letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #6B5414 0%, #9C7A24 12%, #D4AF37 28%, #E8C766 42%, #F3E8CC 50%, #E8C766 58%, #D4AF37 72%, #9C7A24 88%, #6B5414 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: eggEffect === 'title-glow' ? 'title-super-glow 2s ease-in-out' : 'gold-flow 5s linear infinite',
            filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.7))',
            cursor: 'pointer',
          }}
        >KINGDOM 846</h1>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.4rem 0' }}>
          <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37 50%, transparent)' }} />
          <span style={{ color: '#D4AF37', opacity: 0.5, fontSize: '11px', textShadow: '0 0 8px rgba(212,175,55,0.4)' }}>✦ ◆ ✦</span>
          <div style={{ width: '70px', height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37 50%, transparent)' }} />
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          color: '#D4AF37', opacity: 0.65, fontStyle: 'italic', letterSpacing: '0.04em',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>Where legends are forged in fire and crowned in gold</p>

        {/* Enter button */}
        <button
          onClick={enter}
          style={{
            marginTop: '0.75rem', padding: '15px 44px',
            fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em',
            color: '#0a0e1a',
            background: 'linear-gradient(135deg, #6B5414 0%, #9C7A24 15%, #D4AF37 30%, #E8C766 45%, #F3E8CC 50%, #E8C766 55%, #D4AF37 70%, #9C7A24 85%, #6B5414 100%)',
            backgroundSize: '200% auto',
            border: 'none', borderRadius: '6px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
            boxShadow: '0 5px 22px rgba(212,175,55,0.35), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
            animation: 'btn-shimmer 4s linear infinite',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)'
            e.currentTarget.style.boxShadow = '0 10px 32px rgba(212,175,55,0.45), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 5px 22px rgba(212,175,55,0.35), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)'
          }}
        >
          Enter the Realm
        </button>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: '6px', height: '6px', borderRadius: '50%', background: '#D4AF37',
              boxShadow: '0 0 8px rgba(212,175,55,0.4)',
              animation: `dot-pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Easter egg message */}
      {eggMessage && (
        <div style={{
          position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, textAlign: 'center', padding: '0 2rem',
          animation: 'egg-appear 0.5s ease-out',
        }}>
          <p style={{
            fontFamily: "'Cinzel Decorative', serif",
            fontSize: 'clamp(1rem, 4vw, 1.8rem)',
            color: '#E8C766',
            textShadow: '0 0 20px rgba(212,175,55,0.8), 0 0 40px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.9)',
            letterSpacing: '0.05em', lineHeight: 1.4,
          }}>{eggMessage}</p>
        </div>
      )}

      {/* Gold confetti for easter egg */}
      {eggEffect === 'gold-confetti' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', overflow: 'hidden' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} style={{
              position: 'absolute', top: '-10px', left: `${(i * 5) % 100}%`,
              width: '4px', height: '12px', background: i % 2 ? '#D4AF37' : '#E8C766',
              borderRadius: '1px',
              animation: `confetti-fall ${2 + (i % 3)}s linear ${i * 0.1}s infinite`,
            }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes splash-fade { to { opacity: 0; visibility: hidden; } }
        .splash-fade-out { animation: splash-fade 1.2s ease-in forwards; }
        @keyframes bg-zoom { 0% { transform: scale(1); } 100% { transform: scale(1.08); } }
        @keyframes ray-flicker { 0%,100% { opacity: 0.3; } 50% { opacity: 0.7; } }
        @keyframes ember-rise {
          0% { opacity: 0; transform: translateY(0) translateX(0) scale(1); }
          10% { opacity: 0.8; }
          80% { opacity: 0.4; }
          100% { opacity: 0; transform: translateY(-100vh) translateX(20px) scale(0.2); }
        }
        @keyframes spin-cw { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes halo-pulse { 0%,100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.15); } }
        @keyframes gold-flow { to { background-position: 200% center; } }
        @keyframes btn-shimmer { to { background-position: 200% center; } }
        @keyframes crest-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes crest-spin-fast { 0% { transform: rotate(0) scale(1); } 50% { transform: rotate(360deg) scale(1.2); } 100% { transform: rotate(720deg) scale(1); } }
        @keyframes frame-glow { 0%,100% { border-color: rgba(212,175,55,0.15); } 50% { border-color: rgba(212,175,55,0.3); } }
        @keyframes dot-pulse { 0%,80%,100% { opacity: 0.2; transform: scale(1); } 40% { opacity: 1; transform: scale(1.5); } }
        @keyframes title-super-glow { 0%,100% { filter: drop-shadow(0 4px 14px rgba(0,0,0,0.7)); } 50% { filter: drop-shadow(0 0 30px rgba(232,199,102,1)) drop-shadow(0 0 60px rgba(212,175,55,0.8)); } }
        @keyframes egg-appear { 0% { opacity: 0; transform: translateX(-50%) translateY(20px); } 100% { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes confetti-fall { 0% { opacity: 1; transform: translateY(0) rotate(0); } 100% { opacity: 0; transform: translateY(100vh) rotate(720deg); } }
        .egg-gold-flash { animation: egg-flash 0.8s ease-out; }
        @keyframes egg-flash { 0%,100% { background: #060810; } 50% { background: rgba(212,175,55,0.3); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </div>
  )
}
