import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { edgeGeometry } from '../lib/edgeTrace'
import RallyApproach from './RallyApproach'

// The live half of the War Room.
//
// This screen is not read the way a page is read. The caller is holding a
// phone in one hand, looking at the game in the other, and speaking names
// into voice chat. They glance at this for a fraction of a second and need
// three things back: WHO is next, HOW LONG until they call it, and whether
// anything is due RIGHT NOW. Everything here serves that and little else.
//
// The console is deliberately silent. That puts the whole burden on the
// visuals, which is why the state owns a COLOUR rather than a label: the
// final seconds have to register in peripheral vision, from a phone lying
// on the desk, without being read.
//
// What the old screen got wrong: between calls it said "Standing By / Next
// call incoming...", which answers none of the three. The gap between calls
// is most of a rally, so the screen was blank exactly when it was being
// looked at most. The countdown here never goes away -- it simply retargets
// to the next call the instant one fires.

const PHASES = {
  ARMING:  { label: 'ARMING',   note: 'Hold. Sequence starts on zero.' },
  HOLD:    { label: 'HOLD',     note: 'Next call not yet due.' },
  STANDBY: { label: 'STANDBY',  note: 'Take a breath. Call is close.' },
  CALL:    { label: 'CALL',     note: 'Say the name now.' },
  LAUNCH:  { label: 'LAUNCH',   note: 'Called. Retargeting.' },
  CLEAR:   { label: 'ALL CALLED', note: 'Every march is away.' },
}

// The ring's window, in seconds. Fixed rather than scaled to the gap between
// calls: a constant drain rate is learnable, a variable one is not.
const RING_WINDOW = 10

/** The live padding-box size of an element, so the trace can be drawn 1:1. */
function useBoxSize(ref) {
  const [box, setBox] = useState(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setBox((b) =>
      b && b.width === el.clientWidth && b.height === el.clientHeight
        ? b
        : { width: el.clientWidth, height: el.clientHeight })
    read()
    if (!window.ResizeObserver) { window.addEventListener('resize', read); return () => window.removeEventListener('resize', read) }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}

function clock(seconds) {
  const n = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

/** Keeps the phone awake for the length of the rally. */
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return
    let lock = null, released = false
    navigator.wakeLock.request('screen').then((l) => { if (released) l.release(); else lock = l }).catch(() => {})
    return () => { released = true; try { lock?.release() } catch {} }
  }, [active])
}

export default function RallyConsole({ sequence, startAt, onAbort, onComplete }) {
  const [now, setNow] = useState(() => (Date.now() - startAt) / 1000)
  const callPanel = useRef(null)
  const callBox = useBoxSize(callPanel)
  useWakeLock(true)

  // rAF rather than an interval, gated to ~20fps. The playhead has to slide
  // rather than hop for the rail to read as an instrument, but a 60fps React
  // re-render of this tree on a phone is more work than the eye can use.
  useEffect(() => {
    let frame = 0, last = 0
    const loop = (ts) => {
      frame = requestAnimationFrame(loop)
      if (ts - last < 50) return
      last = ts
      setNow((Date.now() - startAt) / 1000)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [startAt])

  // Every march lands at the same moment: a whale called at `offset` marches
  // for `marchSec`, and offset was chosen as (longest - marchSec). So impact
  // is `longest` for all of them, and that is the number the room actually
  // cares about.
  const impactAt = useMemo(
    () => sequence.reduce((max, w) => Math.max(max, w.offset + (w.marchSec || 0)), 0),
    [sequence],
  )

  // The next call is the first one not yet more than a second past. Holding
  // it for that extra second is what gives LAUNCH time to be seen.
  const nextIndex = sequence.findIndex((w) => w.offset - now > -1.2)
  const next = nextIndex >= 0 ? sequence[nextIndex] : null
  const t = next ? next.offset - now : null

  const phase = now < 0 ? 'ARMING'
    : !next ? 'CLEAR'
    : t <= 0 ? 'LAUNCH'
    : t <= 3 ? 'CALL'
    : t <= 10 ? 'STANDBY'
    : 'HOLD'

  // The rally is not over at the last call -- it is over when the marches
  // land. The old screen closed itself one second after the final name, which
  // threw away the one number the room still wanted. Hold until impact, then
  // a couple of seconds so the zero is actually seen.
  useEffect(() => {
    if (impactAt > 0 && now > impactAt + 2.5) onComplete?.()
  }, [now > impactAt + 2.5, impactAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const impactIn = Math.max(0, impactAt - now)
  const progress = impactAt > 0 ? Math.min(100, Math.max(0, (now / impactAt) * 100)) : 0

  // The one big numeral. Seconds while a call is close enough to act on,
  // M:SS once it is far enough away that counting seconds is noise.
  let readout, readoutClass = 'text-[24vw] sm:text-[8rem]'
  if (phase === 'ARMING') readout = String(Math.max(1, Math.ceil(-now)))
  else if (phase === 'CLEAR') readout = clock(impactIn)
  else if (phase === 'LAUNCH') { readout = 'GO'; readoutClass = 'text-[19vw] sm:text-[6.5rem]' }
  else if (t > 60) { readout = clock(t); readoutClass = 'text-[16vw] sm:text-[5.5rem]' }
  else readout = String(Math.ceil(t))

  // Drawn only once a call is inside the window -- a ring sitting full through
  // a two-minute HOLD would be noise, and worse, would stop meaning "soon".
  const ringFrac = phase === 'LAUNCH' ? 1
    : (next && t > 0 && t <= RING_WINDOW) ? t / RING_WINDOW
    : null

  const edge = useMemo(
    () => (callBox ? edgeGeometry(callBox.width, callBox.height) : null),
    [callBox],
  )

  const meta = PHASES[phase]

  return (
    <div className="space-y-4">
      {/* Status bar. Everything needed to know the operation is live and how
          to stop it, and nothing else competing for the eye. */}
      <div className="wr-console flex items-center justify-between gap-3 rounded-2xl border border-gold/15 bg-ink/70 px-4 py-3" data-phase={phase}>
        <div className="flex items-center gap-2.5">
          <span className="wr-live h-2 w-2 rounded-full" style={{ background: 'var(--wr)' }} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.22em] text-parchment/55">Operation Live</span>
        </div>
        <div className="font-mono text-[11px] tabular-nums text-parchment/40">T+{Math.max(0, now).toFixed(1)}s</div>
        <button
          onClick={onAbort}
          className="rounded-lg border border-rose-500/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-rose-300 transition hover:bg-rose-500/12"
        >
          Abort
        </button>
      </div>

      {/* IMPACT. Every march lands together; this is when. The rail under it
          is the whole operation on one line -- spent time behind the head,
          a notch for every call, so the shape of what is left is visible
          without reading the queue below. */}
      <div className="wr-console k-plate px-4 pb-3 pt-4" data-phase={phase}>
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-[.2em] text-parchment/45">All marches land in</div>
            <div className="mt-0.5 font-mono text-3xl font-bold tabular-nums" style={{ color: 'var(--wr)' }}>{clock(impactIn)}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[.14em] text-parchment/40">
            {sequence.filter((w) => w.offset - now <= 0).length}<span className="text-parchment/25"> / {sequence.length}</span> called
          </div>
        </div>
        <div className="wr-rail mt-3">
          <div className="wr-rail-track" />
          <div className="wr-rail-fill" style={{ width: `${progress}%` }} />
          {sequence.map((w) => (
            <span
              key={w.id}
              className="wr-notch"
              data-done={String(w.offset - now <= 0)}
              style={{ left: `${impactAt > 0 ? (w.offset / impactAt) * 100 : 0}%` }}
            />
          ))}
          <span className="wr-head" style={{ left: `${progress}%` }} />
        </div>
      </div>

      {/* THE APPROACH. The marches themselves, closing on one target. The
          console above says who and when; this says where everything is. */}
      <RallyApproach sequence={sequence} now={now} impactAt={impactAt} phase={phase} />

      {/* THE CALL. One name, one number, one state -- identifiable by colour
          before a single word is read. */}
      <div ref={callPanel} className="wr-console k-plate relative overflow-hidden py-9 text-center" data-phase={phase}>
        <div className="wr-radar" />
        <div className="wr-rings" />
        <div className="wr-scan" />
        {/* The approach trace. Rather than a ring around the numeral -- which
            fought the radar rings and crowded the copy -- the panel's own edge
            drains. It reads from the far corner of vision, needs no space of
            its own, and leaves the numeral as large as it wants to be. */}
        {ringFrac !== null && edge && (
          <svg
            className="wr-edge"
            viewBox={`0 0 ${callBox.width} ${callBox.height}`}
            width={callBox.width}
            height={callBox.height}
            aria-hidden="true"
          >
            {edge.arms.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                strokeDasharray={`${edge.length} ${edge.length}`}
                strokeDashoffset={(edge.length * (1 - ringFrac)).toFixed(2)}
              />
            ))}
          </svg>
        )}
        {phase === 'LAUNCH' && <span key={next?.id} className="wr-burst" />}

        <div className="relative z-10">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: 'var(--wr)' }}>
            {meta.label}
          </div>

          {next ? (
            <div className="mt-2 truncate px-4 font-display text-3xl font-bold text-parchment sm:text-4xl">{next.name}</div>
          ) : (
            <div className="mt-2 font-display text-3xl font-bold text-parchment">Sequence Complete</div>
          )}

          <div className={`wr-readout mt-3 font-mono font-black ${readoutClass}`}>{readout}</div>

          <div className="mt-3 text-xs text-parchment/45">{meta.note}</div>

          {/* The one after this one. Knowing what is coming is what lets a
              caller draw breath instead of being surprised twice a minute.
              Guarded on `next`: once everything is called findIndex returns
              -1, and -1 + 1 wraps to sequence[0], which re-advertised the
              FIRST whale at T-0:00 under "Sequence Complete". */}
          {next && sequence[nextIndex + 1] && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/15 bg-ink/60 px-3 py-1.5">
              <Icon name="chevron" size={12} className="text-gold/50" />
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-parchment/45">Then</span>
              <span className="text-xs font-semibold text-parchment/80">{sequence[nextIndex + 1].name}</span>
              <span className="font-mono text-[10px] tabular-nums text-gold/70">
                T-{clock(sequence[nextIndex + 1].offset - now)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FIRING ORDER. The queue, with the active row lit in the state colour
          so the eye can drop straight to it. */}
      <div className="wr-console k-plate p-4" data-phase={phase}>
        <div className="eyebrow mb-3">Firing Order</div>
        <div className="space-y-2">
          {sequence.map((w, i) => {
            const callIn = w.offset - now
            const state = callIn <= 0 ? 'done' : i === nextIndex ? 'active' : 'pending'
            return (
              <div key={w.id} data-state={state} className="wr-row royal-plaque flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold/25 font-mono text-[10px] font-bold text-gold/70">
                  {state === 'done' ? '✓' : i + 1}
                </span>
                <span className="flex-1 truncate font-semibold text-parchment">{w.name}</span>
                <span className="font-mono text-[10px] tabular-nums text-parchment/35">march {w.march}</span>
                <span
                  className="w-16 text-right font-mono text-xs font-bold tabular-nums"
                  style={{ color: state === 'active' ? 'var(--wr)' : undefined }}
                >
                  {callIn <= 0 ? 'CALLED' : `T-${clock(callIn)}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
