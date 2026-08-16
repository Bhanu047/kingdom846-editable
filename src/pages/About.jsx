import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers } from '../data/kingdom'

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

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const domPct = Math.round((kvkStats.dominations / kvkStats.total) * 100)

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative h-64 md:h-full">
            <ArtImage src="./assets/hero-about.webp" alt="Kingdom 846 royal realm" className="h-full w-full drift-slow" />
          </div>
          <div className="p-7 md:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="gold">{kingdom.tier}</Pill>
              <Pill tone="blue">KvK Rank #{kingdom.kvkCurrentRank}</Pill>
              <Pill tone="muted">{kingdom.atlasPercentile}</Pill>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold gradient-gold glow-pulse">Kingdom 846</h1>
            <p className="mt-1 text-sm text-gold-bright/80">“{kingdom.motto}”</p>
            <p className="mt-3 text-sm leading-relaxed text-parchment/70">
              Kingdom 846 stands among the strongest realms tracked by the community: <span className="text-gold-bright">{kingdom.tier}</span>,
              {' '}Atlas rank <span className="text-gold-bright">#{kingdom.atlasRank}</span>, and KvK rank <span className="text-gold-bright">#{kingdom.kvkCurrentRank}</span>.
              Across {kvkStats.total} recorded KvKs, 846 has {kvkStats.dominations} dominations with an {kvkStats.prepWinRate}% prep win rate and {kvkStats.battleWinRate}% battle win rate.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={kingdom.source} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="arrow" size={14} /> Atlas Profile
              </a>
              <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="swords" size={14} /> KvK Rankings
              </a>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={`Rank #${kingdom.atlasRank} · ${kingdom.atlasPercentile}`} />
        <MetricCard label="KvK Rating" value={kingdom.kvkRating} sub={`Global Rank #${kingdom.kvkCurrentRank}`} />
        <MetricCard label="Prep Record" value={kvkStats.prepRecord} sub={`${kvkStats.prepWinRate}% win rate`} />
        <MetricCard label="Battle Record" value={kvkStats.battleRecord} sub={`${kvkStats.battleWinRate}% win rate`} />
      </div>

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

      <Panel glow>
        <SectionTitle eyebrow="Kingdom Doctrine" title="The Crown's Code" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'One Crown', body: 'Four alliances, one kingdom. Every decision serves the realm first. Rallies are shared, intelligence is pooled, and 846 moves together in war.' },
            { title: 'Discipline Wins Wars', body: 'Preparation, shield coverage, march discipline, and synchronized rallies turn strength into results.' },
            { title: 'Honor in Diplomacy', body: 'Clear communication, reliable coordination, and respect between alliances keep the kingdom strong between wars.' },
            { title: 'Forged in Fire', body: `${kvkStats.total} recorded KvKs and ${kvkStats.dominations} dominations have built 846's war record — every battle adds another chapter.` },
          ].map((d) => (
            <div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-5">
              <div className="font-display text-lg font-bold text-gold-bright">{d.title}</div>
              <p className="mt-1.5 text-sm text-parchment/70 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-64">
          <ArtImage src="./assets/art-castle-battle.png" alt="Kingdom 846 castle battle" className="h-full w-full" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,18,32,.58) 0%, rgba(14,18,32,.62) 50%, rgba(14,18,32,.94) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="eyebrow text-gold-bright">The Realm</div>
            <h2 className="mt-1 font-display text-3xl font-bold gradient-gold">The Forge of Legends</h2>
            <p className="mt-2 max-w-xl text-sm text-parchment">One Crown. Four Alliances. Kingdom 846.</p>
          </div>
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">
        Kingdom data: <a href={kingdom.source} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Atlas</a> · <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Optimizer</a>
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
