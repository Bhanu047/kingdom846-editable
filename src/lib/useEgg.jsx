import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Reusable easter egg hook for any page.
 * 
 * Usage:
 *   const { eggMsg, onClick } = useEgg({ clicks: 3, message: 'Hello!' })
 *   <h1 onClick={onClick}>Title</h1>
 *   {eggMsg && <EggToast message={eggMsg} />}
 * 
 * Or with audio:
 *   const { eggMsg, trigger } = useEgg({ clicks: 3, message: 'Hello!', sound: true })
 *   trigger()  // manually trigger
 */

export function useEgg({ clicks = 3, message, sound = true, cooldown = 8000 } = {}) {
  const [eggMsg, setEggMsg] = useState(null)
  const countRef = useRef(0)
  const lastTriggerRef = useRef(0)
  const audioCtxRef = useRef(null)

  const playChord = useCallback(() => {
    if (!sound) return
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
      master.gain.value = 0.15
      master.connect(ctx.destination)
      const notes = [523.25, 659.25, 783.99, 1046.50]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, now + i * 0.08)
        gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.2)
        osc.connect(gain)
        gain.connect(master)
        osc.start(now + i * 0.08)
        osc.stop(now + i * 0.08 + 1.2)
      })
    } catch (e) { /* ignore */ }
  }, [sound])

  const trigger = useCallback(() => {
    const now = Date.now()
    if (now - lastTriggerRef.current < cooldown) return
    lastTriggerRef.current = now
    setEggMsg(message)
    playChord()
    setTimeout(() => setEggMsg(null), 6000)
  }, [message, playChord, cooldown])

  const onClick = useCallback(() => {
    countRef.current++
    if (countRef.current >= clicks) {
      countRef.current = 0
      trigger()
    }
    setTimeout(() => { if (countRef.current > 0) countRef.current = 0 }, 3000)
  }, [clicks, trigger])

  return { eggMsg, onClick, trigger }
}

/**
 * EggToast - golden toast message component
 */
export function EggToast({ message, icon = '✦' }) {
  if (!message) return null
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, maxWidth: '90vw', width: '420px',
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      padding: '16px 20px',
      background: 'linear-gradient(135deg, rgba(14,18,32,0.98), rgba(22,27,48,0.98))',
      border: '1px solid rgba(212,175,55,0.4)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.15)',
      pointerEvents: 'none',
      animation: 'egg-toast-slide 0.5s ease-out, egg-toast-exit 0.5s ease-in 5.5s forwards',
    }}>
      <span style={{
        fontSize: '24px', color: '#E8C766', flexShrink: 0, lineHeight: 1,
        textShadow: '0 0 16px rgba(212,175,55,0.6)',
      }}>{icon}</span>
      <p style={{
        margin: 0, fontSize: '14px', lineHeight: 1.5,
        color: 'rgba(243,232,204,0.8)',
        fontFamily: "'Spectral', serif", fontStyle: 'italic',
      }}>{message}</p>
      <style>{`
        @keyframes egg-toast-slide {
          0% { opacity: 0; transform: translateX(-50%) translateY(40px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes egg-toast-exit {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(40px); }
        }
      `}</style>
    </div>
  )
}
