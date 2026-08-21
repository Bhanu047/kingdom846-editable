import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { TROOP_LABELS, optimizeFormation } from '../lib/combat/battleLabEngine'

const TYPES = ['infantry', 'cavalry', 'archers']
const TROOPS = [
  { key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' },
  { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' },
  { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' },
]

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function NumberField({ label, value, onChange, min = 0, step = 1, suffix, compact = false }) {
  return (
    <label className="block">
      <span className={`mb-1 flex items-center justify-between gap-2 font-semibold uppercase tracking-[0.12em] text-parchment/50 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <span>{label}</span>{suffix && <span className="text-gold/50">{suffix}</span>}
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-gold/15 bg-ink/60 font-semibold text-parchment outline-none transition focus:border-gold/45 focus:ring-2 focus:ring-gold/10 ${compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm'}`}
      />
    </label>
  )
}

function FormationCards({ troops }) {
  return (
    <div className="space-y-3">
      {troops.map((troop) => (
        <div key={troop.type} className="rounded-2xl border border-gold/15 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-gold/55">{troop.short}</div>
              <div className="mt-0.5 font-display text-base font-bold text-parchment">{troop.label}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-gold-bright">{troop.count.toLocaleString()}</div>
              <div className="text-xs font-semibold text-parchment/50">{troop.percent.toFixed(1)}%</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/80">
            <div className="h-full rounded-full bg-gradient-to-r from-gold/55 to-gold-bright" style={{ width: `${Math.max(2, Math.min(100, troop.percent))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FormationSuite() {
  const [capacity, setCapacity] = useState(750000)
  const [stats, setStats] = useState({
    infantry: { attack: 0, lethality: 0, defense: 0, health: 0 },
    cavalry: { attack: 0, lethality: 0, defense: 0, health: 0 },
    archers: { attack: 0, lethality: 0, defense: 0, health: 0 },
  })
  const [targetType, setTargetType] = useState('infantry')
  const [minimums, setMinimums] = useState({ infantry: 0, cavalry: 0, archers: 0 })

  function updateStat(type, field, value) {
    setStats((current) => ({ ...current, [type]: { ...current[type], [field]: Math.max(0, toNumber(value)) } }))
  }

  const state = useMemo(() => {
    try { return { result: optimizeFormation({ capacity, stats, targetType, minimums }), error: '' } }
    catch (error) { return { result: null, error: error.message || 'Unable to optimize formation.' } }
  }, [capacity, stats, targetType, minimums])

  return (
    <div className="space-y-5">
      <section className="panel p-5 md:p-6">
        <div className="eyebrow">Theorycrafting Input</div>
        <h3 className="mt-1 font-display text-xl font-bold text-parchment">Combat Report Stats</h3>
        <p className="mt-1 text-xs text-parchment/45">Enter the Attack/Lethality/Defense/Health percentages from the report/setup you want to model, plus your march capacity.</p>
        <div className="mt-4"><NumberField label="March Capacity" value={capacity} step={1000} onChange={(v) => setCapacity(Math.max(1, toNumber(v, 1)))} /></div>
        <div className="mt-4 space-y-3">
          {TROOPS.map((troop) => (
            <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={troop.icon} size={15} className="text-gold/70" /> {troop.label}</div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <NumberField compact label="Attack" suffix="%" step={0.01} value={stats[troop.key].attack} onChange={(v) => updateStat(troop.key, 'attack', v)} />
                <NumberField compact label="Lethality" suffix="%" step={0.01} value={stats[troop.key].lethality} onChange={(v) => updateStat(troop.key, 'lethality', v)} />
                <NumberField compact label="Defense" suffix="%" step={0.01} value={stats[troop.key].defense} onChange={(v) => updateStat(troop.key, 'defense', v)} />
                <NumberField compact label="Health" suffix="%" step={0.01} value={stats[troop.key].health} onChange={(v) => updateStat(troop.key, 'health', v)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Theorycrafting</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Formation Optimizer</h3>
          <p className="mt-2 text-xs leading-relaxed text-parchment/45">Generalizes the offensive square-root model against a chosen troop target and applies the standard 10% counter relationship. It is a theorycrafting aid, not a full PvP predictor.</p>
          <label className="mt-5 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-parchment/45">Primary target</span>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/40">
              {TYPES.map((type) => <option key={type} value={type}>{TROOP_LABELS[type].label}</option>)}
            </select>
          </label>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {TROOPS.map((troop) => <NumberField compact key={troop.key} label={`${troop.short} minimum`} value={minimums[troop.key]} step={1000} onChange={(v) => setMinimums((current) => ({ ...current, [troop.key]: Math.max(0, Math.floor(toNumber(v))) }))} />)}
          </div>
        </section>

        <section className="panel panel-glow p-5 md:p-6">
          <div className="eyebrow">Recommended split vs {TROOP_LABELS[targetType].label}</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Theory Formation</h3>
          {state.error && <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-100/70">{state.error}</div>}
          {state.result && (
            <div className="mt-4">
              <FormationCards troops={state.result.troops} />
              <div className="mt-4 flex flex-wrap gap-2">
                {state.result.troops.filter((troop) => troop.counter).map((troop) => <span key={troop.type} className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.04] px-2.5 py-1 text-[10px] font-semibold text-emerald-100/65">{troop.label} receives counter bonus</span>)}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
