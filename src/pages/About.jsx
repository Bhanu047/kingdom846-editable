import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers, reputation } from '../data/kingdom'

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
  return <span className="inline-grid h-6 w-6 place-items-center rounded bg-rose-400/15 text-xs font-bold text-rose-300">L</span>
}

function Stars({ n }) {
  return (
    <span className="text-gold-bright">{'★'.repeat(Math.round(n))}<span className="text-parchment/20">{'★'.repeat(5 - Math.round(n))}</span></span>
  )
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const domPct = Math.round((kvkStats.dominations / kvkStats.total) * 100)
  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Hero */}
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative h-64 md:h-full">
            <ArtImage src="./assets/art-kingdom-status.png" alt="Kingdom 846 castle at sunset" className="h-full w-full drift-slow" />
          </div>
          <div className="p-7 md:p-9">
            <div className="flex items-center gap-2">
              <Pill tone="gold">{kingdom.tier}</Pill>
              <Pill tone="blue">Global Rank #{kingdom.kvkCurrentRank}</Pill>
              <Pill tone="muted">{kingdom.atlasPercentile}</Pill>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold gradient-gold glow-pulse">Kingdom 846</h1>
            <p className="mt-1 text-sm text-gold-bright/80">"{kingdom.motto}"</p>
            <p className="mt-3 text-sm leading-relaxed text-parchment/70">
              Kingdom 846 is an <span className="text-gold-bright">S-Tier</span> realm — a battle-hardened
              kingdom with a <span className="text-gold-bright">70% domination rate</span> across ten Kingdom vs Kingdom
              wars. Feared on the field, respected in diplomacy, and holding a perfect
              <span className="text-gold-bright"> 5.0/5.0 rival reputation</span>. We don't wait for glory. We take it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={kingdom.source} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="arrow" size={14} /> Atlas Profile
              </a>
              <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="swords" size={14} /> KvK Rankings
              </a>
              <span className="btn-ghost"><Icon name="fire" size={14} /> {kingdom.season}</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Core metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <MetricCard label="KvK Rating" value={kingdom.kvkRating} sub={`Global Rank #${kingdom.kvkCurrentRank}`} />
        <MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={kingdom.atlasPercentile} />
        <MetricCard label="KvK Dominations" value={`${kvkStats.dominations}/${kvkStats.total}`} sub={`${domPct}% domination rate`} />
      </div>

      {/* KvK record + transfer */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="green">{kvkStats.prepStreak} streak</Pill>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total KvK" value={kvkStats.total} />
            <Stat label="Dominations" value={kvkStats.dominations} tone="gold" />
            <Stat label="Comebacks" value={kvkStats.comebacks} />
            <Stat label="Reversals" value={kvkStats.reversals} />
          </div>
          <div className="mt-4 gold-divider" />
          <div className="mt-4 overflow-x-auto rounded-lg border border-gold/15">
            <table className="w-full text-sm">
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
                {kvkHistory.map((k) => (
                  <tr key={k.kvk} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-3 py-2 text-parchment/60">#{k.kvk}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-parchment/50">{fmtDate(k.date)}</td>
                    <td className="px-3 py-2 font-medium text-parchment">{k.opponent} <span className="text-[10px] text-parchment/40">#{k.opponentRank}</span></td>
                    <td className="px-3 py-2 text-gold-bright">{k.quality.toFixed(2)}</td>
                    <td className="px-3 py-2"><ResultBadge r={k.prep} /></td>
                    <td className="px-3 py-2"><ResultBadge r={k.battle} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Prep Phase" record={kvkStats.prepRecord} rate={kvkStats.prepWinRate} streak={kvkStats.prepStreak} />
            <MiniStat label="Battle Phase" record={kvkStats.battleRecord} rate={kvkStats.battleWinRate} streak={kvkStats.battleBestStreak} />
          </div>
        </Panel>

        <div className="space-y-6 overflow-x-hidden">
          <Panel>
            <SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{kingdom.transferStatus}</Pill>} />
            <p className="text-xs text-parchment/60">Last transfer led the group. Kingdom 846 consistently leads its transfer bracket.</p>
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

      {/* Kingdom Doctrine */}
      <Panel glow>
        <SectionTitle eyebrow="Kingdom Doctrine" title="The Crown's Code" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'One Crown', body: 'Four alliances, one kingdom. Every decision serves the realm first. No alliance fights alone — rallies are shared, intelligence is pooled, and the kingdom moves as one body in war.' },
            { title: 'Discipline Wins Wars', body: 'Shield coverage, march discipline, and prep-phase compliance are non-negotiable. The 80% win rate is built in preparation, not luck.' },
            { title: 'Honor in Diplomacy', body: 'A 5.0/5.0 rival reputation is sacred. NAPs are honored, comms are clean, and rivals become allies.' },
            { title: 'Forged in Fire', body: 'Ten wars. Seven dominations. A perfect diplomatic record. We do not wait for glory — we organize, we strike, and we hold what we conquer.' },
          ].map((d) => (
            <div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-5">
              <div className="font-display text-lg font-bold text-gold-bright">{d.title}</div>
              <p className="mt-1.5 text-sm text-parchment/70 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Lore banner */}
      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-56">
          <ArtImage src="./assets/art-season-opening.png" alt="Kingdom 846 season opening" className="h-full w-full" />
          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,18,32,0.85) 0%, rgba(14,18,32,0.6) 50%, rgba(14,18,32,0.9) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="eyebrow text-gold-bright" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>The Realm</div>
            <h2 className="mt-1 font-display text-3xl font-bold gradient-gold" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(212,175,55,0.3)' }}>The Forge of Legends</h2>
            <p className="mt-2 max-w-xl text-sm text-parchment" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>Ten wars. Seven dominations. A perfect diplomatic record. This is where alliances are tested, rivalries are forged, and legends are crowned in gold. Welcome to 846.</p>
          </div>
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">
        Kingdom data from <a href={kingdom.source} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Atlas</a> & <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Optimizer</a>. Some alliance and commander details are illustrative pending live roster import.
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
