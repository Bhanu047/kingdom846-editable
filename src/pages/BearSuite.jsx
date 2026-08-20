import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { buildBearChatMessage, computeBearDamageScore, optimizeBearFormation } from '../lib/combat/bearOptimizer'

const TROOPS = [
  { key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' },
  { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' },
  { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' },
]

const HEROES = {
  infantry: ['None', 'Alcar', 'Amadeus', 'Charles', 'Eric', 'Forrest', 'Helga', 'Howard', 'Long Fei', 'Seth', 'Triton', 'Zoe'],
  cavalry: ['None', 'Ava', 'Chenko', 'Edwin', 'Fahd', 'Gordon', 'Hilde', 'Jabel', 'Margot', 'Petra', 'Sophia', 'Thrud'],
  archers: ['None', 'Amane', 'Diana', 'Jaeger', 'Marlin', 'Olive', 'Quinn', 'Rosa', 'Saul', 'Vivian', 'Wee & Woo', 'Yang', 'Yeonwoo'],
}
const ALL_HEROES = ['None', ...Array.from(new Set(Object.values(HEROES).flat().filter((h) => h !== 'None'))).sort()]
const EMPTY_STATS = { infantry: { attack: '', lethality: '' }, cavalry: { attack: '', lethality: '' }, archers: { attack: '', lethality: '' } }
const EMPTY_HEROES = { infantry: 'None', cavalry: 'None', archers: 'None' }
const EMPTY_COUNTS = { infantry: '', cavalry: '', archers: '' }

function n(value, fallback = 0) { const x = Number(value); return Number.isFinite(x) ? x : fallback }
function validStats(stats) { return TROOPS.every(({ key }) => n(stats[key].attack) > 0 && n(stats[key].lethality) > 0) }
function normalized(stats) { return Object.fromEntries(TROOPS.map(({ key }) => [key, { attack: n(stats[key].attack), lethality: n(stats[key].lethality) }])) }
function ratioFromCounts(counts) {
  const total = TROOPS.reduce((s, t) => s + Math.max(0, n(counts[t.key])), 0)
  if (!total) return { infantry: 0, cavalry: 0, archers: 0 }
  return Object.fromEntries(TROOPS.map(({ key }) => [key, Math.max(0, n(counts[key])) / total]))
}

function Field({ label, value, onChange, suffix, step = 0.1, min = 0, placeholder = '' }) {
  return <label className="block"><span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45"><span>{label}</span>{suffix && <span className="text-gold/55">{suffix}</span>}</span><input type="number" value={value} placeholder={placeholder} min={min} step={step} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /></label>
}
function Select({ label, value, onChange, children }) { return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none">{children}</select></label> }
function UploadBox({ title, text, onClick }) { return <div className="mb-4 rounded-2xl border border-gold/20 bg-gold/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Report Import</div><div className="mt-1 font-display text-base font-bold text-parchment">{title}</div><div className="mt-1 max-w-xl text-[10px] leading-relaxed text-parchment/45">{text}</div></div><button type="button" onClick={onClick} className="btn-primary btn-royal">Upload Report</button></div></div> }
function TroopStats({ stats, setStats, heroes, setHeroes, showHeroes = true }) { return <div className="space-y-3">{TROOPS.map((troop) => <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={troop.icon} size={15} className="text-gold/70" />{troop.label}</div><div className="grid grid-cols-2 gap-2"><Field label="Attack" suffix="%" value={stats[troop.key].attack} onChange={(v) => setStats((s) => ({ ...s, [troop.key]: { ...s[troop.key], attack: v } }))} /><Field label="Lethality" suffix="%" value={stats[troop.key].lethality} onChange={(v) => setStats((s) => ({ ...s, [troop.key]: { ...s[troop.key], lethality: v } }))} /></div>{showHeroes && <div className="mt-3"><Select label={`Lead ${troop.label === 'Archers' ? 'Archer' : troop.label} Hero`} value={heroes[troop.key]} onChange={(v) => setHeroes((h) => ({ ...h, [troop.key]: v }))}>{HEROES[troop.key].map((hero) => <option key={hero}>{hero}</option>)}</Select></div>}</div>)}</div> }
function Donut({ result }) { const inf = Math.round(result.ratio.infantry * 100), cav = Math.round(result.ratio.cavalry * 100), arc = Math.max(0, 100 - inf - cav); return <div className="mt-5 rounded-2xl border border-gold/20 bg-[#07101e] p-5"><div className="text-center"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Formation Share</div><div className="mt-1 font-display text-lg font-bold text-parchment">Optimal Distribution</div></div><div className="mx-auto mt-5 grid h-56 w-56 place-items-center rounded-full" style={{ background: `conic-gradient(#d9b94e 0 ${inf}%,#7f9ed6 ${inf}% ${inf + cav}%,#c8655a ${inf + cav}% 100%)` }}><div className="grid h-36 w-36 place-items-center rounded-full border border-gold/15 bg-[#07101e] text-center"><div><div className="text-[9px] uppercase tracking-widest text-parchment/35">Best Formation</div><div className="mt-1 font-mono text-2xl font-black text-gold-bright">{inf} / {cav} / {arc}</div></div></div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['INF', inf], ['CAV', cav], ['ARC', arc]].map(([k, v]) => <div key={k} className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] text-parchment/35">{k}</div><div className="font-mono text-xl font-bold text-gold-bright">{v}%</div></div>)}</div></div> }

export default function BearSuite() {
  const [tab, setTab] = useState('ratio')
  const [uploadTarget, setUploadTarget] = useState('ratio')
  const [formationStats, setFormationStats] = useState(EMPTY_STATS)
  const [formationHeroes, setFormationHeroes] = useState(EMPTY_HEROES)
  const [formationTier, setFormationTier] = useState('T10')
  const [impactStats, setImpactStats] = useState(EMPTY_STATS)
  const [impactHeroes, setImpactHeroes] = useState(EMPTY_HEROES)
  const [impactTier, setImpactTier] = useState('T10')
  const [tg, setTg] = useState(0)
  const [capacity, setCapacity] = useState('')
  const [participants, setParticipants] = useState('')
  const [troopCounts, setTroopCounts] = useState(EMPTY_COUNTS)
  const [joiners, setJoiners] = useState(['None', 'None', 'None', 'None'])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onReport = (event) => {
      const r = event.detail || {}
      const next = { infantry: { attack: r.stats?.infantry?.attack ?? '', lethality: r.stats?.infantry?.lethality ?? '' }, cavalry: { attack: r.stats?.cavalry?.attack ?? '', lethality: r.stats?.cavalry?.lethality ?? '' }, archers: { attack: r.stats?.archers?.attack ?? '', lethality: r.stats?.archers?.lethality ?? '' } }
      if (uploadTarget === 'ratio') setFormationStats(next)
      else {
        setImpactStats(next)
        if (r.capacity) setCapacity(String(r.capacity))
        if (r.troopCounts) {
          setTroopCounts({ infantry: String(r.troopCounts.infantry ?? ''), cavalry: String(r.troopCounts.cavalry ?? ''), archers: String(r.troopCounts.archers ?? '') })
        }
      }
    }
    window.addEventListener('k846:report-applied', onReport)
    return () => window.removeEventListener('k846:report-applied', onReport)
  }, [uploadTarget])

  const openUpload = (target) => { setUploadTarget(target); if (window.__k846BattleLabImport?.open) window.__k846BattleLabImport.open(); else alert('Report reader is loading. Try again in a moment.') }

  const formationReady = validStats(formationStats)
  const formationResult = useMemo(() => formationReady ? optimizeBearFormation({ stats: normalized(formationStats), tier: formationTier, tg: 0, leadHeroes: formationHeroes }) : null, [formationReady, formationStats, formationTier, formationHeroes])

  const impactRatio = useMemo(() => ratioFromCounts(troopCounts), [troopCounts])
  const impactReady = validStats(impactStats) && n(capacity) > 0 && n(participants) > 0 && (impactRatio.infantry + impactRatio.cavalry + impactRatio.archers) > 0
  const impactOptimal = useMemo(() => validStats(impactStats) ? optimizeBearFormation({ capacity: n(capacity, 1), stats: normalized(impactStats), tier: impactTier, tg, leadHeroes: impactHeroes }) : null, [impactStats, impactTier, tg, impactHeroes, capacity])
  const impactScore = useMemo(() => impactReady ? computeBearDamageScore({ stats: normalized(impactStats), tier: impactTier, tg, ratio: impactRatio, leadHeroes: impactHeroes }) : 0, [impactReady, impactStats, impactTier, tg, impactRatio, impactHeroes])
  const efficiency = impactReady && impactOptimal?.optimizedScore > 0 ? impactScore / impactOptimal.optimizedScore * 100 : 0

  async function copyFormation() { if (!formationResult) return; try { await navigator.clipboard.writeText(buildBearChatMessage(formationResult)); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }

  return <div className="space-y-5">
    <section className="panel p-4 md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="eyebrow">Bear Calculator</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation + Impact</h2><p className="mt-1 text-xs text-parchment/50">Two calculators. Two report types. No shared hidden defaults.</p></div><div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1"><button onClick={() => setTab('ratio')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === 'ratio' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Hunt Formation</button><button onClick={() => setTab('damage')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === 'damage' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Hunt Impact</button></div></div></section>

    {tab === 'ratio' ? <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <section className="panel p-5 md:p-6"><div className="eyebrow">Hunt Formation Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Rally Bonus Report</h3><UploadBox title="Upload Rally Bonus Screenshot" text="Reads Infantry, Cavalry and Archer Attack + Lethality. Rally Capacity, Participants and True Gold are not used here." onClick={() => openUpload('ratio')} /><TroopStats stats={formationStats} setStats={setFormationStats} heroes={formationHeroes} setHeroes={setFormationHeroes} /><div className="mt-3"><Select label="Troop Tier" value={formationTier} onChange={setFormationTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select></div></section>
      <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Hunt Formation</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Troop Split</h3>{!formationReady ? <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Rally Bonus report or enter all six Attack/Lethality values to calculate.</div> : <><div className="mt-4 space-y-3">{formationResult.troops.map((troop) => <div key={troop.type} className="rounded-2xl border border-gold/15 bg-white/[.035] p-4"><div className="flex justify-between"><span className="font-display font-bold text-parchment">{troop.label}</span><span className="font-mono text-xl font-bold text-gold-bright">{troop.percent.toFixed(2)}%</span></div></div>)}</div><Donut result={formationResult} /><button type="button" onClick={copyFormation} className="btn-primary btn-royal mt-4 w-full justify-center">{copied ? 'Copied' : 'Copy Hunt Formation'}</button></>}</section>
    </div> : <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <section className="panel p-5 md:p-6"><div className="eyebrow">Hunt Impact Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Battle Report</h3><UploadBox title="Upload Battle Report Screenshot" text="Reads combat stats and troop counts when detected. Review every detected value before using the result." onClick={() => openUpload('damage')} /><TroopStats stats={impactStats} setStats={setImpactStats} heroes={impactHeroes} setHeroes={setImpactHeroes} />
        <div className="mt-4 rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-[9px] font-bold uppercase tracking-[.14em] text-gold/55">Detected / Manual Values</div><div className="font-display font-bold text-parchment">Review before calculating</div></div></div><div className="grid grid-cols-2 gap-3"><Field label="Rally Capacity" value={capacity} step={1000} onChange={setCapacity} /><Field label="Participants" value={participants} step={1} onChange={setParticipants} /></div><div className="mt-3 grid grid-cols-3 gap-2">{TROOPS.map((t) => <Field key={t.key} label={`${t.short} Troops`} value={troopCounts[t.key]} step={1000} onChange={(v) => setTroopCounts((c) => ({ ...c, [t.key]: v }))} />)}</div><div className="mt-3 grid grid-cols-2 gap-3"><Select label="Troop Tier" value={impactTier} onChange={setImpactTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select><Select label="True Gold" value={String(tg)} onChange={(v) => setTg(Number(v))}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i}>TG{i}</option>)}</Select></div></div>
        <div className="mt-4 rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="mb-3 font-display font-bold text-parchment">Joiner Skill Heroes</div><div className="grid grid-cols-2 gap-3">{joiners.map((hero, i) => <Select key={i} label={`Joiner ${i + 1}`} value={hero} onChange={(v) => setJoiners((j) => j.map((x, k) => k === i ? v : x))}>{ALL_HEROES.map((h) => <option key={h}>{h}</option>)}</Select>)}</div></div>
      </section>
      <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Hunt Impact</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Impact Result</h3>{!impactReady ? <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Battle Report, review the detected values, and complete any missing Rally Capacity, Participants, troop counts, Tier or True Gold fields.</div> : <><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-gold/15 bg-gold/[.045] p-4"><div className="text-[9px] uppercase text-gold/55">Your Impact</div><div className="mt-1 font-mono text-2xl font-bold text-gold-bright">{impactScore.toFixed(3)}</div></div><div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase text-parchment/35">Optimal Efficiency</div><div className="mt-1 font-mono text-2xl font-bold text-parchment">{efficiency.toFixed(2)}%</div></div><div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase text-parchment/35">Formation</div><div className="mt-1 font-mono text-lg font-bold text-parchment">{Math.round(impactRatio.infantry * 100)} / {Math.round(impactRatio.cavalry * 100)} / {Math.round(impactRatio.archers * 100)}</div></div></div><div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] text-amber-100/60">Impact is a relative comparison model. Joiner selections are preserved in the setup, but only verified hero effects are applied by the optimizer.</div></>}</section>
    </div>}
  </div>
}
