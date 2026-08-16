import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers } from '../data/kingdom'

function MetricCard({ label, value, sub }) {
  return <div className="panel p-4 gold-corners"><div className="eyebrow mb-1">{label}</div><div className="stat-num gradient-gold">{value}</div>{sub && <div className="mt-1 text-xs text-parchment/50">{sub}</div>}</div>
}
function ResultBadge({ r }) {
  if (r === 'W') return <span className="inline-grid h-6 w-6 place-items-center rounded bg-emerald-400/15 text-xs font-bold text-emerald-300">W</span>
  return <span className="inline-grid h-6 w-6 place-items-center rounded bg-rose-400/15 text-xs font-bold text-rose-300">L</span>
}
function fmtDate(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function About() {
  const domPct = Math.round((kvkStats.dominations / kvkStats.total) * 100)
  return <div className="space-y-6 overflow-x-hidden">
    <Panel glow className="relative overflow-hidden p-0 gold-corners">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="relative h-64 md:h-full"><ArtImage src="./assets/hero-about.webp" alt="Kingdom 846 royal realm" className="h-full w-full drift-slow" /></div>
        <div className="p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2"><Pill tone="gold">{kingdom.tier}</Pill><Pill tone="blue">KvK Rank #{kingdom.kvkCurrentRank}</Pill><Pill tone="muted">{kingdom.atlasPercentile}</Pill></div>
          <h1 className="mt-3 font-display text-4xl font-bold gradient-gold glow-pulse">Kingdom 846</h1>
          <p className="mt-1 text-sm text-gold-bright/80">“{kingdom.motto}”</p>
          <p className="mt-3 text-sm leading-relaxed text-parchment/70">Kingdom 846 is tracked by <span className="text-gold-bright">Kingshot Atlas</span> for kingdom scouting/rankings and by <span className="text-gold-bright">Kingshot Optimizer</span> for KvK results and rating history. The latest Optimizer bulletin includes KvK 16 results from July 18, 2026 and confirms Kingdoms 759–846 were included in the July 29 progression alignment.</p>
          <div className="mt-5 flex flex-wrap gap-2"><a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14}/> Atlas Profile</a><a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="swords" size={14}/> KvK Rankings</a><span className="btn-ghost"><Icon name="crown" size={14}/> Kingdom 846</span></div>
        </div>
      </div>
    </Panel>

    <div className="grid grid-cols-2 gap-4 md:grid-cols-3"><MetricCard label="KvK Rating" value={kingdom.kvkRating} sub={`Global Rank #${kingdom.kvkCurrentRank}`}/><MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={kingdom.atlasPercentile}/><MetricCard label="KvK Dominations" value={`${kvkStats.dominations}/${kvkStats.total}`} sub={`${domPct}% domination rate`}/></div>

    <Panel glow className="overflow-hidden p-0"><div className="grid md:grid-cols-[1.1fr_.9fr]"><div className="relative min-h-60"><ArtImage src="./assets/hero-throne-room.webp" alt="Kingdom 846 throne room" className="h-full w-full"/></div><div className="p-6"><SectionTitle eyebrow="Live Community Sources" title="Kingdom Intelligence"/><p className="text-sm leading-relaxed text-parchment/65">Atlas is the scouting and kingdom-exploration source. Optimizer maintains the community KvK leaderboard and explains that rankings use historical prep and battle results, opponent strength, regularization, and time decay. These external sources can change after each KvK, so the buttons above remain the live reference points.</p><div className="mt-4 grid gap-2"><a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="royal-plaque flex items-center justify-between"><span className="font-semibold text-parchment">Kingshot Atlas · K846</span><Icon name="arrow" size={14} className="text-gold"/></a><a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="royal-plaque flex items-center justify-between"><span className="font-semibold text-parchment">Kingshot Optimizer · K846 KvK</span><Icon name="arrow" size={14} className="text-gold"/></a></div></div></div></Panel>

    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="lg:col-span-2"><SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="green">{kvkStats.prepStreak} streak</Pill>}/><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Total KvK" value={kvkStats.total}/><Stat label="Dominations" value={kvkStats.dominations} tone="gold"/><Stat label="Comebacks" value={kvkStats.comebacks}/><Stat label="Reversals" value={kvkStats.reversals}/></div><div className="mt-4 gold-divider"/><div className="mt-4 overflow-x-auto rounded-lg border border-gold/15"><table className="w-full text-sm"><thead className="bg-white/5 text-left text-[10px] uppercase tracking-wider text-parchment/50"><tr><th className="px-3 py-2">KvK</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Opponent</th><th className="px-3 py-2">Quality</th><th className="px-3 py-2">Prep</th><th className="px-3 py-2">Battle</th></tr></thead><tbody>{kvkHistory.map(k=><tr key={k.kvk} className="border-t border-white/5 hover:bg-white/5"><td className="px-3 py-2 text-parchment/60">#{k.kvk}</td><td className="px-3 py-2 whitespace-nowrap text-parchment/50">{fmtDate(k.date)}</td><td className="px-3 py-2 font-medium text-parchment">{k.opponent} <span className="text-[10px] text-parchment/40">#{k.opponentRank}</span></td><td className="px-3 py-2 text-gold-bright">{k.quality.toFixed(2)}</td><td className="px-3 py-2"><ResultBadge r={k.prep}/></td><td className="px-3 py-2"><ResultBadge r={k.battle}/></td></tr>)}</tbody></table></div><div className="mt-4 grid grid-cols-2 gap-3"><MiniStat label="Prep Phase" record={kvkStats.prepRecord} rate={kvkStats.prepWinRate} streak={kvkStats.prepStreak}/><MiniStat label="Battle Phase" record={kvkStats.battleRecord} rate={kvkStats.battleWinRate} streak={kvkStats.battleBestStreak}/></div></Panel>
      <div className="space-y-6 overflow-x-hidden"><Panel><SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{kingdom.transferStatus}</Pill>}/><p className="text-xs text-parchment/60">Transfer information is retained as kingdom history and should be checked against the live tracker before making transfer decisions.</p><div className="mt-3 space-y-2">{transfers.map(t=><div key={t.transfer} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"><div><div className="text-sm font-semibold text-parchment">Transfer #{t.transfer}</div><div className="text-[10px] uppercase tracking-wider text-parchment/40">{t.date} · Group {t.group}</div></div><Pill tone={t.status==='Leading'?'gold':'muted'}>{t.status}</Pill></div>)}</div></Panel></div>
    </div>

    <Panel glow><SectionTitle eyebrow="Kingdom Doctrine" title="The Crown's Code"/><div className="grid gap-4 md:grid-cols-2">{[
      {title:'One Crown',body:'Four alliances, one kingdom. Every decision serves the realm first. Rallies are shared, intelligence is pooled, and the kingdom moves together in war.'},
      {title:'Discipline Wins Wars',body:'Shield coverage, march discipline, prep planning, and synchronized rallies matter more than individual glory.'},
      {title:'Honor in Diplomacy',body:'NAPs, clean communication, and reliable coordination protect the kingdom between wars and strengthen it during KvK.'},
      {title:'Forged in Fire',body:'Every KvK adds another chapter. Results, opponent quality, and recent form are tracked through the linked community tools.'}
    ].map(d=><div key={d.title} className="rounded-lg border border-gold/15 bg-white/5 p-5"><div className="font-display text-lg font-bold text-gold-bright">{d.title}</div><p className="mt-1.5 text-sm text-parchment/70 leading-relaxed">{d.body}</p></div>)}</div></Panel>

    <Panel glow className="relative overflow-hidden p-0"><div className="relative h-64"><ArtImage src="./assets/hero-council.webp" alt="Kingdom 846 royal council" className="h-full w-full"/><div className="absolute inset-0" style={{background:'linear-gradient(180deg, rgba(14,18,32,.55) 0%, rgba(14,18,32,.68) 55%, rgba(14,18,32,.94) 100%)'}}/><div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"><img src="./assets/crest-846.png" alt="Kingdom 846 crest" className="mb-2 h-24 w-auto object-contain drop-shadow-2xl"/><div className="eyebrow text-gold-bright">The Realm</div><h2 className="mt-1 font-display text-3xl font-bold gradient-gold">The Forge of Legends</h2><p className="mt-2 max-w-xl text-sm text-parchment">Kingdom 846 — tracked by live community data, organized around its alliances, and built for coordinated kingdom warfare.</p></div></div></Panel>

    <p className="text-center text-[10px] text-parchment/30">Live references: <a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Atlas</a> &amp; <a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Optimizer</a>.</p>
  </div>
}
function Stat({label,value,tone}){return <div className="rounded-lg bg-white/5 p-3 text-center"><div className={`font-display text-2xl font-bold ${tone==='gold'?'text-gold-bright':'text-parchment'}`}>{value}</div><div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div></div>}
function MiniStat({label,record,rate,streak}){return <div className="rounded-lg border border-gold/15 bg-white/5 p-3"><div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-xl font-bold text-parchment">{record}</span><span className="text-xs text-emerald-300">{rate}% win</span></div><div className="text-[10px] text-gold/70">Best streak {streak}</div></div>}
