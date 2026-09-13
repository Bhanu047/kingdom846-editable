import { useId, useMemo } from 'react'
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

const runsOldestFirst = () => [...tracker846.kvk.history].reverse()

/* ---------------------------------------------------------------- history --
   Atlas score across the campaign, as the profile plots it.
   ------------------------------------------------------------------------ */
function ScoreHistory() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const { atlas } = tracker846
  const series = atlas.curve
  const move = atlas.lastMove

  const W = 520, H = 200, L = 40, R = 16, T = 18, B = 30
  const ticks = [0, 25, 50, 75, 100]
  const x = (i) => L + (i / (series.length - 1)) * (W - L - R)
  const y = (v) => H - B - (v / 100) * (H - T - B)
  const line = smoothPath(series.map((p, i) => ({ x: x(i), y: y(p.score) })))

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
              <circle key={p.kvk} cx={x(i)} cy={y(p.score)} r="2.4" fill="#FFF6DA" />
            ))}
          </g>
        </svg>
        {ticks.filter((t) => t % 50 === 0).map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${(W - L + 6) / W * 100}%`, top: `${y(t) / H * 100}%` }}>{t}</div>
        ))}
        {[0, series.length - 1].map((i, n) => (
          <div key={series[i].kvk} className="pointer-events-none absolute whitespace-nowrap text-[9px] font-semibold text-parchment/40"
            style={{ left: n === 0 ? `${x(i) / W * 100}%` : undefined, right: n ? '2%' : undefined, top: `${(H - 12) / H * 100}%` }}>#{series[i].kvk}</div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-parchment/40">
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

  // Rank is a line now, not a ladder. The ladder existed because only two
  // positions were known and a two-point plot is mostly empty; twelve points
  // is a trajectory, and it tells the real story -- #458 at KvK 7, down into
  // the twenties, with the two falls after a lost phase plainly visible.
  //
  // #1 sits at the TOP: on a rank axis, better is a smaller number, and a
  // chart that climbs as the kingdom falls would be read backwards by
  // everyone. The domain is logarithmic because the same twenty places matter
  // far more at #20 than at #400, and a linear axis flattens the whole recent
  // half of the campaign into one band.
  const worst = Math.max(...series.map((p) => p.rank))
  const span = Math.log(worst)
  const W = 520, H = 200, L = 40, R = 16, T = 18, B = 30
  const x = (i) => L + (i / (series.length - 1)) * (W - L - R)
  const y = (rank) => T + (Math.log(rank) / span) * (H - T - B)
  const line = smoothPath(series.map((p, i) => ({ x: x(i), y: y(p.rank) })))
  const guides = [1, 10, 50, 200, worst]

  return (
    <Panel>
      <SectionTitle eyebrow="Standing" title="Kingdom Ranking" />
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
          {guides.map((g) => <line key={g} x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="rgba(127,158,214,.12)" />)}
          <path d={line} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={`url(#${gid}-r)`} strokeWidth="2.6"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1s' }}>
            {series.map((p, i) => (
              <circle key={p.kvk} cx={x(i)} cy={y(p.rank)} r="2.4" fill="#FFF6DA" />
            ))}
          </g>
        </svg>
        {guides.map((g) => (
          <div key={g} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${(W - L + 6) / W * 100}%`, top: `${y(g) / H * 100}%` }}>#{g}</div>
        ))}
        {[0, series.length - 1].map((i, n) => (
          <div key={series[i].kvk} className="pointer-events-none absolute whitespace-nowrap text-[9px] font-semibold text-parchment/40"
            style={{ left: n === 0 ? `${x(i) / W * 100}%` : undefined, right: n ? '2%' : undefined, top: `${(H - 12) / H * 100}%` }}>#{series[i].kvk}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
   Prep and battle win rate as they actually developed. Every point is computed
   from the KvK history, so this one is complete.
   ------------------------------------------------------------------------ */
function PerformanceTrend() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const runs = runsOldestFirst()
  const pts = useMemo(() => {
    let p = 0, b = 0
    return runs.map((k, i) => {
      if (k.prep === 'W') p += 1
      if (k.battle === 'W') b += 1
      return { kvk: k.kvk, prep: (p / (i + 1)) * 100, battle: (b / (i + 1)) * 100 }
    })
  }, [])

  // preserveAspectRatio="none" so the plot stretches to whatever height the
  // card ends up with. This card sits in a grid row beside the radar and gets
  // stretched to match it -- measured, that left 248px of empty panel under a
  // 178px chart, half the card doing nothing. A line plot has no intrinsic
  // aspect ratio to protect, and the only things that WOULD distort under a
  // non-uniform scale are the end markers, so those are HTML dots positioned
  // over the SVG rather than circles inside it.
  const W = 520, H = 200, L = 40, R = 16, T = 16, B = 26
  const x = (i) => L + (i / (pts.length - 1)) * (W - L - R)
  const y = (v) => H - B - (v / 100) * (H - T - B)
  const path = (key) => smoothPath(pts.map((p, i) => ({ x: x(i), y: y(p[key]) })))
  const last = pts[pts.length - 1]
  const pct = (v) => `${(v / W) * 100}%`
  const vpct = (v) => `${(v / H) * 100}%`
  const k = tracker846.kvk

  return (
    <Panel className="flex flex-col">
      <SectionTitle eyebrow="Consistency" title="Performance Trend" />
      <div className="mt-1 flex flex-wrap items-baseline gap-3 text-[11px]">
        {/* The key shows each line's own dash pattern rather than a dot, so the
            legend tells them apart the same way the plot does. */}
        <span className="inline-flex items-center gap-1.5" style={{ color: BLUE }}>
          <svg width="18" height="3" aria-hidden="true"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke={BLUE} strokeWidth="3" strokeDasharray="5 3.5" /></svg>
          Prep {Math.round(last.prep)}%
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: GOLD }}>
          <svg width="18" height="3" aria-hidden="true"><line x1="0" y1="1.5" x2="18" y2="1.5" stroke={GOLD} strokeWidth="3" /></svg>
          Battle {Math.round(last.battle)}%
        </span>
      </div>
      <div ref={ref} className="relative mt-2 min-h-[160px] flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          {[0, 25, 50, 75, 100].map((t) => (
            <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" vectorEffect="non-scaling-stroke" />
          ))}
          {pts.map((p, i) => (
            <line key={p.kvk} x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="rgba(226,199,125,.05)" vectorEffect="non-scaling-stroke" />
          ))}
          {/* Prep is dashed and battle is solid, as Atlas draws them, so the two
              are still separable in greyscale, in a screenshot, or to a reader
              who cannot tell the blue from the gold.

              That costs prep its draw-in: the animation everything else here
              uses IS a dash -- pathLength="1" with a single dash retreating to
              offset 0 -- and a path cannot carry that and a visible dash
              pattern at once. So prep is wiped in behind a clip rect instead.
              The curve only ever moves left to right, so a left-to-right wipe
              and a drawn line are the same gesture. */}
          <defs>
            <clipPath id={`${gid}-wipe`}>
              <rect x={L - 4} y="0" width={W - L - R + 8} height={H}
                style={{
                  transformOrigin: `${L - 4}px 0px`,
                  transform: reveal ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 1.2s cubic-bezier(.16,1,.3,1)',
                }} />
            </clipPath>
          </defs>
          {/* non-scaling-stroke keeps these 2.6px however far the box stretches;
              without it a tall card would fatten the lines. It also holds the
              dash pattern square, which a stretched viewBox would otherwise
              smear into uneven ticks. */}
          <g clipPath={`url(#${gid}-wipe)`}>
            <path d={path('prep')} fill="none" stroke={BLUE} strokeWidth="2.6"
              strokeDasharray="7 5" strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
          </g>
          <path d={path('battle')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={GOLD} strokeWidth="2.6" vectorEffect="non-scaling-stroke"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1) .16s' }} />
        </svg>
        {[{ v: last.prep, c: BLUE }, { v: last.battle, c: GOLD }].map((m) => (
          <div key={m.c} className="pointer-events-none absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ left: pct(x(pts.length - 1)), top: vpct(y(m.v)), borderColor: m.c, background: '#0b1222',
              opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1.1s' }} />
        ))}
        {[0, 50, 100].map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${((W - L + 6) / W) * 100}%`, top: vpct(y(t)) }}>{t}%</div>
        ))}
        {[0, pts.length - 1].map((i) => (
          <div key={i} className="pointer-events-none absolute whitespace-nowrap text-[9px] font-semibold text-parchment/40"
            style={{ left: i === 0 ? pct(x(i)) : undefined, right: i ? '2%' : undefined, bottom: 0 }}>#{pts[i].kvk}</div>
        ))}
      </div>

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

/* -------------------------------------------------------------- breakdown --
   Where the score comes from. A segmented bar rather than five separate
   readouts, because the point of a decomposition is the relative size.
   ------------------------------------------------------------------------ */
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
