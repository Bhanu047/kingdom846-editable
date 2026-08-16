import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers, reputation } from '../data/kingdom'
import { currentTracker } from '../data/currentTracker'

function MetricCard({ label, value, sub, tone = 'gold' }) {
  const valueClass = tone === 'blue' ? 'text-sky-300' : tone === 'parchment' ? 'text-parchment' : 'gradient-gold'
  return (
    <div className="panel relative overflow-hidden p-4 gold-corners">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-gold/5 blur-2xl" />
      <div className="eyebrow mb-1">{label}</div>
      <div className={`stat-num relative ${valueClass}`}>{value}</div>
      {sub && <div className="relative mt-1 text-xs text-parchment/50">{sub}</div>}
    </div>
  )
}

function ResultBadge({ r }) {
  if (r === 'W') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-emerald-400/15 text-xs font-bold text-emerald-300">W</span>
  if (r === 'L') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-rose-400/15 text-xs font-bold text-rose-300">L</span>
  return <span className="text-parchment/25">—</span>
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const latest = { kvk: currentTracker.kvk, date: currentTracker.date, opponent: currentTracker.opponent, opponentRank: currentTracker.opponentRank, quality: currentTracker.quality, prep: currentTracker.prep, battle: currentTracker.battle, current: true }
  const history = [latest, ...kvkHistory.filter(k => k.kvk !== latest.kvk)]
  const domPct = Math.round((kvkStats.dominations / kvkStats.total) * 100)

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative h-64 overflow-hidden sm:h-72 md:h-auto md:min-h-[390px]">
            <ArtImage src="./assets/hero-about.webp" alt="Kingdom 846 royal realm" className="h-full w-full drift-slow" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-ink/45" />
            <div className="absolute bottom-4 left-4 rounded-lg border border-gold/30 bg-ink/80 px-3 py-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-[.22em] text-gold/65">Latest Kingdom War</div>
              <div className="font-display text-lg font-bold text-gold-bright">K846 vs {currentTracker.opponent}</div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center p-6 sm:p-7 md:p-9">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-gold/5 blur-3xl" />
            <div className="relative flex flex-wrap gap-2">
              <Pill tone="gold">{kingdom.tier}</Pill>
              <Pill tone="red">KvK {currentTracker.kvk} · {currentTracker.opponent}</Pill>
              <Pill tone="blue">{fmtDate(currentTracker.date)}</Pill>
            </div>
            <h1 className="relative mt-3 font-display text-3xl font-bold gradient-gold glow-pulse sm:text-4xl">Kingdom 846</h1>
            <p className="relative mt-1 text-sm text-gold-bright/80">“{kingdom.motto}”</p>
            <p className="relative mt-4 max-w-xl text-sm leading-relaxed text-parchment/72">
              Four alliances. One crown. Kingdom 846 is built around disciplined preparation, shared intelligence, and coordinated battlefield command. <span className="font-semibold text-gold-bright">KvK {currentTracker.kvk} against {currentTracker.opponent}</span> is the newest chapter in the realm's war record.
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2">
              <a href={kingdom.source} target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14} /> Atlas Profile</a>
              <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="swords" size={14} /> KvK Rankings</a>
              <span className="btn-ghost"><Icon name="crown" size={14} /> Royal Realm</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Latest KvK" value={`#${currentTracker.kvk}`} sub={fmtDate(currentTracker.date)} />
        <MetricCard label="Latest Opponent" value={currentTracker.opponent} sub="Kingdom 846 matchup" tone="parchment" />
        <MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={`Rank #${kingdom.atlasRank} · ${kingdom.atlasPercentile}`} />
        <MetricCard label="Scored Dominations" value={`${kvkStats.dominations}/${kvkStats.total}`} sub={`${domPct}% through KvK 16`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="gold">Latest · {currentTracker.opponent}</Pill>} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Recorded KvKs" value={currentTracker.trackedKvks} tone="gold" />
            <Stat label="Dominations" value={kvkStats.dominations} />
            <Stat label="Prep Through #16" value={kvkStats.prepRecord} />
            <Stat label="Battle Through #16" value={kvkStats.battleRecord} />
          </div>

          <div className="mt-4 gold-divider" />
          <div className="mt-4 overflow-x-auto rounded-lg border border-gold/15">
            <table className="min-w-[650px] w-full text-sm">
              <thead className="bg-white/5 text-left text-[10px] uppercase tracking-wider text-parchment/50">
                <tr><th className="px-3 py-2">KvK</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Opponent</th><th className="px-3 py-2">Quality</th><th className="px-3 py-2">Prep</th><th className="px-3 py-2">Battle</th></tr>
              </thead>
              <tbody>
                {history.map(k => (
                  <tr key={k.kvk} className={`border-t border-white/5 hover:bg-white/5 ${k.current ? 'bg-gold/[.055]' : ''}`}>
                    <td className="px-3 py-2 text-parchment/60"><span className={k.current ? 'font-bold text-gold-bright' : ''}>#{k.kvk}</span>{k.current && <span className="ml-2 rounded border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-gold">Latest</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-parchment/50">{fmtDate(k.date)}</td>
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
            <MiniStat label="Prep Phase · through KvK 16" record={kvkStats.prepRecord} rate={kvkStats.prepWinRate} streak={kvkStats.prepStreak} />
            <MiniStat label="Battle Phase · through KvK 16" record={kvkStats.battleRecord} rate={kvkStats.battleWinRate} streak={kvkStats.battleBestStreak} />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{kingdom.transferStatus}</Pill>} />
            <div className="mt-3 space-y-2">
              {transfers.map(t => <div key={t.transfer} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 transition hover:bg-gold/5"><div><div className="text-sm font-semibold text-parchment">Transfer #{t.transfer}</div><div className="text-[10px] uppercase tracking-wider text-parchment/40">{t.date} · Group {t.group}</div></div><Pill tone={t.status === 'Leading' ? 'gold' : 'muted'}>{t.status}</Pill></div>)}
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Rival Reputation" title="Respected Beyond 846" action={<Pill tone="green">{reputation.overall.toFixed(1)}/5</Pill>} />
            <p className="text-sm leading-relaxed text-parchment/65">Organization matters beyond the scoreboard. Clear diplomacy and coordinated castle play remain part of 846's identity.</p>
          </Panel>
        </div>
      </div>

      <Panel glow>
        <SectionTitle eyebrow="Kingdom Doctrine" title="The Crown's Code" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'One Crown', body: 'Four alliances, one kingdom. Intelligence, rallies, and battlefield decisions serve the realm first.' },
            { title: 'Discipline Wins Wars', body: 'Preparation is deliberate. Shields, marches, reinforcements, and rally timing are coordinated before the first attack.' },
            { title: 'Honor in Diplomacy', body: 'Strong diplomacy keeps the kingdom stable between wars and focused when KvK begins.' },
            { title: 'Forged in Fire', body: `The war record now reaches KvK ${currentTracker.kvk}. Every opponent adds another chapter to Kingdom 846.` },
          ].map(d => <div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-5 transition hover:border-gold/30 hover:bg-gold/5"><div className="font-display text-lg font-bold text-gold-bright">{d.title}</div><p className="mt-1.5 text-sm leading-relaxed text-parchment/70">{d.body}</p></div>)}
        </div>
      </Panel>

      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="relative h-64 sm:h-72">
          <ArtImage src="./assets/art-castle-battle.png" alt="Kingdom 846 castle battle" className="h-full w-full drift-slow" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,18,32,.55), rgba(14,18,32,.48) 45%, rgba(14,18,32,.92))' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="eyebrow text-gold-bright">The Realm</div>
            <h2 className="mt-1 font-display text-3xl font-bold gradient-gold glow-pulse">The Forge of Legends</h2>
            <p className="mt-2 max-w-xl text-sm text-parchment/90">One Crown. Four Alliances. Endless Glory.</p>
          </div>
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">Kingdom tracking references: <a href={kingdom.source} target="_blank" rel="noreferrer" className="text-gold/70 underline">Kingshot Atlas</a> · <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="text-gold/70 underline">Kingshot Optimizer</a></p>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return <div className="rounded-lg bg-white/5 p-3 text-center"><div className={`font-display text-2xl font-bold ${tone === 'gold' ? 'text-gold-bright' : 'text-parchment'}`}>{value}</div><div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div></div>
}

function MiniStat({ label, record, rate, streak }) {
  return <div className="rounded-lg border border-gold/15 bg-white/5 p-3"><div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-xl font-bold text-parchment">{record}</span><span className="text-xs text-emerald-300">{rate}% win</span></div><div className="text-[10px] text-gold/70">Best streak {streak}</div></div>
}
