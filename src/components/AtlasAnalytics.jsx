import { useEffect, useId, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import { tracker846 } from '../data/tracker846'
import { smoothPath, useCountUp, useInView, useReveal } from '../lib/chartAnim'

// The Atlas profile, rebuilt on our own page.
//
// Everything drawn here is either published by Atlas verbatim or derived from
// the KvK history we already hold. Atlas now rates kingdoms on three ratings --
// Atlas, Prep and Battle -- each with its own global rank, and plots their
// history as charts without printing the numbers behind them. Those histories
// are not redrawn here: a chart that looks authoritative and is read off
// someone else's picture is worse than an honest gap. The win-rate trend is
// drawn, because it is counted exactly from the runs.

const GOLD = '#E8C558'
const BLUE = '#7f9ed6'

/* ------------------------------------------------------------ kvk charts --
   The trend chart's x-axis -- one point per KvK, from 7 to the latest --
   and everything that follows from it: where a point sits, which labels fit,
   and what the reader gets when they hover or tap one.

   Atlas labels every KvK on its axis. At 520 units wide that is fine, but on a
   360px phone twelve "#12"s collide into a grey smear, so every other label is
   dropped below 400px and the last one is always kept -- an axis whose final
   tick is missing reads as though the chart stops early.

   The hover layer is HTML over the SVG rather than SVG hit areas: it has to
   work on touch, where there is no hover at all and a tap has to land on
   something forgiving. Each point gets an equal vertical band of the plot, so
   the target is the full height of the chart and about 40px wide.
   -------------------------------------------------------------------------- */
const PLOT = { W: 520, H: 200, L: 40, R: 16, T: 18, B: 30 }

/* The entrance, in one place.
 *
 * Every chart plays the same shape: the line draws, its points arrive along it,
 * the fill comes up underneath. Timings live here so the four cards stay in
 * step, and so a card in the right-hand column can be held back a moment -- a
 * whole grid firing at once reads as a page glitch rather than an entrance.
 *
 * `calm` is the reduced-motion path, and it is a real reveal, not a skipped
 * one: the chart fades up over 300ms already drawn, with no drawing, no travel
 * and no counting. The observer still decides WHEN, so it happens as the card
 * arrives rather than silently at mount.
 */
const DRAW_MS = 1100
const DOT_STAGGER_MS = 40
const CALM_FADE_MS = 300
const ROW_STAGGER_MS = 120

function useEntrance(delayMs = 0) {
  const [ref, seen, calm] = useInView()
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!seen) return undefined
    if (!delayMs) { setOn(true); return undefined }
    const id = setTimeout(() => setOn(true), delayMs)
    return () => clearTimeout(id)
  }, [seen, delayMs])

  // What a caller needs to describe any one piece of the sequence.
  return {
    ref,
    on,
    calm,
    // The card itself fades either way; under calm it is the whole entrance.
    cardStyle: { opacity: on ? 1 : 0, transition: `opacity ${calm ? CALM_FADE_MS : 500}ms ease` },
    // A line: drawn on for everyone else, already whole under calm.
    drawStyle: (delay = 0) => (calm
      ? { strokeDasharray: 'none' }
      : {
        strokeDasharray: 1,
        strokeDashoffset: on ? 0 : 1,
        transition: `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }),
    // A point on that line, popping in after the line reaches it.
    dotStyle: (i, cx, cy, delay = DRAW_MS * 0.55) => (calm
      ? { opacity: on ? 1 : 0, transition: `opacity ${CALM_FADE_MS}ms ease` }
      : {
        transformOrigin: `${cx}px ${cy}px`,
        transform: on ? 'scale(1)' : 'scale(0)',
        transition: `transform 260ms cubic-bezier(.34,1.56,.64,1) ${delay + i * DOT_STAGGER_MS}ms`,
      }),
    // Anything that simply arrives: a fill, a label, a legend.
    fadeStyle: (delay = 0) => ({
      opacity: on ? 1 : 0,
      transition: `opacity ${calm ? CALM_FADE_MS : 450}ms ease ${calm ? 0 : delay}ms`,
    }),
  }
}

// A headline figure that counts up when its card arrives -- and simply reads
// its value under reduced motion, where useCountUp returns the target outright.
function useFigure(value, on, duration = 900) {
  return useCountUp(on ? value : 0, duration)
}


function useKvkPoints(count) {
  const [active, setActive] = useState(null)
  const { W, L, R } = PLOT
  const x = (i) => L + (i / (count - 1)) * (W - L - R)
  return { active, setActive, x }
}

function KvkHover({ count, onActive }) {
  return (
    <div className="absolute inset-0 flex" onPointerLeave={() => onActive(null)}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" tabIndex={-1} aria-hidden="true"
          className="h-full flex-1 cursor-default bg-transparent"
          onPointerEnter={() => onActive(i)}
          onPointerDown={() => onActive(i)}
          onFocus={() => onActive(i)} />
      ))}
    </div>
  )
}

function KvkTooltip({ label, value, left, top }) {
  // Mounted only while a point is active, so `useReveal` gives it a frame at
  // the start state and the fade-and-rise actually plays instead of the box
  // snapping into place.
  const shown = useReveal()
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-gold/25 bg-[#0b1222]/95 px-2 py-1 text-[10px] shadow-lg"
      style={{
        left,
        top,
        opacity: shown ? 1 : 0,
        transform: `translate(-50%, ${shown ? '-140%' : 'calc(-140% + 4px)'})`,
        transition: 'opacity 120ms ease, transform 120ms cubic-bezier(.2,.8,.3,1)',
      }}>
      <span className="text-parchment/50">KvK {label}</span>
      <span className="ml-1.5 font-mono font-bold text-gold-bright">{value}</span>
    </div>
  )
}

// The axis sits in its OWN row under the plot, not absolutely positioned
// inside it. Inside the plot box the bottom y-tick (0%, or #470 on the rank
// chart) and the first KvK label both land in the same corner, and on a phone
// -- where the box is shorter but the type is not smaller -- they overlapped.
// Measured at 360 and 390px: "0" sitting on top of "#7".
function KvkAxis({ series, x }) {
  const { W } = PLOT
  const last = series.length - 1
  return (
    <div className="relative mt-1.5 h-3">
      {series.map((p, i) => (
        <div key={p.kvk}
          className={`pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-parchment/40 ${
            i % 2 === 0 || i === last ? '' : 'hidden min-[400px]:block'}`}
          style={{ left: `${(x(i) / W) * 100}%` }}>#{p.kvk}</div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- ratings --
   The three ratings and their ranks, as the profile header prints them.
   ------------------------------------------------------------------------ */
function AtlasRatings({ delay = 0 }) {
  const ent = useEntrance(delay)
  const { atlas, tier } = tracker846
  const shownRating = useFigure(atlas.rating, ent.on)
  const shownRank = useFigure(atlas.rank, ent.on)
  const sub = [
    { label: 'Prep Rating', ...atlas.prep, color: BLUE },
    { label: 'Battle Rating', ...atlas.battle, color: GOLD },
  ]

  return (
    <Panel style={ent.cardStyle}>
      <SectionTitle eyebrow="Standing" title="Atlas Ratings" action={<Pill tone="gold">{tier}</Pill>} />
      <div ref={ent.ref} className="mt-3 flex items-baseline gap-3">
        <span className="gilt-text font-mono text-3xl font-black tabular-nums">
          {shownRating.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-parchment/45">Atlas Rating</span>
        <span className="ml-auto font-mono text-lg font-black tabular-nums text-gold-bright">#{Math.round(shownRank)}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {sub.map((r, i) => (
          <div key={r.label} className="rounded-lg bg-white/5 p-3 text-center" style={ent.fadeStyle(250 + i * 120)}>
            <div className="font-mono text-lg font-bold tabular-nums" style={{ color: r.color }}>
              {r.rating.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-parchment/45">{r.label}</div>
            <div className="mt-0.5 font-mono text-[11px] text-parchment/70">Rank #{r.rank}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg bg-white/5 p-3 text-center" style={ent.fadeStyle(490)}>
        <div className="font-mono text-lg font-bold tabular-nums text-parchment">{atlas.mystic.total.toLocaleString('en-US')}</div>
        <div className="text-[9px] uppercase tracking-wider text-parchment/45">Mystic Trials · Top 100 total</div>
        <div className="mt-0.5 font-mono text-[11px] text-parchment/70">Rank #{atlas.mystic.rank}</div>
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-parchment/40">
        As shown on the Kingshot Atlas profile on {atlas.verified}.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ trend --
   Prep and battle win rate as they developed, KvK by KvK -- the profile's
   "Performance Trend", counted from the runs.
   ------------------------------------------------------------------------ */
function PerformanceTrend({ delay = 0 }) {
  const gid = useId()
  const ent = useEntrance(delay)
  const series = tracker846.atlas.trend
  const { active, setActive, x } = useKvkPoints(series.length)

  // preserveAspectRatio="none" so the plot stretches to whatever height the
  // card ends up with. This card sits in a grid row beside the ratings card
  // and gets stretched to match it. A line plot has no intrinsic
  // aspect ratio to protect, and the only things that WOULD distort under a
  // non-uniform scale are the end markers, so those are HTML dots positioned
  // over the SVG rather than circles inside it.
  const { W, H, L, R, T, B } = PLOT
  const ticks = [0, 25, 50, 75, 100]
  const y = (v) => H - B - (v / 100) * (H - T - B)
  const path = (key) => smoothPath(series.map((p, i) => ({ x: x(i), y: y(p[key]) })))
  const area = (key) => `${path(key)} L${x(series.length - 1)},${H - B} L${x(0)},${H - B} Z`
  const last = series[series.length - 1]
  const pct = (v) => `${(v / W) * 100}%`
  const vpct = (v) => `${(v / H) * 100}%`
  const k = tracker846.kvk
  const hot = active == null ? null : series[active]
  const shownPrep = useFigure(last.prepWinRate, ent.on)
  const shownBattle = useFigure(last.battleWinRate, ent.on)

  return (
    <Panel className="flex flex-col" style={ent.cardStyle}>
      <SectionTitle eyebrow="Consistency" title="Performance Trend" />
      <div className="mt-1 flex flex-wrap items-baseline gap-3 text-[11px]">
        {/* The key shows each line's own dash pattern rather than a dot, so the
            legend tells them apart the same way the plot does. */}
        <span className="inline-flex items-center gap-1.5" style={{ color: BLUE }}>
          <svg width="18" height="3" aria-hidden="true"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke={BLUE} strokeWidth="3" strokeDasharray="5 3.5" /></svg>
          Prep WR <span className="tabular-nums">{shownPrep.toFixed(1)}%</span>
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: GOLD }}>
          <svg width="18" height="3" aria-hidden="true"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke={GOLD} strokeWidth="3" /></svg>
          Battle WR <span className="tabular-nums">{shownBattle.toFixed(1)}%</span>
        </span>
      </div>
      <div ref={ent.ref} className="relative mt-2 min-h-[160px] flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id={`${gid}-pf`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity=".20" />
              <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gid}-bf`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity=".22" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
            {/* Prep is dashed and battle is solid, as Atlas draws them, so the
                two are still separable in greyscale, in a screenshot, or to a
                reader who cannot tell the blue from the gold.

                That costs prep its draw-in: the animation everything else here
                uses IS a dash -- pathLength="1" with a single dash retreating
                to offset 0 -- and a path cannot carry that and a visible dash
                pattern at once. So prep is wiped in behind a clip rect instead.
                The curve only ever moves left to right, so a left-to-right wipe
                and a drawn line are the same gesture. */}
            <clipPath id={`${gid}-wipe`}>
              <rect x={L - 4} y="0" width={W - L - R + 8} height={H}
                style={ent.calm ? { transform: 'scaleX(1)' } : {
                  transformOrigin: `${L - 4}px 0px`,
                  transform: ent.on ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform ${DRAW_MS}ms cubic-bezier(.16,1,.3,1) 150ms`,
                }} />
            </clipPath>
          </defs>
          {ticks.map((t) => (
            <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" vectorEffect="non-scaling-stroke" />
          ))}
          {series.map((p, i) => (
            <line key={p.kvk} x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="rgba(226,199,125,.05)" vectorEffect="non-scaling-stroke" />
          ))}
          <g style={ent.fadeStyle(DRAW_MS * 0.9)}>
            <path d={area('prepWinRate')} fill={`url(#${gid}-pf)`} />
            <path d={area('battleWinRate')} fill={`url(#${gid}-bf)`} />
          </g>
          {/* non-scaling-stroke keeps these 2.6px however far the box stretches;
              without it a tall card would fatten the lines. It also holds the
              dash pattern square, which a stretched viewBox would otherwise
              smear into uneven ticks. */}
          <g clipPath={`url(#${gid}-wipe)`}>
            <path d={path('prepWinRate')} fill="none" stroke={BLUE} strokeWidth="2.6"
              strokeDasharray="8 4" strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
          </g>
          <path d={path('battleWinRate')} pathLength="1" fill="none" stroke={GOLD} strokeWidth="2.6"
            vectorEffect="non-scaling-stroke" style={ent.drawStyle()} />
        </svg>
        {/* Point markers are HTML: under preserveAspectRatio="none" an SVG
            circle would be squashed into an ellipse by the stretch. */}
        {series.map((p, i) => (
          <div key={p.kvk} className="pointer-events-none absolute rounded-full"
            style={{
              left: pct(x(i)), top: vpct(y(p.battleWinRate)),
              height: active === i ? 9 : 5, width: active === i ? 9 : 5,
              background: active === i ? '#FFF6DA' : GOLD,
              // -50%/-50% is folded into the transform so the pop-in scales
              // about the point itself rather than its top-left corner.
              ...(ent.calm
                ? { transform: 'translate(-50%, -50%)', opacity: ent.on ? 1 : 0, transition: `opacity ${CALM_FADE_MS}ms ease` }
                : {
                  transform: `translate(-50%, -50%) scale(${ent.on ? 1 : 0})`,
                  transition: `transform 260ms cubic-bezier(.34,1.56,.64,1) ${DRAW_MS * 0.55 + i * DOT_STAGGER_MS}ms, height .12s, width .12s`,
                }),
            }} />
        ))}
        <div className="pointer-events-none absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ left: pct(x(series.length - 1)), top: vpct(y(last.prepWinRate)), borderColor: BLUE, background: '#0b1222',
            ...ent.fadeStyle(DRAW_MS) }} />
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${((W - L + 6) / W) * 100}%`, top: vpct(y(t)) }}>{t}%</div>
        ))}
        <KvkHover count={series.length} onActive={setActive} />
        {hot && <KvkTooltip label={hot.kvk}
          value={`prep ${hot.prepWinRate.toFixed(1)}% · battle ${hot.battleWinRate.toFixed(1)}%`}
          left={pct(x(active))} top={vpct(y(Math.max(hot.prepWinRate, hot.battleWinRate)))} />}
      </div>
      <KvkAxis series={series} x={x} />

      {/* The record the curves are drawn from. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Prep', value: k.prep.record, sub: `${k.prep.winRate}% win` },
          { label: 'Battle', value: k.battle.record, sub: `${k.battle.winRate}% win` },
          { label: 'Best streak', value: k.prep.best, sub: 'consecutive' },
        ].map((c) => (
          <div key={c.label} className="rounded-lg bg-white/5 p-2.5 text-center">
            <div className="font-display text-base font-bold text-parchment">{c.value}</div>
            <div className="text-[9px] uppercase tracking-wider text-parchment/45">{c.label}</div>
            <div className="mt-0.5 text-[9px] text-parchment/35">{c.sub}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */
export default function AtlasAnalytics() {
  return (
    <div className="space-y-6">
      {/* The second card follows the first. A grid that fires all at once
          reads as the page glitching rather than as an entrance. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AtlasRatings />
        <PerformanceTrend delay={ROW_STAGGER_MS} />
      </div>
    </div>
  )
}
