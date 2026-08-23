import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom } from '../data/kingdom'
import { tracker846 } from '../data/tracker846'

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
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const history = tracker846.kvk.history.map((k) => ({ ...k, current: k.kvk === latestKvk.kvk }))
  return (
    <div className="space-y-6 overflow-x-hidden">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div>
          <div className="relative h-60 overflow-hidden md:h-80">
            <ArtImage src="./assets/royal-hall.jpg" alt="The great hall of Kingdom 846" className="h-full w-full hall-breathe" />
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
          <SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="gold">Latest · {latestKvk.opponent}</Pill>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Latest Opponent" value={latestKvk.opponent} tone="gold" />
            <Stat label="Dominations" value={tracker846.kvk.dominations} />
            <Stat label="Comebacks" value={tracker846.kvk.comebacks} />
            <Stat label="Reversals" value={tracker846.kvk.reversals} />
            <Stat label="Invasions" value={tracker846.kvk.invasions} />
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
                    <td className="px-3 py-2 font-medium text-parchment">{k.opponent}<span className="ml-1 text-[10px] text-parchment/40">#{k.opponentRank}</span></td>
                    <td className="px-3 py-2 text-gold-bright">{k.quality.toFixed(2)}</td>
                    <td className="px-3 py-2"><ResultBadge r={k.prep} /></td>
                    <td className="px-3 py-2"><ResultBadge r={k.battle} /></td>
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
