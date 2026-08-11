import { useState, useEffect, useRef } from 'react'

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const [entered, setEntered] = useState(false)
  const audioCtxRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Dramatic ambient sound using Web Audio API (no external file needed)
  const playSound = () => {
    if (entered) return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const now = ctx.currentTime

      // Deep boom (bass drum)
      const boom = ctx.createOscillator()
      const boomGain = ctx.createGain()
      boom.frequency.setValueAtTime(55, now)
      boom.frequency.exponentialRampToValueAtTime(28, now + 1.2)
      boomGain.gain.setValueAtTime(0.0001, now)
      boomGain.gain.exponentialRampToValueAtTime(0.5, now + 0.05)
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
      boom.connect(boomGain).connect(ctx.destination)
      boom.start(now); boom.stop(now + 1.5)

      // Rising shimmer (gold sparkle)
      const shimmer = ctx.createOscillator()
      const shimmerGain = ctx.createGain()
      shimmer.type = 'triangle'
      shimmer.frequency.setValueAtTime(400, now)
      shimmer.frequency.exponentialRampToValueAtTime(1200, now + 0.8)
      shimmerGain.gain.setValueAtTime(0.0001, now)
      shimmerGain.gain.exponentialRampToValueAtTime(0.08, now + 0.3)
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      shimmer.connect(shimmerGain).connect(ctx.destination)
      shimmer.start(now); shimmer.stop(now + 1.2)

      // Epic horn note
      const horn = ctx.createOscillator()
      const hornGain = ctx.createGain()
      horn.type = 'sawtooth'
      horn.frequency.setValueAtTime(110, now + 0.1)
      horn.frequency.linearRampToValueAtTime(165, now + 0.4)
      hornGain.gain.setValueAtTime(0.0001, now + 0.1)
      hornGain.gain.exponentialRampToValueAtTime(0.06, now + 0.3)
      hornGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8)
      const hornFilter = ctx.createBiquadFilter()
      hornFilter.type = 'lowpass'
      hornFilter.frequency.setValueAtTime(800, now + 0.1)
      horn.connect(hornFilter).connect(hornGain).connect(ctx.destination)
      horn.start(now + 0.1); horn.stop(now + 1.8)
    } catch (e) { /* audio not available */ }
  }

  const enter = () => {
    if (fading) return
    setEntered(true)
    playSound()
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1200)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'splash-fade-out' : ''}`}
      style={{ background: '#060810' }}
    >
      {/* ===== AI-GENERATED CASTLE BACKGROUND ===== */}
      <img
        src="./assets/splash-castle-bg.png"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          opacity: 0.7,
          animation: 'bg-zoom 20s ease-out forwards',
        }}
      />
      {/* Dark gradient overlay for text readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(180deg, rgba(6,8,16,0.6) 0%, rgba(6,8,16,0.3) 40%, rgba(6,8,16,0.7) 80%, rgba(6,8,16,0.95) 100%)',
      }} />

      {/* ===== GOD RAYS (CSS animated) ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45) - 90
          return (
            <div key={i} style={{
              position: 'absolute', top: '30%', left: '50%',
              width: '1px', height: '100vh',
              background: 'linear-gradient(to bottom, rgba(232,199,102,0.12), transparent 60%)',
              transformOrigin: 'top center',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              animation: `ray-flicker 5s ease-in-out ${i * 0.4}s infinite`,
            }} />
          )
        })}
      </div>

      {/* ===== FLOATING GOLD PARTICLES ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 50 }).map((_, i) => {
          const left = (i * 2 + 2) % 100
          const delay = (i * 0.25) % 10
          const dur = 7 + (i % 8)
          const size = 1 + (i % 4)
          return (
            <span key={i} style={{
              position: 'absolute', bottom: '-10px', left: `${left}%`,
              width: `${size}px`, height: `${size}px`, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,199,102,0.9), rgba(212,175,55,0))',
              opacity: 0,
              animation: `float-up ${dur}s linear ${delay}s infinite`,
            }} />
          )
        })}
      </div>

      {/* ===== SHOCKWAVE RINGS ===== */}
      <div style={{ position: 'absolute', zIndex: 5, pointerEvents: 'none', top: '50%', left: '50%' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            width: '120px', height: '120px',
            borderRadius: '50%',
            border: '1px solid rgba(232,199,102,0.25)',
            transform: 'translate(-50%, -50%)',
            animation: `ring-expand 4s ease-out ${i * 1.3}s infinite`,
          }} />
        ))}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1.5rem', textAlign: 'center' }}>

        {/* Shield Crest */}
        <div style={{ width: '120px', height: '120px', marginBottom: '1.25rem', position: 'relative' }}>
          <svg viewBox="0 0 140 140" width="120" height="120">
            {/* Rotating dashed rings */}
            <g style={{ animation: 'spin-cw 25s linear infinite', transformOrigin: '70px 70px' }}>
              <circle cx="70" cy="70" r="67" fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth="0.5" strokeDasharray="2 8" />
            </g>
            <g style={{ animation: 'spin-ccw 18s linear infinite', transformOrigin: '70px 70px' }}>
              <circle cx="70" cy="70" r="61" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="0.3" strokeDasharray="1 5" />
            </g>
            {/* Shield */}
            <path
              d="M70,16 L114,29 L114,66 Q114,100 70,122 Q26,100 26,66 L26,29 Z"
              fill="url(#splash-shield-grad)"
              stroke="#D4AF37"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.5))', animation: 'shield-pulse 3s ease-in-out infinite' }}
            />
            <path d="M70,20 L110,32 L110,66 Q110,96 70,116 Q30,96 30,66 L30,32 Z" fill="none" stroke="rgba(232,199,102,0.25)" strokeWidth="0.5" />
            {/* Castle towers */}
            <g transform="translate(70,58)">
              <rect x="-24" y="-6" width="9" height="24" fill="#D4AF37" rx="1" />
              <rect x="-25" y="-10" width="3" height="5" fill="#D4AF37" /><rect x="-20" y="-10" width="3" height="5" fill="#D4AF37" /><rect x="-15" y="-10" width="3" height="5" fill="#D4AF37" />
              <rect x="-5" y="-16" width="10" height="34" fill="#E8C766" rx="1" />
              <rect x="-6" y="-20" width="3" height="5" fill="#E8C766" /><rect x="-1" y="-20" width="3" height="5" fill="#E8C766" /><rect x="4" y="-20" width="3" height="5" fill="#E8C766" />
              <rect x="15" y="-6" width="9" height="24" fill="#D4AF37" rx="1" />
              <rect x="14" y="-10" width="3" height="5" fill="#D4AF37" /><rect x="19" y="-10" width="3" height="5" fill="#D4AF37" /><rect x="24" y="-10" width="3" height="5" fill="#D4AF37" />
              <path d="M-3,18 L-3,10 Q-3,5 0,5 Q3,5 3,10 L3,18 Z" fill="#060810" stroke="#D4AF37" strokeWidth="0.5" />
              <rect x="-21" y="2" width="2" height="4" fill="#060810" opacity="0.7" />
              <rect x="-2" y="-4" width="2" height="4" fill="#060810" opacity="0.7" />
              <rect x="18" y="2" width="2" height="4" fill="#060810" opacity="0.7" />
            </g>
            <text x="70" y="108" textAnchor="middle" fill="#E8C766" fontFamily="Cinzel, serif" fontSize="17" fontWeight="bold" letterSpacing="2">846</text>
            <defs>
              <linearGradient id="splash-shield-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A1F38" />
                <stop offset="100%" stopColor="#0E1220" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Eyebrow */}
        <p style={{
          fontSize: 'clamp(10px, 1.5vw, 13px)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5em', color: '#D4AF37', marginBottom: '0.5rem',
          textShadow: '0 0 12px rgba(212,175,55,0.4)', paddingLeft: '0.5em',
        }}>United We Rise</p>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          fontSize: 'clamp(1.7rem, 5.5vw, 3.5rem)', fontWeight: 'bold',
          color: '#E8C766', margin: 0, letterSpacing: '0.02em',
          textShadow: '0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.25), 0 2px 10px rgba(0,0,0,0.9)',
        }}>Welcome to Kingdom 846</h1>

        {/* Subtitle */}
        <p style={{
          marginTop: '0.5rem', fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
          color: 'rgba(243,232,204,0.6)', fontStyle: 'italic',
        }}>A realm forged in fire, built for victory</p>

        {/* Divider */}
        <div style={{
          marginTop: '1.25rem', width: '180px', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
        }} />

        {/* Enter button */}
        <button
          onClick={enter}
          style={{
            marginTop: '1.25rem', padding: '0.8rem 2.5rem',
            fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em',
            color: '#0E1220',
            background: 'linear-gradient(180deg, #E8C766, #D4AF37)',
            border: '1px solid #9C7A24', borderRadius: '0.5rem', cursor: 'pointer',
            boxShadow: '0 6px 24px -6px rgba(212,175,55,0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'
            e.currentTarget.style.boxShadow = '0 12px 36px -6px rgba(212,175,55,0.9), inset 0 1px 0 rgba(255,255,255,0.35)'
            e.currentTarget.style.filter = 'brightness(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 6px 24px -6px rgba(212,175,55,0.7), inset 0 1px 0 rgba(255,255,255,0.25)'
            e.currentTarget.style.filter = 'brightness(1)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L4 7v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V7l-8-5z" />
          </svg>
          Enter the Realm
        </button>
      </div>

      <style>{`
        @keyframes splash-fade { to { opacity: 0; visibility: hidden; } }
        .splash-fade-out { animation: splash-fade 1.2s ease-in forwards; }
        @keyframes bg-zoom { from { transform: scale(1.15); } to { transform: scale(1); } }
        @keyframes ray-flicker { 0%,100% { opacity: 0.3; } 50% { opacity: 0.7; } }
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-100vh) scale(1.2); opacity: 0; }
        }
        @keyframes ring-expand {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
        @keyframes spin-cw { to { transform: rotate(360deg); } }
        @keyframes spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes shield-pulse {
          0%,100% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.4)); }
          50% { filter: drop-shadow(0 0 22px rgba(212,175,55,0.8)); }
        }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </div>
  )
}
