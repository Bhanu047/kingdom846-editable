import { useEffect, useRef } from 'react'

// An ambient aurora behind the whole app. The site had plenty of ENTRANCE
// animation already -- things slid in once and then the page sat still, which
// is what read as "flat". This is the opposite: it never arrives and never
// finishes, it just keeps moving, so any screenshot of the site has depth in it.
//
// Built from blurred radial ribbons rather than a WebGL shader on purpose:
// four composited layers cost virtually nothing on a phone, degrade to a plain
// dark ground if anything fails, and need no dependency. reactbits.dev and
// auroragradient.com are both blocked by this environment's egress proxy, so
// this is an equivalent rather than a port of either.
//
// Palette is the kingdom's own -- gold and royal blue -- not the teal/violet
// that every aurora background defaults to.
const RIBBONS = [
  { className: 'aurora-ribbon aurora-r1' },
  { className: 'aurora-ribbon aurora-r2' },
  { className: 'aurora-ribbon aurora-r3' },
  { className: 'aurora-ribbon aurora-r4' },
]

export default function Aurora() {
  const hostRef = useRef(null)

  // A very slow parallax on pointer movement. The aurora is the furthest thing
  // back, so it moves least -- enough to feel like the page has depth when you
  // move the mouse, not enough to notice as an effect. Pointer coordinates are
  // written to custom properties and consumed in CSS, so nothing re-renders.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return

    let frame = 0
    let tx = 0
    let ty = 0
    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        host.style.setProperty('--ax', tx.toFixed(3))
        host.style.setProperty('--ay', ty.toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // data-html2canvas-ignore matters more than it looks. html2canvas draws
  // position:fixed elements into whatever it is capturing, and it drops
  // filter:blur() -- so during a report export these soft ribbons became four
  // hard translucent gold and blue discs laid straight over the document,
  // desaturating every chart in it. The attribute keeps the aurora on screen
  // and out of every downloaded report.
  return (
    <div ref={hostRef} className="aurora-field" aria-hidden="true" data-html2canvas-ignore="true">
      {RIBBONS.map((r) => <div key={r.className} className={r.className} />)}
      <div className="aurora-grain" />
    </div>
  )
}
