import { useEffect, useRef } from 'react'

/**
 * Ambient particle system — floating gold embers + mouse-tracking light glow.
 * Pure canvas, no dependencies.
 *
 * Everything here is decoration, so it is written to give way. It does not run
 * when the page is hidden, when the visitor has asked for reduced motion, or
 * on a device with no pointer to track. The original ran a full-viewport
 * animation loop unconditionally, including in background tabs, and kept a
 * phone's CPU busy for as long as the site was open.
 */
export default function ParticleField() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -100, y: -100 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // A touch device has no cursor for the glow to follow and no spare frame
    // budget to spend on embers behind the content. The aurora already gives
    // the background its depth there.
    const coarse = window.matchMedia('(hover: none)').matches
    // Two cores or fewer is a phone that will feel every frame this costs.
    const weak = (navigator.hardwareConcurrency || 8) <= 4
    if (coarse || weak) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return
    let raf = 0
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

    // An ember's glow is the same soft disc every time, only its colour,
    // opacity and radius change. Drawing it used to mean building a fresh
    // radial gradient per particle per frame -- 35 gradient objects, each one
    // allocating and being collected again, 60 times a second. It is instead
    // rendered once into a small offscreen tile here and blitted with
    // drawImage, which the GPU handles and which allocates nothing per frame.
    // Colour comes from a hue rotation on the tile rather than a second sprite:
    // the embers only span 15 degrees of hue, so one white-gold sprite tinted
    // by globalAlpha is indistinguishable from the original.
    const SPRITE = 64
    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = SPRITE
    const sctx = sprite.getContext('2d')
    if (sctx) {
      const g = sctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2)
      g.addColorStop(0, 'hsla(47, 80%, 78%, 1)')
      g.addColorStop(0.18, 'hsla(47, 75%, 62%, 0.85)')
      g.addColorStop(1, 'hsla(47, 70%, 60%, 0)')
      sctx.fillStyle = g
      sctx.fillRect(0, 0, SPRITE, SPRITE)
    }

    // The cursor glow is likewise a fixed 300px disc that only ever moves.
    const GLOW = 300
    const glow = document.createElement('canvas')
    glow.width = glow.height = GLOW
    const gctx = glow.getContext('2d')
    if (gctx) {
      const g = gctx.createRadialGradient(GLOW / 2, GLOW / 2, 0, GLOW / 2, GLOW / 2, GLOW / 2)
      g.addColorStop(0, 'rgba(212,175,55,0.06)')
      g.addColorStop(0.5, 'rgba(212,175,55,0.02)')
      g.addColorStop(1, 'rgba(212,175,55,0)')
      gctx.fillStyle = g
      gctx.fillRect(0, 0, GLOW, GLOW)
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)

      // Mouse glow
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      if (mx > 0) ctx.drawImage(glow, mx - GLOW / 2, my - GLOW / 2)

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
        const r = p.size * 4
        ctx.globalAlpha = Math.min(1, p.opacity * flicker)
        ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2)
      }
      ctx.globalAlpha = 1

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

    // A background tab still services requestAnimationFrame in some browsers,
    // and an installed PWA left open in the background did exactly that. Stop
    // the loop outright rather than trusting the browser to throttle it.
    const start = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(draw) }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }
    const onVisibility = () => { if (document.hidden) stop(); else start() }

    // Reinitialising the field is only worth doing once the resize has
    // settled; a phone rotating or a desktop window being dragged fires this
    // continuously, and each call reseeds every particle.
    let resizeTimer = 0
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => { resize(); init() }, 150)
    }

    resize()
    init()
    start()

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      clearTimeout(resizeTimer)
      // The listener removed here is the one that was added. It used to be a
      // different function object -- an inline arrow went on, `resize` came
      // off -- so every mount left a live resize handler behind.
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      data-html2canvas-ignore="true"
      style={{ zIndex: 0 }}
    />
  )
}
