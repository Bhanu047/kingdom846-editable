import { useId } from 'react'
import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { smoothPath, useReveal } from '../lib/chartAnim'
import { kingdom } from '../data/kingdom'
import { tracker846 } from '../data/tracker846'
import { hallImage } from '../data/realmArt'

const latestKvk = { ...tracker846.kvk.latest, current: true }

function MetricCard({ label, value, sub }) {
  return (
    <div className="panel p-4 gold-corners">
      <div className="eyebrow mb-1">{label}</div>
      <div className="stat-num gradient-gold">{value}</div>
      {sub && <div className="mt-1 text-xs text-parchment/50">{sub}</div>}
    </div>
  )
}

function ResultBadge({ r }) {
  if (r === 'W') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-emerald-400/15 text-xs font-bold text-emerald-300">W</span>
  if (r === 'L') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-rose-400/15 text-xs font-bold text-rose-300">L</span>
  return <span className="inline-grid h-6 min-w-6 place-items-center text-xs font-bold text-parchment/30">—</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

// Rating Evolution.
//
// The right-hand column ended at Transfer Status and left a tall block of dead
// space beside an eleven-row table. This fills it with the one thing the page
// had the data for and never drew: how the record has actually moved.
//
// Built only from figures already in the tracker -- match quality faced per
// KvK, and the running win rate across prep and battle. Deliberately NOT the
// per-KvK Atlas score: that number is on the Atlas profile but not in our
// snapshot, and inventing a curve for it would make the page look live while
// being fiction. The card says which series it is showing for that reason.
function RatingEvolution() {
  const reveal = useReveal()
  const gid = useId()
  // Oldest first -- the history is stored newest first for the table.
  const runs = [...tracker846.kvk.history].reverse()
  if (runs.length < 2) return null

  let won = 0
  const pts = runs.map((k, i) => {
    if (k.prep === 'W') won += 1
    if (k.battle === 'W') won += 1
    return { kvk: k.kvk, quality: k.quality, rate: (won / ((i + 1) * 2)) * 100 }
  })

  const W = 320, H = 148, L = 30, R = 30, T = 14, B = 24
  const qs = pts.map((p) => p.quality)
  const qLo = Math.min(...qs) - 0.3, qHi = Math.max(...qs) + 0.3
  const x = (i) => L + (i / (pts.length - 1)) * (W - L - R)
  const yQ = (v) => H - B - ((v - qLo) / (qHi - qLo)) * (H - T - B)
  const yR = (v) => H - B - (v / 100) * (H - T - B)
  const path = (fn, key) => smoothPath(pts.map((p, i) => ({ x: x(i), y: fn(p[key]) })))
  const last = pts[pts.length - 1]

  return (
    <Panel>
      <SectionTitle eyebrow="Trajectory" title="Rating Evolution" />
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id={`${gid}-q`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0B23B" stopOpacity=".28" />
              <stop offset="100%" stopColor="#E0B23B" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, .5, 1].map((t) => (
            <line key={t} x1={L} x2={W - R} y1={T + t * (H - T - B)} y2={T + t * (H - T - B)} stroke="rgba(226,199,125,.10)" />
          ))}
          <path d={`${path(yQ, 'quality')} L${x(pts.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill={`url(#${gid}-q)`} opacity={reveal ? 1 : 0} style={{ transition: 'opacity .7s ease .3s' }} />
          <path d={path(yQ, 'quality')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1} fill="none" stroke="#E8C558" strokeWidth="2.2" style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
          <path d={path(yR, 'rate')} pathLength="1" strokeDasharray="1" strokeDashoffset={reveal ? 0 : 1} fill="none" stroke="#7f9ed6" strokeWidth="2" strokeOpacity=".85" style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) .12s' }} />
          <g style={{ opacity: reveal ? 1 : 0, transition: 'opacity .4s ease 1s' }}>
            <circle cx={x(pts.length - 1)} cy={yQ(last.quality)} r="4.5" fill="none" stroke="#E8C558" strokeWidth="1.6" />
            <circle cx={x(pts.length - 1)} cy={yQ(last.quality)} r="2" fill="#F6E2A4" />
          </g>
        </svg>
        {/* HTML, not SVG <text> -- same export rule as every other chart here. */}
        <div className="pointer-events-none absolute text-[9px] font-semibold text-parchment/40" style={{ left: 0, top: `${(H - 16) / H * 100}%` }}>#{pts[0].kvk}</div>
        <div className="pointer-events-none absolute text-[9px] font-semibold text-parchment/40" style={{ right: 0, top: `${(H - 16) / H * 100}%` }}>#{last.kvk}</div>
      </div>
      {/* Short labels: at this column width "Match quality faced" and
          "Running win rate" could not sit on one line and the second was
          clipped by the panel edge. */}
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="whitespace-nowrap text-gold-bright">● Match quality</span>
        <span className="whitespace-nowrap text-[#7f9ed6]">● Win rate</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/5 p-2.5 text-center">
          <div className="font-display text-lg font-bold text-gold-bright">{tracker846.kvk.rating.toFixed(3)}</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/45">KvK Rating · #{tracker846.kvk.rank}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2.5 text-center">
          <div className="font-display text-lg font-bold text-parchment">{Math.round(last.rate)}%</div>
          <div className="text-[9px] uppercase tracking-wider text-parchment/45">Win rate · {runs.length} KvKs</div>
        </div>
      </div>
    </Panel>
  )
}

export default function About() {
  const history = tracker846.kvk.history.map((k) => ({ ...k, current: k.kvk === latestKvk.kvk }))
  const total = tracker846.kvk.total
  const share = (n) => Math.round((n / Math.max(1, total)) * 100)
  return (
    <div className="space-y-6 overflow-x-hidden">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div>
          <div className="relative h-60 overflow-hidden md:h-80">
            <ArtImage src={hallImage} alt="The great hall of Kingdom 846" className="h-full w-full hall-breathe" />
            <div className="hero-grade absolute inset-0" aria-hidden="true" />
            <div className="hero-bloom" aria-hidden="true" />
            <div className="hero-rake absolute inset-0" aria-hidden="true" />
            {/* Fades into the copy below so the banner and the panel read as one
                surface rather than a picture with a caption stuck under it. */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-2 to-transparent" aria-hidden="true" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="./assets/crest-846.webp" alt="" className="hero-crest h-32 w-auto md:h-48" />
            </div>
          </div>
          <div className="p-7 text-center md:p-9">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Pill tone="gold">{tracker846.tier}</Pill>
              <Pill tone="blue">KvK #{latestKvk.kvk}</Pill>
              <Pill tone="red">vs {latestKvk.opponent}</Pill>
            </div>
            <h1 className="gilt-display mt-4 font-decorative text-4xl font-black tracking-[.03em] md:text-6xl">KINGDOM 846</h1>
            <p className="mt-2 font-display text-sm tracking-[.12em] text-gold-bright/85 md:text-base">“{kingdom.motto}”</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-parchment/70">
              Kingdom 846 is an <span className="text-gold-bright">S-Tier</span> realm built around four alliances moving under one crown. Discipline in preparation, coordinated rallies, and kingdom-first command define the realm. The newest KvK chapter is <span className="text-gold-bright">K846 vs K795</span>.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14} /> Atlas Profile</a>
              <a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="swords" size={14} /> KvK Rankings</a>
              <span className="btn-ghost"><Icon name="crown" size={14} /> Kingdom 846</span>
            </div>
            {/* The tracker figures on this page are snapshots -- neither
                ks-atlas nor kingshotoptimizer publishes an API, so they are
                read and entered by hand. Saying when they were last checked is
                the honest alternative to a page that looks live and is not.
                Day count beside it IS live: it derives from the founding date. */}
            <p className="mt-4 text-[11px] text-parchment/45">
              Day <span className="text-gold-bright/80 tabular-nums">{kingdom.currentDay}</span> of the realm
              <span className="mx-2 text-gold/25">&#9670;</span>
              Tracker figures verified {new Date(kingdom.trackerVerified + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <MetricCard label="KvK Rating" value={tracker846.kvk.rating.toFixed(3)} sub={`Global Rank #${tracker846.kvk.rank}`} />
        <MetricCard label="Atlas Score" value={tracker846.atlas.score.toFixed(2)} sub={`Rank #${tracker846.atlas.rank}`} />
        <MetricCard label="Latest KvK" value={`#${latestKvk.kvk}`} sub={`K846 vs ${latestKvk.opponent}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Total KvKs" value={total} tone="gold" />
            <Stat label="Dominations" value={tracker846.kvk.dominations} share={share(tracker846.kvk.dominations)} />
            <Stat label="Comebacks" value={tracker846.kvk.comebacks} share={share(tracker846.kvk.comebacks)} />
            <Stat label="Reversals" value={tracker846.kvk.reversals} share={share(tracker846.kvk.reversals)} />
            <Stat label="Invasions" value={tracker846.kvk.invasions} share={share(tracker846.kvk.invasions)} />
          </div>
          <div className="mt-4 gold-divider" />
          <div className="mt-4 overflow-hidden rounded-lg border border-gold/15">
            <table className="w-full text-[13px]">
              <thead className="bg-white/5 text-left text-[10px] uppercase tracking-wider text-parchment/50">
                <tr>
                  <th className="px-2.5 py-2">KvK</th>
                  <th className="px-2.5 py-2">Date</th>
                  <th className="px-2.5 py-2">Opponent</th>
                  <th className="px-2.5 py-2">Quality</th>
                  <th className="px-2.5 py-2">Prep</th>
                  <th className="px-2.5 py-2">Battle</th>
                </tr>
              </thead>
              <tbody>
                {history.map((k) => (
                  <tr key={k.kvk} className={`border-t border-white/5 hover:bg-white/5 ${k.current ? 'bg-gold/[.055]' : ''}`}>
                    <td className="px-2.5 py-2 text-parchment/60"><span className={k.current ? 'font-bold text-gold-bright' : ''}>#{k.kvk}</span></td>
                    <td className="px-2.5 py-2 whitespace-nowrap text-parchment/50">{fmtDate(k.date)}</td>
                    <td className="px-2.5 py-2 font-medium text-parchment">{k.opponent}<span className="ml-1 text-[10px] text-parchment/40">#{k.opponentRank}</span></td>
                    <td className="px-2.5 py-2 tabular-nums text-gold-bright">{k.quality.toFixed(2)}</td>
                    <td className="px-2.5 py-2"><ResultBadge r={k.prep} /></td>
                    <td className="px-2.5 py-2"><ResultBadge r={k.battle} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Prep Record" record={tracker846.kvk.prep.record} rate={tracker846.kvk.prep.winRate} streak={tracker846.kvk.prep.best} />
            <MiniStat label="Battle Record" record={tracker846.kvk.battle.record} rate={tracker846.kvk.battle.winRate} streak={tracker846.kvk.battle.best} />
          </div>
        </Panel>

        <div className="space-y-6 overflow-x-hidden">
          <Panel>
            <SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{tracker846.transfers[0].status}</Pill>} />
            <div className="mt-3 space-y-2">
              {tracker846.transfers.map((t) => (
                <div key={t.transfer} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-parchment">Transfer #{t.transfer}</div>
                    <div className="text-[10px] uppercase tracking-wider text-parchment/40">{t.date} · Group {t.group}</div>
                  </div>
                  <Pill tone={t.status === 'Leading' ? 'gold' : 'muted'}>{t.status}</Pill>
                </div>
              ))}
            </div>
          </Panel>
          <RatingEvolution />
        </div>
      </div>

      <Panel glow>
        <SectionTitle eyebrow="Kingdom Doctrine" title="The Crown's Code" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'One Crown', body: 'Four alliances, one kingdom. Every decision serves the realm first. Rallies are shared, intelligence is pooled, and the kingdom moves as one body in war.' },
            { title: 'Discipline Wins Wars', body: 'Shield coverage, march discipline, reinforcement timing, and prep-phase coordination turn strength into results.' },
            { title: 'Honor in Diplomacy', body: 'Clear communication and reliable coordination keep the realm stable between wars and focused when KvK begins.' },
            { title: 'Forged in Fire', body: `The recorded war history now leads through KvK ${latestKvk.kvk} against ${latestKvk.opponent}: preparation won and battle won.` },
          ].map((d) => (
            <div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-5">
              <div className="font-display text-lg font-bold text-gold-bright">{d.title}</div>
              <p className="mt-1.5 text-sm text-parchment/70 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-56">
          <ArtImage src="./assets/art-season-opening.png" alt="Kingdom 846 royal season artwork" className="h-full w-full" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,18,32,0.85) 0%, rgba(14,18,32,0.6) 50%, rgba(14,18,32,0.9) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="eyebrow text-gold-bright" style={{ textShadow: '0 2px 12px rgba(0,0,0,1)' }}>The Realm</div>
            <h2 className="mt-1 font-display text-3xl font-bold gradient-gold" style={{ textShadow: '0 2px 16px rgba(0,0,0,1), 0 0 20px rgba(212,175,55,0.3)' }}>The Forge of Legends</h2>
            <p className="mt-2 max-w-xl text-sm text-parchment" style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>One Crown. Four Alliances. Endless Glory.</p>
          </div>
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">
        Kingdom data: <a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Atlas</a> · <a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Optimizer</a>
      </p>
    </div>
  )
}

// `share` renders the count's percentage beside it. A bare "8" says nothing
// about whether that is most of the record or a fraction of it; "8 · 73%" does,
// and it costs no extra row.
function Stat({ label, value, tone, share }) {
  const c = tone === 'gold' ? 'text-gold-bright' : 'text-parchment'
  return (
    <div className="rounded-lg bg-white/5 p-3 text-center">
      <div className="flex items-baseline justify-center gap-1.5">
        <span className={`font-display text-2xl font-bold ${c}`}>{value}</span>
        {share != null && <span className="font-mono text-[11px] text-parchment/45">{share}%</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div>
    </div>
  )
}

function MiniStat({ label, record, rate, streak }) {
  return (
    <div className="rounded-lg border border-gold/15 bg-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-xl font-bold text-parchment">{record}</span>
        <span className="text-xs text-emerald-300">{rate}% win</span>
      </div>
      <div className="text-[10px] text-gold/70">Best streak {streak}</div>
    </div>
  )
}
