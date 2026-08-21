import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { buildBearChatMessage, optimizeBearFormation } from '../lib/combat/bearOptimizer'
import {
  MYSTIC_TRIALS,
  SOURCE_LABELS,
  TROOP_LABELS,
  armyFromProfile,
  calculateHeroSynergy,
  calculateMysticEligibility,
  optimizeFormation,
  simulateT10Battle,
} from '../lib/combat/battleLabEngine'
import {
  createBlankProfile,
  deleteProfile,
  exportProfilesJson,
  getActiveProfileId,
  importProfilesJson,
  loadProfiles,
  saveProfile,
  setActiveProfileId,
} from '../lib/combat/profileStore'

const TYPES = ['infantry', 'cavalry', 'archers']
const TROOPS = [
  { key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' },
  { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' },
  { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' },
]

const MODULES = [
  { id: 'bear', label: 'Bear Optimizer', icon: 'target', status: 'Live', tone: 'verified' },
  { id: 'mystic', label: 'Mystic Trials', icon: 'sparkles', status: 'Live', tone: 'verified' },
  { id: 'battle', label: 'Battle Simulator', icon: 'swords', status: 'Live', tone: 'verified' },
  { id: 'heroes', label: 'Hero Synergy', icon: 'crown', status: 'Live', tone: 'community' },
  { id: 'formation', label: 'Formation Optimizer', icon: 'layers', status: 'Live', tone: 'verified' },
]

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function NumberField({ label, value, onChange, min = 0, step = 1, suffix, help, compact = false }) {
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
      {help && <span className="mt-1 block text-[10px] leading-relaxed text-parchment/35">{help}</span>}
    </label>
  )
}

function StatusBadge({ tone = 'community', children }) {
  const cls = tone === 'verified'
    ? 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100/75'
    : tone === 'experimental'
      ? 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100/75'
      : 'border-sky-300/20 bg-sky-300/[0.06] text-sky-100/75'
  return <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${cls}`}>{children}</span>
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

function ProfilePanel({ profile, profiles, onProfileChange, onSave, onNew, onSelect, onDelete, onExport, onImport, status }) {
  const importRef = useRef(null)

  return (
    <section className="panel p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="eyebrow">Player Profile</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-parchment">{profile.name || 'Guest Player'}</h2>
            <StatusBadge tone="verified">No account required</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-parchment/45">Profiles are stored on this device. Export a JSON backup to move them to another device.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onNew} className="rounded-lg border border-gold/15 bg-white/5 px-3 py-2 text-xs font-semibold text-parchment/65 hover:border-gold/30 hover:text-parchment">New</button>
          <button type="button" onClick={onSave} className="btn-primary btn-royal !px-3 !py-2 !text-xs"><Icon name="shieldCheck" size={13} /> Save profile</button>
          <button type="button" onClick={onExport} className="rounded-lg border border-gold/15 bg-white/5 px-3 py-2 text-xs font-semibold text-parchment/65 hover:border-gold/30 hover:text-parchment"><Icon name="download" size={13} /> Export</button>
          <button type="button" onClick={() => importRef.current?.click()} className="rounded-lg border border-gold/15 bg-white/5 px-3 py-2 text-xs font-semibold text-parchment/65 hover:border-gold/30 hover:text-parchment"><Icon name="upload" size={13} /> Import</button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_.55fr_.75fr]">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-parchment/50">Player name</span>
          <input value={profile.name} onChange={(e) => onProfileChange({ ...profile, name: e.target.value })} maxLength={40} className="w-full rounded-xl border border-gold/15 bg-ink/60 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-parchment/50">Kingdom</span>
          <input value={profile.kingdom} onChange={(e) => onProfileChange({ ...profile, kingdom: e.target.value })} maxLength={12} className="w-full rounded-xl border border-gold/15 bg-ink/60 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" />
        </label>
        <NumberField label="March capacity" value={profile.capacity} step={1000} min={1} onChange={(v) => onProfileChange({ ...profile, capacity: Math.max(1, toNumber(v, 1)) })} />
      </div>

      {profiles.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gold/10 pt-4">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.14em] text-parchment/35">Saved</span>
          {profiles.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${item.id === profile.id ? 'border-gold/40 bg-gold/10 text-gold-bright' : 'border-gold/10 bg-white/[0.025] text-parchment/55 hover:border-gold/25'}`}>{item.name} · K{item.kingdom}</button>
          ))}
          {profiles.some((item) => item.id === profile.id) && <button type="button" onClick={() => onDelete(profile.id)} className="ml-auto text-[10px] font-semibold text-red-200/55 hover:text-red-200">Delete current</button>}
        </div>
      )}
      {status && <div className="mt-3 text-[10px] font-semibold text-gold/65">{status}</div>}
    </section>
  )
}

function ProfileCombatStats({ profile, onChange }) {
  function update(type, field, value) {
    onChange({
      ...profile,
      stats: {
        ...profile.stats,
        [type]: { ...profile.stats[type], [field]: Math.max(0, toNumber(value)) },
      },
    })
  }

  return (
    <section className="panel p-5 md:p-6">
      <div className="eyebrow">Reusable stats</div>
      <h2 className="mt-1 font-display text-xl font-bold text-parchment">Combat Report Stats</h2>
      <p className="mt-1 text-xs text-parchment/45">Enter the percentages from the report/setup you want Battle Lab to model.</p>
      <div className="mt-4 space-y-3">
        {TROOPS.map((troop) => (
          <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={troop.icon} size={15} className="text-gold/70" /> {troop.label}</div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <NumberField compact label="Attack" suffix="%" step={0.01} value={profile.stats[troop.key].attack} onChange={(v) => update(troop.key, 'attack', v)} />
              <NumberField compact label="Lethality" suffix="%" step={0.01} value={profile.stats[troop.key].lethality} onChange={(v) => update(troop.key, 'lethality', v)} />
              <NumberField compact label="Defense" suffix="%" step={0.01} value={profile.stats[troop.key].defense} onChange={(v) => update(troop.key, 'defense', v)} />
              <NumberField compact label="Health" suffix="%" step={0.01} value={profile.stats[troop.key].health} onChange={(v) => update(troop.key, 'health', v)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function BearModule({ profile }) {
  const [minimums, setMinimums] = useState({ infantry: 0, cavalry: 0, archers: 0 })
  const [copied, setCopied] = useState(false)
  const state = useMemo(() => {
    try {
      return { result: optimizeBearFormation({ capacity: profile.capacity, stats: profile.stats, minimums }), error: '' }
    } catch (error) {
      return { result: null, error: error.message || 'Unable to calculate formation.' }
    }
  }, [profile.capacity, profile.stats, minimums])

  const message = state.result ? buildBearChatMessage(state.result) : ''
  async function copy() {
    if (!message) return
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <section className="panel p-5 md:p-6">
        <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Bear Hunt</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Optimizer Settings</h2></div><StatusBadge tone="verified">Community model</StatusBadge></div>
        <p className="mt-2 text-xs leading-relaxed text-parchment/45">Uses the profile's Attack + Lethality and optimizes the square-root Bear model. Set a floor only when you intentionally need minimum troops of a type.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {TROOPS.map((troop) => <NumberField key={troop.key} label={`${troop.short} minimum`} value={minimums[troop.key]} step={1000} onChange={(v) => setMinimums((current) => ({ ...current, [troop.key]: Math.max(0, Math.floor(toNumber(v))) }))} />)}
        </div>
        <div className="mt-5 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-4 text-xs leading-relaxed text-sky-100/60">Use stats from the same hero/gear setup you actually send. Battle Lab does not claim this is an official Kingshot formula.</div>
      </section>

      <section className="panel panel-glow p-5 md:p-6">
        <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Recommended March</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Split</h2></div><div className="font-mono text-sm font-bold text-gold-bright">{Number(profile.capacity).toLocaleString()}</div></div>
        {state.error && <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm text-red-100/70">{state.error}</div>}
        {state.result && <>
          <div className="mt-4"><FormationCards troops={state.result.troops} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Modeled gain</div><div className="mt-1 font-mono text-lg font-bold text-gold-bright">{state.result.gainVsBalanced >= 0 ? '+' : ''}{state.result.gainVsBalanced.toFixed(2)}%</div><div className="text-[10px] text-parchment/35">vs even split</div></div>
            <div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Profile</div><div className="mt-1 text-sm font-bold text-parchment">{profile.name}</div><div className="text-[10px] text-parchment/35">Kingdom {profile.kingdom}</div></div>
          </div>
          <button type="button" onClick={copy} className="btn-primary btn-royal mt-4 w-full justify-center"><Icon name={copied ? 'shieldCheck' : 'scroll'} size={14} /> {copied ? 'Copied' : 'Copy formation'}</button>
          <div className="mt-3 rounded-xl border border-gold/10 bg-ink/50 p-3 font-mono text-[11px] leading-relaxed text-parchment/55">{message}</div>
        </>}
      </section>
    </div>
  )
}

function MysticModule({ profile, onProfileChange }) {
  const [trialId, setTrialId] = useState('radiant')
  const result = useMemo(() => calculateMysticEligibility(trialId, profile.sources), [trialId, profile.sources])
  function updateSource(key, value) {
    onProfileChange({ ...profile, sources: { ...profile.sources, [key]: Math.max(0, toNumber(value)) } })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="panel p-5 md:p-6">
        <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Mystic Trials</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Stat Source Filter</h2></div><StatusBadge tone="verified">Source rules</StatusBadge></div>
        <label className="mt-5 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-parchment/45">Trial</span><select value={trialId} onChange={(e) => setTrialId(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/40">{Object.entries(MYSTIC_TRIALS).map(([id, trial]) => <option key={id} value={id}>{trial.label}</option>)}</select></label>
        <p className="mt-3 rounded-xl border border-gold/10 bg-white/[0.025] p-3 text-xs leading-relaxed text-parchment/50">{result.trial.note}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.keys(SOURCE_LABELS).map((key) => <NumberField compact key={key} label={SOURCE_LABELS[key]} suffix="%" step={0.01} value={profile.sources[key]} onChange={(v) => updateSource(key, v)} />)}
        </div>
      </section>

      <section className="panel panel-glow p-5 md:p-6">
        <div className="eyebrow">Eligible for {result.trial.label}</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Included Progression</h2>
        <div className="mt-4 rounded-2xl border border-gold/15 bg-gold/[0.04] p-4"><div className="text-[9px] uppercase tracking-wider text-gold/50">Entered eligible source total</div><div className="mt-1 font-mono text-3xl font-bold text-gold-bright">{result.eligibleTotal.toFixed(2)}%</div><div className="mt-1 text-[10px] text-parchment/35">A source filter / planning value, not a direct damage prediction.</div></div>
        <div className="mt-4 space-y-2">{result.eligible.map((item) => <div key={item.key} className="flex items-center justify-between rounded-xl border border-emerald-300/10 bg-emerald-300/[0.025] px-3 py-2.5"><span className="text-xs font-semibold text-parchment/65">{item.label}</span><span className="font-mono text-xs font-bold text-emerald-100/70">{item.value.toFixed(2)}%</span></div>)}</div>
        {result.ignored.some((item) => item.value > 0) && <div className="mt-4"><div className="text-[9px] font-bold uppercase tracking-[0.13em] text-parchment/35">Ignored by this trial</div><div className="mt-2 flex flex-wrap gap-2">{result.ignored.filter((item) => item.value > 0).map((item) => <span key={item.key} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-parchment/40">{item.label} {item.value.toFixed(1)}%</span>)}</div></div>}
      </section>
    </div>
  )
}

function BattleSimulatorModule({ profile }) {
  const defaultCounts = useMemo(() => {
    const each = Math.floor(profile.capacity / 3)
    return { infantry: each, cavalry: each, archers: profile.capacity - each * 2 }
  }, [profile.capacity])
  const [attackerCounts, setAttackerCounts] = useState(defaultCounts)
  const [defenderCounts, setDefenderCounts] = useState(defaultCounts)
  const [defenderStats, setDefenderStats] = useState(() => JSON.parse(JSON.stringify(profile.stats)))
  const [maxRounds, setMaxRounds] = useState(50)

  useEffect(() => { setAttackerCounts(defaultCounts) }, [defaultCounts])

  const battle = useMemo(() => simulateT10Battle({
    attacker: armyFromProfile(profile, attackerCounts),
    defender: armyFromProfile({ stats: defenderStats }, defenderCounts),
    maxRounds,
  }), [profile, attackerCounts, defenderCounts, defenderStats, maxRounds])

  function updateDefender(type, field, value) {
    setDefenderStats((current) => ({ ...current, [type]: { ...current[type], [field]: Math.max(0, toNumber(value)) } }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><div><div className="text-xs font-bold text-amber-100/80">Experimental T10 Expedition simulator</div><div className="mt-1 text-[11px] text-amber-100/50">Front-line targeting + simultaneous casualties are modeled. Cavalry bypass, Archer volley, and hero proc edge cases are not yet included.</div></div><StatusBadge tone="experimental">Validate with reports</StatusBadge></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-5"><div className="eyebrow">Attacker · {profile.name}</div><h2 className="mt-1 font-display text-xl font-bold text-parchment">Your Army</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{TROOPS.map((troop) => <NumberField key={troop.key} label={`${troop.short} troops`} value={attackerCounts[troop.key]} step={1000} onChange={(v) => setAttackerCounts((current) => ({ ...current, [troop.key]: Math.max(0, Math.floor(toNumber(v))) }))} />)}</div><div className="mt-3 text-[10px] text-parchment/35">Uses combat stats saved in your Player Profile.</div></section>
        <section className="panel p-5"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Defender</div><h2 className="mt-1 font-display text-xl font-bold text-parchment">Enemy Army</h2></div><button type="button" onClick={() => { setDefenderStats(JSON.parse(JSON.stringify(profile.stats))); setDefenderCounts({ ...attackerCounts }) }} className="rounded-lg border border-gold/15 px-3 py-2 text-[10px] font-semibold text-parchment/55 hover:text-parchment">Mirror mine</button></div><div className="mt-4 space-y-3">{TROOPS.map((troop) => <div key={troop.key} className="rounded-xl border border-gold/10 bg-white/[0.02] p-3"><div className="mb-2 text-xs font-bold text-parchment/65">{troop.label}</div><div className="grid grid-cols-2 gap-2 lg:grid-cols-5"><NumberField compact label="Troops" value={defenderCounts[troop.key]} step={1000} onChange={(v) => setDefenderCounts((current) => ({ ...current, [troop.key]: Math.max(0, Math.floor(toNumber(v))) }))} />{['attack', 'lethality', 'defense', 'health'].map((field) => <NumberField compact key={field} label={field === 'lethality' ? 'LET' : field.slice(0, 3).toUpperCase()} suffix="%" step={0.01} value={defenderStats[troop.key][field]} onChange={(v) => updateDefender(troop.key, field, v)} />)}</div></div>)}</div></section>
      </div>
      <section className="panel panel-glow p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow">Simulation Result</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">{battle.outcome === 'attacker' ? 'Attacker advantage' : battle.outcome === 'defender' ? 'Defender advantage' : 'Even result'}</h2></div><div className="w-36"><NumberField compact label="Max rounds" value={maxRounds} min={1} step={1} onChange={(v) => setMaxRounds(Math.max(1, Math.min(200, Math.floor(toNumber(v, 50)))))} /></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Rounds</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">{battle.rounds.length}</div></div><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Your losses</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{battle.attackerLosses.toLocaleString()}</div></div><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Enemy losses</div><div className="mt-1 font-mono text-xl font-bold text-parchment">{battle.defenderLosses.toLocaleString()}</div></div><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Remaining edge</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">{Math.abs(battle.remainingA - battle.remainingD).toLocaleString()}</div></div></div>
        {battle.rounds.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="text-[9px] uppercase tracking-wider text-parchment/35"><tr><th className="py-2">Round</th><th>Your remaining</th><th>Enemy remaining</th><th>Your losses</th><th>Enemy losses</th></tr></thead><tbody>{battle.rounds.slice(-10).map((round) => <tr key={round.round} className="border-t border-gold/8 text-parchment/55"><td className="py-2 font-mono text-gold/70">{round.round}</td><td>{round.attackerRemaining.toLocaleString()}</td><td>{round.defenderRemaining.toLocaleString()}</td><td>{Object.values(round.attackerLosses).reduce((a, b) => a + b, 0).toLocaleString()}</td><td>{Object.values(round.defenderLosses).reduce((a, b) => a + b, 0).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  )
}

function HeroSynergyModule() {
  const [effects, setEffects] = useState([
    { id: '1', name: 'Joiner 1', group: 'A', percent: 25 },
    { id: '2', name: 'Joiner 2', group: 'A', percent: 25 },
    { id: '3', name: 'Joiner 3', group: 'B', percent: 25 },
    { id: '4', name: 'Joiner 4', group: 'B', percent: 25 },
  ])
  const result = useMemo(() => calculateHeroSynergy(effects), [effects])
  function update(index, field, value) { setEffects((current) => current.map((item, i) => i === index ? { ...item, [field]: field === 'percent' ? Math.max(0, toNumber(value)) : value } : item)) }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
      <section className="panel p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Rally Joiners</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Hero Synergy</h2></div><StatusBadge tone="community">Stacking model</StatusBadge></div><p className="mt-2 text-xs leading-relaxed text-parchment/45">Effects in the same internal family add together first; different families multiply. Use A/B/C as placeholders when you know two skills belong to different families.</p><div className="mt-5 space-y-3">{effects.map((effect, index) => <div key={effect.id} className="grid gap-2 rounded-xl border border-gold/10 bg-white/[0.025] p-3 sm:grid-cols-[1fr_.45fr_.55fr]"><label><span className="mb-1 block text-[9px] uppercase text-parchment/35">Name</span><input value={effect.name} onChange={(e) => update(index, 'name', e.target.value)} className="w-full rounded-lg border border-gold/10 bg-ink/60 px-2.5 py-2 text-xs text-parchment outline-none focus:border-gold/35" /></label><label><span className="mb-1 block text-[9px] uppercase text-parchment/35">Group</span><input value={effect.group} maxLength={4} onChange={(e) => update(index, 'group', e.target.value.toUpperCase())} className="w-full rounded-lg border border-gold/10 bg-ink/60 px-2.5 py-2 text-xs font-bold text-gold-bright outline-none focus:border-gold/35" /></label><NumberField compact label="Bonus" suffix="%" step={0.01} value={effect.percent} onChange={(v) => update(index, 'percent', v)} /></div>)}</div></section>
      <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Combined result</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Skill Multiplier</h2><div className="mt-5 rounded-2xl border border-gold/20 bg-gold/[0.05] p-5 text-center"><div className="text-[9px] uppercase tracking-[0.15em] text-gold/50">Grouped multiplier</div><div className="mt-2 font-mono text-4xl font-bold text-gold-bright">{result.multiplier.toFixed(3)}×</div></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Flat-add baseline</div><div className="mt-1 font-mono text-lg font-bold text-parchment">{result.flatMultiplier.toFixed(3)}×</div></div><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Synergy edge</div><div className="mt-1 font-mono text-lg font-bold text-gold-bright">{result.improvementVsFlat >= 0 ? '+' : ''}{result.improvementVsFlat.toFixed(2)}%</div></div></div><div className="mt-4 space-y-2">{Object.entries(result.groups).map(([group, percent]) => <div key={group} className="flex items-center justify-between rounded-lg border border-gold/10 px-3 py-2 text-xs"><span className="font-semibold text-parchment/55">Group {group}</span><span className="font-mono font-bold text-gold/75">+{percent.toFixed(2)}%</span></div>)}</div></section>
    </div>
  )
}

function FormationModule({ profile }) {
  const [targetType, setTargetType] = useState('infantry')
  const [minimums, setMinimums] = useState({ infantry: 0, cavalry: 0, archers: 0 })
  const state = useMemo(() => {
    try { return { result: optimizeFormation({ capacity: profile.capacity, stats: profile.stats, targetType, minimums }), error: '' } }
    catch (error) { return { result: null, error: error.message || 'Unable to optimize formation.' } }
  }, [profile.capacity, profile.stats, targetType, minimums])
  return (
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <section className="panel p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Theorycrafting</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation Optimizer</h2></div><StatusBadge tone="experimental">Experimental</StatusBadge></div><p className="mt-2 text-xs leading-relaxed text-parchment/45">Generalizes the offensive square-root model against a chosen troop target and applies the standard 10% counter relationship. It is a theorycrafting aid, not a full PvP predictor.</p><label className="mt-5 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-parchment/45">Primary target</span><select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/40">{TYPES.map((type) => <option key={type} value={type}>{TROOP_LABELS[type].label}</option>)}</select></label><div className="mt-4 grid gap-2 sm:grid-cols-3">{TROOPS.map((troop) => <NumberField compact key={troop.key} label={`${troop.short} minimum`} value={minimums[troop.key]} step={1000} onChange={(v) => setMinimums((current) => ({ ...current, [troop.key]: Math.max(0, Math.floor(toNumber(v))) }))} />)}</div></section>
      <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Recommended split vs {TROOP_LABELS[targetType].label}</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Theory Formation</h2>{state.error && <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-xs text-red-100/70">{state.error}</div>}{state.result && <div className="mt-4"><FormationCards troops={state.result.troops} /><div className="mt-4 flex flex-wrap gap-2">{state.result.troops.filter((troop) => troop.counter).map((troop) => <span key={troop.type} className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.04] px-2.5 py-1 text-[10px] font-semibold text-emerald-100/65">{troop.label} receives counter bonus</span>)}</div></div>}</section>
    </div>
  )
}

export default function BattleLab() {
  const [activeModule, setActiveModule] = useState('bear')
  const [profiles, setProfiles] = useState([])
  const [profile, setProfile] = useState(() => createBlankProfile('Guest Player'))
  const [profileStatus, setProfileStatus] = useState('')

  useEffect(() => {
    const saved = loadProfiles()
    setProfiles(saved)
    const activeId = getActiveProfileId()
    const active = saved.find((item) => item.id === activeId) || saved[0]
    if (active) setProfile(active)
  }, [])

  function showProfileStatus(message) {
    setProfileStatus(message)
    setTimeout(() => setProfileStatus(''), 2200)
  }

  function handleSaveProfile() {
    const saved = saveProfile(profile)
    setProfile(saved)
    setProfiles(loadProfiles())
    showProfileStatus('Profile saved on this device.')
  }

  function handleNewProfile() {
    setActiveProfileId('')
    setProfile(createBlankProfile('New Player'))
    showProfileStatus('New unsaved profile created.')
  }

  function handleSelectProfile(id) {
    const selected = profiles.find((item) => item.id === id)
    if (!selected) return
    setActiveProfileId(id)
    setProfile(JSON.parse(JSON.stringify(selected)))
  }

  function handleDeleteProfile(id) {
    const remaining = deleteProfile(id)
    setProfiles(remaining)
    const next = remaining[0] || createBlankProfile('Guest Player')
    if (remaining[0]) setActiveProfileId(remaining[0].id)
    setProfile(next)
    showProfileStatus('Profile removed from this device.')
  }

  function handleExportProfiles() {
    const blob = new Blob([exportProfilesJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'kingdom846-battle-lab-profiles.json'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    showProfileStatus('Profile backup exported.')
  }

  async function handleImportProfiles(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const merged = importProfilesJson(await file.text())
      setProfiles(merged)
      if (merged[0]) { setProfile(merged[0]); setActiveProfileId(merged[0].id) }
      showProfileStatus('Profiles imported successfully.')
    } catch (error) {
      showProfileStatus(error.message || 'Unable to import profiles.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel panel-glow overflow-hidden p-0">
        <div className="relative overflow-hidden px-5 py-6 md:px-7 md:py-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><div className="eyebrow">Kingdom 846 · Tactical Intelligence</div><div className="mt-2 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold-bright"><Icon name="crosshair" size={22} /></div><div><h1 className="font-display text-3xl font-bold tracking-tight text-parchment md:text-4xl">Battle Lab</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-parchment/55">One profile. Five tactical tools. Built natively for the Kingdom 846 portal.</p></div></div></div>
            <div className="flex flex-wrap gap-2"><StatusBadge tone="verified">Guest access</StatusBadge><StatusBadge tone="community">Clean-room engine</StatusBadge></div>
          </div>
        </div>
      </section>

      <ProfilePanel profile={profile} profiles={profiles} onProfileChange={setProfile} onSave={handleSaveProfile} onNew={handleNewProfile} onSelect={handleSelectProfile} onDelete={handleDeleteProfile} onExport={handleExportProfiles} onImport={handleImportProfiles} status={profileStatus} />

      <section className="grid gap-2 md:grid-cols-5">
        {MODULES.map((module) => {
          const active = activeModule === module.id
          return <button key={module.id} type="button" onClick={() => setActiveModule(module.id)} className={`rounded-2xl border p-3 text-left transition hover:border-gold/30 ${active ? 'border-gold/45 bg-gold/10 shadow-[0_0_30px_rgba(212,175,55,.08)]' : 'border-gold/10 bg-white/[0.025]'}`}><div className="flex items-center justify-between gap-2"><Icon name={module.icon} size={17} className={active ? 'text-gold-bright' : 'text-gold/50'} /><StatusBadge tone={module.tone}>{module.status}</StatusBadge></div><div className="mt-2 text-xs font-semibold text-parchment/75">{module.label}</div></button>
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <ProfileCombatStats profile={profile} onChange={setProfile} />
        <div>
          {activeModule === 'bear' && <BearModule profile={profile} />}
          {activeModule === 'mystic' && <MysticModule profile={profile} onProfileChange={setProfile} />}
          {activeModule === 'battle' && <BattleSimulatorModule profile={profile} />}
          {activeModule === 'heroes' && <HeroSynergyModule />}
          {activeModule === 'formation' && <FormationModule profile={profile} />}
        </div>
      </div>

      <section className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-parchment/40">
        <span className="font-semibold text-parchment/60">Battle Lab model policy:</span> verified source-filter rules are separated from community-tested and experimental combat models. Experimental outputs should be compared against real Kingshot battle reports before being treated as predictive.
      </section>
    </div>
  )
}
