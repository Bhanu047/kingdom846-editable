import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers } from '../data/kingdom'

const latestKvk = { kvk: 17, date: null, opponent: 'K795', opponentRank: null, quality: null, prep: null, battle: null, current: true }

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
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const history = [latestKvk, ...kvkHistory.filter((k) => k.kvk !== latestKvk.kvk)]
  return (
    <div className="space-y-6 overflow-x-hidden">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative h-64 md:h-full">
            <ArtImage src="./assets/art-kingdom-status.png" alt="Kingdom 846 castle at sunset" className="h-full w-full drift-slow" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-ink/35" />
          </div>
          <div className="p-7 md:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="gold">{kingdom.tier}</Pill>
              <Pill tone="blue">KvK #{latestKvk.kvk}</Pill>
              <Pill tone="red">vs {latestKvk.opponent}</Pill>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold gradient-gold glow-pulse">Kingdom 846</h1>
            <p className="mt-1 text-sm text-gold-bright/80">“{kingdom.motto}”</p>
            <p className="mt-3 text-sm leading-relaxed text-parchment/70">
              Kingdom 846 is an <span className="text-gold-bright">S-Tier</span> realm built around four alliances moving under one crown. Discipline in preparation, coordinated rallies, and kingdom-first command define the realm. The newest KvK chapter is <span className="text-gold-bright">K846 vs K795</span>.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14} /> Atlas Profile</a>
              <a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="swords" size={14} /> KvK Rankings</a>
              <span className="btn-ghost"><Icon name="crown" size={14} /> Kingdom 846</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <MetricCard label="KvK Rating" value={kingdom.kvkRating} sub={`Global Rank #${kingdom.kvkCurrentRank}`} />
        <MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={`Rank #${kingdom.atlasRank} · ${kingdom.atlasPercentile}`} />
        <MetricCard label="Latest KvK" value={`#${latestKvk.kvk}`} sub={`K846 vs ${latestKvk.opponent}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="gold">Latest · {latestKvk.opponent}</Pill>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Latest Opponent" value={latestKvk.opponent} tone="gold" />
            <Stat label="Dominations" value={kvkStats.dominations} />
            <Stat label="Comebacks" value={kvkStats.comebacks} />
            <Stat label="Reversals" value={kvkStats.reversals} />
          </div>
          <div className="mt-4 gold-divider" />
          <div className="mt-4 overflow-x-auto rounded-lg border border-gold/15">
            <table className="min-w-[650px] w-full text-sm">
              <thead className="bg-white/5 text-left text-[10px] uppercase tracking-wider text-parchment/50">
                <tr>
                  <th className="px-3 py-2">KvK</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Opponent</th>
                  <th className="px-3 py-2">Quality</th>
                  <th className="px-3 py-2">Prep</th>
                  <th className="px-3 py-2">Battle</th>
                </tr>
              </thead>
              <tbody>
                {history.map((k) => (
                  <tr key={k.kvk} className={`border-t border-white/5 hover:bg-white/5 ${k.current ? 'bg-gold/[.055]' : ''}`}>
                    <td className="px-3 py-2 text-parchment/60"><span className={k.current ? 'font-bold text-gold-bright' : ''}>#{k.kvk}</span>{k.current && <span className="ml-2 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-gold">Latest</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-parchment/50">{fmtDate(k.date)}</td>
                    <td className="px-3 py-2 font-medium text-parchment">{k.opponent}{k.opponentRank ? <span className="ml-1 text-[10px] text-parchment/40">#{k.opponentRank}</span> : null}</td>
                    <td className="px-3 py-2 text-gold-bright">{typeof k.quality === 'number' ? k.quality.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2"><ResultBadge r={k.prep} /></td>
                    <td className="px-3 py-2"><ResultBadge r={k.battle} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Prep Record" record={kvkStats.prepRecord} rate={kvkStats.prepWinRate} streak={kvkStats.prepStreak} />
            <MiniStat label="Battle Record" record={kvkStats.battleRecord} rate={kvkStats.battleWinRate} streak={kvkStats.battleBestStreak} />
          </div>
        </Panel>

        <div className="space-y-6 overflow-x-hidden">
          <Panel>
            <SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{kingdom.transferStatus}</Pill>} />
            <div className="mt-3 space-y-2">
              {transfers.map((t) => (
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
        </div>
      </div>

      <Panel glow>
        <SectionTitle eyebrow="Kingdom Doctrine" title="The Crown's Code" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'One Crown', body: 'Four alliances, one kingdom. Every decision serves the realm first. Rallies are shared, intelligence is pooled, and the kingdom moves as one body in war.' },
            { title: 'Discipline Wins Wars', body: 'Shield coverage, march discipline, reinforcement timing, and prep-phase coordination turn strength into results.' },
            { title: 'Honor in Diplomacy', body: 'Clear communication and reliable coordination keep the realm stable between wars and focused when KvK begins.' },
            { title: 'Forged in Fire', body: `The recorded war history now leads into KvK ${latestKvk.kvk} against ${latestKvk.opponent}. Every opponent adds another chapter to Kingdom 846.` },
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

function Stat({ label, value, tone }) {
  const c = tone === 'gold' ? 'text-gold-bright' : 'text-parchment'
  return (
    <div className="rounded-lg bg-white/5 p-3 text-center">
      <div className={`font-display text-2xl font-bold ${c}`}>{value}</div>
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
