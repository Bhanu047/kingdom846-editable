import { useEffect, useRef, useState } from 'react'
import { HALL_VERT, HALL_FRAG, HALL_LOOK } from '../lib/hallShader'

// The home hero's room, running live.
//
// The hero already showed the same weekly hall as the entrance, but as a flat
// plate: the torches did not burn, the mist did not move, the light shafts did
// not fall. The entrance runs that same image through a fragment shader, which
// is the entire reason it feels like a place rather than a picture of one.
// This puts that shader behind the hero.
//
// Three things it does that the entrance does not need to:
//
//   * it sizes to an ELEMENT, not the window, and re-sizes with it;
//   * it stops completely when scrolled out of view, when the tab is hidden,
//     and under prefers-reduced-motion -- the entrance owns the whole screen
//     for a few seconds, whereas this sits on a page you leave open;
//   * it opens fully lit. The entrance fades up from black over 3.6s because
//     that is its curtain rise. Here it would just look like the image failed
//     to load.
//
// If WebGL is missing or the context is lost, `onFallback` fires and the caller
// paints the still plate instead. There is no half-state: either the room is
// alive or it is the photograph it always was.
export default function LiveHall({ src, hall, className = '', onFallback }) {
  const holder = useRef(null)
  const canvas = useRef(null)
  const [dead, setDead] = useState(false)

  useEffect(() => {
    const host = holder.current
    const cv = canvas.current
    if (!host || !cv) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setDead(true); onFallback?.('prefers-reduced-motion'); return }

    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) { setDead(true); onFallback?.('no-webgl'); return }

    let stop = false
    const give = (why) => { stop = true; setDead(true); onFallback?.(why) }

    const compile = (type, source) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, source); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[LiveHall]', gl.getShaderInfoLog(s)); return null
      }
      return s
    }
    // A phone renders the same shader; only the pixel budget differs.
    const low = window.matchMedia?.('(max-width:820px)').matches
    const vs = compile(gl.VERTEX_SHADER, HALL_VERT)
    const fs = compile(gl.FRAGMENT_SHADER, (low ? '#define LOW_TIER 1\n' : '') + HALL_FRAG)
    if (!vs || !fs) { give('shader-compile'); return }

    const prog = gl.createProgram()
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[LiveHall]', gl.getProgramInfoLog(prog)); give('shader-link'); return
    }
    gl.useProgram(prog)

    // One oversized triangle covering the viewport -- cheaper than two.
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const U = (n) => gl.getUniformLocation(prog, n)
    const u = {
      res: U('uRes'), texRes: U('uTexRes'), mouse: U('uMouse'), time: U('uTime'),
      exp: U('uExposure'), blur: U('uBlur'), zoom: U('uZoom'), fire: U('uFire'),
      mist: U('uMist'), rain: U('uRain'), storm: U('uStorm'), aurora: U('uAurora'),
      ray: U('uRayCol'), rayAmt: U('uRayAmt'),
    }

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]))
    for (const [k, v] of [['TEXTURE_WRAP_S', 'CLAMP_TO_EDGE'], ['TEXTURE_WRAP_T', 'CLAMP_TO_EDGE'],
                          ['TEXTURE_MIN_FILTER', 'LINEAR'], ['TEXTURE_MAG_FILTER', 'LINEAR']]) {
      gl.texParameteri(gl.TEXTURE_2D, gl[k], gl[v])
    }

    let texRes = [1, 1], loaded = false
    const img = new Image()
    // No crossOrigin. The plate is served from this app's own origin, so CORS
    // buys nothing -- and a CORS-mode request has a different HTTP cache key
    // from a plain one, so this fetched the hall a second time even though the
    // page's own boot veil had already downloaded the identical file. 280 kB,
    // twice, on the first screen. The canvas is only ever drawn to, never read
    // back, so there is no tainting to avoid either.
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      texRes = [img.naturalWidth, img.naturalHeight]
      loaded = true
    }
    // The plate never arriving is the one failure that would show a black box.
    img.onerror = () => give('image-load')
    img.src = src

    const look = HALL_LOOK[hall] || HALL_LOOK.sapphire

    // Cap the pixel budget: this is a banner, not the whole screen, and a
    // 3x-DPR phone rendering it at native resolution is pure waste.
    const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.1 : 1.5)
    let w = 0, h = 0
    const resize = () => {
      const r = host.getBoundingClientRect()
      const nw = Math.max(1, Math.floor(r.width * dpr))
      const nh = Math.max(1, Math.floor(r.height * dpr))
      if (nw === w && nh === h) return
      w = nw; h = nh
      cv.width = w; cv.height = h
      gl.viewport(0, 0, w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    // Parallax from the pointer's position WITHIN the hero, so the room leans
    // toward the cursor instead of tracking a window it does not fill.
    let mx = 0, my = 0, tmx = 0, tmy = 0
    const onMove = (e) => {
      const r = host.getBoundingClientRect()
      tmx = ((e.clientX - r.left) / r.width - 0.5) * 0.85
      tmy = ((e.clientY - r.top) / r.height - 0.5) * 0.85
    }
    const onLeave = () => { tmx = 0; tmy = 0 }
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)

    // Only run while it can actually be seen.
    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting }, { threshold: 0 })
    io.observe(host)
    const onVis = () => { if (!document.hidden) last = performance.now() / 1000 }
    document.addEventListener('visibilitychange', onVis)

    const lost = (e) => { e.preventDefault(); give('context-lost') }
    cv.addEventListener('webglcontextlost', lost)

    // A wall clock would jump the flame forward by however long the hero spent
    // off-screen; this only advances while the room is being watched.
    let clock = 40, last = performance.now() / 1000, frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      if (stop) return
      const now = performance.now() / 1000
      const dt = Math.min(now - last, 0.05)
      last = now
      if (!onScreen || document.hidden || !loaded) return
      clock += dt
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05

      gl.uniform2f(u.res, w, h)
      gl.uniform2f(u.texRes, texRes[0], texRes[1])
      gl.uniform2f(u.mouse, mx, my)
      gl.uniform1f(u.time, clock)
      gl.uniform1f(u.exp, 1)     // lit from the first frame -- see the note above
      gl.uniform1f(u.blur, 0)
      gl.uniform1f(u.zoom, 1)
      gl.uniform1f(u.fire, look.fire)
      gl.uniform1f(u.mist, look.mist)
      gl.uniform1f(u.rain, look.rain)
      gl.uniform1f(u.storm, look.storm)
      gl.uniform1f(u.aurora, look.aurora)
      gl.uniform3f(u.ray, look.ray[0], look.ray[1], look.ray[2])
      gl.uniform1f(u.rayAmt, look.rayAmt)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      stop = true
      cancelAnimationFrame(frame)
      ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      cv.removeEventListener('webglcontextlost', lost)
      img.onload = img.onerror = null
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [src, hall, onFallback])

  return (
    <div ref={holder} className={`absolute inset-0 ${className}`} aria-hidden="true">
      <canvas ref={canvas} className="h-full w-full" style={{ display: dead ? 'none' : 'block' }} />
    </div>
  )
}
