import { Panel, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers } from '../data/kingdom'

function MetricCard({ label, value, sub }) {
  return (
    <div className="panel p-3">
      <div className="eyebrow mb-1 text-[10px]">{label}</div>
      <div className="stat-num text-lg">{value}</div>
      {sub && <div className="mt-1 text-[10px] text-parchment/50">{sub}</div>}
    </div>
  )
}

function ResultBadge({ r }) {
  if (r === 'W') return <span className="inline-grid h-5 w-5 place-items-center rounded bg-emerald-400/15 text-[10px] font-bold text-emerald-300">W</span>
  return <span className="inline-grid h-5 w-5 place-items-center rounded bg-rose-400/15 text-[10px] font-bold text-rose-300">L</span>
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function About() {
  const domPct = Math.round((kvkStats.dominations / kvkStats.total) * 100)
  return (
    <div className="space-y-4">
      {/* Hero - compact on mobile */}
      <Panel glow>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="gold">{kingdom.tier}</Pill>
          <Pill tone="blue">Global Rank #{kingdom.kvkCurrentRank}</Pill>
          <Pill tone="muted">{kingdom.atlasPercentile}</Pill>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-parchment">Kingdom 846</h1>
        <p className="mt-1 text-sm text-gold-bright/80">"{kingdom.motto}"</p>
        <p className="mt-2 text-sm leading-relaxed text-parchment/70">
          Kingdom 846 is an <span className="text-gold-bright">S-Tier</span> realm — a battle-hardened
          kingdom with a <span className="text-gold-bright">70% domination rate</span> across ten Kingdom vs Kingdom
          wars. Feared on the field, respected in diplomacy, and holding a perfect
          <span className="text-gold-bright"> 5.0/5.0 rival reputation</span>. We don't wait for glory. We take it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={kingdom.source} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
            <Icon name="arrow" size={12} /> Atlas Profile
          </a>
          <a href={kingdom.kvkSource} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
            <Icon name="swords" size={12} /> KvK Rankings
          </a>
          <span className="btn-ghost text-xs"><Icon name="fire" size={12} /> {kingdom.season}</span>
        </div>
      </Panel>

      {/* Core metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="KvK Rating" value={kingdom.kvkRating} sub={`Rank #${kingdom.kvkCurrentRank}`} />
        <MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={kingdom.atlasPercentile} />
        <MetricCard label="Dominations" value={`${kvkStats.dominations}/${kvkStats.total}`} sub={`${domPct}% rate`} />
      </div>

      {/* KvK record */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-parchment">KvK History</h2>
          <Pill tone="green">{kvkStats.prepStreak} streak</Pill>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <div className="font-display text-xl font-bold text-parchment">{kvkStats.total}</div>
            <div className="text-[9px] uppercase tracking-wider text-parchment/50">Total</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <div className="font-display text-xl font-bold text-gold-bright">{kvkStats.dominations}</div>
            <div className="text-[9px] uppercase tracking-wider text-parchment/50">Wins</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <div className="font-display text-xl font-bold text-parchment">{kvkStats.comebacks}</div>
            <div className="text-[9px] uppercase tracking-wider text-parchment/50">Comebacks</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2 text-center">
            <div className="font-display text-xl font-bold text-parchment">{kvkStats.reversals}</div>
            <div className="text-[9px] uppercase tracking-wider text-parchment/50">Reversals</div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gold/15">
          <table className="w-full text-xs">
            <thead className="bg-white/5 text-left text-[9px] uppercase tracking-wider text-parchment/50">
              <tr>
                <th className="px-2 py-2">KvK</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Opponent</th>
                <th className="px-2 py-2">Quality</th>
                <th className="px-2 py-2">Prep</th>
                <th className="px-2 py-2">Battle</th>
              </tr>
            </thead>
            <tbody>
              {kvkHistory.map((k) => (
                <tr key={k.kvk} className="border-t border-white/5">
                  <td className="px-2 py-2 text-parchment/60">#{k.kvk}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-parchment/50">{fmtDate(k.date)}</td>
                  <td className="px-2 py-2 font-medium text-parchment">{k.opponent} <span className="text-[9px] text-parchment/40">#{k.opponentRank}</span></td>
                  <td className="px-2 py-2 text-gold-bright">{k.quality.toFixed(2)}</td>
                  <td className="px-2 py-2"><ResultBadge r={k.prep} /></td>
                  <td className="px-2 py-2"><ResultBadge r={k.battle} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-gold/15 bg-white/5 p-2">
            <div className="text-[9px] uppercase tracking-wider text-parchment/50">Prep Phase</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-parchment">{kvkStats.prepRecord}</span>
              <span className="text-[10px] text-emerald-300">{kvkStats.prepWinRate}%</span>
            </div>
          </div>
          <div className="rounded-lg border border-gold/15 bg-white/5 p-2">
            <div className="text-[9px] uppercase tracking-wider text-parchment/50">Battle Phase</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-parchment">{kvkStats.battleRecord}</span>
              <span className="text-[10px] text-emerald-300">{kvkStats.battleWinRate}%</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Transfer Status */}
      <Panel>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg font-bold text-parchment">Transfer Status</h2>
          <Pill tone="gold">{kingdom.transferStatus}</Pill>
        </div>
        <p className="text-xs text-parchment/60 mb-2">Last transfer led the group.</p>
        <div className="space-y-2">
          {transfers.map((t) => (
            <div key={t.transfer} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <div>
                <div className="text-sm font-semibold text-parchment">Transfer #{t.transfer}</div>
                <div className="text-[9px] uppercase tracking-wider text-parchment/40">{t.date} · Group {t.group}</div>
              </div>
              <Pill tone={t.status === 'Leading' ? 'gold' : 'muted'}>{t.status}</Pill>
            </div>
          ))}
        </div>
      </Panel>

      {/* Doctrine */}
      <Panel glow>
        <h2 className="font-display text-lg font-bold text-parchment mb-3">Kingdom Doctrine</h2>
        <div className="space-y-2">
          {[
            { title: 'United We Rise', body: 'No alliance fights alone. Rallies are shared, intelligence is pooled, and the kingdom moves as one body in war.' },
            { title: 'Discipline Wins Wars', body: 'Shield coverage, march discipline, and prep-phase compliance are non-negotiable.' },
            { title: 'Honor in Diplomacy', body: 'A 5.0/5.0 rival reputation is sacred. NAPs are honored, comms are clean.' },
            { title: 'Take What Is Ours', body: 'We do not wait for glory. We organize, we strike, and we hold what we conquer.' },
          ].map((d) => (
            <div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-3">
              <div className="font-display text-sm font-bold text-gold-bright">{d.title}</div>
              <p className="mt-1 text-xs text-parchment/70 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
