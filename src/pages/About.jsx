import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom, kvkHistory, kvkStats, transfers } from '../data/kingdom'

const TRACKER_CHECKED = 'Aug 16, 2026'

function MetricCard({ label, value, sub }) {
  return <div className="panel p-4 gold-corners"><div className="eyebrow mb-1">{label}</div><div className="stat-num gradient-gold">{value}</div>{sub&&<div className="mt-1 text-xs text-parchment/50">{sub}</div>}</div>
}
function ResultBadge({r}){return r==='W'?<span className="inline-grid h-6 w-6 place-items-center rounded bg-emerald-400/15 text-xs font-bold text-emerald-300">W</span>:<span className="inline-grid h-6 w-6 place-items-center rounded bg-rose-400/15 text-xs font-bold text-rose-300">L</span>}
function fmtDate(iso){return new Date(iso+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}

export default function About(){
  const domPct=Math.round((kvkStats.dominations/kvkStats.total)*100)
  return <div className="space-y-6 overflow-x-hidden">
    <Panel glow className="relative overflow-hidden p-0 gold-corners">
      <div className="grid md:grid-cols-2">
        <div className="relative min-h-72"><ArtImage src="./assets/hero-about.webp" alt="Kingdom 846 royal realm" className="h-full w-full"/></div>
        <div className="p-7 md:p-9">
          <div className="flex flex-wrap gap-2"><Pill tone="gold">{kingdom.tier}</Pill><Pill tone="blue">KvK Rank #{kingdom.kvkCurrentRank}</Pill><Pill tone="muted">{kingdom.atlasPercentile}</Pill></div>
          <div className="mt-5 flex items-center gap-4"><img src="./assets/crest-846.png?v=20260816-verified" alt="Kingdom 846 crest" className="h-28 w-auto object-contain drop-shadow-2xl"/><div><h1 className="font-display text-4xl font-bold gradient-gold">Kingdom 846</h1><p className="mt-1 text-sm text-gold-bright/80">“{kingdom.motto}”</p></div></div>
          <p className="mt-4 text-sm leading-relaxed text-parchment/70">The numeric cards below are the portal’s latest saved Kingdom 846 tracker snapshot. They are linked directly to the two community sources so members can confirm the live values whenever either tracker changes.</p>
          <div className="mt-3 text-[11px] uppercase tracking-wider text-parchment/40">Source check performed {TRACKER_CHECKED}</div>
          <div className="mt-5 flex flex-wrap gap-2"><a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14}/> Open K846 Atlas</a><a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="swords" size={14}/> Open K846 Optimizer</a></div>
        </div>
      </div>
    </Panel>

    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <MetricCard label="KvK Rating" value={kingdom.kvkRating} sub={`Saved rank #${kingdom.kvkCurrentRank}`}/>
      <MetricCard label="Atlas Score" value={kingdom.atlasScore} sub={`${kingdom.atlasPercentile} · saved snapshot`}/>
      <MetricCard label="Atlas Rank" value={`#${kingdom.atlasRank}`} sub={kingdom.tier}/>
      <MetricCard label="KvK Dominations" value={`${kvkStats.dominations}/${kvkStats.total}`} sub={`${domPct}% saved record`}/>
    </div>

    <Panel glow><SectionTitle eyebrow="Official Data References" title="Atlas + Optimizer"/><div className="grid gap-4 md:grid-cols-2">
      <a href="https://ks-atlas.com/kingdom/846" target="_blank" rel="noreferrer" className="royal-plaque block p-5"><div className="font-display text-xl font-bold text-gold-bright">Kingshot Atlas · Kingdom 846</div><p className="mt-2 text-sm text-parchment/65">Atlas describes its kingdom pages as scouting, ranking, comparison and KvK-history tools. Its live Kingdom 846 values are rendered in the browser, so this portal links to the live page rather than pretending a stale scrape is current.</p></a>
      <a href="https://kingshotoptimizer.com/kvk-rankings/kingdom/846" target="_blank" rel="noreferrer" className="royal-plaque block p-5"><div className="font-display text-xl font-bold text-gold-bright">Kingshot Optimizer · Kingdom 846</div><p className="mt-2 text-sm text-parchment/65">Optimizer’s July 18 bulletin confirms KvK 16 results were added to a dataset covering 8,312 matchups across 16 KvKs. Its ranking model accounts for opponent strength and separates prep and battle performance.</p></a>
    </div></Panel>

    <Panel><SectionTitle eyebrow="War Record" title="Kingdom vs Kingdom History" action={<Pill tone="green">{kvkStats.prepStreak} streak</Pill>}/><div className="overflow-x-auto rounded-lg border border-gold/15"><table className="w-full text-sm"><thead className="bg-white/5 text-left text-[10px] uppercase tracking-wider text-parchment/50"><tr><th className="px-3 py-2">KvK</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Opponent</th><th className="px-3 py-2">Quality</th><th className="px-3 py-2">Prep</th><th className="px-3 py-2">Battle</th></tr></thead><tbody>{kvkHistory.map(k=><tr key={k.kvk} className="border-t border-white/5"><td className="px-3 py-2">#{k.kvk}</td><td className="px-3 py-2 whitespace-nowrap text-parchment/50">{fmtDate(k.date)}</td><td className="px-3 py-2 font-medium">{k.opponent} <span className="text-[10px] text-parchment/40">#{k.opponentRank}</span></td><td className="px-3 py-2 text-gold-bright">{k.quality.toFixed(2)}</td><td className="px-3 py-2"><ResultBadge r={k.prep}/></td><td className="px-3 py-2"><ResultBadge r={k.battle}/></td></tr>)}</tbody></table></div></Panel>

    <Panel glow><SectionTitle eyebrow="Royal Artwork" title="The Realm in Pictures"/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
      ['./assets/hero-throne-room.webp','Royal Throne Room'],['./assets/hero-council.webp','Kingdom Council'],['./assets/art-castle-battle.png','Castle Battle'],['./assets/art-kvk-prep.png','KvK Preparation'],['./assets/art-bear-trap.png','Bear Hunt'],['./assets/hero-alliances.webp','Four Alliances']
    ].map(([src,label])=><div key={src} className="overflow-hidden rounded-xl border border-gold/15 bg-white/5"><ArtImage src={src} alt={label} className="h-44 w-full"/><div className="px-3 py-2 text-xs font-semibold text-parchment/70">{label}</div></div>)}</div></Panel>

    <div className="grid gap-6 lg:grid-cols-2"><Panel><SectionTitle eyebrow="Mobility" title="Transfer Status" action={<Pill tone="gold">{kingdom.transferStatus}</Pill>}/><div className="space-y-2">{transfers.map(t=><div key={t.transfer} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"><div><div className="text-sm font-semibold">Transfer #{t.transfer}</div><div className="text-[10px] text-parchment/40">{t.date} · Group {t.group}</div></div><Pill tone={t.status==='Leading'?'gold':'muted'}>{t.status}</Pill></div>)}</div></Panel><Panel glow className="relative overflow-hidden p-0"><div className="relative h-full min-h-64"><ArtImage src="./assets/hero-council.webp" alt="Kingdom council" className="h-full w-full"/><div className="absolute inset-0 bg-ink/60"/><div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"><img src="./assets/crest-846.png?v=20260816-verified" alt="Kingdom 846 crest" className="h-28 w-auto"/><div className="mt-2 eyebrow text-gold-bright">One Crown · Four Alliances</div><div className="mt-1 font-display text-2xl font-bold gradient-gold">Kingdom 846</div></div></div></Panel></div>
  </div>
}
