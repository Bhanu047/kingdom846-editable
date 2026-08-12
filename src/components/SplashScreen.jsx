import { useState, useEffect, useRef } from 'react'

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const [entered, setEntered] = useState(false)
  const audioRef = useRef(null)
  const enterAudioRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    // Autoplay fanfare - try immediately, fallback on any interaction
    if (audioRef.current) {
      audioRef.current.volume = 0.7
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay - play on ANY first interaction
        const playOnInteract = () => {
          audioRef.current?.play().catch(() => {})
          document.removeEventListener('mousemove', playOnInteract)
          document.removeEventListener('touchstart', playOnInteract)
          document.removeEventListener('touchmove', playOnInteract)
          document.removeEventListener('keydown', playOnInteract)
          document.removeEventListener('click', playOnInteract)
          document.removeEventListener('scroll', playOnInteract)
          document.removeEventListener('pointermove', playOnInteract)
        }
        document.addEventListener('mousemove', playOnInteract)
        document.addEventListener('touchstart', playOnInteract, { passive: true })
        document.addEventListener('touchmove', playOnInteract, { passive: true })
        document.addEventListener('keydown', playOnInteract)
        document.addEventListener('click', playOnInteract)
        document.addEventListener('scroll', playOnInteract, { passive: true })
        document.addEventListener('pointermove', playOnInteract)
      })
    }
    
    return () => { document.body.style.overflow = '' }
  }, [])

  const enter = () => {
    if (fading) return
    setEntered(true)
    // Play enter sound
    if (enterAudioRef.current) {
      enterAudioRef.current.volume = 0.8
      enterAudioRef.current.currentTime = 0
      enterAudioRef.current.play().catch(() => {})
    }
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1500)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'splash-fade-out' : ''}`}
      style={{ background: '#060810' }}
    >
      {/* Autoplay royal fanfare - plays when website opens */}
      <audio ref={audioRef} autoPlay>
        <source src="./assets/fanfare.wav" type="audio/wav" />
      </audio>
      {/* Enter sound - plays when user taps Enter the Realm */}
      <audio ref={enterAudioRef} preload="auto">
        <source src="./assets/enter-sound.wav" type="audio/wav" />
      </audio>

      {/* Cinematic throne room background */}
      <img
        src="./assets/royal-bg.jpg"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          animation: 'bg-zoom 20s ease-in-out infinite alternate',
        }}
      />

      {/* Dark gradient overlay for text readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(6,8,16,0.3) 0%, rgba(6,8,16,0.75) 70%, rgba(6,8,16,0.92) 100%)',
      }} />

      {/* God rays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45) - 90
          return (
            <div key={i} style={{
              position: 'absolute', top: '25%', left: '50%',
              width: '1px', height: '100vh',
              background: 'linear-gradient(to bottom, rgba(232,199,102,0.1), transparent 60%)',
              transformOrigin: 'top center',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              animation: `ray-flicker 5s ease-in-out ${i * 0.4}s infinite`,
            }} />
          )
        })}
      </div>

      {/* Gold border frame */}
      <div style={{
        position: 'absolute', inset: '16px', zIndex: 15, pointerEvents: 'none',
        border: '1px solid rgba(212,175,55,0.2)', borderRadius: '6px',
        animation: 'frame-glow 5s ease-in-out infinite',
      }}>
        <div style={{ position: 'absolute', inset: '5px', border: '1px solid rgba(212,175,55,0.08)', borderRadius: '3px' }} />
      </div>

      {/* Floating gold particles */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const left = (i * 2.5 + 2) % 100
          const delay = (i * 0.25) % 10
          const dur = 8 + (i % 8)
          const size = 2 + (i % 3)
          return (
            <span key={i} style={{
              position: 'absolute', bottom: '-10px', left: `${left}%`,
              width: `${size}px`, height: `${size}px`, borderRadius: '50%',
              background: i % 3 === 0 ? '#D4AF37' : '#E8C766',
              boxShadow: `0 0 ${4 + size}px rgba(212,175,55,0.5)`,
              opacity: 0,
              animation: `ember-rise ${dur}s linear ${delay}s infinite`,
            }} />
          )
        })}
      </div>

      {/* Rotating ring behind crest */}
      <div style={{
        position: 'absolute', zIndex: 5, pointerEvents: 'none',
        top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(28vh, 280px)', height: 'min(28vh, 280px)',
        borderRadius: '50%', border: '1px solid rgba(212,175,55,0.12)',
        animation: 'spin-cw 25s linear infinite',
      }}>
        <div style={{
          position: 'absolute', inset: '15px', borderRadius: '50%',
          border: '1px solid rgba(212,175,55,0.06)',
        }} />
      </div>

      {/* Glow halo behind crest */}
      <div style={{
        position: 'absolute', zIndex: 5, pointerEvents: 'none',
        top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(25vh, 250px)', height: 'min(25vh, 250px)', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(140,43,58,0.05) 40%, transparent 65%)',
        animation: 'halo-pulse 5s ease-in-out infinite',
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', textAlign: 'center', gap: '0.6rem' }}>

        {/* Royal Crest Image */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="./assets/crest-846.png"
            alt="Kingdom 846 Royal Crest"
            style={{
              maxHeight: '35vh',
              maxWidth: '70vw',
              width: 'auto', height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 35px rgba(0,0,0,0.9)) drop-shadow(0 0 25px rgba(212,175,55,0.2))',
              animation: 'crest-float 7s ease-in-out infinite',
              position: 'relative', zIndex: 2,
            }}
          />
        </div>

        {/* Eyebrow */}
        <p style={{
          fontSize: 'clamp(10px, 1.5vw, 13px)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.45em', color: '#D4AF37', opacity: 0.7, marginBottom: '0.25rem',
          textShadow: '0 0 12px rgba(212,175,55,0.4)', paddingLeft: '0.45em',
        }}>One Crown · Four Alliances</p>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 900, margin: 0, letterSpacing: '0.06em',
          background: 'linear-gradient(135deg, #6B5414 0%, #9C7A24 12%, #D4AF37 28%, #E8C766 42%, #F3E8CC 50%, #E8C766 58%, #D4AF37 72%, #9C7A24 88%, #6B5414 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'gold-flow 5s linear infinite',
          filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.7))',
        }}>KINGDOM 846</h1>

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
        @keyframes frame-glow { 0%,100% { border-color: rgba(212,175,55,0.15); } 50% { border-color: rgba(212,175,55,0.3); } }
        @keyframes dot-pulse { 0%,80%,100% { opacity: 0.2; transform: scale(1); } 40% { opacity: 1; transform: scale(1.5); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
        @media (max-width: 768px) {
          .splash-fade-out img[alt="Kingdom 846 Royal Crest"] { max-height: 28vh !important; }
        }
        @media (max-width: 480px) {
          .splash-fade-out img[alt="Kingdom 846 Royal Crest"] { max-height: 22vh !important; }
        }
      `}</style>
    </div>
  )
}
