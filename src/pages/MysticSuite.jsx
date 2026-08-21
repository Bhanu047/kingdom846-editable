import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { MYSTIC_TRIALS, SOURCE_LABELS, calculateMysticEligibility } from '../lib/combat/battleLabEngine'

const TRIAL_ICONS = { coliseum: 'swords', forest: 'paw', crystal: 'sparkles', nexus: 'book', molten: 'fire', radiant: 'star' }
const SOURCE_ICONS = { heroes: 'crown', heroGear: 'shieldCheck', widgets: 'zap', pets: 'paw', petSkills: 'sparkles', charms: 'star', academy: 'book', warAcademy: 'flag', governorGear: 'shield' }
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f
const EMPTY_BONUSES = Object.fromEntries(Object.keys(SOURCE_LABELS).map((k) => [k, '']))

function Field({ label, value, onChange, icon }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45"><Icon name={icon} size={11} className="text-gold/50" />{label}</span>
      <div className="relative">
        <input type="number" value={value} min={0} step={.1} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 pr-8 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold/45">%</span>
      </div>
    </label>
  )
}

function TrialCard({ id, trial, active, eligibleTotal, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-gold/50 bg-gold/[.06] shadow-[0_0_0_1px_rgba(212,175,55,.25)]' : 'border-gold/10 bg-white/[.02] hover:border-gold/25'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-9 w-9 place-items-center rounded-xl border ${active ? 'border-gold/40 bg-gold/10 text-gold-bright' : 'border-gold/15 bg-black/20 text-parchment/50'}`}><Icon name={TRIAL_ICONS[id]} size={16} /></div>
          <div>
            <div className="font-display text-sm font-bold text-parchment">{trial.label}</div>
            <div className="mt-0.5 text-[10px] text-parchment/40">{trial.sources.length} of 9 sources count</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-base font-bold text-gold-bright">{eligibleTotal.toFixed(1)}%</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/35">eligible</div>
        </div>
      </div>
    </button>
  )
}

export default function MysticSuite() {
  const [trialId, setTrialId] = useState('coliseum')
  const [bonuses, setBonuses] = useState(EMPTY_BONUSES)
  const setBonus = (key, v) => setBonuses((b) => ({ ...b, [key]: v }))
  const normalized = useMemo(() => Object.fromEntries(Object.keys(SOURCE_LABELS).map((k) => [k, n(bonuses[k])])), [bonuses])

  const results = useMemo(() => Object.fromEntries(Object.keys(MYSTIC_TRIALS).map((id) => [id, calculateMysticEligibility(id, normalized)])), [normalized])
  const active = results[trialId]
  const grandTotal = Object.values(normalized).reduce((s, v) => s + v, 0)
  const ranked = Object.entries(results).map(([id, r]) => ({ id, label: r.trial.label, total: r.eligibleTotal })).sort((a, b) => b.total - a.total)
  const bestId = ranked[0]?.id

  return (
    <div className="space-y-5">
      <section className="panel p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="eyebrow">Mystic Trials</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-parchment">Stat Source Filter</h2>
            <p className="mt-1 text-xs text-parchment/50">Enter your current bonus from each stat source once, then check which trial actually uses it.</p>
          </div>
          {grandTotal > 0 && <div className="rounded-2xl border border-gold/20 bg-gold/[.045] px-5 py-3 text-center"><div className="text-[9px] font-bold uppercase tracking-wider text-parchment/40">Best Trial For Your Stats</div><div className="mt-0.5 font-display text-lg font-bold text-gold-bright">{results[bestId]?.trial.label}</div></div>}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Your Stat Sources</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Current Bonuses</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <Field key={key} label={label} icon={SOURCE_ICONS[key]} value={bonuses[key]} onChange={(v) => setBonus(key, v)} />
            ))}
          </div>
        </section>

        <section className="panel panel-glow p-5 md:p-6">
          <div className="eyebrow">Select a Trial</div>
          <h3 className="mt-1 font-display text-xl font-bold text-parchment">Which Sources Count</h3>
          <div className="mt-4 space-y-2.5">
            {Object.entries(MYSTIC_TRIALS).map(([id, trial]) => (
              <TrialCard key={id} id={id} trial={trial} active={trialId === id} eligibleTotal={results[id].eligibleTotal} onSelect={setTrialId} />
            ))}
          </div>
        </section>
      </div>

      {active && (
        <section className="panel panel-glow p-4 md:p-6">
          <div className="eyebrow">{active.trial.label}</div>
          <h3 className="mt-1 font-display text-2xl font-bold text-parchment">Eligibility Breakdown</h3>
          <p className="mt-1 text-xs text-parchment/50">{active.trial.note}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-gold/20 bg-gold/[.045] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Eligible Total</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">{active.eligibleTotal.toFixed(1)}%</div></div>
            <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Not Counted</div><div className="mt-1 font-mono text-xl font-bold text-parchment/60">{active.ignoredTotal.toFixed(1)}%</div></div>
            <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Sources In</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{active.eligible.length} / 9</div></div>
            <div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Grand Total (All)</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{grandTotal.toFixed(1)}%</div></div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.03] p-4">
              <div className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-200/60">Counts Toward {active.trial.label}</div>
              <div className="mt-3 space-y-2">
                {active.eligible.length === 0 && <div className="text-xs text-parchment/35">No sources apply to this trial.</div>}
                {active.eligible.map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-xl border border-emerald-300/10 bg-black/15 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-semibold text-parchment/80"><Icon name={SOURCE_ICONS[s.key]} size={13} className="text-emerald-200/70" />{s.label}</span>
                    <span className="font-mono text-sm font-bold text-emerald-200">{s.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gold/10 bg-white/[.02] p-4">
              <div className="text-[9px] font-bold uppercase tracking-[.15em] text-parchment/40">Wasted on {active.trial.label}</div>
              <div className="mt-3 space-y-2">
                {active.ignored.length === 0 && <div className="text-xs text-parchment/35">Every source you entered applies here.</div>}
                {active.ignored.map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-xl border border-gold/5 bg-black/15 px-3 py-2 opacity-60">
                    <span className="flex items-center gap-2 text-xs font-semibold text-parchment/60"><Icon name={SOURCE_ICONS[s.key]} size={13} className="text-parchment/35" />{s.label}</span>
                    <span className="font-mono text-sm font-bold text-parchment/50">{s.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="panel p-4 md:p-6">
        <div className="eyebrow">All Trials Ranked</div>
        <h3 className="mt-1 font-display text-xl font-bold text-parchment">Eligible Total by Trial</h3>
        <div className="mt-4 space-y-2.5">
          {ranked.map((r, i) => {
            const max = ranked[0]?.total || 1
            return (
              <div key={r.id} className={`rounded-xl border p-3 ${r.id === trialId ? 'border-gold/35 bg-gold/[.04]' : 'border-gold/10 bg-white/[.02]'}`}>
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-parchment/75">{i + 1}. {r.label}</span><span className="font-mono font-bold text-gold-bright">{r.total.toFixed(1)}%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-gradient-to-r from-gold/50 to-gold-bright" style={{ width: `${max > 0 ? Math.max(2, r.total / max * 100) : 0}%` }} /></div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
