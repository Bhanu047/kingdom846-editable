import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { calculateHeroSynergy, optimizeMysticComposition, simulateT10Battle } from '../lib/combat/battleLabEngine'
import { HUNT_JOINER_HEROES, applyJoinerBonuses } from '../lib/combat/huntImpact'

const TROOPS = [{ key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' }, { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' }, { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' }]
const HEROES = { infantry: ['None', 'Alcar', 'Amadeus', 'Charles', 'Eric', 'Forrest', 'Helga', 'Howard', 'Long Fei', 'Seth', 'Triton', 'Zoe'], cavalry: ['None', 'Ava', 'Chenko', 'Edwin', 'Fahd', 'Gordon', 'Hilde', 'Jabel', 'Margot', 'Petra', 'Sophia', 'Thrud'], archers: ['None', 'Amane', 'Diana', 'Jaeger', 'Marlin', 'Olive', 'Quinn', 'Rosa', 'Saul', 'Vivian', 'Wee & Woo', 'Yang', 'Yeonwoo'] }
const STATS = [{ key: 'count', label: 'Troops', suffix: '', step: 100 }, { key: 'attack', label: 'Attack', suffix: '%', step: .1 }, { key: 'lethality', label: 'Lethality', suffix: '%', step: .1 }, { key: 'defense', label: 'Defense', suffix: '%', step: .1 }, { key: 'health', label: 'Health', suffix: '%', step: .1 }]
const WIDGET_OPTIONS = [0, 5, 7.5, 10, 12.5, 15]
const EMPTY_LINE = { count: '', attack: '', lethality: '', defense: '', health: '', widget: '0', widgetStat: 'attack' }
const EMPTY_ARMY = { infantry: { ...EMPTY_LINE }, cavalry: { ...EMPTY_LINE }, archers: { ...EMPTY_LINE } }
const EMPTY_HEROES = { infantry: 'None', cavalry: 'None', archers: 'None' }
const EMPTY_JOINERS = Array.from({ length: 4 }, () => ({ hero: 'None', skillLevel: 5 }))
const EMPTY_EFFECTS = Array.from({ length: 6 }, () => ({ group: 'A', percent: '' }))
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f
const fmt = (v) => Number.isFinite(v) ? Math.round(v).toLocaleString() : '—'
const pct = (v) => `${Math.round(v * 100)}%`

function Field({ label, value, onChange, suffix, step, compact }) {
  return (
    <label className="block">
      <span className={`mb-1 flex justify-between font-bold uppercase tracking-[.1em] text-parchment/40 ${compact ? 'text-[8px]' : 'text-[9px]'}`}><span>{label}</span>{suffix && <span className="text-gold/50">{suffix}</span>}</span>
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-lg border border-gold/15 bg-ink/70 font-semibold text-parchment outline-none focus:border-gold/45 ${compact ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-2 text-sm'}`} />
    </label>
  )
}

function Select({ label, value, onChange, options, compact }) {
  return (
    <label className="block">
      <span className={`mb-1 block font-bold uppercase tracking-[.1em] text-parchment/40 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-lg border border-gold/15 bg-ink font-semibold text-parchment outline-none ${compact ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-2 text-sm'}`}>{options.map((o) => typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o}>{o}</option>)}</select>
    </label>
  )
}

function ArmyForm({ army, setArmy, heroes, setHeroes, joiners, setJoiners, tier, setTier, tg, setTg, accent }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select compact label="Troop Tier" value={tier} onChange={setTier} options={['T1-T6', 'T7-T9', 'T10', 'T11']} />
        <Select compact label="True Gold" value={String(tg)} onChange={(v) => setTg(Number(v))} options={Array.from({ length: 9 }, (_, i) => ({ value: String(i), label: `TG${i}` }))} />
      </div>
      {TROOPS.map((t) => (
        <div key={t.key} className="rounded-2xl border border-gold/10 bg-white/[.025] p-3.5">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-parchment"><Icon name={t.icon} size={13} className={accent} />{t.label}</div>
          <div className="grid grid-cols-5 gap-1.5">
            {STATS.map((s) => (
              <Field key={s.key} compact label={s.label} suffix={s.suffix} step={s.step} value={army[t.key][s.key]} onChange={(v) => setArmy((a) => ({ ...a, [t.key]: { ...a[t.key], [s.key]: v } }))} />
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-[1fr_auto_60px] items-end gap-1.5">
            <Select compact label="Lead Hero" value={heroes[t.key]} onChange={(v) => setHeroes((h) => ({ ...h, [t.key]: v }))} options={HEROES[t.key]} />
            <div className="inline-flex rounded-lg border border-gold/15 bg-black/25 p-0.5">
              {['attack', 'lethality'].map((k) => (
                <button key={k} type="button" onClick={() => setArmy((a) => ({ ...a, [t.key]: { ...a[t.key], widgetStat: k } }))} className={`rounded px-1.5 py-1 text-[8px] font-bold uppercase ${(army[t.key].widgetStat || 'attack') === k ? 'bg-gold/15 text-gold-bright' : 'text-parchment/40'}`}>{k === 'attack' ? 'ATK' : 'LET'}</button>
              ))}
            </div>
            <Select compact label="Widget" value={army[t.key].widget} onChange={(v) => setArmy((a) => ({ ...a, [t.key]: { ...a[t.key], widget: v } }))} options={WIDGET_OPTIONS} />
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-3.5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-parchment/45">Joiners</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {joiners.map((slot, i) => (
            <div key={i} className="space-y-1">
              <Select compact label={`Joiner ${i + 1}`} value={slot.hero} onChange={(v) => setJoiners((j) => j.map((x, k) => k === i ? { ...x, hero: v } : x))} options={HUNT_JOINER_HEROES} />
              <Select compact label="Skill" value={String(slot.skillLevel)} onChange={(v) => setJoiners((j) => j.map((x, k) => k === i ? { ...x, skillLevel: Number(v) } : x))} options={['1', '2', '3', '4', '5']} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function totalCount(army) { return TROOPS.reduce((s, t) => s + Math.max(0, n(army[t.key].count)), 0) }

function effectiveArmy(army, joiners) {
  const raw = Object.fromEntries(TROOPS.map((t) => [t.key, { attack: n(army[t.key].attack), lethality: n(army[t.key].lethality), widget: n(army[t.key].widget), widgetStat: army[t.key].widgetStat === 'lethality' ? 'lethality' : 'attack' }]))
  const withJoiners = applyJoinerBonuses(raw, joiners)
  return Object.fromEntries(TROOPS.map((t) => {
    const s = withJoiners[t.key]
    const widget = Math.max(0, s.widget)
    return [t.key, {
      count: Math.max(0, n(army[t.key].count)),
      attack: s.attack + (s.widgetStat === 'attack' ? widget : 0),
      lethality: s.lethality + (s.widgetStat === 'lethality' ? widget : 0),
      defense: n(army[t.key].defense),
      health: n(army[t.key].health),
    }]
  }))
}

function OutcomeBanner({ outcome, attackerLeft, defenderLeft, rounds }) {
  const label = outcome === 'attacker' ? 'Your Army Wins' : outcome === 'defender' ? 'Enemy Army Wins' : 'Mutual Wipe / Draw'
  const tone = outcome === 'attacker' ? 'border-emerald-300/25 bg-emerald-300/[.05] text-emerald-200' : outcome === 'defender' ? 'border-red-400/25 bg-red-400/[.05] text-red-300' : 'border-gold/25 bg-gold/[.05] text-gold-bright'
  return (
    <div className={`rounded-2xl border p-5 text-center ${tone}`}>
      <div className="font-display text-2xl font-bold">{label}</div>
      <div className="mt-1 text-xs text-parchment/50">Resolved in {rounds} round{rounds === 1 ? '' : 's'} · Your army {fmt(attackerLeft)} left · Enemy army {fmt(defenderLeft)} left</div>
    </div>
  )
}

function RoundChart({ rounds }) {
  if (!rounds.length) return null
  const W = 760, H = 220, L = 48, R = 18, T = 20, B = 34
  const maxV = Math.max(...rounds.map((r) => Math.max(r.attackerRemaining, r.defenderRemaining)), 1)
  const x = (i) => L + i / Math.max(1, rounds.length - 1) * (W - L - R)
  const y = (v) => H - B - v / maxV * (H - T - B)
  const path = (key) => rounds.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(r[key])}`).join(' ')
  return (
    <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-4">
      <div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Troops Remaining by Round</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
        {[0, .25, .5, .75, 1].map((t) => <line key={t} x1={L} x2={W - R} y1={T + t * (H - T - B)} y2={T + t * (H - T - B)} stroke="rgba(226,199,125,.10)" />)}
        <path d={path('attackerRemaining')} fill="none" stroke="#7f9ed6" strokeWidth="3" />
        <path d={path('defenderRemaining')} fill="none" stroke="#c8655a" strokeWidth="3" />
      </svg>
      <div className="mt-1 flex justify-center gap-4 text-[10px]"><span className="text-[#7f9ed6]">● Your Army</span><span className="text-[#c8655a]">● Enemy Army</span></div>
    </div>
  )
}

const TROOP_COLORS = { infantry: '#d9b94e', cavalry: '#7f9ed6', archers: '#c8655a' }

function FormationRow({ composition, sub, margin, max, active }) {
  return (
    <div className={`rounded-xl border p-3 ${active ? 'border-gold/40 bg-gold/[.05]' : 'border-gold/10 bg-white/[.02]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-4 w-20 shrink-0 overflow-hidden rounded-full border border-gold/10">
            <div style={{ width: `${composition.infantry * 100}%`, background: TROOP_COLORS.infantry }} />
            <div style={{ width: `${composition.cavalry * 100}%`, background: TROOP_COLORS.cavalry }} />
            <div style={{ width: `${composition.archers * 100}%`, background: TROOP_COLORS.archers }} />
          </div>
          <div className="text-xs"><span className="font-semibold text-parchment/85">{Math.round(composition.infantry * 100)}/{Math.round(composition.cavalry * 100)}/{Math.round(composition.archers * 100)}</span><span className="ml-2 text-[10px] text-parchment/40">{sub}</span></div>
        </div>
        <span className={`font-mono text-sm font-bold ${margin >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{margin >= 0 ? '+' : ''}{fmt(margin)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25">
        <div className={`h-full rounded-full ${margin >= 0 ? 'bg-gradient-to-r from-emerald-400/50 to-emerald-300' : 'bg-gradient-to-r from-red-400/50 to-red-300'}`} style={{ width: `${max > 0 ? Math.max(2, Math.abs(margin) / max * 100) : 0}%` }} />
      </div>
    </div>
  )
}

// NEW OPTION — "Stat Radar": a 5-axis polygon comparing overall army stat
// profiles (troop-weighted Attack/Lethality/Defense/Health, plus Troops) —
// a chart type not used anywhere else on the site, good for Direct Attack's
// pre-battle matchup since it has full per-side stat data.
function StatRadar({ yourStats, enemyStats, yourLabel = 'YOUR ARMY', enemyLabel = 'ENEMY ARMY' }) {
  const AXES = [{ key: 'attack', label: 'ATK' }, { key: 'lethality', label: 'LET' }, { key: 'defense', label: 'DEF' }, { key: 'health', label: 'HP' }, { key: 'troops', label: 'TROOPS' }]
  const R = 72, CX = 140, CY = 116
  const angleFor = (i) => -Math.PI / 2 + i * (2 * Math.PI / AXES.length)
  const maxes = AXES.map((a) => Math.max(1, yourStats[a.key], enemyStats[a.key]))
  const pt = (i, val, max) => [CX + R * Math.min(1, val / max) * Math.cos(angleFor(i)), CY + R * Math.min(1, val / max) * Math.sin(angleFor(i))]
  const poly = (stats) => AXES.map((a, i) => pt(i, stats[a.key], maxes[i])).map(([x, y]) => `${x},${y}`).join(' ')
  const gridPoly = (scale) => AXES.map((a, i) => pt(i, scale, 1)).map(([x, y]) => `${x},${y}`).join(' ')
  const VB_W = 280, VB_H = 250
  return (
    <div className="rounded-2xl border border-gold/20 bg-[#07101e] p-4 md:p-5">
      <div className="relative mx-auto w-full max-w-md">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full">
          {[.25, .5, .75, 1].map((s) => <polygon key={s} points={gridPoly(s)} fill="none" stroke="rgba(226,199,125,.12)" />)}
          <polygon points={poly(yourStats)} fill="rgba(127,158,214,.28)" stroke="#7f9ed6" strokeWidth="2" />
          <polygon points={poly(enemyStats)} fill="rgba(200,101,90,.22)" stroke="#c8655a" strokeWidth="2" />
        </svg>
        {/* Plain HTML labels, not SVG <text> — html2canvas 1.4.1 renders SVG
            text (and the whole SVG along with it) blank in exported reports. */}
        {AXES.map((a, i) => { const [x, y] = pt(i, 1.42, 1); return <div key={a.key} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-extrabold text-parchment" style={{ left: `${x / VB_W * 100}%`, top: `${y / VB_H * 100}%` }}>{a.label}</div> })}
      </div>
      <div className="mt-1 flex justify-center gap-4 text-[10px]"><span className="text-[#7f9ed6]">● {yourLabel}</span><span className="text-[#c8655a]">● {enemyLabel}</span></div>
    </div>
  )
}

// NEW OPTION — "Formation Blocks": a pictorial icon-grid army display (one
// row per troop type, one block per slice of that type's share) instead of
// an abstract chart — reads like an actual formation roster, and doubles as
// a casualty display when casualtyFraction is passed (blocks dim to show losses).
function FormationBlocks({ side, casualtyFraction, label, color }) {
  const total = Math.max(0, side.infantry) + Math.max(0, side.cavalry) + Math.max(0, side.archers)
  const BLOCKS_PER_ROW = 36
  const rows = TROOPS.map((t) => {
    const count = Math.max(0, side[t.key])
    const blockCount = total > 0 && count > 0 ? Math.max(1, Math.round(count / total * BLOCKS_PER_ROW)) : 0
    const lostBlocks = casualtyFraction != null ? Math.round(blockCount * Math.max(0, Math.min(1, casualtyFraction))) : 0
    return { key: t.key, label: t.label, count, blockCount, lostBlocks, color: TROOP_COLORS[t.key] }
  })
  return (
    <div className="rounded-2xl border border-gold/15 bg-black/20 p-3.5">
      <div className="flex items-baseline justify-between"><div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div><div className="font-mono text-xs text-parchment/50">{fmt(total)}</div></div>
      <div className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-[8px] font-bold uppercase text-parchment/35">{r.label.slice(0, 3)}</span>
            <div className="flex flex-1 flex-wrap gap-[2px]">
              {Array.from({ length: r.blockCount }).map((_, i) => (
                <div key={i} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: r.color, opacity: i < r.blockCount - r.lostBlocks ? 1 : .15 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormationBlocksMatchup({ yourSide, enemySide, yourLabel = 'YOUR ARMY', enemyLabel = 'ENEMY ARMY', yourCasualtyFraction, enemyCasualtyFraction }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-gold/20 bg-[#07101e] p-4 md:grid-cols-2 md:p-5">
      <FormationBlocks side={yourSide} label={yourLabel} color="#7f9ed6" casualtyFraction={yourCasualtyFraction} />
      <FormationBlocks side={enemySide} label={enemyLabel} color="#c8655a" casualtyFraction={enemyCasualtyFraction} />
    </div>
  )
}

// NEW OPTION — "Victory Podium": top 3 compositions shown as a leaderboard
// podium (1st/2nd/3rd place blocks), leaning into game-leaderboard styling
// rather than a chart at all.
function VictoryPodium({ top3 }) {
  if (!top3.length) return null
  const order = [1, 0, 2].filter((i) => top3[i])
  const HEIGHTS = { 0: 84, 1: 56, 2: 36 }
  const MEDALS = { 0: '🥇', 1: '🥈', 2: '🥉' }
  const ROW_H = 176
  return (
    <div className="rounded-2xl border border-gold/20 bg-[#07101e] p-4 md:p-5">
      <div className="flex justify-center gap-3" style={{ height: ROW_H }}>
        {order.map((i) => {
          const c = top3[i]
          return (
            <div key={i} className="relative w-28" style={{ height: ROW_H }}>
              <div className="absolute inset-x-0 flex flex-col items-center" style={{ bottom: HEIGHTS[i] + 8 }}>
                <div className="text-lg">{MEDALS[i]}</div>
                <div className="mt-1 flex h-3 w-20 overflow-hidden rounded-full border border-gold/10">
                  <div style={{ width: `${c.composition.infantry * 100}%`, background: TROOP_COLORS.infantry }} />
                  <div style={{ width: `${c.composition.cavalry * 100}%`, background: TROOP_COLORS.cavalry }} />
                  <div style={{ width: `${c.composition.archers * 100}%`, background: TROOP_COLORS.archers }} />
                </div>
                <div className="mt-1 font-mono text-[10px] text-parchment/60">{Math.round(c.composition.infantry * 100)}/{Math.round(c.composition.cavalry * 100)}/{Math.round(c.composition.archers * 100)}</div>
              </div>
              <div className={`absolute inset-x-0 bottom-0 flex items-end justify-center rounded-t-lg border-x border-t ${i === 0 ? 'border-gold/40 bg-gold/[.08]' : 'border-gold/15 bg-white/[.03]'}`} style={{ height: `${HEIGHTS[i]}px` }}>
                <div className="pb-2 font-mono text-sm font-black text-gold-bright">{c.margin >= 0 ? '+' : ''}{fmt(c.margin)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SynergyPanel({ effects, setEffects }) {
  const result = useMemo(() => calculateHeroSynergy(effects.map((e) => ({ group: e.group, percent: n(e.percent) }))), [effects])
  return (
    <section className="panel p-5 md:p-6">
      <div className="eyebrow">Optional</div>
      <h3 className="mt-1 font-display text-xl font-bold text-parchment">Hero Effect Stacking</h3>
      <p className="mt-1 text-xs text-parchment/50">Same-group hero bonuses stack additively, then different groups multiply. Use this to work out the real combined % before typing it into an army's stats above.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {effects.map((e, i) => (
          <div key={i} className="rounded-xl border border-gold/10 bg-white/[.025] p-2.5">
            <div className="grid grid-cols-[1fr_60px] gap-1.5">
              <label className="block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-parchment/40">Group</span><input value={e.group} onChange={(ev) => setEffects((arr) => arr.map((x, k) => k === i ? { ...x, group: ev.target.value.slice(0, 2).toUpperCase() } : x))} className="w-full rounded-lg border border-gold/15 bg-ink/70 px-2 py-1.5 text-xs font-bold text-parchment outline-none" /></label>
              <label className="block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-parchment/40">%</span><input type="number" min={0} step={.1} value={e.percent} onChange={(ev) => setEffects((arr) => arr.map((x, k) => k === i ? { ...x, percent: ev.target.value } : x))} className="w-full rounded-lg border border-gold/15 bg-ink/70 px-2 py-1.5 text-xs font-semibold text-parchment outline-none" /></label>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gold/20 bg-gold/[.045] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Combined Multiplier</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">×{result.multiplier.toFixed(3)}</div><div className="mt-0.5 text-[10px] text-parchment/40">= +{((result.multiplier - 1) * 100).toFixed(1)}% effective</div></div>
        <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">vs. Naive Flat Add</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{result.improvementVsFlat >= 0 ? '+' : ''}{result.improvementVsFlat.toFixed(1)}%</div><div className="mt-0.5 text-[10px] text-parchment/40">gained by stacking correctly by group</div></div>
      </div>
    </section>
  )
}

export default function PvPSuite() {
  const [attacker, setAttacker] = useState(EMPTY_ARMY)
  const [attackerHeroes, setAttackerHeroes] = useState(EMPTY_HEROES)
  const [attackerJoiners, setAttackerJoiners] = useState(EMPTY_JOINERS)
  const [attackerTier, setAttackerTier] = useState('T10')
  const [attackerTg, setAttackerTg] = useState(0)
  const [defender, setDefender] = useState(EMPTY_ARMY)
  const [defenderHeroes, setDefenderHeroes] = useState(EMPTY_HEROES)
  const [defenderJoiners, setDefenderJoiners] = useState(EMPTY_JOINERS)
  const [defenderTier, setDefenderTier] = useState('T10')
  const [defenderTg, setDefenderTg] = useState(0)
  const [effects, setEffects] = useState(EMPTY_EFFECTS)
  const [result, setResult] = useState(null)
  const [mode, setMode] = useState('direct')

  const [sweepSparsity, setSweepSparsity] = useState('0.05')
  const [sweepMinInfantry, setSweepMinInfantry] = useState('0')
  const [sweepMaxInfantry, setSweepMaxInfantry] = useState('100')
  const [sweepMinCavalry, setSweepMinCavalry] = useState('0')
  const [sweepMaxCavalry, setSweepMaxCavalry] = useState('100')
  const [sweepResult, setSweepResult] = useState(null)

  const ready = totalCount(attacker) > 0 && totalCount(defender) > 0
  const runBattle = () => setResult(simulateT10Battle({
    attacker: effectiveArmy(attacker, attackerJoiners),
    defender: effectiveArmy(defender, defenderJoiners),
  }))

  const runSweep = () => setSweepResult(optimizeMysticComposition({
    yourArmy: effectiveArmy(attacker, attackerJoiners),
    opponentArmy: effectiveArmy(defender, defenderJoiners),
    sparsity: n(sweepSparsity, 0.05),
    minInfantryFraction: n(sweepMinInfantry, 0) / 100, maxInfantryFraction: n(sweepMaxInfantry, 100) / 100,
    minCavalryFraction: n(sweepMinCavalry, 0) / 100, maxCavalryFraction: n(sweepMaxCavalry, 100) / 100,
  }))

  // Same auto-narrowing idea used in Mystic Trials: a fast wide-open pass
  // first, then the fraction bounds narrow to a window around whatever that
  // pass found.
  const suggestSweepBounds = () => {
    if (!ready) return
    const coarse = optimizeMysticComposition({ yourArmy: effectiveArmy(attacker, attackerJoiners), opponentArmy: effectiveArmy(defender, defenderJoiners), sparsity: 0.1 })
    if (!coarse.best) return
    const window = 0.2
    setSweepMinInfantry(String(Math.round(Math.max(0, coarse.best.composition.infantry - window) * 100)))
    setSweepMaxInfantry(String(Math.round(Math.min(1, coarse.best.composition.infantry + window) * 100)))
    setSweepMinCavalry(String(Math.round(Math.max(0, coarse.best.composition.cavalry - window) * 100)))
    setSweepMaxCavalry(String(Math.round(Math.min(1, coarse.best.composition.cavalry + window) * 100)))
  }

  const sweepTop = useMemo(() => sweepResult?.candidates?.slice(0, 8) || [], [sweepResult])
  const sweepMaxMargin = useMemo(() => Math.max(1, ...sweepTop.map((c) => Math.abs(c.margin))), [sweepTop])

  return (
    <div className="space-y-5">
      <section className="panel p-4 md:p-5">
        <div className="eyebrow">Battles with Heroes</div>
        <h2 className="mt-1 font-display text-2xl font-bold text-parchment">PvP Battle Simulator</h2>
        <p className="mt-1 text-xs text-parchment/50">Two ways to model a PvP fight: run a single Direct Attack with the exact compositions below, or run the Composition Optimizer to find the split of your total troops that wins by the widest margin — closer to garrisoning a tower or defending a rally against a known enemy force.</p>
        <div className="mt-4 inline-flex rounded-xl border border-gold/15 bg-black/25 p-1">
          <button type="button" onClick={() => setMode('direct')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${mode === 'direct' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Direct Attack</button>
          <button type="button" onClick={() => setMode('sweep')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${mode === 'sweep' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Composition Optimizer</button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Your Stats</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Your Army</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-parchment/35">{mode === 'sweep' ? 'In the Composition Optimizer, only the total across the three Troops fields matters — the search decides how to split it. Lead Hero, Troop Tier, Joiners and Widget stay fixed per type either way.' : 'Lead Hero and Troop Tier are for the record — if your Attack/Lethality already come from an in-game report, that hero\'s stat bonus is already inside those numbers. Joiners and Widget add on top.'}</p>
          <div className="mt-4"><ArmyForm army={attacker} setArmy={setAttacker} heroes={attackerHeroes} setHeroes={setAttackerHeroes} joiners={attackerJoiners} setJoiners={setAttackerJoiners} tier={attackerTier} setTier={setAttackerTier} tg={attackerTg} setTg={setAttackerTg} accent="text-[#7f9ed6]" /></div>
        </section>
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Opponent Stats</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Enemy Army</h3>
          <p className="mt-1 text-[10px] leading-relaxed text-parchment/35">{mode === 'sweep' ? 'This side stays exactly as entered — the search only re-splits your own troops above, never the opponent\'s.' : 'Same rule applies here — enter what the opponent\'s report already shows, then their Joiners and Widget on top.'}</p>
          <div className="mt-4"><ArmyForm army={defender} setArmy={setDefender} heroes={defenderHeroes} setHeroes={setDefenderHeroes} joiners={defenderJoiners} setJoiners={setDefenderJoiners} tier={defenderTier} setTier={setDefenderTier} tg={defenderTg} setTg={setDefenderTg} accent="text-[#c8655a]" /></div>
        </section>
      </div>

      {mode === 'direct' && <div className="flex justify-center"><button onClick={runBattle} disabled={!ready} className="btn-primary btn-royal px-8 disabled:opacity-40"><Icon name="swords" size={15} /> Run Battle</button></div>}

      {mode === 'direct' && result && (
        <section className="panel panel-glow p-4 md:p-6">
          <div className="eyebrow">Result</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-parchment">Battle Outcome</h3>
          <div className="mt-4 space-y-4">
            <OutcomeBanner outcome={result.outcome} attackerLeft={result.remainingA} defenderLeft={result.remainingD} rounds={result.rounds.length} />
            {(() => {
              const yourStart = effectiveArmy(attacker, attackerJoiners)
              const enemyStart = effectiveArmy(defender, defenderJoiners)
              const weighted = (army, key) => { const total = TROOPS.reduce((s, t) => s + army[t.key].count, 0); return total > 0 ? TROOPS.reduce((s, t) => s + army[t.key].count * army[t.key][key], 0) / total : 0 }
              const yourStats = { attack: weighted(yourStart, 'attack'), lethality: weighted(yourStart, 'lethality'), defense: weighted(yourStart, 'defense'), health: weighted(yourStart, 'health'), troops: result.startingA }
              const enemyStats = { attack: weighted(enemyStart, 'attack'), lethality: weighted(enemyStart, 'lethality'), defense: weighted(enemyStart, 'defense'), health: weighted(enemyStart, 'health'), troops: result.startingD }
              const yourSide = { infantry: yourStart.infantry.count, cavalry: yourStart.cavalry.count, archers: yourStart.archers.count }
              const enemySide = { infantry: enemyStart.infantry.count, cavalry: enemyStart.cavalry.count, archers: enemyStart.archers.count }
              const yourCasualtyFraction = result.startingA > 0 ? result.attackerLosses / result.startingA : 0
              const enemyCasualtyFraction = result.startingD > 0 ? result.defenderLosses / result.startingD : 0
              return (
                <div data-report-clone="pvp-direct-visual" className="space-y-4">
                  <StatRadar yourStats={yourStats} enemyStats={enemyStats} />
                  <FormationBlocksMatchup yourSide={yourSide} enemySide={enemySide} yourCasualtyFraction={yourCasualtyFraction} enemyCasualtyFraction={enemyCasualtyFraction} />
                </div>
              )
            })()}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Your Losses</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.attackerLosses)}</div></div>
              <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Enemy Losses</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.defenderLosses)}</div></div>
              <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Your Starting</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.startingA)}</div></div>
              <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Enemy Starting</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.startingD)}</div></div>
            </div>
            <RoundChart rounds={result.rounds} />
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">Experimental T10 field-battle model — a projection based on Attack/Lethality vs Defense/Health (Joiners and Widget already folded in) and the Infantry→Cavalry→Archer→Infantry counter cycle, not a guarantee of any real fight's outcome.</div>
          </div>
        </section>
      )}

      {mode === 'sweep' && (
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Search Settings</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Search Tuning</h3>
          <label className="mt-4 block max-w-xs">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Search Step</span>
            <input type="number" min={.005} max={.5} step={.005} value={sweepSparsity} onChange={(e) => setSweepSparsity(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
            <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">Grid step between compositions tested. 0.05 is a good start; use 0.025 for a finer (slower) search.</span>
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Search Bounds</span>
            <button type="button" onClick={suggestSweepBounds} disabled={!ready} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gold/[.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-bright/80 hover:border-gold/40 disabled:opacity-30"><Icon name="sparkles" size={11} /> Suggest Bounds</button>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-parchment/35">Runs a quick wide-open pass first, then narrows Min/Max below to a window around whatever it finds.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Infantry Floor</span>
              <div className="relative"><input type="number" min={0} max={100} step={1} value={sweepMinInfantry} onChange={(e) => setSweepMinInfantry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Infantry Ceiling</span>
              <div className="relative"><input type="number" min={0} max={100} step={1} value={sweepMaxInfantry} onChange={(e) => setSweepMaxInfantry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Cavalry Floor</span>
              <div className="relative"><input type="number" min={0} max={100} step={1} value={sweepMinCavalry} onChange={(e) => setSweepMinCavalry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Cavalry Ceiling</span>
              <div className="relative"><input type="number" min={0} max={100} step={1} value={sweepMaxCavalry} onChange={(e) => setSweepMaxCavalry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
            </label>
          </div>
          <span className="mt-2 block text-[10px] leading-relaxed text-parchment/35">Bounds narrow the search away from splits that rarely win — Infantry and Cavalry each get a Min/Max range; Archers fill whatever's left.</span>
          <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">This model has no randomness, so there's no true "win rate %" or "mean resident" survivor average to report the way a Monte Carlo tool would — the same composition always fights out the same way. What you get below is the deterministic best split and its exact survivor margin against the enemy army entered above.</div>
          <div className="mt-4 flex justify-center"><button onClick={runSweep} disabled={!ready} className="btn-primary btn-royal px-8 disabled:opacity-40"><Icon name="sparkles" size={15} /> Run Composition Optimizer</button></div>
        </section>
      )}

      {mode === 'sweep' && sweepResult && (
        <section className="panel panel-glow p-4 md:p-6">
          <div className="eyebrow">Result</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-parchment">Best Composition Found</h3>
          {sweepResult.best ? (
            <div className="mt-4 space-y-4">
              <div className={`rounded-2xl border p-5 text-center ${sweepResult.best.margin >= 0 ? 'border-emerald-300/25 bg-emerald-300/[.05] text-emerald-200' : 'border-red-400/25 bg-red-400/[.05] text-red-300'}`}>
                <div className="font-display text-2xl font-bold">{sweepResult.best.result.outcome === 'attacker' ? 'You Win' : sweepResult.best.result.outcome === 'defender' ? 'Still Loses' : 'Even Fight'}</div>
                <div className="mt-1 text-xs text-parchment/50">Best split: {pct(sweepResult.best.composition.infantry)} Infantry / {pct(sweepResult.best.composition.cavalry)} Cavalry / {pct(sweepResult.best.composition.archers)} Archers · margin {sweepResult.best.margin >= 0 ? '+' : ''}{fmt(sweepResult.best.margin)} troops</div>
              </div>
              <div data-report-clone="pvp-sweep-visual"><VictoryPodium top3={sweepTop.slice(0, 3)} /></div>
              {sweepResult.classical && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gold/10 bg-white/[.02] p-4">
                    <div className="text-[9px] uppercase tracking-wider text-parchment/35">Classical 50/25/25 (the default guess)</div>
                    <div className={`mt-1 font-mono text-lg font-bold ${sweepResult.classical.margin >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{sweepResult.classical.margin >= 0 ? '+' : ''}{fmt(sweepResult.classical.margin)}</div>
                    <div className="mt-0.5 text-[10px] text-parchment/40">{sweepResult.classical.result.outcome === 'attacker' ? 'wins' : sweepResult.classical.result.outcome === 'defender' ? 'loses' : 'draw'}</div>
                  </div>
                  <div className="rounded-2xl border border-gold/20 bg-gold/[.04] p-4">
                    <div className="text-[9px] uppercase tracking-wider text-parchment/35">Optimal split found above</div>
                    <div className={`mt-1 font-mono text-lg font-bold ${sweepResult.best.margin >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{sweepResult.best.margin >= 0 ? '+' : ''}{fmt(sweepResult.best.margin)}</div>
                    <div className="mt-0.5 text-[10px] text-gold-bright/70">{sweepResult.best.margin - sweepResult.classical.margin >= 0 ? '+' : ''}{fmt(sweepResult.best.margin - sweepResult.classical.margin)} troops vs. classical</div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Infantry</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(sweepResult.totalYourTroops * sweepResult.best.composition.infantry)}</div></div>
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Cavalry</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(sweepResult.totalYourTroops * sweepResult.best.composition.cavalry)}</div></div>
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Archers</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(sweepResult.totalYourTroops * sweepResult.best.composition.archers)}</div></div>
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Compositions Tested</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{sweepResult.candidates.length}</div></div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-parchment/40">Top Compositions By Margin</div>
                <div className="space-y-2">
                  {sweepTop.map((c, i) => (
                    <FormationRow key={i} active={i === 0} composition={c.composition} sub={c.result.outcome === 'attacker' ? 'wins' : c.result.outcome === 'defender' ? 'loses' : 'draw'} margin={c.margin} max={sweepMaxMargin} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-parchment/50">No composition found — check your troop totals above.</div>
          )}
        </section>
      )}

      <SynergyPanel effects={effects} setEffects={setEffects} />
    </div>
  )
}
