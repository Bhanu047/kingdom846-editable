import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Global Easter Eggs component — works across the entire website.
 * Renders a golden toast + visual effects when secrets are triggered.
 * 
 * Hidden secrets:
 * 1. Konami code (↑↑↓↓←→←→BA) → "Royal Secret Found"
 * 2. Type "846" anywhere → "The Crown Remembers"
 * 3. Type "crown" anywhere → "Long Live the King"
 * 4. Type "glory" anywhere → "Glory is Taken, Not Given"
 * 5. Click the header crest 5x → "Royal Crest Awakened"
 * 6. Click the footer text 3x → "True Heir of Kingdom 846"
 * 7. Type "sparta" anywhere → "The Spartan Never Retreats"
 */

const SECRETS = [
  {
    id: 'konami',
    trigger: 'konami',
    title: 'Royal Secret Found',
    message: 'You have uncovered the hidden code. The Crown acknowledges you, noble seeker.',
    effect: 'gold-flash',
    icon: '◆',
  },
  {
    id: '846',
    trigger: 'type',
    word: '846',
    title: 'The Crown Remembers',
    message: '8 Battles Won. 4 Alliances. 1 Crown. The identity of Kingdom 846 lives on.',
    effect: 'confetti',
    icon: '✦',
  },
  {
    id: 'crown',
    trigger: 'type',
    word: 'crown',
    title: 'Long Live the King',
    message: 'The crown is heavy, but the worthy bear it. You seek what others fear.',
    effect: 'glow-pulse',
    icon: '♛',
  },
  {
    id: 'glory',
    trigger: 'type',
    word: 'glory',
    title: 'Glory is Taken',
    message: 'We don\'t wait for glory. We take it. — Kingdom 846',
    effect: 'firework',
    icon: '✧',
  },
  {
    id: 'sparta',
    trigger: 'type',
    word: 'sparta',
    title: 'The Spartan Never Retreats',
    message: 'Forged in discipline, crowned in victory. Sparta leads the realm.',
    effect: 'gold-flash',
    icon: '⚔',
  },
  {
    id: 'crest5',
    trigger: 'click',
    selector: 'header img[src*="crest"]',
    clicks: 5,
    title: 'Royal Crest Awakened',
    message: 'The crest pulses with ancient power. You have awakened the 846.',
    effect: 'confetti',
    icon: '✦',
  },
  {
    id: 'footer3',
    trigger: 'click',
    selector: 'footer',
    clicks: 3,
    title: 'True Heir of Kingdom 846',
    message: 'You read the fine print. True heirs notice what others overlook.',
    effect: 'glow-pulse',
    icon: '♛',
  },
]

export default function EasterEggs() {
  const [activeEgg, setActiveEgg] = useState(null)
  const [showEffect, setShowEffect] = useState(null)
  const triggeredRef = useRef(new Set())
  const typeBufferRef = useRef('')
  const konamiRef = useRef([])
  const clickCountsRef = useRef({})
  const audioCtxRef = useRef(null)

  // Play a short pleasant chord
  const playEggSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state !== 'running') ctx.resume()
      const now = ctx.currentTime
      const master = ctx.createGain()
      master.gain.value = 0.2
      master.connect(ctx.destination)

      const notes = [523.25, 659.25, 783.99, 1046.50] // C E G C
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, now + i * 0.08)
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.5)
        osc.connect(gain)
        gain.connect(master)
        osc.start(now + i * 0.08)
        osc.stop(now + i * 0.08 + 1.5)
      })
    } catch (e) { /* ignore */ }
  }, [])

  const trigger = useCallback((secret) => {
    if (triggeredRef.current.has(secret.id)) {
      // Allow re-trigger after 8 seconds
      const lastTime = triggeredRef.current.get(secret.id)
      if (Date.now() - lastTime < 8000) return
    }
    triggeredRef.current.set(secret.id, Date.now())
    setActiveEgg(secret)
    setShowEffect(secret.effect)
    playEggSound()

    // Clear effect after animation
    setTimeout(() => setShowEffect(null), 3000)
    setTimeout(() => setActiveEgg(null), 6000)
  }, [playEggSound])

  useEffect(() => {
    const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

    const onKey = (e) => {
      // Don't trigger when typing in input fields
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Konami code
      konamiRef.current.push(e.key)
      if (konamiRef.current.length > konami.length) konamiRef.current.shift()
      if (konamiRef.current.join(',').toLowerCase() === konami.join(',').toLowerCase()) {
        const s = SECRETS.find(s => s.id === 'konami')
        if (s) trigger(s)
        konamiRef.current = []
        typeBufferRef.current = ''
        return
      }

      // Word typing
      const key = e.key.toLowerCase()
      if (key.length === 1) {
        typeBufferRef.current += key
        if (typeBufferRef.current.length > 8) typeBufferRef.current = typeBufferRef.current.slice(-8)
        
        for (const secret of SECRETS) {
          if (secret.trigger === 'type' && typeBufferRef.current.endsWith(secret.word)) {
            trigger(secret)
            typeBufferRef.current = ''
            break
          }
        }
      }
    }

    const onClick = (e) => {
      for (const secret of SECRETS) {
        if (secret.trigger !== 'click') continue
        const el = document.querySelector(secret.selector)
        if (!el) continue
        if (el === e.target || el.contains(e.target) || e.target.closest(secret.selector)) {
          const id = secret.id
          clickCountsRef.current[id] = (clickCountsRef.current[id] || 0) + 1
          if (clickCountsRef.current[id] >= secret.clicks) {
            trigger(secret)
            clickCountsRef.current[id] = 0
          }
          // Reset counter after 3 seconds of no clicks
          setTimeout(() => {
            if (clickCountsRef.current[id] > 0) clickCountsRef.current[id] = 0
          }, 3000)
        }
      }
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [trigger])

  return (
    <>
      {/* Visual effects overlay */}
      {showEffect === 'gold-flash' && (
        <div className="egg-gold-flash-overlay" />
      )}
      {showEffect === 'glow-pulse' && (
        <div className="egg-glow-pulse-overlay" />
      )}
      {(showEffect === 'confetti' || showEffect === 'firework') && (
        <div className="egg-confetti-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="egg-confetti-piece"
              style={{
                left: `${(i * 3.5) % 100}%`,
                animationDelay: `${(i * 0.05)}s`,
                animationDuration: `${2 + (i % 3)}s`,
                background: i % 3 === 0 ? '#D4AF37' : i % 3 === 1 ? '#E8C766' : '#8C2B3A',
                transform: `rotate(${i * 36}deg)`,
              }}
            />
          ))}
          {showEffect === 'firework' && (
            <>
              {Array.from({ length: 15 }).map((_, i) => (
                <span
                  key={`fw-${i}`}
                  className="egg-firework-piece"
                  style={{
                    left: `${20 + (i * 4) % 60}%`,
                    top: `${20 + (i * 7) % 40}%`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Toast message */}
      {activeEgg && (
        <div className="egg-toast">
          <div className="egg-toast-icon">{activeEgg.icon}</div>
          <div className="egg-toast-content">
            <div className="egg-toast-title">{activeEgg.title}</div>
            <div className="egg-toast-message">{activeEgg.message}</div>
          </div>
        </div>
      )}

      <style>{`
        /* Gold flash */
        .egg-gold-flash-overlay {
          position: fixed; inset: 0; z-index: 9998; pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(212,175,55,0.25) 0%, transparent 70%);
          animation: egg-flash-anim 3s ease-out forwards;
        }
        @keyframes egg-flash-anim {
          0% { opacity: 0; }
          15% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Glow pulse */
        .egg-glow-pulse-overlay {
          position: fixed; inset: 0; z-index: 9998; pointer-events: none;
          box-shadow: inset 0 0 200px rgba(212,175,55,0.3);
          animation: egg-glow-anim 3s ease-out forwards;
        }
        @keyframes egg-glow-anim {
          0%, 100% { opacity: 0; }
          30%, 70% { opacity: 1; }
        }

        /* Confetti */
        .egg-confetti-container {
          position: fixed; inset: 0; z-index: 9998; pointer-events: none; overflow: hidden;
        }
        .egg-confetti-piece {
          position: absolute; top: -20px;
          width: 6px; height: 14px; border-radius: 1px;
          animation: egg-confetti-fall linear forwards;
        }
        @keyframes egg-confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0); }
          100% { opacity: 0; transform: translateY(110vh) rotate(720deg); }
        }
        .egg-firework-piece {
          position: absolute; width: 8px; height: 8px; border-radius: 50%;
          background: #E8C766; box-shadow: 0 0 12px rgba(232,199,102,0.8);
          animation: egg-firework-anim 1.5s ease-out forwards;
        }
        @keyframes egg-firework-anim {
          0% { opacity: 1; transform: scale(0); }
          50% { opacity: 1; transform: scale(3); }
          100% { opacity: 0; transform: scale(5); }
        }

        /* Toast */
        .egg-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          z-index: 9999; max-width: 90vw; width: 420px;
          display: flex; align-items: flex-start; gap: 14px;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(14,18,32,0.98), rgba(22,27,48,0.98));
          border: 1px solid rgba(212,175,55,0.4);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.05);
          animation: egg-toast-slide 0.5s ease-out, egg-toast-exit 0.5s ease-in 5.5s forwards;
        }
        @keyframes egg-toast-slide {
          0% { opacity: 0; transform: translateX(-50%) translateY(40px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes egg-toast-exit {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(40px); }
        }
        .egg-toast-icon {
          font-size: 28px; color: #E8C766; line-height: 1; flex-shrink: 0;
          text-shadow: 0 0 16px rgba(212,175,55,0.6);
          animation: egg-icon-pulse 2s ease-in-out infinite;
        }
        @keyframes egg-icon-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .egg-toast-content { flex: 1; min-width: 0; }
        .egg-toast-title {
          font-family: 'Cinzel Decorative', 'Cinzel', serif;
          font-size: 16px; font-weight: 700; color: #E8C766;
          text-shadow: 0 0 10px rgba(212,175,55,0.4);
          letter-spacing: 0.04em; margin-bottom: 4px;
        }
        .egg-toast-message {
          font-size: 13px; line-height: 1.5; color: rgba(243,232,204,0.7);
          font-family: 'Spectral', serif; font-style: italic;
        }

        @media (max-width: 480px) {
          .egg-toast { width: 92vw; padding: 14px 16px; }
          .egg-toast-icon { font-size: 24px; }
          .egg-toast-title { font-size: 14px; }
          .egg-toast-message { font-size: 12px; }
        }
      `}</style>
    </>
  )
}
