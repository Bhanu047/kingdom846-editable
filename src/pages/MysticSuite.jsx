import { useId, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { PlayerNameField } from '../components/ui'
import { usePlayerName } from '../hooks/usePlayerName'
import { optimizeTrialSplit, MYSTIC_ZONES, MYSTIC_ZONE_NAMES } from '../lib/combat/mysticTrials'
import { TIER_STAT_MULTIPLIER } from '../lib/combat/kingshotCombat'
import { useCountUp, useReveal } from '../lib/chartAnim'
import CountUp from '../components/CountUp'

const TROOPS = [{ key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' }, { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' }, { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' }]
const TRIALS = MYSTIC_ZONE_NAMES
const TIERS = Object.keys(TIER_STAT_MULTIPLIER)
// Openers live in mysticTrials.js beside the zone's stat sources.
const TRIAL_OPENERS = Object.fromEntries(MYSTIC_ZONE_NAMES.map((z) => [z, MYSTIC_ZONES[z].opener.join('/')]))
const TRIAL_SOURCES = Object.fromEntries(MYSTIC_ZONE_NAMES.map((z) => [z, MYSTIC_ZONES[z].sources]))
// Search window around each opener. The model ranks splits inside this range
// rather than across the whole simplex, because left unbounded it wanders to
// corners real play never recommends (0% Cavalry, 50%+ Archers). The window
// comes from played results; the ranking inside it is the model's opinion.
// Wide enough that the search can actually reach its own optimum. These used to
// be 15/10/10 around the opener, which on Forest of Life floored Archers at 25%
// -- so 57/21/21, and our own unbounded best of 64/16/20, were both outside the
// search by construction. No model is good enough to find an answer it is not
// allowed to test.
const BOUND_SLACK = { infantry: 20, cavalry: 20, archers: 20 }
export function openerBounds(trial) {
  const [inf, cav, arc] = (TRIAL_OPENERS[trial] || '50/15/35').split('/').map(Number)
  const w = (v, s) => [String(Math.max(0, v - s)), String(Math.min(100, v + s))]
  const [minInfantry, maxInfantry] = w(inf, BOUND_SLACK.infantry)
  const [minCavalry, maxCavalry] = w(cav, BOUND_SLACK.cavalry)
  const [minArchers, maxArchers] = w(arc, BOUND_SLACK.archers)
  return { minInfantry, maxInfantry, minCavalry, maxCavalry, minArchers, maxArchers }
}
// Was a second, hand-maintained copy of which rooms have heroes. The engine
// already knows (MYSTIC_ZONES[zone].heroesApply), and a duplicate list is how
// the two drift apart.
const zoneRule = (trial) => MYSTIC_ZONES[trial] || MYSTIC_ZONES['Knowledge Nexus']
const STATS = [{ key: 'count', label: 'Troops', suffix: '', step: 100 }, { key: 'attack', label: 'Attack', suffix: '%', step: .1 }, { key: 'lethality', label: 'Lethality', suffix: '%', step: .1 }, { key: 'defense', label: 'Defense', suffix: '%', step: .1 }, { key: 'health', label: 'Health', suffix: '%', step: .1 }]
const EMPTY_LINE = { count: '', attack: '', lethality: '', defense: '', health: '' }
const EMPTY_ARMY = { infantry: { ...EMPTY_LINE }, cavalry: { ...EMPTY_LINE }, archers: { ...EMPTY_LINE } }
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f
const fmt = (v) => Number.isFinite(v) ? Math.round(v).toLocaleString() : '—'
const pct = (v) => `${Math.round(v * 100)}%`

// Swaps the generic "You Win"/"Still Loses" outcome text for a named one
// once a player enters their name — a report with a name on it can be
// attributed to whoever ran it, unlike the generic version, which is the
// whole reason to enter one at all.
// Colour follows the verdict, not the sign of the margin: a too-close-to-call
// result rendered in loss-red still reads as "you lose" no matter what the
// words say, which is the impression this whole panel exists to get right.
export function outcomeTone(outcome) {
  if (outcome === 'attacker') return 'border-emerald-300/25 bg-emerald-300/[.05] text-emerald-200'
  if (outcome === 'defender') return 'border-red-400/25 bg-red-400/[.05] text-red-300'
  return 'border-gold/25 bg-gold/[.05] text-gold-bright'
}

export function outcomeLabel(outcome, playerName, opts = {}) {
  const { win = 'You Win', lose = 'Still Loses', draw = 'Too Close To Call' } = opts
  const name = (playerName || '').trim()
  if (outcome === 'attacker') return name ? `${name} Win` : win
  if (outcome === 'defender') return name ? `${name} Lose` : lose
  return draw
}

function Field({ label, value, onChange, suffix }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[9px] font-bold uppercase tracking-[.1em] text-parchment/40"><span>{label}</span>{suffix && <span className="text-gold/50">{suffix}</span>}</span>
      <input type="number" min={0} step="any" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gold/15 bg-ink/70 px-2.5 py-2 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
    </label>
  )
}

function ArmyForm({ army, setArmy, locked, accent }) {
  return (
    <div className="space-y-3">
      {TROOPS.map((t) => (
        <div key={t.key} className="rounded-2xl border border-gold/10 bg-white/[.025] p-3.5">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-parchment"><Icon name={t.icon} size={13} className={accent} />{t.label}</div>
          <div className="grid grid-cols-5 gap-1.5">
            {STATS.map((s) => (
              <Field key={s.key} label={s.label} suffix={s.suffix} step={s.step} value={army[t.key][s.key]} onChange={locked ? undefined : (v) => setArmy((a) => ({ ...a, [t.key]: { ...a[t.key], [s.key]: v } }))} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export const TROOP_COLORS = { infantry: '#d9b94e', cavalry: '#7f9ed6', archers: '#c8655a' }

const MEDALS = ['🥇', '🥈', '🥉']

// Ranked candidate splits.
//
// This was a diverging bar chart of each split's score, which failed badly on
// the data it actually gets: a good search returns candidates that are all
// close together (43.1% down to 42.3% is typical), so every bar rendered
// near-full-width and identical. The 0.8 points that decide the ranking were
// invisible while the bar screamed for attention, and the composition swatch
// -- the part a player actually acts on -- was squeezed into 36px.
//
// So the bar now encodes the COMPOSITION, which genuinely differs row to row
// and is what you go and do in-game. The score moves to its own column with
// its gap from the best, where a 0.1 difference is legible as text instead of
// being lost in a pixel of bar length.
export function CompositionChart({ items, total }) {
  const reveal = useReveal()
  if (!items.length) return null
  const scores = items.map((c) => (total > 0 ? (c.margin / total) * 100 : 0))
  const bestScore = Math.max(...scores)
  const legend = [['infantry', 'INF'], ['cavalry', 'CAV'], ['archers', 'ARC']]

  return (
    <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {legend.map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-parchment/45">
              <span className="h-2 w-2 rounded-sm" style={{ background: TROOP_COLORS[key] }} />{label}
            </span>
          ))}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-parchment/30">vs best</span>
      </div>

      <div className="space-y-1.5">
        {items.map((c, i) => {
          const score = scores[i]
          const delta = score - bestScore
          const parts = [
            { key: 'infantry', v: c.composition.infantry * 100 },
            { key: 'cavalry', v: c.composition.cavalry * 100 },
            { key: 'archers', v: c.composition.archers * 100 },
          ]
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black ${i < 3 ? '' : 'border border-gold/20 bg-black/30 text-parchment/40'}`}>
                {i < 3 ? MEDALS[i] : <span className="text-[8px]">#{i + 1}</span>}
              </span>

              {/* The bar IS the composition: segment widths are the split. */}
              <div className="flex h-7 min-w-0 flex-1 overflow-hidden rounded-md border border-gold/10">
                {parts.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center justify-center overflow-hidden transition-[width] duration-700"
                    style={{
                      width: reveal ? `${p.v}%` : '0%',
                      background: TROOP_COLORS[p.key],
                      transitionDelay: `${i * 60}ms`,
                    }}
                  >
                    {p.v >= 9 && <span className="font-mono text-[10px] font-bold tabular-nums text-black/70">{Math.round(p.v)}</span>}
                  </div>
                ))}
              </div>

              <div className="w-[62px] shrink-0 text-right sm:w-[76px]">
                <div className="font-mono text-[11px] font-bold tabular-nums text-parchment/85">{score.toFixed(1)}%</div>
                <div className={`font-mono text-[9px] tabular-nums ${delta >= -0.001 ? 'text-emerald-300/80' : 'text-parchment/35'}`}>
                  {delta >= -0.001 ? 'best' : delta.toFixed(1)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ArmyCard({ side, label, border, glow, align, reveal, accent }) {
  const total = Math.max(0, side.infantry) + Math.max(0, side.cavalry) + Math.max(0, side.archers)
  return (
    <div className={`relative min-w-0 flex-1 overflow-hidden rounded-2xl border p-2.5 sm:p-4 ${border}`} style={{ boxShadow: `inset 0 0 30px ${glow}` }}>
      <CornerAccents color={accent} />
      <div className={`text-[9px] font-bold uppercase tracking-wider text-parchment/50 ${align}`}>{label}</div>
      <div className={`badge-shine mt-0.5 rounded-lg font-mono text-base font-black tabular-nums text-parchment sm:text-2xl ${align}`}>{fmt(useCountUp(total))}</div>
      <div className="mt-3 space-y-2">
        {TROOPS.map((t, i) => (
          <div key={t.key} className={`flex items-center gap-2 ${align === 'text-right' ? 'flex-row-reverse' : ''}`}>
            <Icon name={t.icon} size={12} style={{ color: TROOP_COLORS[t.key] }} />
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,.5)]"><div className="h-full rounded-full" style={{ width: reveal ? `${total > 0 ? Math.max(0, side[t.key]) / total * 100 : 0}%` : '0%', background: `linear-gradient(180deg, rgba(255,255,255,.4), ${TROOP_COLORS[t.key]} 35%, ${TROOP_COLORS[t.key]})`, transition: `width 1s cubic-bezier(.16,1,.3,1) ${i * 100}ms`, boxShadow: `0 0 7px ${TROOP_COLORS[t.key]}aa` }} /></div>
            <span className="w-[62px] shrink-0 font-mono text-[9px] tabular-nums text-parchment/55 sm:w-24 sm:text-[10px]" style={{ textAlign: align === 'text-right' ? 'left' : 'right' }}>{fmt(side[t.key])} <span className="text-parchment/35">({total > 0 ? Math.round(Math.max(0, side[t.key]) / total * 100) : 0}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Four small L-shaped corner brackets, like a targeting reticle or an
// official-document frame -- reads as "this panel matters" rather than a
// plain box. Parent must be position:relative.
function CornerAccents({ color = 'rgba(226,199,125,.55)' }) {
  return (
    <>
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2" style={{ borderColor: color }} />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2" style={{ borderColor: color }} />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2" style={{ borderColor: color }} />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2" style={{ borderColor: color }} />
    </>
  )
}

// OPTION B — "VS Army Cards": two side-by-side matchup cards with a crossed-
// swords divider, each troop type shown as its own labeled progress row.
export function VsArmyCards({ yourSide, enemySide, yourLabel = 'YOUR FORCE', enemyLabel = 'ENEMY FORCE' }) {
  const reveal = useReveal()
  return (
    <div className="rounded-2xl border border-gold/20 bg-[#07101e] p-4 md:p-5">
      <div className="flex items-stretch gap-2 md:gap-3">
        <ArmyCard side={yourSide} label={yourLabel} border="border-[#7f9ed6]/25 bg-[#7f9ed6]/[.045]" glow="rgba(127,158,214,.08)" align="text-left" reveal={reveal} accent="rgba(127,158,214,.6)" />
        <div className="flex shrink-0 flex-col items-center justify-center px-1">
          <Icon name="swords" size={20} className="text-gold-bright" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-gold/50">VS</div>
        </div>
        <ArmyCard side={enemySide} label={enemyLabel} border="border-[#c8655a]/25 bg-[#c8655a]/[.045]" glow="rgba(200,101,90,.08)" align="text-right" reveal={reveal} accent="rgba(200,101,90,.6)" />
      </div>
    </div>
  )
}

// OPTION C — "Clash Gauge": a semi-circle power gauge with a needle, like a
// boss-fight HUD meter, needle leaning toward whichever side is stronger.
// Styled as a jeweled instrument dial rather than flat colored arcs: metallic
// gradient fills, tick marks around the rim, a diamond-tipped needle with a
// glowing pivot jewel, and an ambient shine sweep across the margin readout.
export function ClashGauge({ yourTotal, enemyTotal, margin }) {
  const reveal = useReveal()
  const animatedMargin = useCountUp(margin)
  const gid = useId()
  const combined = Math.max(1, yourTotal + enemyTotal)
  const yourShare = yourTotal / combined
  const R = 92, CX = 130, CY = 118
  const angle = Math.PI * (1 - yourShare)
  const pt = (a, r = R) => [CX + r * Math.cos(a), CY - r * Math.sin(a)]
  // Approximate arcs as polylines rather than SVG "A" (elliptical arc) path
  // commands — html2canvas 1.4.1 doesn't rasterize arc commands (they render
  // blank in exported reports), but a fine-enough polyline looks identical
  // on screen and exports correctly.
  const arc = (from, to, r = R) => { const steps = 32; return Array.from({ length: steps + 1 }, (_, i) => { const [x, y] = pt(from + (to - from) * (i / steps), r); return `${i ? 'L' : 'M'}${x},${y}` }).join(' ') }
  const [nx, ny] = pt(angle)
  const ticks = Array.from({ length: 9 }, (_, i) => Math.PI * (i / 8))
  return (
    <div className="rounded-2xl border border-gold/20 bg-[#07101e] p-4 md:p-5">
      <div className="relative mx-auto w-full max-w-md">
        <svg viewBox="0 0 260 140" className="w-full">
          <defs>
            <linearGradient id={`${gid}-y`} x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#4d6ea3"/><stop offset="100%" stopColor="#b7cdf0"/></linearGradient>
            <linearGradient id={`${gid}-e`} x1="1" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#9c4238"/><stop offset="100%" stopColor="#eda296"/></linearGradient>
          </defs>
          <path d={arc(Math.PI, 0)} stroke="rgba(226,199,125,.16)" strokeWidth="20" fill="none" strokeLinecap="round" />
          {ticks.map((a, i) => { const [ox, oy] = pt(a, R + 11), [ix, iy] = pt(a, R + 2); return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(226,199,125,.4)" strokeWidth="1.5" /> })}
          <path d={arc(Math.PI, angle)} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1} stroke={`url(#${gid}-y)`} strokeWidth="16" fill="none" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)', filter: 'drop-shadow(0 0 7px #7f9ed690)' }} />
          <path d={arc(angle, 0)} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1} stroke={`url(#${gid}-e)`} strokeWidth="16" fill="none" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) .15s', filter: 'drop-shadow(0 0 7px #c8655a90)' }} />
          <g style={{ transformOrigin: `${CX}px ${CY}px`, opacity: reveal ? 1 : 0, transform: reveal ? 'scale(1)' : 'scale(.4)', transition: 'opacity .5s ease .9s, transform .5s cubic-bezier(.34,1.56,.64,1) .9s' }}>
            <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#e8c558" strokeWidth="3" strokeLinecap="round" />
            <rect x={nx - 5} y={ny - 5} width="10" height="10" fill="#f5d778" stroke="#a67f1f" strokeWidth="1" transform={`rotate(45 ${nx} ${ny})`} style={{ filter: 'drop-shadow(0 0 5px #f5d778aa)' }} />
            <circle cx={CX} cy={CY} r="8" fill="#f5d778" stroke="#071224" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px #f5d77899)' }} />
            <circle cx={CX} cy={CY} r="3" fill="#fff6dd" />
          </g>
        </svg>
        {/* Labels are plain HTML, not SVG <text> — html2canvas 1.4.1 renders
            SVG text blank in exported reports (in fact it blanks the whole
            SVG when text is present), so labels live outside the <svg>. */}
        <div className="absolute bottom-[3%] left-[3%] text-[11px] font-bold tracking-wide text-[#9eb9ef]">YOUR FORCE</div>
        <div className="absolute bottom-[3%] right-[3%] text-[11px] font-bold tracking-wide text-[#e08c80]">ENEMY</div>
      </div>
      <div className="badge-shine mx-auto mt-1 max-w-[240px] rounded-xl text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="font-mono text-2xl font-black" style={{ color: margin >= 0 ? '#6ee7b7' : '#fca5a5' }}>{margin >= 0 ? '+' : ''}{fmt(animatedMargin)}</span>
          <span className="font-mono text-sm font-bold" style={{ color: margin >= 0 ? '#6ee7b7' : '#fca5a5', opacity: .7 }}>({margin >= 0 ? '+' : ''}{(yourTotal > 0 ? margin / yourTotal * 100 : 0).toFixed(1)}%)</span>
        </div>
        <div className="text-[10px] text-parchment/40">troop margin</div>
      </div>
    </div>
  )
}

export default function MysticSuite() {
  const [yours, setYours] = useState(EMPTY_ARMY)
  const [opponent, setOpponent] = useState(EMPTY_ARMY)
  const [sparsity, setSparsity] = useState('0.05')
  const [minInfantry, setMinInfantry] = useState(() => openerBounds(TRIALS[0]).minInfantry)
  const [maxInfantry, setMaxInfantry] = useState(() => openerBounds(TRIALS[0]).maxInfantry)
  const [minCavalry, setMinCavalry] = useState(() => openerBounds(TRIALS[0]).minCavalry)
  const [maxCavalry, setMaxCavalry] = useState(() => openerBounds(TRIALS[0]).maxCavalry)
  const [minArchers, setMinArchers] = useState(() => openerBounds(TRIALS[0]).minArchers)
  const [maxArchers, setMaxArchers] = useState(() => openerBounds(TRIALS[0]).maxArchers)
  const [trial, setTrial] = useState(TRIALS[0])
  const [result, setResult] = useState(null)
  const [runId, setRunId] = useState(0)
  const [yourTier, setYourTier] = useState('T10')
  const [enemyTier, setEnemyTier] = useState('T10')
  const [playerName, setPlayerName] = usePlayerName()

  const yourTotal = TROOPS.reduce((s, t) => s + Math.max(0, n(yours[t.key].count)), 0)
  const opponentTotal = TROOPS.reduce((s, t) => s + Math.max(0, n(opponent[t.key].count)), 0)
  const ready = yourTotal > 0 && opponentTotal > 0
  const rule = zoneRule(trial)
  const hasHeroes = rule.heroesApply

  const selectTrial = (t) => {
    setTrial(t)
    const b = openerBounds(t)
    setMinInfantry(b.minInfantry); setMaxInfantry(b.maxInfantry)
    setMinCavalry(b.minCavalry); setMaxCavalry(b.maxCavalry)
    setMinArchers(b.minArchers); setMaxArchers(b.maxArchers)
  }

  const buildSides = () => ({
    yourStats: Object.fromEntries(TROOPS.map((t) => [t.key, {
      attack: n(yours[t.key].attack), lethality: n(yours[t.key].lethality),
      defense: n(yours[t.key].defense), health: n(yours[t.key].health), tier: yourTier,
    }])),
    enemyArmy: Object.fromEntries(TROOPS.map((t) => [t.key, {
      count: n(opponent[t.key].count), attack: n(opponent[t.key].attack), lethality: n(opponent[t.key].lethality),
      defense: n(opponent[t.key].defense), health: n(opponent[t.key].health), tier: enemyTier,
    }])),
  })

  const run = () => {
    const { yourStats, enemyArmy } = buildSides()
    // Step is a percentage-point grid here, not a 0-1 sparsity.
    setResult(optimizeTrialSplit({
      totalTroops: yourTotal, yourStats, enemyArmy, zone: trial,
      stepPercent: Math.max(1, Math.round(n(sparsity, 0.05) * 100)),
      bounds: { minInfantry, maxInfantry, minCavalry, maxCavalry, minArchers, maxArchers },
    }))
    setRunId((id) => id + 1)
  }

  // The shared chart plots `margin` in troops; the Trials model scores in
  // survival share, so convert once here rather than teaching the chart two
  // scoring schemes.
  const top = useMemo(() => (result?.candidates || []).slice(0, 8)
    .map((c) => ({ ...c, margin: c.survivalEdge * (result?.totalTroops || 0) })), [result])

  const reset = () => {
    setYours(EMPTY_ARMY)
    setOpponent(EMPTY_ARMY)
    setSparsity('0.05')
    selectTrial(TRIALS[0])
    setResult(null)
  }

  // Runs a fast, wide-open search first, then narrows the bounds to a window
  // around whatever that pass found, so the fine search spends its grid where
  // the answer actually is.
  //
  // This used to call optimizeMysticComposition from the OLD engine -- the one
  // built on fabricated per-type base stats that this whole module replaced.
  // So the coarse pass that decides where to look was still being made by the
  // discredited model, and the rebuilt search only ever ran inside bounds it
  // chose. It now uses the same optimizer as the real run, and bounds Archers
  // too rather than leaving them free to absorb the remainder.
  const suggestBounds = () => {
    if (!ready) return
    const { yourStats, enemyArmy } = buildSides()
    const coarse = optimizeTrialSplit({ totalTroops: yourTotal, yourStats, enemyArmy, zone: trial, stepPercent: 10 })
    if (!coarse.best) return
    const window = 20
    const clamp = (v) => String(Math.min(100, Math.max(0, Math.round(v))))
    const [inf, cav, arc] = coarse.best.split
    setMinInfantry(clamp(inf - window)); setMaxInfantry(clamp(inf + window))
    setMinCavalry(clamp(cav - window)); setMaxCavalry(clamp(cav + window))
    setMinArchers(clamp(arc - window)); setMaxArchers(clamp(arc + window))
  }

  return (
    <div className="space-y-5">
      <section className="panel p-4 md:p-5">
        <div className="eyebrow">Mystic Trials</div>
        <h2 className="mt-1 font-display text-2xl font-bold text-parchment">Troop Composition Optimizer</h2>
        <p className="mt-1 text-xs text-parchment/50">Enter your troops and the opponent's, exactly as a Mystic Trial battle report shows them, then search for the Infantry/Cavalry/Archer split that wins by the widest margin.</p>
        <ol className="mt-4 space-y-2.5 border-t border-gold/10 pt-4 text-xs leading-relaxed text-parchment/60">
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/[.06] text-[10px] font-bold text-gold-bright">1</span><span>Fill in both armies below exactly as a Mystic Trial battle report shows them — or upload the report screenshots and let the reader fill them in for you.</span></li>
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/[.06] text-[10px] font-bold text-gold-bright">2</span><span>Adjust Sparsity for how fine the search runs, and Min Infantry Fraction to skip splits that are never competitive.</span></li>
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/[.06] text-[10px] font-bold text-gold-bright">3</span><span>{hasHeroes
            ? <><b className="text-parchment/70">{trial}</b> is one of the two rooms that lets you bring heroes, and the enemy has them too — this model doesn't account for hero skills, so lower the opponent's troop counts a little for a rough estimate.</>
            : <><b className="text-parchment/70">{trial}</b> doesn't let either side pick heroes, so there's nothing to compensate for — the bonuses on your report are the whole fight.</>}</span></li>
        </ol>
        <div className="mt-4 border-t border-gold/10 pt-4">
          <PlayerNameField value={playerName} onChange={setPlayerName} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Your Stats</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Your Troops</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-parchment/35">Total troop count here is fixed — the optimizer only searches how you split it across the three types.</p>
          <div className="mt-4"><ArmyForm army={yours} setArmy={setYours} accent="text-[#7f9ed6]" /></div>
        </section>
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Opponent Stats</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Opponent Troops</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-parchment/35">Enter the defender's stats exactly as shown — this side stays fixed while the search runs.</p>
          <div className="mt-4"><ArmyForm army={opponent} setArmy={setOpponent} accent="text-[#c8655a]" /></div>
        </section>
      </div>

      <section className="panel p-5 md:p-6">
        <div className="eyebrow">Search Settings</div>
        <h3 className="mt-1 font-display text-xl font-bold text-parchment">Search Tuning</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Mystic Trial</span>
            <select value={trial} onChange={(e) => selectTrial(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45">{TRIALS.map((t) => <option key={t}>{t}</option>)}</select>
            {/* The room is not just a label on the search. Each one scores a
                DIFFERENT stat pool, which is why the same account reports ~180%
                bonuses in Knowledge Nexus and ~897% in Molten Fort — and why
                four of the six have no heroes on either side at all. That rule
                decides what you should be levelling, so it belongs here rather
                than buried in a caveat. */}
            <div className="mt-2 rounded-xl border border-gold/15 bg-gold/[.04] p-3">
              <div className="text-[9px] font-bold uppercase tracking-[.12em] text-gold-bright/70">{trial} · what counts here{rule.days ? <span className="ml-1.5 font-normal normal-case tracking-normal text-parchment/35">opens {rule.days}</span> : null}</div>
              <div className="mt-1 text-[11px] leading-relaxed text-parchment/65">{rule.everything
                ? <>This room is the one that counts <b className="text-gold-bright/90">everything</b> — {rule.sources.join(', ')}. </>
                : <>Only <b className="text-gold-bright/90">{rule.sources.join(', ')}</b> take{rule.sources.length === 1 ? 's' : ''} effect in this room — every other bonus on your account is switched off. </>}{hasHeroes
                ? <>This is one of the two rooms where <b className="text-parchment/85">heroes do apply</b>{rule.ownTroops ? <>, and the only one fought with <b className="text-parchment/85">your own soldiers</b>, so troop tier and army size matter too</> : null}.</>
                : <><b className="text-parchment/85">Heroes don't count here</b> — this room doesn't let either side pick them, so hero skills change nothing and there's no enemy hero to allow for.</>}</div>
              <div className="mt-1.5 text-[10px] leading-relaxed text-parchment/35">Selecting the room also sets the search bounds to a window around its played opener ({TRIAL_OPENERS[trial]}). Widen them below to explore outside it.</div>
            </div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Your Troop Tier</span>
            <select value={yourTier} onChange={(e) => setYourTier(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45">{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
            <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">The "Lv." under your portraits in the battle report. This matters more than it looks: a tier lands on all four stats, so it squares into both attack and defence — T11 against T10 is roughly a 1.9x swing, not 17%.</span>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Stage Troop Tier</span>
            <select value={enemyTier} onChange={(e) => setEnemyTier(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45">{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
            <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">The "Lv." under the enemy icons — most zones hand out T10.</span>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Search Step</span>
            <input type="number" min={.005} max={.5} step="any" value={sparsity} onChange={(e) => setSparsity(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
            <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">Grid step between compositions tested. 0.05 is a good start; use 0.025 for a finer (slower) search.</span>
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Search Bounds</span>
          <button type="button" onClick={suggestBounds} disabled={!ready} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gold/[.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-bright/80 hover:border-gold/40 disabled:opacity-30"><Icon name="sparkles" size={11} /> Suggest Bounds</button>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-parchment/35">Runs a quick wide-open pass first, then narrows the Min/Max range below to a window around whatever split it finds, so you don't have to guess where to start.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Infantry Floor</span>
            <div className="relative"><input type="number" min={0} max={100} step="any" value={minInfantry} onChange={(e) => setMinInfantry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Infantry Ceiling</span>
            <div className="relative"><input type="number" min={0} max={100} step="any" value={maxInfantry} onChange={(e) => setMaxInfantry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Cavalry Floor</span>
            <div className="relative"><input type="number" min={0} max={100} step="any" value={minCavalry} onChange={(e) => setMinCavalry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Cavalry Ceiling</span>
            <div className="relative"><input type="number" min={0} max={100} step="any" value={maxCavalry} onChange={(e) => setMaxCavalry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Archer Floor</span>
            <div className="relative"><input type="number" min={0} max={100} step="any" value={minArchers} onChange={(e) => setMinArchers(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Archer Ceiling</span>
            <div className="relative"><input type="number" min={0} max={100} step="any" value={maxArchers} onChange={(e) => setMaxArchers(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
        </div>
        <span className="mt-2 block text-[10px] leading-relaxed text-parchment/35">All three types get a Min/Max range — Archers included, because bounding only Infantry and Cavalry lets Archers absorb whatever is left and run to any share. These default to a window around <b className="text-parchment/55">{trial}</b>'s played opener ({TRIAL_OPENERS[trial]}); right now the search tests Infantry <b className="text-parchment/55">{minInfantry || 0}–{maxInfantry || 100}%</b>, Cavalry <b className="text-parchment/55">{minCavalry || 0}–{maxCavalry || 100}%</b>, Archers <b className="text-parchment/55">{minArchers || 0}–{maxArchers || 100}%</b>. Widen them to explore outside the opener.</span>
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">
          <b className="text-amber-200">How much to trust this.</b> Every mechanic here traces to a published source: the +10% counter triangle (which <i>is</i> the troops' Master Brawler / Charge / Ranged Strike abilities), Cavalry's 20% chance to slip past the front line, the Archer double-shot, the front-row targeting order, and troop tier. Nothing is fitted to make our numbers agree with anyone else's. Checked against a real <b className="text-amber-200">Knowledge Nexus</b> report it calls the stage as cleared — which is what happened — and its near-optimal range covers both the played opener and the answer an established tool gives. On an even matchup with no tier gap it still leans somewhat heavy on Infantry and light on Archers against what players actually field, so where it disagrees with <b className="text-amber-200">{trial}</b>'s opener ({TRIAL_OPENERS[trial]}) by more than the range below, the opener is the safer bet. Both are scored side by side. What it will not give you is a win percentage, and that is on purpose: its ranking of splits holds up against real reports, its absolute win/lose call does not, and a confident wrong answer about whether a stage is winnable is the most damaging thing this tool could tell you. </div>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={run} disabled={!ready} className="btn-primary btn-royal px-8 disabled:opacity-40"><Icon name="sparkles" size={15} /> Run Optimizer</button>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-gold/20 bg-white/[.02] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-parchment/60 hover:border-gold/35 hover:text-parchment"><Icon name="refresh" size={14} /> Reset</button>
        </div>
      </section>

      {result && (
        <section key={runId} className="panel panel-glow p-4 md:p-6">
          <div className="eyebrow">Result</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-parchment">Best Composition Found</h3>
          {result.best ? (
            <div className="mt-4 space-y-4">
              {/* The headline is the split, not a win/lose call. The model's
                  ranking of splits against each other is what's been checked
                  against known-good answers; its absolute verdict has not
                  survived that check -- it scores a Knowledge Nexus fight the
                  player actually won as a heavy loss -- so stating one here
                  would be asserting something we've measured to be wrong. */}
              <div className="stagger-in rounded-2xl border border-gold/25 bg-gold/[.05] p-5 text-center text-gold-bright">
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-gold-bright/60">{playerName.trim() ? <><span data-k846-player-name="true">{playerName.trim()}</span> · Recommended Split</> : 'Recommended Split'}</div>
                <div className="mt-1 font-display text-2xl font-bold" data-k846-outcome-label="true">{pct(result.best.composition.infantry)} / {pct(result.best.composition.cavalry)} / {pct(result.best.composition.archers)}</div>
                <div className="mt-1 text-xs text-parchment/50">Infantry / Cavalry / Archers · best of {result.candidates.length} splits tested · score {(result.best.survivalEdge * 100).toFixed(1)}%{result.baseline ? <>, {(result.best.survivalEdge - result.baseline.survivalEdge) >= 0 ? '+' : ''}{((result.best.survivalEdge - result.baseline.survivalEdge) * 100).toFixed(1)} vs the opener</> : null}</div>
                <div className="mt-2 text-[10px] leading-relaxed text-parchment/40">The score compares splits against each other. It is not a prediction of whether you win — see below.</div>
              </div>

              {/* Both blocks below travel into the downloaded report, so a
                  shared report carries the same caveats as the screen. */}
              <div data-report-clone="verdict" className="space-y-4">
              {/* The single split above is the centre of a range, not a
                  prescription. The objective is flat -- dozens of splits score
                  within a point of the winner -- so quoting one to the percent
                  and stopping there is false precision. It is also why our
                  answer and another calculator's can look ten points apart on
                  Infantry while being worth ~2 points of survival to you. */}
              {/* Suppressed when the band covers the entire search: if every
                  split ties, "anything in this range" says nothing. */}
              {result.band && result.band.count > 1 && result.band.count < result.candidates.length && (
                <div className="stagger-in rounded-2xl border border-gold/12 bg-white/[.02] p-4">
                  <div className="text-[9px] uppercase tracking-wider text-parchment/35">Anything in this range is as good</div>
                  <div className="mt-1 font-mono text-lg font-bold text-parchment">{result.band.infantry[0]}–{result.band.infantry[1]} / {result.band.cavalry[0]}–{result.band.cavalry[1]} / {result.band.archers[0]}–{result.band.archers[1]}</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-parchment/45">{result.band.count} of the {result.candidates.length} splits tested score within {(result.band.tolerance * 100).toFixed(0)} point of the best — a difference smaller than the uncertainty in the model's own constants. Field whatever in that range suits the troops you have; the exact headline number is not worth chasing.</div>
                </div>
              )}

              {/* NO clears / does-not-clear verdict here, and this is deliberate.
                  It was added, and it was wrong to add: the note at the top of
                  this result block already recorded that the model's ranking of
                  splits survives checking while its absolute win/lose call does
                  not. Then a big red "no split clears this stage, come back when
                  your bonuses are higher" panel went in anyway, on fights where
                  an established tool gives a real chance of winning. Telling
                  someone a stage is hopeless is the most damaging thing this
                  tool can get wrong, and it is the part we have measured to be
                  unreliable. So it states what it knows and stops there. */}
              {result.distribution && (
                <div className="stagger-in rounded-2xl border border-gold/12 bg-white/[.02] p-4">
                  <div className="text-[9px] uppercase tracking-wider text-parchment/35">How much to read into the score</div>
                  <div className="mt-1.5 font-mono text-sm text-parchment/80">{(result.distribution.meanEdge * 100).toFixed(1)}% ± {(result.distribution.stdDev * 100).toFixed(1)} across {result.distribution.trials} simulated runs</div>
                  <div className="mt-1.5 text-[11px] leading-relaxed text-parchment/50">Kingshot resolves a battle over many rounds, and which abilities fire in a given round is a roll — so the same split does not give the same result twice. That range is this split re-fought {result.distribution.trials} times with Cavalry's Ambusher and the Archer double-shot rolled each round instead of averaged.</div>
                  <div className="mt-2.5 text-[11px] leading-relaxed text-amber-100/60"><b className="text-amber-200">This score ranks splits. It does not call the winner.</b> Checked against real reports, the ordering holds up — on a Forest of Life report this tool's pick and an established optimizer's pick scored within 0.1 points of each other. The absolute win/lose call does not hold up: it scored a Knowledge Nexus stage the player <i>actually cleared</i> as a heavy loss. Use the split, and take the number as "this beats that", not as a forecast.</div>
                </div>
              )}
              </div>
              {(() => {
                const yourSide = { infantry: result.totalTroops * result.best.composition.infantry, cavalry: result.totalTroops * result.best.composition.cavalry, archers: result.totalTroops * result.best.composition.archers }
                const enemySide = { infantry: n(opponent.infantry.count), cavalry: n(opponent.cavalry.count), archers: n(opponent.archers.count) }
                return (
                  <div data-report-clone="mystic-visual" className="stagger-in space-y-4">
                    <ClashGauge yourTotal={yourSide.infantry + yourSide.cavalry + yourSide.archers} enemyTotal={enemySide.infantry + enemySide.cavalry + enemySide.archers} margin={result.best.survivalEdge * result.totalTroops} />
                    <VsArmyCards yourSide={yourSide} enemySide={enemySide} yourLabel="Your Best Split" enemyLabel="Opponent" />
                  </div>
                )
              })()}
              {result.baseline && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="stagger-in rounded-2xl border border-gold/10 bg-white/[.02] p-4">
                    <div className="text-[9px] uppercase tracking-wider text-parchment/35">{trial} played opener ({TRIAL_OPENERS[trial]})</div>
                    <div className={`mt-1 font-mono text-lg font-bold ${result.baseline.survivalEdge >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{(result.baseline.survivalEdge * 100).toFixed(1)}%</div>
                    <div className="mt-0.5 text-[10px] text-parchment/40">what players actually run</div>
                  </div>
                  <div className="stagger-in rounded-2xl border border-gold/20 bg-gold/[.04] p-4">
                    <div className="text-[9px] uppercase tracking-wider text-parchment/35">Our search</div>
                    <div className={`mt-1 font-mono text-lg font-bold ${result.best.survivalEdge >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{(result.best.survivalEdge * 100).toFixed(1)}%</div>
                    <div className="mt-0.5 text-[10px] text-gold-bright/70">{(result.best.survivalEdge - result.baseline.survivalEdge) >= 0 ? '+' : ''}{((result.best.survivalEdge - result.baseline.survivalEdge) * 100).toFixed(1)} pts vs the opener</div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="stagger-in rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Infantry</div><div className="mt-1 font-mono text-xl font-bold text-parchment"><CountUp value={result.totalTroops * result.best.composition.infantry} format={fmt} /></div></div>
                <div className="stagger-in rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Cavalry</div><div className="mt-1 font-mono text-xl font-bold text-parchment"><CountUp value={result.totalTroops * result.best.composition.cavalry} format={fmt} /></div></div>
                <div className="stagger-in rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Archers</div><div className="mt-1 font-mono text-xl font-bold text-parchment"><CountUp value={result.totalTroops * result.best.composition.archers} format={fmt} /></div></div>
                <div className="stagger-in rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Compositions Tested</div><div className="mt-1 font-mono text-xl font-bold text-parchment"><CountUp value={result.candidates.length} /></div></div>
              </div>
              <div data-report-clone="ranked-splits">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-parchment/40">Top Splits Ranked</div>
                <CompositionChart items={top} total={result.totalTroops} />
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-parchment/50">No composition found — check your troop totals above.</div>
          )}
        </section>
      )}
    </div>
  )
}
