import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, transfers } from '../data/kingdom'
import { currentTracker } from '../data/currentTracker'

function MetricCard({ label, value, sub, tone = 'gold' }) {
  const valueClass = tone === 'blue' ? 'text-sky-300' : tone === 'parchment' ? 'text-parchment' : 'gradient-gold'
  return (
    <div className="panel relative overflow-hidden p-4 gold-corners">
      <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-gold/5 blur-2xl" />
      <div className="eyebrow mb-1">{label}</div>
      <div className={`stat-num relative ${valueClass}`}>{value}</div>
      {sub && <div className="relative mt-1 text-xs text-parchment/50">{sub}</div>}
    </div>
  )
}

function ResultBadge({ r }) {
  if (r === 'W') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-emerald-400/15 text-xs font-bold text-emerald-300">W</span>
  if (r === 'L') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-rose-400/15 text-xs font-bold text-rose-300">L</span>
  return <span className="inline-grid h-6 min-w-6 place-items-center rounded border border-gold/15 bg-white/5 px-1.5 text-xs font-bold text-parchment/35">—</span>
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const latest = {
    kvk: currentTracker.kvk,
    date: currentTracker.date,
    opponent: currentTracker.opponent,
    opponentRank: currentTracker.opponentRank,
    quality: currentTracker.quality,
    prep: currentTracker.prep,
    battle: currentTracker.battle,
    current: true,
  }
  const history = [latest, ...kvkHistory.filter((k) => k.kvk !== latest.kvk)]

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative min-h-72 overflow-hidden md:min-h-[390px]">
            <ArtImage src="./assets/hero-about.webp" alt="Kingdom 846 royal realm" className="h-full w-full drift-slow" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-ink/45" />
            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-lg border border-gold/25 bg-ink/80 px-3 py-2 shadow-xl backdrop-blur-sm">
              <Icon name="swords" size={18} className="text-gold" />
              <div>
                <div className="text-[9px] uppercase tracking-[.22em] text-gold/65">Latest KvK</div>
                <div className="font-display text-lg font-bold text-gold-bright">K846 vs {currentTracker.opponent}</div>
              </div>
            </div>
          </div>
          <div className="relative flex flex-col justify-center p-7 md:p-9">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-gold/5 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-2">
              <Pill tone="gold">KvK {currentTracker.kvk}</Pill>
              <Pill tone="red">vs {currentTracker.opponent}</Pill>
              <Pill tone="blue">{fmtDate(currentTracker.date)}</Pill>
            </div>
            <h1 className="relative mt-3 font-display text-4xl font-bold gradient-gold glow-pulse">Kingdom 846</h1>
            <p className="relative mt-1 text-sm text-gold-bright/80">“{kingdom.motto}”</p>
            <p className="relative mt-4 text-sm leading-relaxed text-parchment/72">
              Kingdom 846's current tracked matchup is <span className="font-semibold text-gold-bright">KvK {currentTracker.kvk} against {currentTracker.opponent}</span> on {fmtDate(currentTracker.date)}. The current Optimizer dataset now runs through KvK {currentTracker.optimizerDatasetKvks} with {currentTracker.optimizerMatchups.toLocaleString()} recorded matchups across {currentTracker.optimizerKingdoms.toLocaleString()} kingdoms.
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2">
              <a href={kingdom.source} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="arrow" size={14} /> K846 Atlas
              </a>
              <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="swords" size={14} /> K846 Optimizer
              </a>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Latest KvK" value={`#${currentTracker.kvk}`} sub={fmtDate(currentTracker.date)} />
        <MetricCard label="Latest Opponent" value={currentTracker.opponent} sub="Kingdom 846 matchup" tone="parchment" />
        <MetricCard label="K846 Tracked KvKs" value={currentTracker.trackedKvks} sub={`KvK 7–${currentTracker.kvk}`} />
        <MetricCard label="Optimizer Dataset" value={`KvK ${currentTracker.optimizerDatasetKvks}`} sub={`${currentTracker.optimizerMatchups.toLocaleString()} matchups`} tone="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="gold">Latest · {currentTracker.opponent}</Pill>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Latest KvK" value={`#${currentTracker.kvk}`} tone="gold" />
            <Stat label="Latest Opponent" value={currentTracker.opponent} />
            <Stat label="Tracked KvKs" value={currentTracker.trackedKvks} />
            <Stat label="Dataset Through" value={`#${currentTracker.optimizerDatasetKvks}`} />
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
                {history.map((k) => (
                  <tr key={k.kvk} className={`border-t border-white/5 hover:bg-white/5 ${k.current ? 'bg-gold/[.055]' : ''}`}>
                    <td className="px-3 py-2 text-parchment/60">
                      <span className={k.current ? 'font-bold text-gold-bright' : ''}>#{k.kvk}</span>
                      {k.current && <span className="ml-2 rounded border border-gold/20 bg-gold/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-gold">Latest</span>}
                    </td>
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
          <div className="mt-4 rounded-lg border border-gold/15 bg-gradient-to-r from-gold/5 via-white/[.025] to-transparent p-4">
            <div className="flex items-start gap-3">
              <Icon name="crown" size={20} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <div className="font-display text-sm font-bold text-gold-bright">KvK 17 is now the active latest record</div>
                <p className="mt-1 text-xs leading-relaxed text-parchment/55">K795 has been added ahead of K623. Phase-result cells remain neutral until the source detail for the K846 row is available, so the portal does not turn an unknown result into a false win or loss.</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{kingdom.transferStatus}</Pill>} />
          <div className="mt-3 space-y-2">
            {transfers.map((t) => (
              <div key={t.transfer} className="flex items-center justify-between rounded-lg border border-transparent bg-white/5 px-3 py-2 transition hover:border-gold/15 hover:bg-gold/5">
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
            { title: 'Forged in Fire', body: `${currentTracker.trackedKvks} tracked KvK matchups now lead into the latest chapter against ${currentTracker.opponent}. Every battle adds another page to 846's war record.` },
          ].map((d) => (
            <div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-5 transition hover:border-gold/30 hover:bg-gold/5">
              <div className="font-display text-lg font-bold text-gold-bright">{d.title}</div>
              <p className="mt-1.5 text-sm text-parchment/70 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-72">
          <ArtImage src="./assets/art-castle-battle.png" alt="Kingdom 846 castle battle" className="h-full w-full drift-slow" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,18,32,.38) 0%, rgba(14,18,32,.58) 50%, rgba(14,18,32,.94) 100%)' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="eyebrow text-gold-bright">The Realm</div>
            <h2 className="mt-1 font-display text-3xl font-bold gradient-gold glow-pulse">The Forge of Legends</h2>
            <p className="mt-2 max-w-xl text-sm text-parchment">One Crown. Four Alliances. Kingdom 846.</p>
          </div>
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">
        Live references: <a href={kingdom.source} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Atlas</a> · <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Optimizer</a>
      </p>
    </div>
  )
}

function Stat({ label, value, tone }) {
  const c = tone === 'gold' ? 'text-gold-bright' : 'text-parchment'
  return (
    <div className="rounded-lg border border-gold/10 bg-white/5 p-3 text-center">
      <div className={`font-display text-2xl font-bold ${c}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div>
    </div>
  )
}
