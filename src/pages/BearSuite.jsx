import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { buildBearChatMessage, computeBearDamageScore, optimizeBearFormation } from '../lib/combat/bearOptimizer'
import { applyJoinerBonuses, computeHuntImpact, HUNT_JOINER_HEROES } from '../lib/combat/huntImpact'

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

const EMPTY_STATS = { infantry: { attack: '', lethality: '' }, cavalry: { attack: '', lethality: '' }, archers: { attack: '', lethality: '' } }
const EMPTY_HEROES = { infantry: 'None', cavalry: 'None', archers: 'None' }
const EMPTY_COUNTS = { infantry: '', cavalry: '', archers: '' }
const EMPTY_JOINERS = Array.from({ length: 4 }, () => ({ hero: 'None', skillLevel: 5 }))

function n(value, fallback = 0) { const x = Number(value); return Number.isFinite(x) ? x : fallback }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function validStats(stats) { return TROOPS.every(({ key }) => n(stats[key].attack) > 0 && n(stats[key].lethality) > 0) }
function normalized(stats) { return Object.fromEntries(TROOPS.map(({ key }) => [key, { attack: n(stats[key].attack), lethality: n(stats[key].lethality) }])) }
function ratioFromCounts(counts) {
  const total = TROOPS.reduce((s, t) => s + Math.max(0, n(counts[t.key])), 0)
  if (!total) return { infantry: 0, cavalry: 0, archers: 0 }
  return Object.fromEntries(TROOPS.map(({ key }) => [key, Math.max(0, n(counts[key])) / total]))
}
function fmt(value) {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(2)
}

function Field({ label, value, onChange, suffix, step = 0.1, min = 0, placeholder = '' }) {
  return <label className="block"><span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45"><span>{label}</span>{suffix && <span className="text-gold/55">{suffix}</span>}</span><input type="number" value={value} placeholder={placeholder} min={min} step={step} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45" /></label>
}
function Select({ label, value, onChange, children }) { return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none">{children}</select></label> }
function UploadBox({ title, text, onClick }) { return <div className="mb-4 rounded-2xl border border-gold/20 bg-gold/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Report Import</div><div className="mt-1 font-display text-base font-bold text-parchment">{title}</div><div className="mt-1 max-w-xl text-[10px] leading-relaxed text-parchment/45">{text}</div></div><button type="button" onClick={onClick} className="btn-primary btn-royal">Upload Report</button></div></div> }
function TroopStats({ stats, setStats, heroes, setHeroes }) { return <div className="space-y-3">{TROOPS.map((troop) => <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={troop.icon} size={15} className="text-gold/70" />{troop.label}</div><div className="grid grid-cols-2 gap-2"><Field label="Attack" suffix="%" value={stats[troop.key].attack} onChange={(v) => setStats((s) => ({ ...s, [troop.key]: { ...s[troop.key], attack: v } }))} /><Field label="Lethality" suffix="%" value={stats[troop.key].lethality} onChange={(v) => setStats((s) => ({ ...s, [troop.key]: { ...s[troop.key], lethality: v } }))} /></div><div className="mt-3"><Select label={`Lead ${troop.label === 'Archers' ? 'Archer' : troop.label} Hero`} value={heroes[troop.key]} onChange={(v) => setHeroes((h) => ({ ...h, [troop.key]: v }))}>{HEROES[troop.key].map((hero) => <option key={hero}>{hero}</option>)}</Select></div></div>)}</div> }

function Donut({ result }) {
  const inf = Math.round(result.ratio.infantry * 100), cav = Math.round(result.ratio.cavalry * 100), arc = Math.max(0, 100 - inf - cav)
  return <div className="mt-5 rounded-2xl border border-gold/20 bg-[#07101e] p-5"><div className="text-center"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Formation Share</div><div className="mt-1 font-display text-lg font-bold text-parchment">Optimal Distribution</div></div><div className="mx-auto mt-5 grid h-56 w-56 place-items-center rounded-full" style={{ background: `conic-gradient(#d9b94e 0 ${inf}%,#7f9ed6 ${inf}% ${inf + cav}%,#c8655a ${inf + cav}% 100%)` }}><div className="grid h-36 w-36 place-items-center rounded-full border border-gold/15 bg-[#07101e] text-center"><div><div className="text-[9px] uppercase tracking-widest text-parchment/35">Best Formation</div><div className="mt-1 font-mono text-2xl font-black text-gold-bright">{inf} / {cav} / {arc}</div></div></div></div></div>
}

function gaussianHistogram(mean, sigma, bins = 22) {
  const lo = Math.max(0, mean - 3.2 * sigma), hi = mean + 3.2 * sigma, step = (hi - lo) / bins
  const values = Array.from({ length: bins }, (_, i) => { const x = lo + (i + .5) * step; const z = (x - mean) / sigma; return { x, y: Math.exp(-.5 * z * z) } })
  const total = values.reduce((s, d) => s + d.y, 0)
  return values.map((d) => ({ ...d, y: d.y / total }))
}

function ImpactHistogram({ mean, optimalMean, sigma }) {
  const current = gaussianHistogram(mean, sigma), optimal = gaussianHistogram(optimalMean, sigma * Math.max(.75, optimalMean / Math.max(mean, .001)))
  const all = [...current, ...optimal], minX = Math.min(...all.map((d) => d.x)), maxX = Math.max(...all.map((d) => d.x)), maxY = Math.max(...all.map((d) => d.y))
  const W = 760, H = 280, padL = 48, padR = 18, padT = 25, padB = 42
  const x = (v) => padL + (v - minX) / Math.max(.001, maxX - minX) * (W - padL - padR), y = (v) => H - padB - v / Math.max(.001, maxY) * (H - padT - padB), barW = Math.max(2, (W - padL - padR) / current.length * .82)
  return <div className="mt-4 rounded-2xl border border-gold/20 bg-[#07101e] p-3 md:p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Impact Probability Distribution</div><div className="font-display text-lg font-bold text-parchment">10,000-hunt projection</div></div><div className="flex gap-3 text-[10px] text-parchment/50"><span>● Current</span><span className="text-gold-bright">● Optimal</span></div></div><svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full overflow-visible">{[0,.25,.5,.75,1].map((t) => <line key={t} x1={padL} x2={W-padR} y1={padT+t*(H-padT-padB)} y2={padT+t*(H-padT-padB)} stroke="rgba(226,199,125,.10)" />)}{current.map((d,i) => <rect key={`c${i}`} x={x(d.x)-barW/2} y={y(d.y)} width={barW} height={H-padB-y(d.y)} fill="rgba(86,139,238,.72)" />)}{optimal.map((d,i) => <rect key={`o${i}`} x={x(d.x)-barW/2} y={y(d.y)} width={barW} height={H-padB-y(d.y)} fill="rgba(226,181,48,.38)" />)}<line x1={x(mean)} x2={x(mean)} y1={padT} y2={H-padB} stroke="#7f9ed6" strokeDasharray="5 5" strokeWidth="2"/><line x1={x(optimalMean)} x2={x(optimalMean)} y1={padT} y2={H-padB} stroke="#e3ba41" strokeDasharray="5 5" strokeWidth="2"/><text x={x(mean)} y="16" textAnchor="middle" fill="#9eb9ef" fontSize="12">Current {fmt(mean)}</text><text x={x(optimalMean)} y="31" textAnchor="middle" fill="#e8c558" fontSize="12">Optimal {fmt(optimalMean)}</text><text x={W/2} y={H-8} textAnchor="middle" fill="rgba(244,236,211,.55)" fontSize="11">Projected Impact Index</text></svg></div>
}

function SensitivityChart({ points }) {
  if (!points.length) return null
  const W=760,H=240,pL=45,pR=18,pT=18,pB=36, xs=points.map((p)=>p.delta), ys=points.flatMap((p)=>[p.infantry,p.cavalry,p.archers]), minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  const x=(v)=>pL+(v-minX)/(maxX-minX)*(W-pL-pR), y=(v)=>H-pB-(v-minY)/Math.max(.001,maxY-minY)*(H-pT-pB), pathFor=(key)=>points.map((p,i)=>`${i?'L':'M'}${x(p.delta)},${y(p[key])}`).join(' ')
  return <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-3"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Formation Sensitivity</div><div className="text-xs text-parchment/45">Impact change as troop shares move around the current formation.</div><svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full"><line x1={pL} x2={W-pR} y1={y(0)} y2={y(0)} stroke="rgba(226,199,125,.18)"/><path d={pathFor('infantry')} fill="none" stroke="#d9b94e" strokeWidth="3"/><path d={pathFor('cavalry')} fill="none" stroke="#7f9ed6" strokeWidth="3"/><path d={pathFor('archers')} fill="none" stroke="#c8655a" strokeWidth="3"/></svg></div>
}

function RiskCurve({ mean, sigma }) {
  const thresholds=[.85,.95,1.05,1.15].map((m)=>mean*m)
  const chance=(t)=>{ const z=(t-mean)/(sigma*Math.SQRT2); const erf=(x)=>{const s=Math.sign(x),a=Math.abs(x),p=.3275911,a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,q=1/(1+p*a);return s*(1-(((((a5*q+a4)*q+a3)*q+a2)*q+a1)*q)*Math.exp(-a*a))}; return clamp((1-.5*(1+erf(z)))*100,0,100)}
  return <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-4"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Percentile / Risk</div><div className="mt-3 space-y-3">{thresholds.map((t)=><div key={t}><div className="mb-1 flex justify-between text-xs"><span className="text-parchment/55">Chance above {fmt(t)}</span><span className="font-mono font-bold text-gold-bright">{chance(t).toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gold/70" style={{width:`${chance(t)}%`}}/></div></div>)}</div></div>
}

export default function BearSuite() {
  const [tab, setTab] = useState('ratio'), [uploadTarget, setUploadTarget] = useState('ratio')
  const [formationStats, setFormationStats] = useState(EMPTY_STATS), [formationHeroes, setFormationHeroes] = useState(EMPTY_HEROES), [formationTier, setFormationTier] = useState('T10')
  const [impactStats, setImpactStats] = useState(EMPTY_STATS), [impactHeroes, setImpactHeroes] = useState(EMPTY_HEROES), [impactTier, setImpactTier] = useState('T10')
  const [tg, setTg] = useState(0), [capacity, setCapacity] = useState(''), [participants, setParticipants] = useState(''), [troopCounts, setTroopCounts] = useState(EMPTY_COUNTS), [joiners, setJoiners] = useState(EMPTY_JOINERS), [copied, setCopied] = useState(false)

  useEffect(() => {
    const onReport = (event) => {
      const r = event.detail || {}, next = { infantry: { attack: r.stats?.infantry?.attack ?? '', lethality: r.stats?.infantry?.lethality ?? '' }, cavalry: { attack: r.stats?.cavalry?.attack ?? '', lethality: r.stats?.cavalry?.lethality ?? '' }, archers: { attack: r.stats?.archers?.attack ?? '', lethality: r.stats?.archers?.lethality ?? '' } }
      if (uploadTarget === 'ratio') setFormationStats(next)
      else {
        setImpactStats(next)
        if (r.capacity !== '' && r.capacity != null) setCapacity(String(r.capacity))
        if (r.participants !== '' && r.participants != null) setParticipants(String(r.participants))
        if (r.troopCounts) setTroopCounts({ infantry: String(r.troopCounts.infantry ?? ''), cavalry: String(r.troopCounts.cavalry ?? ''), archers: String(r.troopCounts.archers ?? '') })
        if (r.tier) setImpactTier(String(r.tier).startsWith('TG') ? 'T11' : r.tier)
        if (r.tg !== '' && r.tg != null) setTg(Number(r.tg))
      }
    }
    window.addEventListener('k846:report-applied', onReport)
    return () => window.removeEventListener('k846:report-applied', onReport)
  }, [uploadTarget])

  const openUpload = (target) => {
    setUploadTarget(target)
    const importer = target === 'ratio' ? window.__k846HuntFormationImport : window.__k846HuntImpactImport
    if (importer?.open) importer.open()
    else if (window.__k846BattleLabImport?.open) window.__k846BattleLabImport.open()
    else alert('Report reader is loading. Try again in a moment.')
  }

  const formationReady = validStats(formationStats)
  const formationResult = useMemo(() => formationReady ? optimizeBearFormation({ stats: normalized(formationStats), tier: formationTier, tg: 0, leadHeroes: formationHeroes }) : null, [formationReady, formationStats, formationTier, formationHeroes])

  const impactRatio = useMemo(() => ratioFromCounts(troopCounts), [troopCounts])
  const impactTotalTroops = useMemo(() => TROOPS.reduce((s,t)=>s+Math.max(0,n(troopCounts[t.key])),0), [troopCounts])
  const impactReady = validStats(impactStats) && n(capacity) > 0 && n(participants) > 0 && impactTotalTroops > 0
  const impactResult = useMemo(() => impactReady ? computeHuntImpact({ stats: normalized(impactStats), tier: impactTier, tg, ratio: impactRatio, leadHeroes: impactHeroes, troopCounts: Object.fromEntries(TROOPS.map((t)=>[t.key,n(troopCounts[t.key])])), capacity:n(capacity), participants:n(participants), joiners }) : null, [impactReady, impactStats, impactTier, tg, impactRatio, impactHeroes, troopCounts, capacity, participants, joiners])
  const projectedMean = impactResult?.impactIndex || 0, projectedOptimalMean = impactResult?.optimalImpactIndex || 0, efficiency = impactResult?.efficiency || 0
  const activeJoiners = joiners.filter((j)=>j.hero !== 'None').length
  const sigma = projectedMean * clamp(.08 + .012 * Math.max(0, 4 - activeJoiners), .08, .16)
  const p5 = Math.max(0, projectedMean - 1.645*sigma), p95 = projectedMean + 1.645*sigma

  const sensitivity = useMemo(() => {
    if (!impactReady || !impactResult) return []
    const adjustedStats = applyJoinerBonuses(normalized(impactStats), joiners), scale = Math.sqrt(Math.max(1, impactTotalTroops)), base = projectedMean || 1
    return Array.from({length:11},(_,i)=>i-5).map((delta)=>{
      const shift=delta/100
      const scoreFor=(target)=>{ const r={...impactRatio}, others=TROOPS.map(t=>t.key).filter(k=>k!==target); r[target]=clamp(r[target]+shift,0,1); const remaining=1-r[target], otherSum=others.reduce((s,k)=>s+impactRatio[k],0)||1; others.forEach(k=>{r[k]=remaining*impactRatio[k]/otherSum}); return computeBearDamageScore({stats:adjustedStats,tier:impactTier,tg,ratio:r,leadHeroes:impactHeroes})*scale }
      return {delta,infantry:(scoreFor('infantry')/base-1)*100,cavalry:(scoreFor('cavalry')/base-1)*100,archers:(scoreFor('archers')/base-1)*100}
    })
  }, [impactReady, impactResult, impactStats, joiners, impactTotalTroops, projectedMean, impactRatio, impactTier, tg, impactHeroes])

  async function copyFormation() { if (!formationResult) return; try { await navigator.clipboard.writeText(buildBearChatMessage(formationResult)); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }

  return <div className="space-y-5">
    <section className="panel p-4 md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="eyebrow">Bear Calculator</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation + Impact</h2><p className="mt-1 text-xs text-parchment/50">Two calculators. Two report types. No shared hidden defaults.</p></div><div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1"><button onClick={() => setTab('ratio')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === 'ratio' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Hunt Formation</button><button onClick={() => setTab('damage')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === 'damage' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Hunt Impact</button></div></div></section>

    {tab === 'ratio' ? <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]"><section className="panel p-5 md:p-6"><div className="eyebrow">Hunt Formation Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Rally Bonus Report</h3><UploadBox title="Upload Rally Bonus Screenshot" text="Reads Infantry, Cavalry and Archer Attack + Lethality only." onClick={() => openUpload('ratio')} /><TroopStats stats={formationStats} setStats={setFormationStats} heroes={formationHeroes} setHeroes={setFormationHeroes} /><div className="mt-3"><Select label="Troop Tier" value={formationTier} onChange={setFormationTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select></div></section><section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Hunt Formation</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Troop Split</h3>{!formationReady ? <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Rally Bonus report or enter all six values.</div> : <><div className="mt-4 space-y-3">{formationResult.troops.map((troop) => <div key={troop.type} className="rounded-2xl border border-gold/15 bg-white/[.035] p-4"><div className="flex justify-between"><span className="font-display font-bold text-parchment">{troop.label}</span><span className="font-mono text-xl font-bold text-gold-bright">{troop.percent.toFixed(2)}%</span></div></div>)}</div><Donut result={formationResult}/><button onClick={copyFormation} className="btn-primary btn-royal mt-4 w-full justify-center">{copied?'Copied':'Copy Hunt Formation'}</button></>}</section></div> :
    <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]"><section className="panel p-5 md:p-6"><div className="eyebrow">Hunt Impact Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Battle Report</h3><UploadBox title="Upload Battle Report Screenshot" text="Reads combat stats, rally size and troop counts. Review before calculating." onClick={() => openUpload('damage')} /><TroopStats stats={impactStats} setStats={setImpactStats} heroes={impactHeroes} setHeroes={setImpactHeroes}/><div className="mt-4 rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="mb-3"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-gold/55">Detected / Manual Values</div><div className="font-display font-bold text-parchment">Review before calculating</div></div><div className="grid grid-cols-2 gap-3"><Field label="Rally Capacity" value={capacity} step={1000} onChange={setCapacity}/><Field label="Participants" value={participants} step={1} onChange={setParticipants}/></div><div className="mt-3 grid grid-cols-3 gap-2">{TROOPS.map((t)=><Field key={t.key} label={`${t.short} Troops`} value={troopCounts[t.key]} step={1000} onChange={(v)=>setTroopCounts((c)=>({...c,[t.key]:v}))}/>)}</div><div className="mt-3 grid grid-cols-2 gap-3"><Select label="Troop Tier" value={impactTier} onChange={setImpactTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select><Select label="True Gold" value={String(tg)} onChange={(v)=>setTg(Number(v))}>{Array.from({length:9},(_,i)=><option key={i} value={i}>TG{i}</option>)}</Select></div></div><div className="mt-4 rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="mb-1 font-display font-bold text-parchment">Joiner Skill Heroes</div><div className="mb-3 text-[10px] text-parchment/45">Only the first Expedition skill of the four contributing joiners is modeled.</div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{joiners.map((slot,i)=><div key={i} className="grid grid-cols-[1fr_100px] gap-2"><Select label={`Joiner ${i+1}`} value={slot.hero} onChange={(v)=>setJoiners((j)=>j.map((x,k)=>k===i?{...x,hero:v}:x))}>{HUNT_JOINER_HEROES.map((h)=><option key={h}>{h}</option>)}</Select><Select label="Skill" value={String(slot.skillLevel)} onChange={(v)=>setJoiners((j)=>j.map((x,k)=>k===i?{...x,skillLevel:Number(v)}:x))}>{[1,2,3,4,5].map((lv)=><option key={lv} value={lv}>Lv{lv}</option>)}</Select></div>)}</div></div></section>
    <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Hunt Impact</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Impact Result</h3>{!impactReady ? <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Battle Report, then review capacity, participants, troop counts, tier and True Gold.</div> : <><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-gold/15 bg-gold/[.045] p-4"><div className="text-[9px] uppercase text-gold/55">Projected Impact Index</div><div className="mt-1 font-mono text-2xl font-bold text-gold-bright">{fmt(projectedMean)}</div></div><div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase text-parchment/35">Optimal Efficiency</div><div className="mt-1 font-mono text-2xl font-bold text-parchment">{efficiency.toFixed(2)}%</div></div><div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase text-parchment/35">Joiner Bonus</div><div className="mt-1 font-mono text-sm font-bold text-parchment">ATK +{impactResult?.joinerBonuses.attack || 0}% · LET +{impactResult?.joinerBonuses.lethality || 0}%</div></div></div><ImpactHistogram mean={projectedMean} optimalMean={projectedOptimalMean} sigma={Math.max(.001,sigma)}/><div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Low Range (5%)</div><div className="mt-1 font-mono font-bold text-parchment">{fmt(p5)}</div></div><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Expected</div><div className="mt-1 font-mono font-bold text-gold-bright">{fmt(projectedMean)}</div></div><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">High Range (95%)</div><div className="mt-1 font-mono font-bold text-parchment">{fmt(p95)}</div></div><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Potential Gain</div><div className="mt-1 font-mono font-bold text-gold-bright">+{fmt(Math.max(0,projectedOptimalMean-projectedMean))}</div></div></div><div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><SensitivityChart points={sensitivity}/><RiskCurve mean={projectedMean} sigma={Math.max(.001,sigma)}/></div><div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">This is a relative Hunt Impact projection. Absolute Bear damage in millions will not be labeled until the tier/unit-damage calibration is validated.</div></>}</section></div>}
  </div>
}
