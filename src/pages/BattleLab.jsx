import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { buildBearChatMessage, optimizeBearFormation } from '../lib/combat/bearOptimizer'

const DEFAULTS = {
  capacity: 750000,
  infantry: { attack: 300, lethality: 250, minimum: 0 },
  cavalry: { attack: 300, lethality: 250, minimum: 0 },
  archers: { attack: 300, lethality: 250, minimum: 0 },
}

const MODULES = [
  { id: 'bear', label: 'Bear Optimizer', icon: 'target', status: 'Live' },
  { id: 'mystic', label: 'Mystic Trials', icon: 'sparkles', status: 'Next' },
  { id: 'battle', label: 'Battle Simulator', icon: 'swords', status: 'Next' },
  { id: 'heroes', label: 'Hero Synergy', icon: 'crown', status: 'Next' },
  { id: 'formation', label: 'Formation Optimizer', icon: 'layers', status: 'Next' },
]

const TROOPS = [
  { key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' },
  { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' },
  { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' },
]

function NumberField({ label, value, onChange, min = 0, step = 1, suffix, help }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-parchment/55">
        <span>{label}</span>
        {suffix && <span className="text-gold/55">{suffix}</span>}
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gold/15 bg-ink/60 px-3 py-2.5 text-sm font-semibold text-parchment outline-none transition focus:border-gold/45 focus:ring-2 focus:ring-gold/10"
      />
      {help && <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">{help}</span>}
    </label>
  )
}

function TroopResult({ troop }) {
  const width = Math.max(2, Math.min(100, troop.percent))
  return (
    <div className="rounded-2xl border border-gold/15 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/55">{troop.short}</div>
          <div className="mt-0.5 font-display text-lg font-bold text-parchment">{troop.label}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl font-bold text-gold-bright">{troop.count.toLocaleString()}</div>
          <div className="text-xs font-semibold text-parchment/50">{troop.percent.toFixed(1)}%</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/80">
        <div className="h-full rounded-full bg-gradient-to-r from-gold/55 to-gold-bright" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-parchment/45">
        <div>ATK <span className="font-semibold text-parchment/70">{troop.attack.toFixed(2)}%</span></div>
        <div>LET <span className="font-semibold text-parchment/70">{troop.lethality.toFixed(2)}%</span></div>
      </div>
    </div>
  )
}

export default function BattleLab() {
  const [activeModule, setActiveModule] = useState('bear')
  const [capacity, setCapacity] = useState(DEFAULTS.capacity)
  const [stats, setStats] = useState({
    infantry: { ...DEFAULTS.infantry },
    cavalry: { ...DEFAULTS.cavalry },
    archers: { ...DEFAULTS.archers },
  })
  const [copied, setCopied] = useState(false)

  const resultState = useMemo(() => {
    try {
      const result = optimizeBearFormation({
        capacity,
        stats,
        minimums: {
          infantry: stats.infantry.minimum,
          cavalry: stats.cavalry.minimum,
          archers: stats.archers.minimum,
        },
      })
      return { result, error: '' }
    } catch (error) {
      return { result: null, error: error.message || 'Unable to calculate formation.' }
    }
  }, [capacity, stats])

  const result = resultState.result
  const chatMessage = result ? buildBearChatMessage(result) : ''

  function updateTroop(type, field, value) {
    setStats((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [field]: Math.max(0, Number(value) || 0),
      },
    }))
  }

  function resetExample() {
    setCapacity(DEFAULTS.capacity)
    setStats({
      infantry: { ...DEFAULTS.infantry },
      cavalry: { ...DEFAULTS.cavalry },
      archers: { ...DEFAULTS.archers },
    })
  }

  async function copyFormation() {
    if (!chatMessage) return
    try {
      await navigator.clipboard.writeText(chatMessage)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel panel-glow overflow-hidden p-0">
        <div className="relative overflow-hidden px-5 py-6 md:px-7 md:py-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="eyebrow">Kingdom 846 · Tactical Intelligence</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold-bright">
                  <Icon name="crosshair" size={22} />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-parchment md:text-4xl">Battle Lab</h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-parchment/55">Test formations, compare combat assumptions, and turn your own report stats into practical march recommendations.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Bear Engine · Community Model
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-5">
        {MODULES.map((module) => {
          const active = activeModule === module.id
          const enabled = module.id === 'bear'
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => enabled && setActiveModule(module.id)}
              disabled={!enabled}
              className={`rounded-2xl border p-3 text-left transition ${active ? 'border-gold/45 bg-gold/10 shadow-[0_0_30px_rgba(212,175,55,.08)]' : 'border-gold/10 bg-white/[0.025]'} ${enabled ? 'hover:border-gold/30' : 'cursor-not-allowed opacity-55'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon name={module.icon} size={17} className={active ? 'text-gold-bright' : 'text-gold/50'} />
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${module.status === 'Live' ? 'bg-emerald-400/10 text-emerald-200/80' : 'bg-white/5 text-parchment/35'}`}>{module.status}</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-parchment/75">{module.label}</div>
            </button>
          )
        })}
      </section>

      {activeModule === 'bear' && (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <section className="panel p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="eyebrow">Bear Hunt</div>
                <h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation Inputs</h2>
              </div>
              <button type="button" onClick={resetExample} className="flex items-center gap-2 self-start rounded-lg border border-gold/15 bg-white/5 px-3 py-2 text-xs font-semibold text-parchment/60 hover:border-gold/30 hover:text-parchment">
                <Icon name="refresh" size={14} /> Reset example
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-gold/15 bg-gold/[0.035] p-4">
              <NumberField
                label="March Capacity"
                value={capacity}
                onChange={(value) => setCapacity(Math.max(1, Number(value) || 1))}
                min={1}
                step={1000}
                help="Use the capacity from the march you actually send to Bear."
              />
            </div>

            <div className="mt-4 space-y-4">
              {TROOPS.map((troop) => (
                <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg border border-gold/15 bg-gold/[0.06] text-gold/80"><Icon name={troop.icon} size={17} /></div>
                    <div>
                      <div className="font-display text-base font-bold text-parchment">{troop.label}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-parchment/35">{troop.short} offensive stats</div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <NumberField label="Attack" suffix="%" value={stats[troop.key].attack} onChange={(v) => updateTroop(troop.key, 'attack', v)} step={0.01} />
                    <NumberField label="Lethality" suffix="%" value={stats[troop.key].lethality} onChange={(v) => updateTroop(troop.key, 'lethality', v)} step={0.01} />
                    <NumberField label="Minimum" value={stats[troop.key].minimum} onChange={(v) => updateTroop(troop.key, 'minimum', v)} step={1000} help="Optional floor." />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-3 text-xs leading-relaxed text-sky-100/60">
              Enter Attack and Lethality from a battle/rally report using the same setup you use for Bear. The current engine models Bear as Infantry, applies troop-specific offensive weighting, and optimizes the square-root troop scaling rather than forcing a fixed ratio.
            </div>
          </section>

          <section className="space-y-4">
            <div className="panel panel-glow p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow">Recommended March</div>
                  <h2 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Split</h2>
                </div>
                <div className="rounded-xl border border-gold/15 bg-gold/[0.05] px-3 py-2 text-right">
                  <div className="text-[9px] uppercase tracking-wider text-gold/50">Capacity</div>
                  <div className="font-mono text-sm font-bold text-gold-bright">{result ? result.capacity.toLocaleString() : '—'}</div>
                </div>
              </div>

              {resultState.error ? (
                <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100/75">{resultState.error}</div>
              ) : result ? (
                <>
                  <div className="mt-5 space-y-3">
                    {result.troops.map((troop) => <TroopResult key={troop.type} troop={troop} />)}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3">
                      <div className="text-[9px] uppercase tracking-wider text-parchment/35">Model gain</div>
                      <div className="mt-1 font-mono text-lg font-bold text-gold-bright">{result.gainVsBalanced >= 0 ? '+' : ''}{result.gainVsBalanced.toFixed(2)}%</div>
                      <div className="mt-1 text-[10px] text-parchment/35">vs. an even split under the same model</div>
                    </div>
                    <div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3">
                      <div className="text-[9px] uppercase tracking-wider text-parchment/35">Confidence</div>
                      <div className="mt-1 text-sm font-bold text-parchment">Community-tested</div>
                      <div className="mt-1 text-[10px] text-parchment/35">not an official Kingshot formula</div>
                    </div>
                  </div>

                  <button type="button" onClick={copyFormation} className="btn-primary btn-royal mt-4 w-full justify-center">
                    <Icon name={copied ? 'shieldCheck' : 'scroll'} size={15} /> {copied ? 'Copied formation' : 'Copy alliance-chat formation'}
                  </button>

                  <div className="mt-3 rounded-xl border border-gold/10 bg-ink/50 p-3 font-mono text-[11px] leading-relaxed text-parchment/55">{chatMessage}</div>
                </>
              ) : null}
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2 text-gold/75"><Icon name="sparkles" size={16} /><span className="text-xs font-bold uppercase tracking-[0.14em]">How Battle Lab decides</span></div>
              <div className="mt-3 space-y-3 text-xs leading-relaxed text-parchment/50">
                <p><span className="font-semibold text-parchment/70">1.</span> Attack and Lethality are multiplied into an offensive factor for each troop type.</p>
                <p><span className="font-semibold text-parchment/70">2.</span> Bear-specific troop weighting is applied, including the Archer advantage against an Infantry-type target.</p>
                <p><span className="font-semibold text-parchment/70">3.</span> The march is allocated to maximize the square-root damage model while respecting your minimum troop floors.</p>
                <p><span className="font-semibold text-parchment/70">4.</span> Results are estimates. Nearby formations should still be tested in real rallies because hidden mechanics and buffs can move the optimum.</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
