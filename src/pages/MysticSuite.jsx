import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { optimizeMysticComposition } from '../lib/combat/battleLabEngine'

const TROOPS = [{ key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' }, { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' }, { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' }]
const TRIALS = ['Coliseum', 'Forest of Life', 'Crystal Cave', 'Knowledge Nexus', 'Molten Fort', 'Radiant Spire']
const HERO_TRIALS = ['Coliseum', 'Radiant Spire']
const STATS = [{ key: 'count', label: 'Troops', suffix: '', step: 100 }, { key: 'attack', label: 'Attack', suffix: '%', step: .1 }, { key: 'lethality', label: 'Lethality', suffix: '%', step: .1 }, { key: 'defense', label: 'Defense', suffix: '%', step: .1 }, { key: 'health', label: 'Health', suffix: '%', step: .1 }]
const EMPTY_LINE = { count: '', attack: '', lethality: '', defense: '', health: '' }
const EMPTY_ARMY = { infantry: { ...EMPTY_LINE }, cavalry: { ...EMPTY_LINE }, archers: { ...EMPTY_LINE } }
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f
const fmt = (v) => Number.isFinite(v) ? Math.round(v).toLocaleString() : '—'
const pct = (v) => `${Math.round(v * 100)}%`

function Field({ label, value, onChange, suffix, step }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[9px] font-bold uppercase tracking-[.1em] text-parchment/40"><span>{label}</span>{suffix && <span className="text-gold/50">{suffix}</span>}</span>
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gold/15 bg-ink/70 px-2.5 py-2 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
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

function ResultBar({ label, sub, value, max, active }) {
  return (
    <div className={`rounded-xl border p-3 ${active ? 'border-gold/40 bg-gold/[.05]' : 'border-gold/10 bg-white/[.02]'}`}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <div><span className="font-semibold text-parchment/85">{label}</span><span className="ml-2 text-[10px] text-parchment/40">{sub}</span></div>
        <span className={`font-mono text-sm font-bold ${value >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{value >= 0 ? '+' : ''}{fmt(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25">
        <div className={`h-full rounded-full ${value >= 0 ? 'bg-gradient-to-r from-emerald-400/50 to-emerald-300' : 'bg-gradient-to-r from-red-400/50 to-red-300'}`} style={{ width: `${max > 0 ? Math.max(2, Math.abs(value) / max * 100) : 0}%` }} />
      </div>
    </div>
  )
}

export default function MysticSuite() {
  const [yours, setYours] = useState(EMPTY_ARMY)
  const [opponent, setOpponent] = useState(EMPTY_ARMY)
  const [sparsity, setSparsity] = useState('0.05')
  const [minInfantry, setMinInfantry] = useState('0')
  const [maxInfantry, setMaxInfantry] = useState('100')
  const [minCavalry, setMinCavalry] = useState('0')
  const [maxCavalry, setMaxCavalry] = useState('100')
  const [trial, setTrial] = useState(TRIALS[0])
  const [result, setResult] = useState(null)

  const yourTotal = TROOPS.reduce((s, t) => s + Math.max(0, n(yours[t.key].count)), 0)
  const opponentTotal = TROOPS.reduce((s, t) => s + Math.max(0, n(opponent[t.key].count)), 0)
  const ready = yourTotal > 0 && opponentTotal > 0
  const hasHeroes = HERO_TRIALS.includes(trial)

  const run = () => {
    const yourArmy = Object.fromEntries(TROOPS.map((t) => [t.key, { count: n(yours[t.key].count), attack: n(yours[t.key].attack), lethality: n(yours[t.key].lethality), defense: n(yours[t.key].defense), health: n(yours[t.key].health) }]))
    const opponentArmy = Object.fromEntries(TROOPS.map((t) => [t.key, { count: n(opponent[t.key].count), attack: n(opponent[t.key].attack), lethality: n(opponent[t.key].lethality), defense: n(opponent[t.key].defense), health: n(opponent[t.key].health) }]))
    setResult(optimizeMysticComposition({
      yourArmy, opponentArmy, sparsity: n(sparsity, 0.05),
      minInfantryFraction: n(minInfantry, 0) / 100, maxInfantryFraction: n(maxInfantry, 100) / 100,
      minCavalryFraction: n(minCavalry, 0) / 100, maxCavalryFraction: n(maxCavalry, 100) / 100,
    }))
  }

  const top = useMemo(() => result?.candidates?.slice(0, 8) || [], [result])
  const maxMargin = useMemo(() => Math.max(1, ...top.map((c) => Math.abs(c.margin))), [top])

  const reset = () => {
    setYours(EMPTY_ARMY)
    setOpponent(EMPTY_ARMY)
    setSparsity('0.05')
    setMinInfantry('0')
    setMaxInfantry('100')
    setMinCavalry('0')
    setMaxCavalry('100')
    setTrial(TRIALS[0])
    setResult(null)
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
          <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/[.06] text-[10px] font-bold text-gold-bright">3</span><span>For Coliseum or Radiant Spire — trials with enemy heroes this model doesn't account for — try lowering the opponent's troop counts proportionally for a rough estimate.</span></li>
        </ol>
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
        <h3 className="mt-1 font-display text-xl font-bold text-parchment">Simulation Parameters</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Mystic Trial</span>
            <select value={trial} onChange={(e) => setTrial(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45">{TRIALS.map((t) => <option key={t}>{t}</option>)}</select>
            <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">Which trial this search is for — only changes whether the hero-caveat warning below applies.</span>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Sparsity</span>
            <input type="number" min={.005} max={.5} step={.005} value={sparsity} onChange={(e) => setSparsity(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
            <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">Grid step between compositions tested. 0.05 is a good start; use 0.025 for a finer (slower) search.</span>
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Min Infantry</span>
            <div className="relative"><input type="number" min={0} max={100} step={1} value={minInfantry} onChange={(e) => setMinInfantry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Max Infantry</span>
            <div className="relative"><input type="number" min={0} max={100} step={1} value={maxInfantry} onChange={(e) => setMaxInfantry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Min Cavalry</span>
            <div className="relative"><input type="number" min={0} max={100} step={1} value={minCavalry} onChange={(e) => setMinCavalry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">Max Cavalry</span>
            <div className="relative"><input type="number" min={0} max={100} step={1} value={maxCavalry} onChange={(e) => setMaxCavalry(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span></div>
          </label>
        </div>
        <span className="mt-2 block text-[10px] leading-relaxed text-parchment/35">Bounds narrow the search away from splits that rarely win — Infantry and Cavalry each get a Min/Max range; Archers fill whatever's left.</span>
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">
          This model has no randomness — the same composition always produces the same result, so there's no "number of battles" setting to average over, unlike a Monte Carlo tool.
          {hasHeroes && <> <b className="text-amber-200">{trial}</b> involves enemy heroes this model doesn't account for — try lowering the opponent's troop counts (keeping their ratio the same) for a rough estimate, since hero-boosted defenders are effectively fighting above their raw troop count.</>}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={run} disabled={!ready} className="btn-primary btn-royal px-8 disabled:opacity-40"><Icon name="sparkles" size={15} /> Run Optimizer</button>
          <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-xl border border-gold/20 bg-white/[.02] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-parchment/60 hover:border-gold/35 hover:text-parchment"><Icon name="refresh" size={14} /> Reset</button>
        </div>
      </section>

      {result && (
        <section className="panel panel-glow p-4 md:p-6">
          <div className="eyebrow">Result</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-parchment">Best Composition Found</h3>
          {result.best ? (
            <div className="mt-4 space-y-4">
              <div className={`rounded-2xl border p-5 text-center ${result.best.margin >= 0 ? 'border-emerald-300/25 bg-emerald-300/[.05] text-emerald-200' : 'border-red-400/25 bg-red-400/[.05] text-red-300'}`}>
                <div className="font-display text-2xl font-bold">{result.best.result.outcome === 'attacker' ? 'You Win' : result.best.result.outcome === 'defender' ? 'Still Loses' : 'Even Fight'}</div>
                <div className="mt-1 text-xs text-parchment/50">Best split: {pct(result.best.composition.infantry)} Infantry / {pct(result.best.composition.cavalry)} Cavalry / {pct(result.best.composition.archers)} Archers · margin {result.best.margin >= 0 ? '+' : ''}{fmt(result.best.margin)} troops</div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Infantry</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.totalYourTroops * result.best.composition.infantry)}</div></div>
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Cavalry</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.totalYourTroops * result.best.composition.cavalry)}</div></div>
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Archers</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{fmt(result.totalYourTroops * result.best.composition.archers)}</div></div>
                <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Compositions Tested</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{result.candidates.length}</div></div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-parchment/40">Top Compositions By Margin</div>
                <div className="space-y-2">
                  {top.map((c, i) => (
                    <ResultBar key={i} active={i === 0} label={`${Math.round(c.composition.infantry * 100)}/${Math.round(c.composition.cavalry * 100)}/${Math.round(c.composition.archers * 100)}`} sub={c.result.outcome === 'attacker' ? 'wins' : c.result.outcome === 'defender' ? 'loses' : 'draw'} value={c.margin} max={maxMargin} />
                  ))}
                </div>
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
