import { useEffect, useRef } from 'react'

/**
 * Ambient particle system — floating gold embers + mouse-tracking light glow.
 * Pure canvas, no dependencies. Lightweight.
 */
export default function ParticleField() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -100, y: -100 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let w = 0, h = 0
    let particles = []
    const PARTICLE_COUNT = window.innerWidth < 768 ? 15 : 35

    function resize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }

    function createParticle() {
      return {
        x: Math.random() * w,
        y: h + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        opacity: 0.2 + Math.random() * 0.5,
        flicker: Math.random() * Math.PI * 2,
        flickerSpeed: 0.02 + Math.random() * 0.03,
        hue: 40 + Math.random() * 15,
      }
    }

    function init() {
      particles = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = createParticle()
        p.y = Math.random() * h
        particles.push(p)
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)

      // Mouse glow
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      if (mx > 0) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 150)
        grad.addColorStop(0, 'rgba(212,175,55,0.06)')
        grad.addColorStop(0.5, 'rgba(212,175,55,0.02)')
        grad.addColorStop(1, 'rgba(212,175,55,0)')
        ctx.fillStyle = grad
        ctx.fillRect(mx - 150, my - 150, 300, 300)
      }

      // Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.flicker += p.flickerSpeed

        // Mouse attraction (subtle)
        if (mx > 0) {
          const dx = mx - p.x
          const dy = my - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            p.vx += (dx / dist) * 0.02
            p.vy += (dy / dist) * 0.02
          }
        }

        // Damp velocity
        p.vx *= 0.99
        p.vy *= 0.995

        // Wrap around
        if (p.y < -20) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        if (p.x < -20) p.x = w + 10
        if (p.x > w + 20) p.x = -10

        const flicker = 0.6 + Math.sin(p.flicker) * 0.4
        const alpha = p.opacity * flicker

        // Glow
        ctx.beginPath()
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
        glowGrad.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${alpha})`)
        glowGrad.addColorStop(1, `hsla(${p.hue}, 70%, 60%, 0)`)
        ctx.fillStyle = glowGrad
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${alpha * 1.2})`
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    function onMouseMove(e) {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    function onMouseLeave() {
      mouseRef.current.x = -100
      mouseRef.current.y = -100
    }

    resize()
    init()
    draw()

    window.addEventListener('resize', () => { resize(); init() })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
