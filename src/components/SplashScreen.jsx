import { useState, useEffect } from 'react'

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const enter = () => {
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1000)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'splash-fade-out' : ''}`}
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1f3a 0%, #0d1020 50%, #060810 100%)' }}
    >
      {/* ===== GOD RAYS ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) - 90
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '35%',
                left: '50%',
                width: '2px',
                height: '120vh',
                background: `linear-gradient(to bottom, rgba(212,175,55,0.15), transparent 70%)`,
                transformOrigin: 'top center',
                transform: `translateX(-50%) rotate(${angle}deg)`,
                animation: `god-ray-pulse 4s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          )
        })}
      </div>

      {/* ===== CENTRAL GLOW ===== */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
          zIndex: 2,
          animation: 'glow-breathe 4s ease-in-out infinite',
        }}
      />

      {/* ===== DRAGON SILHOUETTE ===== */}
      <svg
        viewBox="0 0 200 60"
        style={{
          position: 'absolute',
          top: '15%',
          left: '-15%',
          width: '40%',
          height: 'auto',
          zIndex: 3,
          opacity: 0.25,
          animation: 'dragon-fly 15s linear infinite',
        }}
      >
        <path
          d="M10,30 Q15,20 25,22 L35,18 Q40,15 45,18 L52,12 Q56,10 58,14 L55,22 Q60,20 65,24 L75,20 Q80,18 82,24 L78,30 Q85,28 90,32 L100,28 Q105,26 108,30 L105,36 Q112,34 116,38 L125,34 Q130,32 132,36 L128,42 Q135,40 140,44 L150,40 Q155,38 158,42 L155,48 Q162,46 166,50 L175,46 Q182,44 185,48 Q190,52 185,54 L175,52 Q170,54 165,52 L155,50 Q150,52 145,50 L135,48 Q128,50 125,48 L115,46 Q108,48 105,48 L95,46 Q88,48 85,48 L75,46 Q68,48 65,48 L55,46 Q48,48 45,48 L35,46 Q28,48 25,48 L15,46 Q8,44 10,30 Z M52,12 Q48,6 50,2 Q54,4 56,8 M58,14 Q62,8 66,6 Q64,12 60,16"
          fill="#1a1f38"
          stroke="rgba(212,175,55,0.2)"
          strokeWidth="0.3"
        />
      </svg>

      {/* ===== CASTLE SILHOUETTE ===== */}
      <svg
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '35%',
          zIndex: 2,
        }}
      >
        {/* Distant mountains */}
        <path
          d="M0,300 L0,200 L100,160 L200,190 L350,130 L500,170 L650,120 L800,160 L950,140 L1100,170 L1200,150 L1200,300 Z"
          fill="#0d1020"
          opacity="0.6"
        />
        {/* Castle structures */}
        <path
          d="M0,300 L0,220 L40,220 L40,180 L55,180 L55,150 L75,150 L75,180 L90,180 L90,220 L140,220 L140,160 L160,160 L160,140 L175,140 L175,125 L195,125 L195,140 L210,140 L210,160 L230,160 L230,220 L290,220 L290,170 L310,170 L310,150 L325,150 L325,130 L345,130 L345,150 L360,150 L360,170 L380,170 L380,220 L440,220 L440,140 L465,140 L465,115 L490,115 L490,95 L520,95 L520,115 L545,115 L545,140 L570,140 L570,220 L630,220 L630,160 L655,160 L655,135 L680,135 L680,115 L705,115 L705,135 L725,135 L725,160 L750,160 L750,220 L810,220 L810,170 L830,170 L830,150 L850,150 L850,130 L870,130 L870,150 L890,150 L890,170 L910,170 L910,220 L970,220 L970,180 L985,180 L985,150 L1005,150 L1005,180 L1020,180 L1020,220 L1080,220 L1080,200 L1100,200 L1100,180 L1120,180 L1120,200 L1140,200 L1140,220 L1200,220 L1200,300 Z"
          fill="url(#castle-grad-splash)"
        />
        {/* Flag poles */}
        <line x1="520" y1="95" x2="520" y2="65" stroke="#D4AF37" strokeWidth="1.5" opacity="0.5" />
        <g style={{ animation: 'flag-wave-splash 2.5s ease-in-out infinite', transformOrigin: '520px 65px' }}>
          <path d="M520,65 L535,68 L532,74 L520,72 Z" fill="#D4AF37" opacity="0.4" />
        </g>
        <line x1="490" y1="115" x2="490" y2="90" stroke="#D4AF37" strokeWidth="1" opacity="0.4" />
        <g style={{ animation: 'flag-wave-splash 2s ease-in-out infinite', transformOrigin: '490px 90px' }}>
          <path d="M490,90 L502,93 L500,97 L490,95 Z" fill="#D4AF37" opacity="0.3" />
        </g>
        <line x1="175" y1="125" x2="175" y2="105" stroke="#D4AF37" strokeWidth="1" opacity="0.3" />
        <g style={{ animation: 'flag-wave-splash 3s ease-in-out infinite', transformOrigin: '175px 105px' }}>
          <path d="M175,105 L185,107 L183,111 L175,109 Z" fill="#D4AF37" opacity="0.25" />
        </g>
        {/* Glowing windows */}
        <rect x="48" y="200" width="3" height="5" fill="#E8C766" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.3;0.6" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="525" y="170" width="3" height="5" fill="#E8C766" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite" />
        </rect>
        <rect x="705" y="190" width="3" height="5" fill="#E8C766" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.3;0.5" dur="4s" repeatCount="indefinite" />
        </rect>
        <defs>
          <linearGradient id="castle-grad-splash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1f38" />
            <stop offset="100%" stopColor="#060810" />
          </linearGradient>
        </defs>
      </svg>

      {/* ===== FLOATING PARTICLES ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const left = (i * 2.5 + 3) % 100
          const delay = (i * 0.3) % 8
          const dur = 6 + (i % 6)
          const size = 1 + (i % 5)
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                bottom: '-10px',
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(232,199,102,0.9), rgba(212,175,55,0))',
                opacity: 0,
                animation: `ember-rise ${dur}s linear ${delay}s infinite`,
              }}
            />
          )
        })}
      </div>

      {/* ===== SHOCKWAVE RINGS ===== */}
      <div style={{ position: 'absolute', zIndex: 4, pointerEvents: 'none' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '1px solid rgba(212,175,55,0.3)',
              transform: 'translate(-50%, -50%)',
              animation: `shockwave 3s ease-out ${i * 1}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem', textAlign: 'center' }}>

        {/* Shield Crest */}
        <div style={{ width: '130px', height: '130px', marginBottom: '1.5rem', position: 'relative' }}>
          <svg viewBox="0 0 140 140" width="130" height="130">
            {/* Rotating outer ring with runes */}
            <g style={{ animation: 'ring-spin 20s linear infinite', transformOrigin: '70px 70px' }}>
              <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="0.5" strokeDasharray="3 6" />
            </g>
            <g style={{ animation: 'ring-spin-rev 15s linear infinite', transformOrigin: '70px 70px' }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.3" strokeDasharray="1 4" />
            </g>

            {/* Shield */}
            <path
              d="M70,16 L114,29 L114,66 Q114,100 70,122 Q26,100 26,66 L26,29 Z"
              fill="url(#shield-bg-splash)"
              stroke="#D4AF37"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))', animation: 'shield-glow 3s ease-in-out infinite' }}
            />
            <path
              d="M70,20 L110,32 L110,66 Q110,96 70,116 Q30,96 30,66 L30,32 Z"
              fill="none"
              stroke="rgba(232,199,102,0.25)"
              strokeWidth="0.5"
            />

            {/* Castle inside shield */}
            <g transform="translate(70,58)">
              {/* Left tower */}
              <rect x="-24" y="-6" width="9" height="24" fill="#D4AF37" rx="1" />
              <rect x="-25" y="-10" width="3" height="5" fill="#D4AF37" />
              <rect x="-20" y="-10" width="3" height="5" fill="#D4AF37" />
              <rect x="-15" y="-10" width="3" height="5" fill="#D4AF37" />
              {/* Center tower (tallest) */}
              <rect x="-5" y="-16" width="10" height="34" fill="#E8C766" rx="1" />
              <rect x="-6" y="-20" width="3" height="5" fill="#E8C766" />
              <rect x="-1" y="-20" width="3" height="5" fill="#E8C766" />
              <rect x="4" y="-20" width="3" height="5" fill="#E8C766" />
              {/* Right tower */}
              <rect x="15" y="-6" width="9" height="24" fill="#D4AF37" rx="1" />
              <rect x="14" y="-10" width="3" height="5" fill="#D4AF37" />
              <rect x="19" y="-10" width="3" height="5" fill="#D4AF37" />
              <rect x="24" y="-10" width="3" height="5" fill="#D4AF37" />
              {/* Gate */}
              <path d="M-3,18 L-3,10 Q-3,5 0,5 Q3,5 3,10 L3,18 Z" fill="#060810" stroke="#D4AF37" strokeWidth="0.5" />
              {/* Windows */}
              <rect x="-21" y="2" width="2" height="4" fill="#060810" opacity="0.7" />
              <rect x="-2" y="-4" width="2" height="4" fill="#060810" opacity="0.7" />
              <rect x="18" y="2" width="2" height="4" fill="#060810" opacity="0.7" />
            </g>

            {/* 846 text */}
            <text x="70" y="108" textAnchor="middle" fill="#E8C766" fontFamily="Cinzel, serif" fontSize="17" fontWeight="bold" letterSpacing="2">
              846
            </text>

            <defs>
              <linearGradient id="shield-bg-splash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A1F38" />
                <stop offset="100%" stopColor="#0E1220" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Eyebrow */}
        <p style={{
          fontSize: 'clamp(10px, 1.5vw, 13px)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5em',
          color: '#D4AF37',
          marginBottom: '0.75rem',
          textShadow: '0 0 10px rgba(212,175,55,0.3)',
          paddingLeft: '0.5em',
        }}>
          United We Rise
        </p>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
          fontSize: 'clamp(1.8rem, 5.5vw, 3.5rem)',
          fontWeight: 'bold',
          color: '#E8C766',
          margin: 0,
          letterSpacing: '0.02em',
          textShadow: '0 0 30px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.2), 0 2px 8px rgba(0,0,0,0.8)',
        }}>
          Welcome to Kingdom 846
        </h1>

        {/* Subtitle */}
        <p style={{
          marginTop: '0.75rem',
          fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
          color: 'rgba(243,232,204,0.55)',
          fontStyle: 'italic',
        }}>
          A realm forged in fire, built for victory
        </p>

        {/* Decorative divider */}
        <div style={{
          marginTop: '1.5rem',
          width: '200px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
        }} />

        {/* Enter button */}
        <button
          onClick={enter}
          style={{
            marginTop: '1.5rem',
            padding: '0.85rem 2.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#0E1220',
            background: 'linear-gradient(180deg, #E8C766, #D4AF37)',
            border: '1px solid #9C7A24',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 6px 20px -6px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
            e.currentTarget.style.boxShadow = '0 10px 30px -6px rgba(212,175,55,0.8), inset 0 1px 0 rgba(255,255,255,0.3)'
            e.currentTarget.style.filter = 'brightness(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 6px 20px -6px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.2)'
            e.currentTarget.style.filter = 'brightness(1)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L4 7v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V7l-8-5z" />
          </svg>
          Enter the Realm
        </button>
      </div>

      {/* ===== CINEMATIC LETTERBOX BARS ===== */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '0vh', background: '#000', zIndex: 50,
        animation: 'letterbox-open 1.5s ease-out 0.5s forwards',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '0vh', background: '#000', zIndex: 50,
        animation: 'letterbox-open 1.5s ease-out 0.5s forwards',
      }} />

      <style>{`
        @keyframes god-ray-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.6; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes dragon-fly {
          0% { transform: translateX(0) translateY(0) rotate(-2deg); opacity: 0; }
          10% { opacity: 0.25; }
          90% { opacity: 0.25; }
          100% { transform: translateX(350vw) translateY(20px) rotate(2deg); opacity: 0; }
        }
        @keyframes flag-wave-splash {
          0%, 100% { transform: skewX(0deg) scaleY(1); }
          50% { transform: skewX(-12deg) scaleY(0.95); }
        }
        @keyframes ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ring-spin-rev {
          to { transform: rotate(-360deg); }
        }
        @keyframes shield-glow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(212,175,55,0.3)); }
          50% { filter: drop-shadow(0 0 20px rgba(212,175,55,0.7)); }
        }
        @keyframes shockwave {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes ember-rise {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) scale(1.2); opacity: 0; }
        }
        @keyframes letterbox-open {
          from { height: 0vh; }
          to { height: 0vh; }
        }
        @keyframes splash-fade {
          to { opacity: 0; visibility: hidden; }
        }
        .splash-fade-out {
          animation: splash-fade 1s ease-in forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
