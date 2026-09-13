import { useId, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import Icon from './Icon'
import { tracker846 } from '../data/tracker846'
import { smoothPath, useInView } from '../lib/chartAnim'

// The Atlas profile, rebuilt on our own page.
//
// A note on what is and is not drawn here, because it is the whole design
// constraint. Everything on this page is either published by Atlas verbatim,
// read off its own charts, or derived from the KvK history we already hold.
//
// The score and rank curves used to be RECONSTRUCTED -- modelled from our
// record with weights solved out of the published breakdown -- because the
// profile draws those curves without publishing the numbers behind them. They
// are the real per-KvK figures now, read point by point off the profile's
// charts, so the model and its calibration rings are gone. What the readings
// cost in precision is stated where it matters: about +/-0.1 on a score and
// +/-1 on a rank, against win rates that are exact.
//
// The rule that produced the old model still holds for anything we cannot
// read: a chart that looks authoritative and is guessed is worse than one with
// an honest gap in it. This is a kingdom's public record, and people compare
// it against the real profile.

const GOLD = '#E8C558'
const BLUE = '#7f9ed6'

/* ------------------------------------------------------------ kvk charts --
   The three line charts share an x-axis -- one point per KvK, 7 through 18 --
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
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-md border border-gold/25 bg-[#0b1222]/95 px-2 py-1 text-[10px] shadow-lg"
      style={{ left, top }}>
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

/* ---------------------------------------------------------------- history --
   Atlas score across the campaign, as the profile plots it.
   ------------------------------------------------------------------------ */
function ScoreHistory() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const { atlas } = tracker846
  const series = atlas.curve
  const move = atlas.lastMove
  const { active, setActive, x } = useKvkPoints(series.length)

  const { W, H, L, R, T, B } = PLOT
  const ticks = [0, 25, 50, 75, 100]
  const y = (v) => H - B - (v / 100) * (H - T - B)
  const line = smoothPath(series.map((p, i) => ({ x: x(i), y: y(p.score) })))
  const hot = active == null ? null : series[active]

  return (
    <Panel>
      <SectionTitle eyebrow="Trajectory" title="Atlas Score History" />
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-bold" style={{ color: GOLD }}>▲{move.score.toFixed(2)}</span>
        <span className="text-[11px] text-parchment/50">KvK {move.fromKvk} → {move.toKvk}</span>
        <span className="ml-auto font-mono text-lg font-black text-gold-bright">{atlas.score.toFixed(2)}</span>
      </div>
      <div ref={ref} className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id={`${gid}-f`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity=".26" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" />)}
          <path d={`${line} L${x(series.length - 1)},${H - B} L${x(0)},${H - B} Z`}
            fill={`url(#${gid}-f)`} style={{ opacity: reveal ? 1 : 0, transition: 'opacity .7s ease .3s' }} />
          <path d={line} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={GOLD} strokeWidth="2.6"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1s' }}>
            {series.map((p, i) => (
              <circle key={p.kvk} cx={x(i)} cy={y(p.score)} r={active === i ? 4.2 : 2.4}
                fill="#FFF6DA" stroke={GOLD} strokeWidth={active === i ? 1.6 : 0} />
            ))}
          </g>
        </svg>
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${((W - L + 6) / W) * 100}%`, top: `${(y(t) / H) * 100}%` }}>{t}</div>
        ))}
        <KvkHover count={series.length} onActive={setActive} />
        {hot && <KvkTooltip label={hot.kvk} value={hot.score.toFixed(2)}
          left={`${(x(active) / W) * 100}%`} top={`${(y(hot.score) / H) * 100}%`} />}
      </div>
      <KvkAxis series={series} x={x} />
      <p className="mt-4 text-[10px] leading-relaxed text-parchment/40">
        Read off the Atlas history chart (±0.1). Its last point sits at {series[series.length - 1].score.toFixed(2)};
        the profile recalculates after a KvK settles, and {atlas.score.toFixed(2)} is the standing it shows now.
      </p>
    </Panel>
  )
}

function RankHistory() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const { atlas, tier } = tracker846
  const series = atlas.curve
  const move = atlas.lastMove
  const headroom = atlas.score - atlas.tierThreshold
  const { active, setActive, x } = useKvkPoints(series.length)

  // Atlas's own axis: linear, #1 at the top, running to #470 -- the size of the
  // ladder rather than the band this kingdom happens to occupy. A log domain
  // read better in isolation, but this chart is compared against the source
  // side by side, and a curve whose shape depends on which scale we picked is
  // the wrong kind of difference to introduce.
  const { W, H, L, R, T, B } = PLOT
  const FLOOR = 470
  const ticks = [1, 118, 236, 353, FLOOR]
  const y = (rank) => T + ((rank - 1) / (FLOOR - 1)) * (H - T - B)
  const line = smoothPath(series.map((p, i) => ({ x: x(i), y: y(p.rank) })))
  const hot = active == null ? null : series[active]

  return (
    <Panel>
      <SectionTitle eyebrow="Standing" title="Kingdom Ranking History" />
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-bold" style={{ color: BLUE }}>▲{move.ranks} ranks</span>
        <span className="text-[11px] text-parchment/50">KvK {move.fromKvk} → {move.toKvk}</span>
        <span className="ml-auto font-mono text-lg font-black text-gold-bright">#{atlas.rank}</span>
      </div>
      <div ref={ref} className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id={`${gid}-r`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={BLUE} stopOpacity=".55" />
              <stop offset="100%" stopColor="#FFF6DA" stopOpacity="1" />
            </linearGradient>
          </defs>
          {ticks.map((t) => <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(127,158,214,.12)" />)}
          <path d={line} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={`url(#${gid}-r)`} strokeWidth="2.6"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1s' }}>
            {series.map((p, i) => (
              <circle key={p.kvk} cx={x(i)} cy={y(p.rank)} r={active === i ? 4.2 : 2.4}
                fill="#FFF6DA" stroke={BLUE} strokeWidth={active === i ? 1.6 : 0} />
            ))}
          </g>
        </svg>
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${((W - L + 6) / W) * 100}%`, top: `${(y(t) / H) * 100}%` }}>#{t}</div>
        ))}
        <KvkHover count={series.length} onActive={setActive} />
        {hot && <KvkTooltip label={hot.kvk} value={`#${hot.rank}`}
          left={`${(x(active) / W) * 100}%`} top={`${(y(hot.rank) / H) * 100}%`} />}
      </div>
      <KvkAxis series={series} x={x} />

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/5 p-2.5 text-center">
          <div className="font-display text-lg font-bold text-gold-bright">{tier}</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/45">Tier · {atlas.tierThreshold}+ to hold</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2.5 text-center">
          <div className="font-display text-lg font-bold text-emerald-300">+{headroom.toFixed(2)}</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/45">Above threshold</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-gold/15 bg-gold/[.04] px-3 py-2 text-[11px] text-parchment/65">
        Ranks better than <span className="font-bold text-gold-bright">{atlas.percentile}%</span> of all kingdoms.
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ trend --
   Prep and battle win rate as they developed, from the same curve the other
   two charts use. The stored rates are the profile's own, and the test file
   holds them against the rates recomputed from the twelve runs -- so these are
   read from the source AND checked against our record, not one or the other.
   ------------------------------------------------------------------------ */
function PerformanceTrend() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const series = tracker846.atlas.curve
  const { active, setActive, x } = useKvkPoints(series.length)

  // preserveAspectRatio="none" so the plot stretches to whatever height the
  // card ends up with. This card sits in a grid row beside the radar and gets
  // stretched to match it -- measured, that left 248px of empty panel under a
  // 178px chart, half the card doing nothing. A line plot has no intrinsic
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

  return (
    <Panel className="flex flex-col">
      <SectionTitle eyebrow="Consistency" title="Performance Trend" />
      <div className="mt-1 flex flex-wrap items-baseline gap-3 text-[11px]">
        {/* The key shows each line's own dash pattern rather than a dot, so the
            legend tells them apart the same way the plot does. */}
        <span className="inline-flex items-center gap-1.5" style={{ color: BLUE }}>
          <svg width="18" height="3" aria-hidden="true"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke={BLUE} strokeWidth="3" strokeDasharray="5 3.5" /></svg>
          Prep WR {last.prepWinRate.toFixed(1)}%
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: GOLD }}>
          <svg width="18" height="3" aria-hidden="true"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke={GOLD} strokeWidth="3" /></svg>
          Battle WR {last.battleWinRate.toFixed(1)}%
        </span>
      </div>
      <div ref={ref} className="relative mt-2 min-h-[160px] flex-1">
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
                style={{
                  transformOrigin: `${L - 4}px 0px`,
                  transform: reveal ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 1.2s cubic-bezier(.16,1,.3,1)',
                }} />
            </clipPath>
          </defs>
          {ticks.map((t) => (
            <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" vectorEffect="non-scaling-stroke" />
          ))}
          {series.map((p, i) => (
            <line key={p.kvk} x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="rgba(226,199,125,.05)" vectorEffect="non-scaling-stroke" />
          ))}
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .7s ease .4s' }}>
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
          <path d={path('battleWinRate')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={GOLD} strokeWidth="2.6" vectorEffect="non-scaling-stroke"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1) .16s' }} />
        </svg>
        {/* Point markers are HTML: under preserveAspectRatio="none" an SVG
            circle would be squashed into an ellipse by the stretch. */}
        {series.map((p, i) => (
          <div key={p.kvk} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: pct(x(i)), top: vpct(y(p.battleWinRate)),
              height: active === i ? 9 : 5, width: active === i ? 9 : 5,
              background: active === i ? '#FFF6DA' : GOLD,
              opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1.1s, height .12s, width .12s',
            }} />
        ))}
        <div className="pointer-events-none absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ left: pct(x(series.length - 1)), top: vpct(y(last.prepWinRate)), borderColor: BLUE, background: '#0b1222',
            opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1.1s' }} />
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

      {/* The card is stretched to the radar's height either way, so it may as
          well carry the record the curves are drawn from. */}
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

// The five score components, each its own colour so the stacked bar and the
// list below it read as the same thing.
const SEG_COLORS = { base: '#E0B23B', dominv: '#5D90E8', form: '#5BC98C', streaks: '#C77FD8', history: '#D76158' }

function ScoreBreakdown() {
  const [ref, reveal] = useInView()
  const { breakdown, score, experiencePenalty } = tracker846.atlas
  const total = breakdown.reduce((s, b) => s + b.pts, 0)
  // The components are re-read less often than the score is. When they are
  // behind it, the bar is a decomposition of the OLDER score, so the panel
  // shows that older total and its date instead of printing today's score
  // above five segments that do not add up to it.
  const stale = Math.abs(total - score) > 0.05

  return (
    <Panel>
      <SectionTitle eyebrow="Score Components" title="Atlas Score Breakdown"
        action={<Pill tone="gold">{tracker846.tier}</Pill>} />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="gilt-text font-mono text-3xl font-black">{(stale ? total : score).toFixed(2)}</span>
        <span className="text-[11px] text-parchment/40">
          {stale
            ? `components as of ${tracker846.atlas.componentsVerified} · score now ${score.toFixed(2)}`
            : 'breakdown is approximate'}
        </span>
      </div>
      <div ref={ref} className="k-track mt-3 flex h-5 overflow-hidden rounded-full border border-gold/15">
        {breakdown.map((b, i) => (
          <div key={b.key} className="k-seg" title={`${b.label} ${b.pts}`}
            style={{ width: reveal ? `${(b.pts / total) * 100}%` : '0%', '--c': SEG_COLORS[b.key], transitionDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {breakdown.map((b) => (
          <div key={b.key} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: SEG_COLORS[b.key] }} />
            <span className="flex-1 text-parchment/70">{b.label}
              <span className="ml-1.5 text-parchment/35">{b.note}</span>
            </span>
            <span className="font-mono font-bold tabular-nums text-parchment/90">+{b.pts.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-gold/10 pt-2 text-[11px]">
          <Icon name="shield" size={12} className="text-emerald-300/80" />
          <span className="flex-1 text-parchment/70">Experience
            <span className="ml-1.5 text-parchment/35">{experiencePenalty ? 'penalty applied' : 'no penalty'}</span>
          </span>
          <span className="font-mono font-bold text-emerald-300">{experiencePenalty ? '—' : '✓'}</span>
        </div>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ radar --
   Six axes. Labels sit outside the grid by opting out of the clamp -- the
   same trap that printed the PvP radar's labels on top of its own polygon.
   ------------------------------------------------------------------------ */
function PerformanceRadar() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const axes = tracker846.atlas.radar
  const CX = 170, CY = 152, R = 96
  const angleFor = (i) => (i / axes.length) * Math.PI * 2 - Math.PI / 2
  const pt = (i, val, clamp = true) => {
    const k = clamp ? Math.min(1, val / 100) : val / 100
    return [CX + R * k * Math.cos(angleFor(i)), CY + R * k * Math.sin(angleFor(i))]
  }
  const poly = axes.map((a, i) => pt(i, a.value).join(',')).join(' ')
  const rings = [25, 50, 75, 100]

  return (
    <Panel>
      <SectionTitle eyebrow="Profile" title="Performance Radar" />
      <div ref={ref} className="relative mt-2">
        <svg viewBox="0 0 340 300" className="w-full" role="img"
          aria-label={`Performance radar. ${axes.map((a) => `${a.label}: ${a.value}%`).join(', ')}.`}>
          <defs>
            <radialGradient id={`${gid}-f`}>
              <stop offset="0%" stopColor={GOLD} stopOpacity=".34" />
              <stop offset="100%" stopColor={GOLD} stopOpacity=".10" />
            </radialGradient>
          </defs>
          {rings.map((r) => (
            <polygon key={r} points={axes.map((_, i) => pt(i, r).join(',')).join(' ')}
              fill="none" stroke="rgba(226,199,125,.13)" strokeWidth="1" />
          ))}
          {axes.map((_, i) => {
            const [ex, ey] = pt(i, 100)
            return <line key={i} x1={CX} y1={CY} x2={ex} y2={ey} stroke="rgba(226,199,125,.10)" />
          })}
          <polygon points={poly} fill={`url(#${gid}-f)`} stroke={GOLD} strokeWidth="2.2"
            style={{ transformOrigin: `${CX}px ${CY}px`, transform: reveal ? 'scale(1)' : 'scale(.05)', opacity: reveal ? 1 : 0, transition: 'transform .9s cubic-bezier(.34,1.4,.6,1), opacity .5s ease' }} />
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease .8s' }}>
            {axes.map((a, i) => {
              const [px, py] = pt(i, a.value)
              return <circle key={a.label} cx={px} cy={py} r="3" fill="#F6E2A4" stroke="#0b1222" strokeWidth="1.4" />
            })}
          </g>
        </svg>
        {axes.map((a, i) => {
          // 1.3 with the clamp switched off, so labels clear the outer ring
          // instead of being pinned to it.
          const [lx, ly] = pt(i, 130, false)
          return (
            <div key={a.label}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center"
              style={{ left: `${lx / 340 * 100}%`, top: `${ly / 300 * 100}%` }}>
              <div className="text-[9px] uppercase tracking-[.1em] text-parchment/45">{a.label}</div>
              <div className="font-mono text-[12px] font-bold text-gold-bright">{a.value}%</div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}


/* -------------------------------------------------------------- simulator --
   Atlas's projection for the next KvK. Its simulator lets you pick an outcome;
   only the default one -- both phases won -- is published as figures, so that
   is the only one shown. The others are not extrapolated from it, because the
   components below do not move linearly and a wrong projection on a kingdom's
   own page is worse than an absent one.
   ------------------------------------------------------------------------ */
function ScoreSimulator() {
  const [ref, reveal] = useInView()
  const { atlas } = tracker846
  const sim = atlas.simulator
  const top = Math.max(...sim.parts.map((p) => p.pts))

  return (
    <Panel>
      <SectionTitle eyebrow={`If KvK ${sim.nextKvk} is won`} title="Atlas Score Simulator"
        action={<Pill tone="gold">+{sim.deltaPct.toFixed(1)}%</Pill>} />
      <div className="mt-3 flex items-center gap-3">
        <div>
          <div className="font-mono text-2xl font-black text-parchment/70">{atlas.score.toFixed(2)}</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/40">Now</div>
        </div>
        <Icon name="arrow" size={18} className="text-gold/60" />
        <div>
          <div className="gilt-text font-mono text-3xl font-black">{sim.projected.toFixed(2)}</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/45">Projected · ▲{sim.delta.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-1 text-[11px] text-parchment/50">{sim.outcome}</div>
      <div ref={ref} className="mt-3 space-y-2">
        {sim.parts.map((part, i) => (
          <div key={part.label} className="grid grid-cols-[104px_1fr_46px] items-center gap-2">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">{part.label}</div>
            <div className="k-track h-1.5 overflow-hidden rounded-full bg-white/[.06]">
              <div className="h-full rounded-full"
                style={{
                  width: reveal ? `${top ? (part.pts / top) * 100 : 0}%` : '0%',
                  background: part.pts ? GOLD : 'rgba(226,199,125,.25)',
                  transition: `width .8s cubic-bezier(.16,1,.3,1) ${i * 90}ms`,
                }} />
            </div>
            <div className="text-right font-mono text-[11px] text-gold-bright">+{part.pts.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-parchment/40">
        Atlas&apos;s own projection for a domination in KvK {sim.nextKvk}. Other outcomes are not shown because the
        profile does not publish their figures.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------------ tier --
   Where the kingdom sits against the tier it holds.
   ------------------------------------------------------------------------ */
function PathToTier() {
  const [ref, reveal] = useInView()
  const { atlas, tier } = tracker846
  const held = atlas.score >= atlas.tierThreshold
  // The bar runs from the threshold to 100 rather than 0 to 100: the whole
  // question this panel answers is how much room there is above the line, and
  // two thirds of a 0-100 bar is territory the kingdom left behind long ago.
  const pos = Math.min(100, ((atlas.score - atlas.tierThreshold) / (100 - atlas.tierThreshold)) * 100)

  return (
    <Panel>
      <SectionTitle eyebrow="Standing" title="Path to Next Tier"
        action={<Pill tone="gold">{tier}</Pill>} />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="gilt-text font-mono text-3xl font-black">{atlas.score.toFixed(2)}</span>
        <span className="text-[11px] text-parchment/50">holds at {atlas.tierThreshold}+</span>
      </div>
      <div ref={ref} className="k-track mt-3 h-2.5 overflow-hidden rounded-full border border-gold/15 bg-white/[.05]">
        <div className="h-full rounded-full"
          style={{
            width: reveal ? `${pos}%` : '0%',
            backgroundImage: `linear-gradient(90deg, ${BLUE}, ${GOLD})`,
            transition: 'width 1s cubic-bezier(.16,1,.3,1) .2s',
          }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-parchment/30">
        <span>{atlas.tierThreshold}</span><span>100</span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-parchment/65">
        {held
          ? `Already ${tier}. There is no tier above it — ${(atlas.score - atlas.tierThreshold).toFixed(2)} points of room over the line, and holding it is the whole job.`
          : `${(atlas.tierThreshold - atlas.score).toFixed(2)} points below the ${tier} line.`}
      </p>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */
export default function AtlasAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreHistory />
        <RankHistory />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceTrend />
        <PerformanceRadar />
      </div>
      <ScoreBreakdown />
      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreSimulator />
        <PathToTier />
      </div>
    </div>
  )
}
