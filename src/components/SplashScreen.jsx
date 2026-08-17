import { useEffect, useState } from 'react'

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function enter() {
    if (fading) return
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1650)
  }

  return (
    <div className={`premium-welcome fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading ? 'portal-opening' : ''}`}>
      <div className="welcome-backdrop" aria-hidden="true" />
      <div className="welcome-vignette" aria-hidden="true" />

      <div className="welcome-art-frame">
        <picture>
          <source media="(max-width: 767px)" srcSet="/assets/kingdom846-welcome-mobile.webp" />
          <img
            src="/assets/kingdom846-welcome-premium.webp"
            alt="Kingdom 846 Royal Portal"
            loading="eager"
            fetchPriority="high"
            draggable="false"
            className="welcome-art"
          />
        </picture>

        <div className="welcome-gold-bloom" aria-hidden="true" />
        <div className="welcome-sheen" aria-hidden="true" />

        <button
          type="button"
          onClick={enter}
          disabled={fading}
          className="welcome-enter-hit"
          aria-label="Enter the Realm"
        >
          <span className="sr-only">Enter the Realm</span>
        </button>
      </div>

      <div className="welcome-flash" aria-hidden="true" />

      <style>{`
        .premium-welcome {
          background: #03050b;
          isolation: isolate;
        }
        .welcome-backdrop {
          position: absolute;
          inset: -6%;
          z-index: -3;
          background-image: url('/assets/kingdom846-welcome-premium.webp');
          background-position: center;
          background-size: cover;
          filter: blur(30px) brightness(.32) saturate(1.16);
          transform: scale(1.08);
        }
        .welcome-vignette {
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(ellipse at 50% 45%, rgba(234,190,72,.08), transparent 46%),
            linear-gradient(90deg, rgba(2,3,7,.88), transparent 18%, transparent 82%, rgba(2,3,7,.88));
          pointer-events: none;
        }
        .welcome-art-frame {
          position: relative;
          width: min(100vw, calc(100svh * 1.5006));
          aspect-ratio: 1280 / 853;
          flex: none;
          overflow: hidden;
          box-shadow: 0 0 80px rgba(0,0,0,.72), 0 0 55px rgba(212,175,55,.07);
          animation: royal-breathe 11s ease-in-out infinite alternate;
          transform-origin: center;
        }
        .welcome-art-frame picture,
        .welcome-art {
          display: block;
          width: 100%;
          height: 100%;
        }
        .welcome-art {
          object-fit: cover;
          user-select: none;
          -webkit-user-drag: none;
        }
        .welcome-gold-bloom {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 12%, rgba(255,221,128,.12), transparent 29%);
          mix-blend-mode: screen;
          animation: crown-bloom 4.8s ease-in-out infinite;
        }
        .welcome-sheen {
          position: absolute;
          top: -40%;
          bottom: -40%;
          left: -32%;
          width: 19%;
          pointer-events: none;
          background: linear-gradient(102deg, transparent, rgba(255,232,164,.11), transparent);
          transform: rotate(9deg);
          animation: royal-sheen 7.5s ease-in-out 1.5s infinite;
        }
        .welcome-enter-hit {
          position: absolute;
          z-index: 5;
          left: 31.1%;
          top: 80.5%;
          width: 38%;
          height: 11.2%;
          border: 0;
          border-radius: 18px;
          background: transparent;
          cursor: pointer;
          outline: none;
          transition: transform .22s ease, filter .22s ease, box-shadow .22s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .welcome-enter-hit::after {
          content: '';
          position: absolute;
          inset: 11% 5%;
          border-radius: 16px;
          opacity: 0;
          box-shadow: 0 0 30px rgba(232,199,102,.5), 0 0 62px rgba(212,175,55,.23);
          transition: opacity .22s ease;
        }
        .welcome-enter-hit:hover,
        .welcome-enter-hit:focus-visible {
          transform: scale(1.018);
        }
        .welcome-enter-hit:hover::after,
        .welcome-enter-hit:focus-visible::after {
          opacity: 1;
        }
        .welcome-enter-hit:focus-visible {
          outline: 2px solid rgba(255,222,132,.9);
          outline-offset: -8px;
        }
        .welcome-flash {
          position: absolute;
          inset: 0;
          z-index: 20;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(circle at 50% 42%, rgba(255,240,190,.78), rgba(225,176,58,.22) 28%, transparent 66%);
        }
        .portal-opening .welcome-enter-hit { pointer-events: none; }
        .portal-opening .welcome-art-frame {
          animation: portal-open 1.65s cubic-bezier(.16,1,.3,1) forwards;
        }
        .portal-opening .welcome-flash {
          animation: portal-flash 1.2s ease-out forwards;
        }
        @keyframes royal-breathe {
          from { transform: scale(1); filter: brightness(1); }
          to { transform: scale(1.008); filter: brightness(1.035); }
        }
        @keyframes crown-bloom {
          0%,100% { opacity: .52; }
          50% { opacity: 1; }
        }
        @keyframes royal-sheen {
          0%,58% { left: -32%; opacity: 0; }
          67% { opacity: 1; }
          88%,100% { left: 118%; opacity: 0; }
        }
        @keyframes portal-open {
          0% { transform: scale(1); filter: brightness(1) saturate(1); opacity: 1; }
          35% { transform: scale(1.018); filter: brightness(1.15) saturate(1.08); opacity: 1; }
          100% { transform: scale(1.075); filter: brightness(1.28) saturate(1.03); opacity: 0; }
        }
        @keyframes portal-flash {
          0% { opacity: 0; transform: scale(.7); }
          18% { opacity: .58; }
          48% { opacity: .18; transform: scale(1.08); }
          100% { opacity: 0; transform: scale(1.24); }
        }
        @media (max-width: 767px) {
          .welcome-backdrop {
            background-image: url('/assets/kingdom846-welcome-mobile.webp');
            filter: blur(24px) brightness(.34) saturate(1.12);
          }
          .welcome-vignette {
            background: linear-gradient(180deg, rgba(2,3,7,.5), transparent 11%, transparent 89%, rgba(2,3,7,.58));
          }
          .welcome-art-frame {
            width: 130vw;
            max-width: none;
            aspect-ratio: 2 / 3;
            box-shadow: 0 0 55px rgba(0,0,0,.65);
          }
          .welcome-enter-hit {
            left: 26.5%;
            top: 73.1%;
            width: 47%;
            height: 8.2%;
            border-radius: 12px;
          }
          .welcome-sheen { display: none; }
        }
        @media (max-height: 650px) and (max-width: 767px) {
          .welcome-art-frame { width: 112vw; }
        }
        @media (prefers-reduced-motion: reduce) {
          .welcome-art-frame,
          .welcome-gold-bloom,
          .welcome-sheen { animation: none !important; }
          .portal-opening .welcome-art-frame { animation: portal-open .8s ease-out forwards !important; }
          .portal-opening .welcome-flash { animation-duration: .65s !important; }
        }
      `}</style>
    </div>
  )
}
