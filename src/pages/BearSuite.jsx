import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { buildBearChatMessage, computeBearDamageScore, optimizeBearFormation } from '../lib/combat/bearOptimizer'

const TROOPS = [
  { key: 'infantry', label: 'Infantry', short: 'INF', icon: 'shield' },
  { key: 'cavalry', label: 'Cavalry', short: 'CAV', icon: 'zap' },
  { key: 'archers', label: 'Archers', short: 'ARC', icon: 'crosshair' },
]

const DEFAULT_STATS = {
  infantry: { attack: 580.4, lethality: 611.5 },
  cavalry: { attack: 567.9, lethality: 553.5 },
  archers: { attack: 977.5, lethality: 1196.6 },
}

function num(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function Field({ label, value, onChange, suffix, step = 0.1, min = 0 }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-parchment/45"><span>{label}</span>{suffix && <span className="text-gold/55">{suffix}</span>}</span>
      <input type="number" value={value} min={min} step={step} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none transition focus:border-gold/45 focus:ring-2 focus:ring-gold/10" />
    </label>
  )
}

function RatioCard({ troop }) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl border border-gold/15 bg-black/25 text-gold"><Icon name={troop.icon} size={16} /></div><div><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold/55">{troop.short}</div><div className="font-display text-base font-bold text-parchment">{troop.label}</div></div></div>
        <div className="text-right"><div className="font-mono text-xl font-bold text-gold-bright">{troop.percent.toFixed(2)}%</div><div className="text-xs font-semibold text-parchment/45">{troop.count.toLocaleString()}</div></div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35"><div className="h-full rounded-full bg-gradient-to-r from-gold/55 to-gold-bright" style={{ width: `${Math.max(1, troop.percent)}%` }} /></div>
    </div>
  )
}

function heatColor(fraction) {
  const f = Math.max(0, Math.min(1, fraction))
  if (f >= 0.97) return '#f6df45'
  if (f >= 0.90) return '#eeb737'
  if (f >= 0.80) return '#dc7f3f'
  if (f >= 0.65) return '#ad4a63'
  if (f >= 0.45) return '#71386f'
  return '#382760'
}

function ternaryPoint(infantry, cavalry, archers) {
  const top = { x: 300, y: 42 }
  const left = { x: 58, y: 462 }
  const right = { x: 542, y: 462 }
  return {
    x: top.x * infantry + left.x * cavalry + right.x * archers,
    y: top.y * infantry + left.y * cavalry + right.y * archers,
  }
}

function HuntFormationMap({ stats, tier, tg, result }) {
  const samples = useMemo(() => {
    const steps = 28
    const points = []
    for (let i = 0; i <= steps; i += 1) {
      for (let c = 0; c <= steps - i; c += 1) {
        const a = steps - i - c
        const ratio = { infantry: i / steps, cavalry: c / steps, archers: a / steps }
        const score = computeBearDamageScore({ stats, tier, tg, ratio })
        const p = ternaryPoint(ratio.infantry, ratio.cavalry, ratio.archers)
        points.push({ ...p, score, ratio })
      }
    }
    return points
  }, [stats, tier, tg])

  const best = ternaryPoint(result.ratio.infantry, result.ratio.cavalry, result.ratio.archers)
  const typical = ternaryPoint(0.10, 0.10, 0.80)
  const maxScore = result.optimizedScore || 1
  const whole = {
    infantry: Math.max(0, Math.round(result.ratio.infantry * 100)),
    cavalry: Math.max(0, Math.round(result.ratio.cavalry * 100)),
    archers: 0,
  }
  whole.archers = Math.max(0, 100 - whole.infantry - whole.cavalry)

  const gridLines = []
  for (let n = 1; n < 5; n += 1) {
    const t = n / 5
    const a1 = ternaryPoint(t, 0, 1 - t)
    const a2 = ternaryPoint(t, 1 - t, 0)
    const c1 = ternaryPoint(0, t, 1 - t)
    const c2 = ternaryPoint(1 - t, t, 0)
    const r1 = ternaryPoint(0, 1 - t, t)
    const r2 = ternaryPoint(1 - t, 0, t)
    gridLines.push(<line key={`i${n}`} x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y} />)
    gridLines.push(<line key={`c${n}`} x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} />)
    gridLines.push(<line key={`a${n}`} x1={r1.x} y1={r1.y} x2={r2.x} y2={r2.y} />)
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gold/20 bg-[#07101e] p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold/55">Formation Terrain</div><div className="font-display text-lg font-bold text-parchment">Damage Efficiency Map</div></div>
        <div className="rounded-full border border-gold/20 bg-gold/[0.06] px-3 py-1 font-mono text-xs font-bold text-gold-bright">Best {whole.infantry}/{whole.cavalry}/{whole.archers}</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#f6f1e7] p-2">
        <svg viewBox="0 0 600 525" className="h-auto w-full" role="img" aria-label="Ternary Hunt Formation efficiency map">
          <defs>
            <clipPath id="huntTriangle"><polygon points="300,42 58,462 542,462" /></clipPath>
          </defs>
          <rect width="600" height="525" fill="#f6f1e7" />
          <g clipPath="url(#huntTriangle)">
            {samples.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="18" fill={heatColor(point.score / maxScore)} opacity="0.94" />)}
          </g>
          <g stroke="#9aa1a8" strokeWidth="1" opacity="0.75">{gridLines}</g>
          <polygon points="300,42 58,462 542,462" fill="none" stroke="#121820" strokeWidth="3" />

          <circle cx={best.x} cy={best.y} r="8" fill="#19a34a" stroke="#ffffff" strokeWidth="2" />
          <g stroke="#d92727" strokeWidth="3">
            <line x1={typical.x - 7} y1={typical.y - 7} x2={typical.x + 7} y2={typical.y + 7} />
            <line x1={typical.x + 7} y1={typical.y - 7} x2={typical.x - 7} y2={typical.y + 7} />
          </g>

          <g fontFamily="system-ui, sans-serif" fill="#151b23" fontWeight="700">
            <text x="300" y="22" textAnchor="middle" fontSize="16">Full Infantry</text>
            <text x="22" y="492" fontSize="16" transform="rotate(-58 22 492)">Full Cavalry</text>
            <text x="578" y="492" textAnchor="end" fontSize="16" transform="rotate(58 578 492)">Full Archery</text>
          </g>

          <g fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700">
            <text x="92" y="485" fill="#b56a20">Cavalry fraction →</text>
            <text x="300" y="505" textAnchor="middle" fill="#208e45">Archery fraction →</text>
            <text x="508" y="485" textAnchor="end" fill="#2677b8">← Infantry fraction</text>
          </g>

          <g fontFamily="system-ui, sans-serif" fontSize="13">
            <rect x="82" y="66" width="150" height="56" rx="8" fill="#ffffff" stroke="#c7ccd1" />
            <g stroke="#d92727" strokeWidth="2"><line x1="98" y1="82" x2="108" y2="92" /><line x1="108" y1="82" x2="98" y2="92" /></g>
            <text x="118" y="91" fill="#222">Typical 10/10/80</text>
            <circle cx="103" cy="107" r="5" fill="#19a34a" />
            <text x="118" y="112" fill="#222">Best {whole.infantry}/{whole.cavalry}/{whole.archers}</text>
          </g>
        </svg>
      </div>
      <div className="mt-3 rounded-xl border border-gold/12 bg-black/20 px-4 py-3 text-sm leading-relaxed text-parchment/70">With the stats entered above, the strongest modeled formation is <span className="font-mono font-bold text-gold-bright">{whole.infantry}/{whole.cavalry}/{whole.archers}</span>. The green marker is your optimum; the red cross marks the common 10/10/80 reference.</div>
    </div>
  )
}

export default function BearSuite() {
  const [tab, setTab] = useState('ratio')
  const [capacity, setCapacity] = useState(750000)
  const [participants, setParticipants] = useState(15)
  const [tier, setTier] = useState('T10')
  const [tg, setTg] = useState(0)
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [customRatio, setCustomRatio] = useState({ infantry: 33.33, cavalry: 33.33, archers: 33.34 })
  const [copied, setCopied] = useState(false)

  function updateStat(type, field, value) {
    setStats((current) => ({ ...current, [type]: { ...current[type], [field]: Math.max(0, num(value)) } }))
  }

  const result = useMemo(() => optimizeBearFormation({ capacity, stats, tier, tg }), [capacity, stats, tier, tg])
  const optimalRatio = result.ratio
  const optimalScore = result.optimizedScore
  const equalScore = result.balancedScore
  const customScore = useMemo(() => computeBearDamageScore({ stats, tier, tg, ratio: customRatio }), [stats, tier, tg, customRatio])
  const customVsOptimal = optimalScore > 0 ? customScore / optimalScore * 100 : 0
  const customVsEqual = equalScore > 0 ? ((customScore / equalScore) - 1) * 100 : 0
  const perParticipant = Math.floor(Math.max(1, num(capacity, 1)) / Math.max(1, num(participants, 1)))
  const totalFilled = perParticipant * Math.max(1, num(participants, 1))
  const fillRate = Math.max(1, num(capacity, 1)) > 0 ? totalFilled / Math.max(1, num(capacity, 1)) * 100 : 0
  const rallyDamageIndex = optimalScore * Math.sqrt(perParticipant) * Math.max(1, num(participants, 1))

  async function copyFormation() {
    try {
      await navigator.clipboard.writeText(buildBearChatMessage(result))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }

  return (
    <div className="space-y-5">
      <section className="panel p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="eyebrow">Bear Calculator</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation + Impact</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-parchment/50">Enter Rally Bonus Attack and Lethality from the setup you actually use for Bear. The two tools share the same stats.</p></div>
          <div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1">
            <button type="button" onClick={() => setTab('ratio')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${tab === 'ratio' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45 hover:text-parchment'}`}>Hunt Formation</button>
            <button type="button" onClick={() => setTab('damage')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${tab === 'damage' ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45 hover:text-parchment'}`}>Hunt Impact</button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
        <section className="panel p-5 md:p-6">
          <div className="eyebrow">Rally Bonus Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Combat Stats</h3>
          <div className="mt-4 space-y-3">
            {TROOPS.map((troop) => (
              <div key={troop.key} className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={troop.icon} size={15} className="text-gold/70" /> {troop.label}</div>
                <div className="grid grid-cols-2 gap-2"><Field label="Attack" suffix="%" value={stats[troop.key].attack} onChange={(v) => updateStat(troop.key, 'attack', v)} /><Field label="Lethality" suffix="%" value={stats[troop.key].lethality} onChange={(v) => updateStat(troop.key, 'lethality', v)} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="March capacity" value={capacity} step={1000} min={1} onChange={(v) => setCapacity(Math.max(1, Math.floor(num(v, 1))))} />
            <Field label="Participants" value={participants} step={1} min={1} onChange={(v) => setParticipants(Math.max(1, Math.min(50, Math.floor(num(v, 1)))))} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-parchment/45">Troop tier</span><select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none"><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></select></label>
            <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-parchment/45">True Gold</span><select value={tg} onChange={(e) => setTg(Number(e.target.value))} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none">{Array.from({ length: 9 }, (_, i) => <option key={i} value={i}>TG{i}</option>)}</select></label>
          </div>
          <div className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-3 text-[11px] leading-relaxed text-sky-100/65">Use the troop Attack and Lethality shown in your Rally Bonus screen. Defense, Health and Squad stats are not inputs to this Bear formation/impact model.</div>
        </section>

        {tab === 'ratio' ? (
          <section className="panel panel-glow p-5 md:p-6">
            <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">Hunt Formation</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Troop Split</h3></div><div className="font-mono text-sm font-bold text-gold-bright">{Number(capacity).toLocaleString()}</div></div>
            <div className="mt-4 space-y-3">{result.troops.map((troop) => <RatioCard key={troop.type} troop={{ ...troop, icon: TROOPS.find((item) => item.key === troop.type)?.icon }} />)}</div>
            <HuntFormationMap stats={stats} tier={tier} tg={tg} result={result} />
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Impact gain</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">+{result.gainVsBalanced.toFixed(2)}%</div><div className="text-[10px] text-parchment/35">vs 33/33/33</div></div><div className="rounded-xl border border-gold/10 bg-white/[0.025] p-3"><div className="text-[9px] uppercase tracking-wider text-parchment/35">Archer modifier</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">×{result.arcMult.toFixed(2)}</div><div className="text-[10px] text-parchment/35">tier/TG rule</div></div></div>
            <button type="button" onClick={copyFormation} className="btn-primary btn-royal mt-4 w-full justify-center"><Icon name={copied ? 'shieldCheck' : 'scroll'} size={14} /> {copied ? 'Copied' : 'Copy Hunt Formation'}</button>
            <div className="mt-3 rounded-xl border border-gold/10 bg-ink/50 p-3 font-mono text-[11px] leading-relaxed text-parchment/55">{buildBearChatMessage(result)}</div>
          </section>
        ) : (
          <section className="panel panel-glow p-5 md:p-6">
            <div className="eyebrow">Hunt Impact</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Impact Comparison</h3><p className="mt-1 text-xs text-parchment/45">Compare any troop formation against the calculated optimum and the equal 33/33/33 split.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">{TROOPS.map((troop) => <Field key={troop.key} label={troop.short} suffix="%" value={customRatio[troop.key]} onChange={(v) => setCustomRatio((current) => ({ ...current, [troop.key]: Math.max(0, num(v)) }))} />)}</div>
            <button type="button" onClick={() => setCustomRatio({ infantry: optimalRatio.infantry * 100, cavalry: optimalRatio.cavalry * 100, archers: optimalRatio.archers * 100 })} className="mt-3 rounded-lg border border-gold/15 bg-white/5 px-3 py-2 text-xs font-semibold text-parchment/65 hover:border-gold/30 hover:text-parchment">Use optimal formation</button>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gold/15 bg-gold/[0.045] p-4"><div className="text-[9px] font-bold uppercase tracking-wider text-gold/55">Your impact</div><div className="mt-1 font-mono text-2xl font-bold text-gold-bright">{customScore.toFixed(3)}</div><div className="mt-1 text-[10px] text-parchment/35">relative performance</div></div>
              <div className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4"><div className="text-[9px] font-bold uppercase tracking-wider text-parchment/35">Optimal efficiency</div><div className="mt-1 font-mono text-2xl font-bold text-parchment">{customVsOptimal.toFixed(2)}%</div><div className="mt-1 text-[10px] text-parchment/35">of maximum modeled score</div></div>
              <div className="rounded-2xl border border-gold/10 bg-white/[0.025] p-4"><div className="text-[9px] font-bold uppercase tracking-wider text-parchment/35">Vs equal split</div><div className="mt-1 font-mono text-2xl font-bold text-parchment">{customVsEqual >= 0 ? '+' : ''}{customVsEqual.toFixed(2)}%</div><div className="mt-1 text-[10px] text-parchment/35">33/33/33 comparison</div></div>
            </div>
            <div className="mt-5 rounded-2xl border border-gold/15 bg-black/20 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-parchment/60">Rally impact index</span><span className="font-mono text-lg font-bold text-gold-bright">{Math.round(rallyDamageIndex).toLocaleString()}</span></div><div className="mt-2 grid grid-cols-3 gap-2 text-center"><div><div className="text-[9px] uppercase text-parchment/30">Participants</div><div className="mt-1 text-sm font-bold text-parchment">{participants}</div></div><div><div className="text-[9px] uppercase text-parchment/30">Per player</div><div className="mt-1 text-sm font-bold text-parchment">{perParticipant.toLocaleString()}</div></div><div><div className="text-[9px] uppercase text-parchment/30">Fill</div><div className="mt-1 text-sm font-bold text-parchment">{fillRate.toFixed(2)}%</div></div></div></div>
            <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-3 text-[11px] leading-relaxed text-amber-100/60">Impact score is a relative comparison index, not a prediction of the exact damage number shown by Kingshot. Use it to compare formations with the same stats and rally setup.</div>
          </section>
        )}
      </div>
    </div>
  )
}
