import { useEffect, useRef } from 'react'

/**
 * RoyalAtmosphere — fixed background layers:
 * 1. Golden fog (drifting mist)
 * 2. Royal damask pattern overlay
 * 3. God rays (animated light beams)
 * 4. Floating decorative particles (crowns, stars, shields)
 *
 * All layers: pointer-events:none, low opacity, disabled/reduced on mobile.
 */
export default function RoyalAtmosphere() {
  const particlesRef = useRef(null)

  useEffect(() => {
    // Generate floating decorative particles
    const container = particlesRef.current
    if (!container) return

    // Skip on mobile for performance
    if (window.matchMedia('(max-width: 640px)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const shapes = [
      // Crown
      '<svg viewBox="0 0 24 24"><path d="M5 16 L3 6 L8 10 L12 4 L16 10 L21 6 L19 16 Z M5 16 H19 V18 H5 Z"/></svg>',
      // Star
      '<svg viewBox="0 0 24 24"><path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 16.5 L6 21 L8 13.5 L2 9 L9.5 9 Z"/></svg>',
      // Shield
      '<svg viewBox="0 0 24 24"><path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z"/></svg>',
      // Diamond
      '<svg viewBox="0 0 24 24"><path d="M12 2 L20 12 L12 22 L4 12 Z"/></svg>',
    ]

    const count = 28
    const els = []
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'royal-particle-deco'
      el.innerHTML = shapes[i % shapes.length]
      el.style.left = `${Math.random() * 100}%`
      el.style.animationDuration = `${12 + Math.random() * 18}s`
      el.style.animationDelay = `${Math.random() * 25}s`
      el.style.width = `${10 + Math.random() * 14}px`
      el.style.height = el.style.width
      container.appendChild(el)
      els.push(el)
    }

    return () => {
      els.forEach(el => el.remove())
    }
  }, [])

  return (
    <>
      <div className="royal-fog" aria-hidden="true" />
      <div className="royal-sheen" aria-hidden="true" />
      <div className="royal-pattern" aria-hidden="true" />
      <div className="royal-god-rays" aria-hidden="true" />
      <div className="royal-particles" ref={particlesRef} aria-hidden="true" />
      <div className="royal-vignette" aria-hidden="true" />
    </>
  )
}
