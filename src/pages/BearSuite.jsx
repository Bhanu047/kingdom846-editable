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
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
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
function TroopStats({ stats, setStats, heroes, setHeroes, showHeroes = true }) { return <div className="space-y-3">{TROOPS.map((troop) => <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={troop.icon} size={15} className="text-gold/70" />{troop.label}</div><div className="grid grid-cols-2 gap-2"><Field label="Attack" suffix="%" value={stats[troop.key].attack} onChange={(v) => setStats((s) => ({ ...s, [troop.key]: { ...s[troop.key], attack: v } }))} /><Field label="Lethality" suffix="%" value={stats[troop.key].lethality} onChange={(v) => setStats((s) => ({ ...s, [troop.key]: { ...s[troop.key], lethality: v } }))} /></div>{showHeroes && <div className="mt-3"><Select label={`Lead ${troop.label === 'Archers' ? 'Archer' : troop.label} Hero`} value={heroes[troop.key]} onChange={(v) => setHeroes((h) => ({ ...h, [troop.key]: v }))}>{HEROES[troop.key].map((hero) => <option key={hero}>{hero}</option>)}</Select></div>}</div>)}</div> }
function Donut({ result }) { const inf = Math.round(result.ratio.infantry * 100), cav = Math.round(result.ratio.cavalry * 100), arc = Math.max(0, 100 - inf - cav); return <div className="mt-5 rounded-2xl border border-gold/20 bg-[#07101e] p-5"><div className="text-center"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Formation Share</div><div className="mt-1 font-display text-lg font-bold text-parchment">Optimal Distribution</div></div><div className="mx-auto mt-5 grid h-56 w-56 place-items-center rounded-full" style={{ background: `conic-gradient(#d9b94e 0 ${inf}%,#7f9ed6 ${inf}% ${inf + cav}%,#c8655a ${inf + cav}% 100%)` }}><div className="grid h-36 w-36 place-items-center rounded-full border border-gold/15 bg-[#07101e] text-center"><div><div className="text-[9px] uppercase tracking-widest text-parchment/35">Best Formation</div><div className="mt-1 font-mono text-2xl font-black text-gold-bright">{inf} / {cav} / {arc}</div></div></div></div><div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['INF', inf], ['CAV', cav], ['ARC', arc]].map(([k, v]) => <div key={k} className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] text-parchment/35">{k}</div><div className="font-mono text-xl font-bold text-gold-bright">{v}%</div></div>)}</div></div> }

function gaussianHistogram(mean, sigma, bins = 22) {
  const lo = Math.max(0, mean - 3.2 * sigma)
  const hi = mean + 3.2 * sigma
  const step = (hi - lo) / bins
  const values = Array.from({ length: bins }, (_, i) => {
    const x = lo + (i + 0.5) * step
    const z = (x - mean) / sigma
    return { x, y: Math.exp(-0.5 * z * z) }
  })
  const total = values.reduce((s, d) => s + d.y, 0)
  return values.map((d) => ({ ...d, y: d.y / total }))
}

function ImpactHistogram({ mean, optimalMean, sigma }) {
  const current = gaussianHistogram(mean, sigma)
  const optimalSigma = sigma * Math.max(.75, optimalMean / Math.max(mean, .001))
  const optimal = gaussianHistogram(optimalMean, optimalSigma)
  const all = [...current, ...optimal]
  const minX = Math.min(...all.map((d) => d.x))
  const maxX = Math.max(...all.map((d) => d.x))
  const maxY = Math.max(...all.map((d) => d.y))
  const W = 760, H = 280, padL = 48, padR = 18, padT = 25, padB = 42
  const x = (v) => padL + (v - minX) / Math.max(.001, maxX - minX) * (W - padL - padR)
  const y = (v) => H - padB - v / Math.max(.001, maxY) * (H - padT - padB)
  const barW = Math.max(2, (W - padL - padR) / current.length * .82)
  return <div className="mt-4 rounded-2xl border border-gold/20 bg-[#07101e] p-3 md:p-4">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Damage Probability Distribution</div><div className="font-display text-lg font-bold text-parchment">10,000-hunt projection</div></div><div className="flex gap-3 text-[10px] text-parchment/50"><span>● Current</span><span className="text-gold-bright">● Optimal</span></div></div>
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full overflow-visible" role="img" aria-label="Projected hunt impact probability distribution">
      {[0,.25,.5,.75,1].map((t) => <line key={t} x1={padL} x2={W-padR} y1={padT+t*(H-padT-padB)} y2={padT+t*(H-padT-padB)} stroke="rgba(226,199,125,.10)" strokeWidth="1" />)}
      {current.map((d,i) => <rect key={`c${i}`} x={x(d.x)-barW/2} y={y(d.y)} width={barW} height={H-padB-y(d.y)} rx="1" fill="rgba(86,139,238,.72)" />)}
      {optimal.map((d,i) => <rect key={`o${i}`} x={x(d.x)-barW/2} y={y(d.y)} width={barW} height={H-padB-y(d.y)} rx="1" fill="rgba(226,181,48,.38)" />)}
      <line x1={x(mean)} x2={x(mean)} y1={padT} y2={H-padB} stroke="#7f9ed6" strokeDasharray="5 5" strokeWidth="2" />
      <line x1={x(optimalMean)} x2={x(optimalMean)} y1={padT} y2={H-padB} stroke="#e3ba41" strokeDasharray="5 5" strokeWidth="2" />
      <text x={x(mean)} y="16" textAnchor="middle" fill="#9eb9ef" fontSize="12">Current {fmt(mean)}</text>
      <text x={x(optimalMean)} y="31" textAnchor="middle" fill="#e8c558" fontSize="12">Optimal {fmt(optimalMean)}</text>
      <text x="14" y={H/2} transform={`rotate(-90 14 ${H/2})`} fill="rgba(244,236,211,.55)" fontSize="11">Probability</text>
      <text x={W/2} y={H-8} textAnchor="middle" fill="rgba(244,236,211,.55)" fontSize="11">Projected Hunt Impact</text>
    </svg>
  </div>
}

function SensitivityChart({ points }) {
  const W=760,H=240,pL=45,pR=18,pT=18,pB=36
  const xs = points.map((p) => p.delta)
  const ys = points.flatMap((p) => [p.infantry,p.cavalry,p.archers])
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  const x=(v)=>pL+(v-minX)/(maxX-minX)*(W-pL-pR)
  const y=(v)=>H-pB-(v-minY)/Math.max(.001,maxY-minY)*(H-pT-pB)
  const pathFor=(key)=>points.map((p,i)=>`${i?'L':'M'}${x(p.delta)},${y(p[key])}`).join(' ')
  return <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-3"><div className="mb-2"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Formation Sensitivity</div><div className="text-xs text-parchment/45">Expected impact when each troop share is shifted around the current formation.</div></div><svg viewBox={`0 0 ${W} ${H}`} className="w-full"><line x1={pL} x2={W-pR} y1={y(0)} y2={y(0)} stroke="rgba(226,199,125,.18)"/><path d={pathFor('infantry')} fill="none" stroke="#d9b94e" strokeWidth="3"/><path d={pathFor('cavalry')} fill="none" stroke="#7f9ed6" strokeWidth="3"/><path d={pathFor('archers')} fill="none" stroke="#c8655a" strokeWidth="3"/><text x={W/2} y={H-7} textAnchor="middle" fill="rgba(244,236,211,.5)" fontSize="11">Ratio shift (%)</text></svg><div className="mt-2 flex justify-center gap-4 text-[10px]"><span className="text-gold-bright">● Infantry</span><span className="text-[#9eb9ef]">● Cavalry</span><span className="text-[#df8175]">● Archers</span></div></div>
}

function RiskCurve({ mean, sigma }) {
  const thresholds=[.85,.95,1.05,1.15].map((m)=>mean*m)
  const chance=(t)=>{ const z=(t-mean)/(sigma*Math.SQRT2); const erf=(x)=>{const s=Math.sign(x),a=Math.abs(x);const p=0.3275911,a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429;const q=1/(1+p*a);return s*(1-(((((a5*q+a4)*q+a3)*q+a2)*q+a1)*q)*Math.exp(-a*a))}; return clamp((1-.5*(1+erf(z)))*100,0,100)}
  return <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-4"><div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Percentile / Risk</div><div className="mt-3 space-y-3">{thresholds.map((t)=><div key={t}><div className="mb-1 flex justify-between text-xs"><span className="text-parchment/55">Chance above {fmt(t)}</span><span className="font-mono font-bold text-gold-bright">{chance(t).toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gold/70" style={{width:`${chance(t)}%`}}/></div></div>)}</div></div>
}

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
        if (r.participants) setParticipants(String(r.participants))
        if (r.troopCounts) setTroopCounts({ infantry: String(r.troopCounts.infantry ?? ''), cavalry: String(r.troopCounts.cavalry ?? ''), archers: String(r.troopCounts.archers ?? '') })
      }
    }
    window.addEventListener('k846:report-applied', onReport)
    return () => window.removeEventListener('k846:report-applied', onReport)
  }, [uploadTarget])

  const openUpload = (target) => { setUploadTarget(target); if (window.__k846BattleLabImport?.open) window.__k846BattleLabImport.open(); else alert('Report reader is loading. Try again in a moment.') }

  const formationReady = validStats(formationStats)
  const formationResult = useMemo(() => formationReady ? optimizeBearFormation({ stats: normalized(formationStats), tier: formationTier, tg: 0, leadHeroes: formationHeroes }) : null, [formationReady, formationStats, formationTier, formationHeroes])

  const impactRatio = useMemo(() => ratioFromCounts(troopCounts), [troopCounts])
  const impactTotalTroops = useMemo(() => TROOPS.reduce((s,t)=>s+Math.max(0,n(troopCounts[t.key])),0), [troopCounts])
  const impactReady = validStats(impactStats) && n(capacity) > 0 && n(participants) > 0 && impactTotalTroops > 0
  const impactOptimal = useMemo(() => validStats(impactStats) ? optimizeBearFormation({ capacity: n(capacity, 1), stats: normalized(impactStats), tier: impactTier, tg, leadHeroes: impactHeroes }) : null, [impactStats, impactTier, tg, impactHeroes, capacity])
  const impactScore = useMemo(() => impactReady ? computeBearDamageScore({ stats: normalized(impactStats), tier: impactTier, tg, ratio: impactRatio, leadHeroes: impactHeroes }) : 0, [impactReady, impactStats, impactTier, tg, impactRatio, impactHeroes])
  const impactScale = impactReady ? Math.sqrt(Math.max(1, impactTotalTroops)) : 1
  const projectedMean = impactScore * impactScale
  const projectedOptimalMean = (impactOptimal?.optimizedScore || 0) * impactScale
  const efficiency = projectedOptimalMean > 0 ? projectedMean / projectedOptimalMean * 100 : 0
  const sigma = projectedMean * clamp(.08 + .012 * Math.max(0, 4 - joiners.filter((h)=>h !== 'None').length), .08, .16)
  const p5 = Math.max(0, projectedMean - 1.645*sigma), p95 = projectedMean + 1.645*sigma

  const sensitivity = useMemo(() => {
    if (!impactReady) return []
    const base = projectedMean || 1
    return Array.from({length:11},(_,i)=>i-5).map((delta)=>{
      const shift = delta/100
      const scoreFor=(target)=>{
        const r={...impactRatio}
        const others=TROOPS.map(t=>t.key).filter(k=>k!==target)
        r[target]=clamp(r[target]+shift,0,1)
        const remaining=1-r[target]
        const otherSum=others.reduce((s,k)=>s+impactRatio[k],0) || 1
        others.forEach(k=>{r[k]=remaining*impactRatio[k]/otherSum})
        return computeBearDamageScore({stats:normalized(impactStats),tier:impactTier,tg,ratio:r,leadHeroes:impactHeroes})*impactScale
      }
      return {delta,infantry:(scoreFor('infantry')/base-1)*100,cavalry:(scoreFor('cavalry')/base-1)*100,archers:(scoreFor('archers')/base-1)*100}
    })
  }, [impactReady, impactRatio, impactStats, impactTier, tg, impactHeroes, impactScale, projectedMean])

  async function copyFormation() { if (!formationResult) return; try { await navigator.clipboard.writeText(buildBearChatMessage(formationResult)); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }

  return <div className="space-y-5">
    <section className="panel p-4 md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="eyebrow">Bear Calculator</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation + Impact</h2><p className="mt-1 text-xs text-parchment/50">Two calculators. Two report types. No shared hidden defaults.</p></div><div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1"><button onClick={() => setTab('ratio')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === 'ratio' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Hunt Formation</button><button onClick={() => setTab('damage')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === 'damage' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}>Hunt Impact</button></div></div></section>

    {tab === 'ratio' ? <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <section className="panel p-5 md:p-6"><div className="eyebrow">Hunt Formation Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Rally Bonus Report</h3><UploadBox title="Upload Rally Bonus Screenshot" text="Reads Infantry, Cavalry and Archer Attack + Lethality. Rally Capacity, Participants and True Gold are not used here." onClick={() => openUpload('ratio')} /><TroopStats stats={formationStats} setStats={setFormationStats} heroes={formationHeroes} setHeroes={setFormationHeroes} /><div className="mt-3"><Select label="Troop Tier" value={formationTier} onChange={setFormationTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select></div></section>
      <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Hunt Formation</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Troop Split</h3>{!formationReady ? <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Rally Bonus report or enter all six Attack/Lethality values to calculate.</div> : <><div className="mt-4 space-y-3">{formationResult.troops.map((troop) => <div key={troop.type} className="rounded-2xl border border-gold/15 bg-white/[.035] p-4"><div className="flex justify-between"><span className="font-display font-bold text-parchment">{troop.label}</span><span className="font-mono text-xl font-bold text-gold-bright">{troop.percent.toFixed(2)}%</span></div></div>)}</div><Donut result={formationResult} /><button type="button" onClick={copyFormation} className="btn-primary btn-royal mt-4 w-full justify-center">{copied ? 'Copied' : 'Copy Hunt Formation'}</button></>}</section>
    </div> : <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <section className="panel p-5 md:p-6"><div className="eyebrow">Hunt Impact Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Battle Report</h3><UploadBox title="Upload Battle Report Screenshot" text="Reads combat stats and troop counts when detected. Review every detected value before using the result." onClick={() => openUpload('damage')} /><TroopStats stats={impactStats} setStats={setImpactStats} heroes={impactHeroes} setHeroes={setImpactHeroes} />
        <div className="mt-4 rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="mb-3"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-gold/55">Detected / Manual Values</div><div className="font-display font-bold text-parchment">Review before calculating</div></div><div className="grid grid-cols-2 gap-3"><Field label="Rally Capacity" value={capacity} step={1000} onChange={setCapacity} /><Field label="Participants" value={participants} step={1} onChange={setParticipants} /></div><div className="mt-3 grid grid-cols-3 gap-2">{TROOPS.map((t) => <Field key={t.key} label={`${t.short} Troops`} value={troopCounts[t.key]} step={1000} onChange={(v) => setTroopCounts((c) => ({ ...c, [t.key]: v }))} />)}</div><div className="mt-3 grid grid-cols-2 gap-3"><Select label="Troop Tier" value={impactTier} onChange={setImpactTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select><Select label="True Gold" value={String(tg)} onChange={(v) => setTg(Number(v))}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i}>TG{i}</option>)}</Select></div></div>
        <div className="mt-4 rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="mb-3 font-display font-bold text-parchment">Joiner Skill Heroes</div><div className="grid grid-cols-2 gap-3">{joiners.map((hero, i) => <Select key={i} label={`Joiner ${i + 1}`} value={hero} onChange={(v) => setJoiners((j) => j.map((x, k) => k === i ? v : x))}>{ALL_HEROES.map((h) => <option key={h}>{h}</option>)}</Select>)}</div></div>
      </section>
      <section className="panel panel-glow p-5 md:p-6"><div className="eyebrow">Hunt Impact</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Impact Result</h3>{!impactReady ? <div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Battle Report, then review Rally Capacity, Participants, troop counts, Tier and True Gold.</div> : <><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-gold/15 bg-gold/[.045] p-4"><div className="text-[9px] uppercase text-gold/55">Projected Impact</div><div className="mt-1 font-mono text-2xl font-bold text-gold-bright">{fmt(projectedMean)}</div></div><div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase text-parchment/35">Optimal Efficiency</div><div className="mt-1 font-mono text-2xl font-bold text-parchment">{efficiency.toFixed(2)}%</div></div><div className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="text-[9px] uppercase text-parchment/35">Formation</div><div className="mt-1 font-mono text-lg font-bold text-parchment">{Math.round(impactRatio.infantry * 100)} / {Math.round(impactRatio.cavalry * 100)} / {Math.round(impactRatio.archers * 100)}</div></div></div>
        <ImpactHistogram mean={projectedMean} optimalMean={projectedOptimalMean} sigma={Math.max(.001,sigma)} />
        <div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Low Range (5%)</div><div className="mt-1 font-mono font-bold text-parchment">{fmt(p5)}</div></div><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Expected</div><div className="mt-1 font-mono font-bold text-gold-bright">{fmt(projectedMean)}</div></div><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">High Range (95%)</div><div className="mt-1 font-mono font-bold text-parchment">{fmt(p95)}</div></div><div className="rounded-xl border border-gold/10 bg-white/[.025] p-3"><div className="text-[9px] uppercase text-parchment/35">Potential Gain</div><div className="mt-1 font-mono font-bold text-gold-bright">+{fmt(Math.max(0,projectedOptimalMean-projectedMean))}</div></div></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><SensitivityChart points={sensitivity}/><RiskCurve mean={projectedMean} sigma={Math.max(.001,sigma)}/></div>
        <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">The chart is generated from the live Hunt Impact model. It uses the current report stats, troop counts, tier, True Gold and selected lead heroes. Values are model projections, not decorative sample numbers.</div></>}</section>
    </div>}
  </div>
}
