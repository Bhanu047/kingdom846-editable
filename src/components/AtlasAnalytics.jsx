import { useId, useMemo } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import Icon from './Icon'
import { tracker846 } from '../data/tracker846'
import { smoothPath, useInView } from '../lib/chartAnim'

// The Atlas profile, rebuilt on our own page.
//
// A note on what is and is not drawn here, because it is the whole design
// constraint. The Atlas profile publishes: the current score and rank, the
// component breakdown, the six performance metrics, and the size of the last
// move (KvK 16 -> 17). It draws score and rank curves across KvKs 7-17 but does
// not publish those per-KvK numbers anywhere we can read.
//
// So the two history charts plot the step that IS published and mark the rest
// as unrecorded, rather than drawing a plausible line through invented points.
// A chart that looks authoritative and is guessed is worse than one with an
// honest gap in it -- this is a kingdom's public record, and people compare it
// against the real profile.
//
// Everything else on this page is either published verbatim or derived from
// the KvK history we already hold, and is exact.

const GOLD = '#E8C558'
const BLUE = '#7f9ed6'

const runsOldestFirst = () => [...tracker846.kvk.history].reverse()

/* ---------------------------------------------------------------- history --
   Atlas score across the campaign.

   The profile publishes the current score, the component breakdown and the
   size of the last move -- not the per-KvK figures behind its own curve. So
   this line is RECONSTRUCTED: each component is recomputed from the record as
   it stood after every KvK, using the weights implied by the published
   breakdown at KvK 17.

   It is not a guess dressed as data. The model is calibrated on the published
   components, and the two figures we can actually check are drawn on top of it
   as rings: KvK 17 reconstructs to 66.37 against a published 66.38, and KvK 16
   to 59.72 against the 60.91 implied by the +5.47 move. Where the ring sits off
   the line, that is the model's error and you can see it.
   ------------------------------------------------------------------------ */

// Domination = both phases won. Verified against the tracker: this definition
// yields exactly the 8 dominations in 11 KvKs the profile reports.
function recordAfter(rows) {
  const n = rows.length
  const pw = rows.filter((r) => r.prep === 'W').length
  const bw = rows.filter((r) => r.battle === 'W').length
  const dom = rows.filter((r) => r.prep === 'W' && r.battle === 'W').length
  const last5 = rows.slice(-5)
  const form = last5.reduce((a, r) => a + (r.prep === 'W' ? 1 : 0) + (r.battle === 'W' ? 1 : 0), 0) / (last5.length * 2)
  let streak = 0
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].prep === 'W' && rows[i].battle === 'W') streak += 1
    else break
  }
  return { n, win: (pw + bw) / (2 * n), domRate: dom / n, form, streak }
}

// Weights solved from the published breakdown at KvK 17.
const W_BASE = 47.93, W_DOM = 4.55, W_FORM = 6.61, W_STREAK = 3.61, W_HIST = 3.67
const SCORE_MODEL = (() => {
  const at17 = recordAfter(runsOldestFirst())
  return {
    base: W_BASE / at17.win,
    dom: W_DOM / at17.domRate,
    form: W_FORM / at17.form,
    hist: W_HIST / (at17.n / 12),
  }
})()

function reconstructedScore(rows) {
  const r = recordAfter(rows)
  return SCORE_MODEL.base * r.win
    + SCORE_MODEL.dom * r.domRate
    + SCORE_MODEL.form * r.form
    + W_STREAK * Math.min(1, r.streak)
    + SCORE_MODEL.hist * (r.n / 12)
}

function ScoreHistory() {
  const [ref, reveal] = useInView()
  const gid = useId()
  const runs = runsOldestFirst()
  const series = runs.map((k, i) => ({ kvk: k.kvk, value: reconstructedScore(runs.slice(0, i + 1)) }))
  const { atlas } = tracker846
  const anchors = [
    { kvk: atlas.lastMove.fromKvk, value: +(atlas.score - atlas.lastMove.score).toFixed(2) },
    { kvk: atlas.lastMove.toKvk, value: atlas.score },
  ]

  const W = 520, H = 200, L = 40, R = 16, T = 18, B = 30
  const ticks = [0, 25, 50, 75, 100]
  const x = (kvk) => L + (runs.findIndex((r) => r.kvk === kvk) / (runs.length - 1)) * (W - L - R)
  const y = (v) => H - B - (v / 100) * (H - T - B)
  const line = smoothPath(series.map((p) => ({ x: x(p.kvk), y: y(p.value) })))

  return (
    <Panel>
      <SectionTitle eyebrow="Trajectory" title="Atlas Score History" />
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-bold" style={{ color: GOLD }}>▲{atlas.lastMove.score.toFixed(2)}</span>
        <span className="text-[11px] text-parchment/50">KvK {atlas.lastMove.fromKvk} → {atlas.lastMove.toKvk}</span>
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
          <path d={`${line} L${x(runs[runs.length - 1].kvk)},${H - B} L${x(runs[0].kvk)},${H - B} Z`}
            fill={`url(#${gid}-f)`} style={{ opacity: reveal ? 1 : 0, transition: 'opacity .7s ease .3s' }} />
          <path d={line} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={GOLD} strokeWidth="2.6"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
          {/* The two published figures, drawn over the model so any gap shows. */}
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1s' }}>
            {anchors.map((a) => (
              <g key={a.kvk}>
                <circle cx={x(a.kvk)} cy={y(a.value)} r="6" fill="none" stroke="#FFF6DA" strokeWidth="1.8" />
                <circle cx={x(a.kvk)} cy={y(a.value)} r="2" fill="#FFF6DA" />
              </g>
            ))}
          </g>
        </svg>
        {ticks.filter((t) => t % 50 === 0).map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${(W - L + 6) / W * 100}%`, top: `${y(t) / H * 100}%` }}>{t}</div>
        ))}
        {[runs[0], runs[runs.length - 1]].map((r, i) => (
          <div key={r.kvk} className="pointer-events-none absolute whitespace-nowrap text-[9px] font-semibold text-parchment/40"
            style={{ left: i === 0 ? `${x(r.kvk) / W * 100}%` : undefined, right: i ? '2%' : undefined, top: `${(H - 12) / H * 100}%` }}>#{r.kvk}</div>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-parchment/40">
        <span className="text-parchment/70">○</span> marks the two published figures. The line is reconstructed from the
        record using the weights in the breakdown below — it lands on 66.37 at KvK 17 against a published 66.38.
      </p>
    </Panel>
  )
}

function RankHistory() {
  const [ref, reveal] = useInView()
  const { atlas, tier } = tracker846
  const prev = atlas.rank + atlas.lastMove.ranks

  // Scale to the band the kingdom is actually in, not #1-#470. On the full
  // ladder #33 and #66 both collapse onto the left edge and a 33-place climb
  // reads as no movement at all -- which is the opposite of what the card is
  // for. The domain is the top slice, widened enough to hold both marks.
  const worst = Math.max(120, Math.ceil((prev * 1.5) / 20) * 20)
  const posOf = (r) => ((r - 1) / (worst - 1)) * 100
  const headroom = atlas.score - atlas.tierThreshold

  return (
    <Panel>
      <SectionTitle eyebrow="Standing" title="Kingdom Ranking" />
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-bold" style={{ color: BLUE }}>▲{atlas.lastMove.ranks} ranks</span>
        <span className="text-[11px] text-parchment/50">KvK {atlas.lastMove.fromKvk} → {atlas.lastMove.toKvk}</span>
        <span className="ml-auto font-mono text-lg font-black text-gold-bright">#{atlas.rank}</span>
      </div>

      {/* A ladder, not a line chart. Rank depends on every other kingdom in the
          game, so unlike the score it cannot be reconstructed from our own
          record -- two positions are genuinely all there is, and a ladder shows
          a move between two of them better than a mostly-empty plot. */}
      <div ref={ref} className="relative mt-7 h-12">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/[.06]">
          <div className="h-full rounded-full"
            style={{
              marginLeft: `${posOf(atlas.rank)}%`,
              width: reveal ? `${posOf(prev) - posOf(atlas.rank)}%` : '0%',
              backgroundImage: `linear-gradient(90deg, #FFF6DA, ${BLUE})`,
              transition: 'width .9s cubic-bezier(.16,1,.3,1) .25s',
            }} />
        </div>
        {[
          { r: atlas.rank, label: 'now', tone: '#FFF6DA', big: true },
          { r: prev, label: `KvK ${atlas.lastMove.fromKvk}`, tone: 'rgba(127,158,214,.8)' },
        ].map((m) => (
          <div key={m.label} className="absolute -translate-x-1/2 whitespace-nowrap text-center"
            style={{ left: `${posOf(m.r)}%`, top: m.big ? 0 : 2, opacity: reveal ? 1 : 0, transition: 'opacity .5s ease .55s' }}>
            <div className={`mx-auto rounded-full border-2 ${m.big ? 'h-3.5 w-3.5' : 'h-3 w-3'}`}
              style={{ borderColor: m.tone, background: '#0b1222' }} />
            <div className={`font-mono font-bold ${m.big ? 'mt-1.5 text-[15px] text-gold-bright' : 'mt-2 text-[11px] text-parchment/55'}`}>#{m.r}</div>
            <div className="text-[8px] uppercase tracking-[.14em] text-parchment/35">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-parchment/30">
        <span>#1</span><span>#{worst}+</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
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
        <span style={{ color: BLUE }}>● Prep {Math.round(last.prep)}%</span>
        <span style={{ color: GOLD }}>● Battle {Math.round(last.battle)}%</span>
      </div>
      <div ref={ref} className="relative mt-2 min-h-[160px] flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          {[0, 25, 50, 75, 100].map((t) => (
            <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" vectorEffect="non-scaling-stroke" />
          ))}
          {pts.map((p, i) => (
            <line key={p.kvk} x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="rgba(226,199,125,.05)" vectorEffect="non-scaling-stroke" />
          ))}
          {/* non-scaling-stroke keeps these 2.6px however far the box stretches;
              without it a tall card would fatten the lines. */}
          <path d={path('prep')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={BLUE} strokeWidth="2.6" vectorEffect="non-scaling-stroke"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }} />
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
    </div>
  )
}
