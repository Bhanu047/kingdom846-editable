import { useEffect, useMemo, useRef, useState } from 'react'
import { createAnimatable, animate, stagger, utils } from 'animejs'
import { prefersReducedMotion } from '../lib/motion'

/* The approach.
 *
 * The console answers who to call and when everything lands. It never showed
 * the thing a synced rally actually IS: several marches leaving at different
 * moments, at different speeds, arriving on one target together. That picture
 * is the whole point of the offsets, and until now it lived only in the
 * caller's head.
 *
 * So this is the war map. The target sits at the centre; every march comes in
 * on its own bearing, starting at the rim and closing as its own march time
 * says it should. A whale that has not been called yet waits on the rim, dim.
 * The instant it is called it starts moving, and because offset was chosen as
 * (longest march - own march), all of them touch the centre on the same frame.
 * When they do, the target takes the hit.
 *
 * Why anime.js drives it rather than React: the console re-renders at 20fps on
 * purpose -- a 60fps re-render of that whole tree on a phone is more work than
 * the eye can use. But a marker that HOPS at 20fps reads as a stutter, so each
 * one is handed to createAnimatable, which is built for exactly this: a value
 * driven continuously from an input rather than played as a timeline. React
 * says where the march should be five times a second; anime carries it there
 * smoothly in between.
 */

const RIM = 0.92          // where a waiting march sits, as a fraction of the radius
const CORE = 0.06         // how close to the centre a landed march gets
/* Where a march's NAME ends up once it has landed, as a fraction of the radius.
   The marks all converge on one point -- that is the whole picture -- so their
   labels cannot converge with them or they print on top of each other. Instead
   each name drifts outward along its own bearing as its march closes, and at
   impact they stand in a ring around the struck castle: still readable, and
   still on the line its march came in on. */
const LABEL_RING = 0.42

/** The live square size of the field, so bearings can be resolved in pixels. */
function useSquare(ref) {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const read = () => setSize((s) => (Math.abs(s - el.clientWidth) < 1 ? s : el.clientWidth))
    read()
    if (!window.ResizeObserver) {
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

export default function RallyApproach({ sequence, now, impactAt, phase = 'HOLD' }) {
  const field = useRef(null)
  const size = useSquare(field)
  const markers = useRef(new Map())
  const drivers = useRef(new Map())
  const landed = useRef(new Set())

  // A bearing each, evenly spread, starting at the top and going clockwise.
  const lanes = useMemo(() => {
    const n = Math.max(1, sequence.length)
    return sequence.map((w, i) => ({ ...w, angle: (i / n) * Math.PI * 2 - Math.PI / 2 }))
  }, [sequence])

  // One animatable per marker, rebuilt when the roster changes.
  useEffect(() => {
    if (!size || prefersReducedMotion()) return undefined
    const made = []
    for (const lane of lanes) {
      const el = markers.current.get(lane.id)
      if (!el) continue
      // 220ms of smoothing: long enough to bridge the 50ms React tick without
      // the marker visibly lagging the number beside it.
      const driver = createAnimatable(el, { x: { duration: 220 }, y: { duration: 220 }, ease: 'out(2)' })
      drivers.current.set(lane.id, driver)
      made.push(driver)
    }
    return () => {
      for (const d of made) { try { d.revert?.() } catch {} }
      drivers.current.clear()
    }
  }, [lanes, size])

  // Position every march for the current instant.
  useEffect(() => {
    if (!size) return
    const half = size / 2
    const radius = half - 18

    for (const lane of lanes) {
      const march = lane.marchSec || 0
      const started = now - lane.offset
      // Before the call it holds the rim; after it, it closes at its own pace.
      const p = march > 0 ? utils.clamp(started / march, 0, 1) : (started >= 0 ? 1 : 0)
      const r = radius * (RIM - (RIM - CORE) * p)
      const x = half + Math.cos(lane.angle) * r
      const y = half + Math.sin(lane.angle) * r

      const el = markers.current.get(lane.id)
      const driver = drivers.current.get(lane.id)
      if (driver) { driver.x(x); driver.y(y) }
      else if (el) el.style.transform = `translate(${x}px, ${y}px)`

      if (el) {
        el.dataset.state = p >= 1 ? 'landed' : started >= 0 ? 'flying' : 'waiting'
        el.style.setProperty('--p', p.toFixed(3))

        // The name, walked out along the bearing as the march comes in. At
        // p = 0 this is zero, so a waiting march's label sits under it exactly
        // as before; by p = 1 the labels are a ring and nothing overlaps.
        const rLabel = r * (1 - p) + radius * LABEL_RING * p
        const dx = half + Math.cos(lane.angle) * rLabel - x
        const dy = half + Math.sin(lane.angle) * rLabel - y
        const nameEl = el.querySelector('.wr-march-name')
        if (nameEl) nameEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`
      }

      // The hit. Once per march, when it actually reaches the middle.
      if (p >= 1 && !landed.current.has(lane.id)) {
        landed.current.add(lane.id)
        burst(field.current)
      }
      if (p < 1 && landed.current.has(lane.id)) landed.current.delete(lane.id)  // rewound
    }
  }, [lanes, now, size])

  // The moment the last march arrives. Every mark on this field is an attack,
  // so when all of them are in, the castle stops being the thing being aimed at
  // and becomes the thing that has been hit -- and says so, in red.
  const landedCount = lanes.filter((l) => now - l.offset >= (l.marchSec || 0)).length
  const struck = lanes.length > 0 && landedCount === lanes.length

  return (
    <div className="wr-console k-plate p-4" data-phase={phase}>
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">The Approach</div>
        <div className="font-mono text-[10px] uppercase tracking-[.14em] text-parchment/40">
          {struck ? (
            <span className="wr-struck-label">Castle struck</span>
          ) : (
            <>
              {landedCount}
              <span className="text-parchment/25"> / {lanes.length}</span> landed
            </>
          )}
        </div>
      </div>

      <div ref={field} className="wr-field mt-3" data-struck={struck ? 'true' : undefined}>
        {/* The target's rings. Static: the movement is the marches, and a
            pulsing target underneath them is two things competing. */}
        <span className="wr-field-ring" style={{ '--k': 1 }} />
        <span className="wr-field-ring" style={{ '--k': 0.66 }} />
        <span className="wr-field-ring" style={{ '--k': 0.33 }} />
        <span className="wr-field-core"><CastleMark /></span>

        {lanes.map((lane) => (
          <span
            key={lane.id}
            ref={(el) => { if (el) markers.current.set(lane.id, el); else markers.current.delete(lane.id) }}
            className="wr-march"
            data-state="waiting"
            title={lane.name}
          >
            <span className="wr-march-mark"><RallyMark /></span>
            <span className="wr-march-name">{lane.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* What the field is made of.
 *
 * Two gold dots and a third gold dot: the map said "six things move toward a
 * seventh thing" and left you to remember which was the castle. So the target
 * is a castle and the marches are rally banners -- the two shapes anyone who
 * plays this reads without a legend, and the only two things on the field.
 *
 * Both are drawn in currentColor, which the console sets from --wr, so they
 * turn with the phase for free: gold on hold, amber on standby, red on the
 * call, green on launch. Nothing here knows about any of that.
 *
 * Kept deliberately quiet -- thin strokes, a low fill, no flags flying off the
 * keep. At 30px a detailed castle is a smudge, and the movement is meant to be
 * the thing you watch.
 */
function CastleMark() {
  return (
    <svg viewBox="0 0 24 20" className="wr-castle-art" aria-hidden="true" focusable="false">
      <g fill="currentColor" fillOpacity=".24" stroke="currentColor" strokeWidth="1.05"
         strokeLinejoin="round" strokeLinecap="round">
        {/* Two flanking towers and a taller keep, each crenellated. */}
        <path d="M1.6 19V5h1.4v1.4h0.9V5h1.4v1.4h0.9V5h1.4v14z" />
        <path d="M8.6 19V2.2h1.6v1.6h1v-1.6h1.6v1.6h1v-1.6h1.6V19z" />
        <path d="M16.4 19V5h1.4v1.4h0.9V5h1.4v1.4h0.9V5h1.4v14z" />
      </g>
      {/* The gate, open -- stroke only, so the keep reads as a way in rather
          than a solid block. */}
      <path d="M10.3 19v-3.5a1.7 1.7 0 0 1 3.4 0V19" fill="none"
            stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
      <path d="M0.9 19.3h22.2" fill="none" stroke="currentColor" strokeWidth="1.05"
            strokeOpacity=".55" strokeLinecap="round" />
    </svg>
  )
}

function RallyMark() {
  return (
    <svg viewBox="0 0 20 20" className="wr-rally-art" aria-hidden="true" focusable="false">
      {/* Crossed swords rather than a banner: these six are hitting the castle,
          and a shield -- the other shape in the running -- says defence. It also
          reads better against the keep. The castle is a solid blocky mass; an X
          cuts across it, where a shield is another rounded solid and at 13px the
          two start to rhyme. */}
      <g fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
        <path d="M4.2 3.6 14.6 16.4" />
        <path d="M15.8 3.6 5.4 16.4" />
        {/* The two crossguards, which are what stop it reading as a plain X. */}
        <path d="M3.1 15.2 6.3 18.4" />
        <path d="M16.9 15.2 13.7 18.4" />
      </g>
    </svg>
  )
}

/** A ring out of the centre when a march lands. */
function burst(host) {
  if (!host || prefersReducedMotion()) return
  const ring = document.createElement('span')
  ring.className = 'wr-impact'
  ring.setAttribute('aria-hidden', 'true')
  host.appendChild(ring)
  try {
    animate(ring, {
      scale: [{ from: 0.05, to: 1 }],
      opacity: [{ to: 0.75, duration: 120 }, { to: 0, duration: 700 }],
      ease: 'outExpo',
      onComplete: () => ring.remove(),
    })
  } catch (err) {
    ring.remove()
  }
}

/**
 * The plan, played through before anyone commits to it.
 *
 * A caller reading a list of offsets has to believe the arithmetic. Watching
 * the whole rally run in four seconds -- every march leaving on its own count
 * and the field converging on one instant -- is the same information, checked
 * rather than trusted.
 */
export function useApproachPreview(impactAt) {
  const [clock, setClock] = useState(null)

  const play = useMemo(() => () => {
    if (!impactAt || prefersReducedMotion()) return
    const state = { t: 0 }
    setClock(0)
    animate(state, {
      t: impactAt + 0.4,
      duration: 4200,
      ease: 'inOutQuad',
      onUpdate: () => setClock(state.t),
      onComplete: () => setTimeout(() => setClock(null), 900),
    })
  }, [impactAt])

  return [clock, play]
}
