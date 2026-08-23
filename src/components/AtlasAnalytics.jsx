import { useId, useMemo, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import Icon from './Icon'
import { tracker846 } from '../data/tracker846'
import { smoothPath, useReveal } from '../lib/chartAnim'

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
const RED = '#c8655a'
const GREEN = '#5BC98C'

const runsOldestFirst = () => [...tracker846.kvk.history].reverse()

/* ---------------------------------------------------------------- history --
   Score and rank across the campaign. Only the last step is real; the span
   before it is drawn as an explicit gap.
   ------------------------------------------------------------------------ */
function HistoryChart({ title, eyebrow, delta, deltaLabel, points, fmtY, yTicks, invert, accent }) {
  const reveal = useReveal()
  const gid = useId()
  const runs = runsOldestFirst()
  const W = 520, H = 190, L = 46, R = 16, T = 20, B = 30
  const lo = Math.min(...yTicks), hi = Math.max(...yTicks)
  const x = (kvk) => {
    const i = runs.findIndex((r) => r.kvk === kvk)
    return L + (i / Math.max(1, runs.length - 1)) * (W - L - R)
  }
  const y = (v) => {
    const t = (v - lo) / (hi - lo)
    return invert ? T + t * (H - T - B) : H - B - t * (H - T - B)
  }
  const known = points.filter((p) => p.value != null)
  const firstKnown = known[0]
  const line = known.length > 1 ? smoothPath(known.map((p) => ({ x: x(p.kvk), y: y(p.value) }))) : ''

  return (
    <Panel>
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-bold" style={{ color: accent }}>▲{delta}</span>
        <span className="text-[11px] text-parchment/50">{deltaLabel}</span>
      </div>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <pattern id={`${gid}-gap`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(239,230,207,.09)" strokeWidth="1.2" />
            </pattern>
          </defs>
          {yTicks.map((t) => (
            <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" />
          ))}
          {/* The unrecorded span, hatched. It is a gap in what we hold, and it
              should read as one. */}
          {firstKnown && (
            <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .6s ease .3s' }}>
              <rect x={L} y={T} width={Math.max(0, x(firstKnown.kvk) - L)} height={H - T - B} fill={`url(#${gid}-gap)`} />
            </g>
          )}
          {line && (
            <path
              d={line} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
              fill="none" stroke={accent} strokeWidth="2.6"
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1) .2s' }}
            />
          )}
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease .9s' }}>
            {known.map((p) => (
              <g key={p.kvk}>
                <circle cx={x(p.kvk)} cy={y(p.value)} r="5" fill="none" stroke={accent} strokeWidth="1.6" />
                <circle cx={x(p.kvk)} cy={y(p.value)} r="2.2" fill={accent} />
              </g>
            ))}
          </g>
        </svg>
        {/* HTML labels, not SVG <text> -- html2canvas renders SVG text blank
            and takes the whole graphic with it in exported reports. */}
        {yTicks.map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap font-mono text-[9px] text-parchment/35"
            style={{ right: `${(W - L + 6) / W * 100}%`, top: `${y(t) / H * 100}%` }}>{fmtY(t)}</div>
        ))}
        {[runs[0], runs[runs.length - 1]].map((r, i) => (
          <div key={r.kvk} className="pointer-events-none absolute whitespace-nowrap text-[9px] font-semibold text-parchment/40"
            style={{ left: i === 0 ? `${x(r.kvk) / W * 100}%` : undefined, right: i === 1 ? '2%' : undefined, top: `${(H - 12) / H * 100}%` }}>
            #{r.kvk}
          </div>
        ))}
        {firstKnown && (
          <div className="pointer-events-none absolute text-[9px] uppercase tracking-[.14em] text-parchment/28"
            style={{ left: `${(L + 8) / W * 100}%`, top: `${(T + 8) / H * 100}%` }}>not in snapshot</div>
        )}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ trend --
   Prep and battle win rate as they actually developed. Every point is computed
   from the KvK history, so this one is complete.
   ------------------------------------------------------------------------ */
function PerformanceTrend() {
  const reveal = useReveal()
  const runs = runsOldestFirst()
  const pts = useMemo(() => {
    let p = 0, b = 0
    return runs.map((k, i) => {
      if (k.prep === 'W') p += 1
      if (k.battle === 'W') b += 1
      return { kvk: k.kvk, prep: (p / (i + 1)) * 100, battle: (b / (i + 1)) * 100 }
    })
  }, [])
  const W = 520, H = 190, L = 40, R = 16, T = 20, B = 30
  const x = (i) => L + (i / (pts.length - 1)) * (W - L - R)
  const y = (v) => H - B - (v / 100) * (H - T - B)
  const path = (key) => smoothPath(pts.map((p, i) => ({ x: x(i), y: y(p[key]) })))
  const last = pts[pts.length - 1]

  return (
    <Panel>
      <SectionTitle eyebrow="Consistency" title="Performance Trend" />
      <div className="mt-1 flex flex-wrap items-baseline gap-3 text-[11px]">
        <span style={{ color: BLUE }}>● Prep {Math.round(last.prep)}%</span>
        <span style={{ color: GOLD }}>● Battle {Math.round(last.battle)}%</span>
      </div>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {[0, 25, 50, 75, 100].map((t) => (
            <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(226,199,125,.10)" />
          ))}
          <path d={path('prep')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={BLUE} strokeWidth="2.6"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
          <path d={path('battle')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1}
            fill="none" stroke={GOLD} strokeWidth="2.6"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) .14s' }} />
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1s' }}>
            <circle cx={x(pts.length - 1)} cy={y(last.prep)} r="4.5" fill="none" stroke={BLUE} strokeWidth="1.6" />
            <circle cx={x(pts.length - 1)} cy={y(last.battle)} r="4.5" fill="none" stroke={GOLD} strokeWidth="1.6" />
          </g>
        </svg>
        {[0, 50, 100].map((t) => (
          <div key={t} className="pointer-events-none absolute -translate-y-1/2 font-mono text-[9px] text-parchment/35"
            style={{ right: `${(W - L + 6) / W * 100}%`, top: `${y(t) / H * 100}%` }}>{t}%</div>
        ))}
        {[0, pts.length - 1].map((i) => (
          <div key={i} className="pointer-events-none absolute whitespace-nowrap text-[9px] font-semibold text-parchment/40"
            style={{ left: i === 0 ? `${x(i) / W * 100}%` : undefined, right: i ? '2%' : undefined, top: `${(H - 12) / H * 100}%` }}>
            #{pts[i].kvk}
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
  const reveal = useReveal()
  const { breakdown, score, percentile, experiencePenalty } = tracker846.atlas
  const total = breakdown.reduce((s, b) => s + b.pts, 0)

  return (
    <Panel>
      <SectionTitle eyebrow="Score Components" title="Atlas Score Breakdown"
        action={<Pill tone="gold">{tracker846.tier}</Pill>} />
      <div className="mt-3 flex items-baseline gap-2">
        <span className="gilt-text font-mono text-3xl font-black">{score.toFixed(2)}</span>
        <span className="text-[11px] text-parchment/40">breakdown is approximate</span>
      </div>
      <div className="k-track mt-3 flex h-5 overflow-hidden rounded-full border border-gold/15">
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
      <div className="mt-3 rounded-lg border border-gold/15 bg-gold/[.04] px-3 py-2 text-[11px] text-parchment/65">
        Ranks better than <span className="font-bold text-gold-bright">{percentile}%</span> of all kingdoms.
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ radar --
   Six axes. Labels sit outside the grid by opting out of the clamp -- the
   same trap that printed the PvP radar's labels on top of its own polygon.
   ------------------------------------------------------------------------ */
function PerformanceRadar() {
  const reveal = useReveal()
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
      <div className="relative mt-2">
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
   What a result in KvK 18 does to the record.
   ------------------------------------------------------------------------ */
function NextKvkSimulator() {
  const [prep, setPrep] = useState('W')
  const [battle, setBattle] = useState('W')
  const [domination, setDomination] = useState(true)

  const now = useMemo(() => {
    const k = tracker846.kvk
    return {
      kvks: k.total,
      winRate: ((k.prep.wins + k.battle.wins) / ((k.prep.wins + k.prep.losses) + (k.battle.wins + k.battle.losses))) * 100,
      domination: (k.dominations / k.total) * 100,
      prepRate: (k.prep.wins / (k.prep.wins + k.prep.losses)) * 100,
      battleRate: (k.battle.wins / (k.battle.wins + k.battle.losses)) * 100,
    }
  }, [])

  const next = useMemo(() => {
    const k = tracker846.kvk
    const pw = k.prep.wins + (prep === 'W' ? 1 : 0)
    const pl = k.prep.losses + (prep === 'W' ? 0 : 1)
    const bw = k.battle.wins + (battle === 'W' ? 1 : 0)
    const bl = k.battle.losses + (battle === 'W' ? 0 : 1)
    const doms = k.dominations + (domination ? 1 : 0)
    const total = k.total + 1
    return {
      kvks: total,
      winRate: ((pw + bw) / (pw + pl + bw + bl)) * 100,
      domination: (doms / total) * 100,
      prepRate: (pw / (pw + pl)) * 100,
      battleRate: (bw / (bw + bl)) * 100,
    }
  }, [prep, battle, domination])

  const rows = [
    { label: 'Overall win rate', a: now.winRate, b: next.winRate },
    { label: 'Prep win rate', a: now.prepRate, b: next.prepRate },
    { label: 'Battle win rate', a: now.battleRate, b: next.battleRate },
    { label: 'Domination rate', a: now.domination, b: next.domination },
  ]

  const Toggle = ({ value, set, options }) => (
    <div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => set(o.v)}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${value === o.v ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45 hover:text-parchment/70'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <Panel>
      <SectionTitle eyebrow="What If" title={`Simulate KvK #${tracker846.kvk.latest.kvk + 1}`} />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">
          Prep
          <Toggle value={prep} set={setPrep} options={[{ v: 'W', label: 'Win' }, { v: 'L', label: 'Loss' }]} />
        </label>
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">
          Battle
          <Toggle value={battle} set={setBattle} options={[{ v: 'W', label: 'Win' }, { v: 'L', label: 'Loss' }]} />
        </label>
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">
          Domination
          <Toggle value={domination} set={setDomination} options={[{ v: true, label: 'Yes' }, { v: false, label: 'No' }]} />
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((r) => {
          const d = r.b - r.a
          const tone = d > 0.05 ? GREEN : d < -0.05 ? RED : 'rgba(239,230,207,.45)'
          return (
            <div key={r.label} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="flex-1 text-[11px] text-parchment/60">{r.label}</span>
              <span className="font-mono text-[13px] tabular-nums text-parchment/45">{r.a.toFixed(1)}%</span>
              <Icon name="arrow" size={12} className="text-parchment/25" />
              <span className="font-mono text-[13px] font-bold tabular-nums text-parchment">{r.b.toFixed(1)}%</span>
              <span className="w-14 text-right font-mono text-[11px] font-bold tabular-nums" style={{ color: tone }}>
                {d > 0 ? '+' : ''}{d.toFixed(1)}
              </span>
            </div>
          )
        })}
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
          <span className="flex-1 text-[11px] text-parchment/60">KvKs fought</span>
          <span className="font-mono text-[13px] tabular-nums text-parchment/45">{now.kvks}</span>
          <Icon name="arrow" size={12} className="text-parchment/25" />
          <span className="font-mono text-[13px] font-bold tabular-nums text-parchment">{next.kvks}</span>
          <span className="w-14 text-right font-mono text-[11px] font-bold text-emerald-300">+1</span>
        </div>
      </div>

      {/* Why there is no projected Atlas score here. */}
      <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">
        This projects the <b className="text-amber-100/85">record</b>, which is exact arithmetic on the
        KvK history. It does not project the Atlas score: that formula is ks-atlas's own and is not
        published, so any number here would be a guess wearing the authority of the real one.
      </div>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */
export default function AtlasAnalytics() {
  const { atlas } = tracker846
  const { lastMove } = atlas
  const prevScore = +(atlas.score - lastMove.score).toFixed(2)
  const prevRank = atlas.rank + lastMove.ranks

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <HistoryChart
          eyebrow="Trajectory" title="Atlas Score History"
          delta={lastMove.score.toFixed(2)} deltaLabel={`KvK ${lastMove.fromKvk} → ${lastMove.toKvk}`}
          accent={GOLD} yTicks={[0, 25, 50, 75, 100]} fmtY={(v) => v.toFixed(1)}
          points={[{ kvk: lastMove.fromKvk, value: prevScore }, { kvk: lastMove.toKvk, value: atlas.score }]}
        />
        <HistoryChart
          eyebrow="Standing" title="Kingdom Ranking History"
          delta={`${lastMove.ranks} ranks`} deltaLabel={`KvK ${lastMove.fromKvk} → ${lastMove.toKvk}`}
          accent={BLUE} invert yTicks={[1, 118, 236, 353, 470]} fmtY={(v) => `#${v}`}
          points={[{ kvk: lastMove.fromKvk, value: prevRank }, { kvk: lastMove.toKvk, value: atlas.rank }]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceTrend />
        <PerformanceRadar />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreBreakdown />
        <NextKvkSimulator />
      </div>
    </div>
  )
}
