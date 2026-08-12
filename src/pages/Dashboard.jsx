import { useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { RoyalSectionHeader, GraphicTile } from '../components/VisualElements'
import { kingdom, countdownTo, BANNERS } from '../data/kingdom'
import { apiJson } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useSiteData } from '../context/SiteDataContext'
import { useEgg, EggToast } from '../lib/useEgg'

const colorMap = {
  gold: 'text-gold', silver: 'text-slate-200', crimson: 'text-rose-300',
  blue: 'text-sky-300', violet: 'text-violet-300'
}

function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  return now
}

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth()
  const { data } = useSiteData()
  const [agentStatus, setAgentStatus] = useState(null)

  // Fetch AI agent insights for all visitors
  useEffect(() => {
    apiJson('/api/ai/status').then(setAgentStatus).catch(() => {})
    const id = setInterval(() => apiJson('/api/ai/status').then(setAgentStatus).catch(() => {}), 60000)
    return () => clearInterval(id)
  }, [])

  const players = data.players
  const alliances = data.alliances
  const news = data.news
  const guides = data.guides
  const events = data.events
  const isAdmin = user?.role === 'admin'
  useNow()
  const featured = events[0]
  const cd = featured ? countdownTo(featured.date) : { days: 0, hours: 0, mins: 0, secs: 0 }
  const top4 = alliances.slice(0, 4)
  const about = () => onNavigate('about')
  // Live king status (editable by Sparta via Master Console) — falls back to static defaults
  const [liveKing, setLiveKing] = useState(null)
  useEffect(() => { apiJson('/api/king-status').then(setLiveKing).catch(() => {}) }, [])
  // Live synced news + guides from API (same source as Guides & News pages)
  const [liveData, setLiveData] = useState(null)
  useEffect(() => { apiJson('/api/kingshot').then(setLiveData).catch(() => {}) }, [])
  // Merge: prefer live synced data, fall back to static
  const displayNews = liveData?.news?.length ? liveData.news : news
  const displayGuides = liveData?.guides?.length ? liveData.guides : guides
  const kingSlug = (liveKing?.alliance_tag || kingdom.kingTag || '').replace(/[\[\]]/g, '').toLowerCase()
  const kingAlliance = alliances.find(a => a.slug === kingSlug) || alliances.find(a => a.slug === kingdom.kingAllianceSlug) || alliances[0]
  const kingBanner = BANNERS[kingSlug] || BANNERS[kingdom.kingAllianceSlug] || BANNERS.ryo
  const kingName = liveKing?.name || kingdom.king
  const kingTitle = liveKing?.king_type || 'High King'
  const leadingAlliance = liveKing ? `${liveKing.alliance_tag} ${liveKing.alliance_name}` : kingdom.leadingAlliance
  const isLeadingAlliance = kingSlug === 'ryo'
  // Crown rotation: the king changes every 14 days after Castle Battle — next on Aug 15
  const NEXT_KING_CHANGE = '2026-08-15'
  const kc = countdownTo(NEXT_KING_CHANGE)

  return (
    <div className="space-y-6">
      {/* AI insights banner (if available) */}
      {agentStatus?.insights?.length > 0 && (
        <Panel glow className="gold-corners">
          <div className="flex items-center gap-2 mb-2">
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            <span className="text-[10px] uppercase tracking-wider text-gold/60">AI Advisor Insights</span>
          </div>
          <div className="space-y-1.5">
            {agentStatus.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-parchment/70">
                <span className="text-gold text-xs mt-0.5">◆</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel glow className="hero-frame relative overflow-hidden p-0 gold-corners">
        <div className="relative h-64 md:h-96 hero-shimmer">
          <ArtImage src="./assets/hero-throne-room.png" alt="Kingdom 846" className="h-full w-full drift-slow" />
          <div className="hero-overlay absolute inset-0" />
          <div className="rune-circle" style={{ right: '10%', top: '20%' }} />
          <div className="ember-field">
            <span className="ember" style={{ left: '15%', animationDelay: '0s' }} />
            <span className="ember" style={{ left: '35%', animationDelay: '1.5s' }} />
            <span className="ember" style={{ left: '55%', animationDelay: '3s' }} />
            <span className="ember" style={{ left: '75%', animationDelay: '4.5s' }} />
            <span className="ember" style={{ left: '25%', animationDelay: '2s' }} />
            <span className="ember" style={{ left: '65%', animationDelay: '6s' }} />
          </div>
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-6 md:p-10">
            <div className="eyebrow text-glow">Royal Portal</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-wide text-parchment drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] md:text-6xl gradient-gold glow-pulse">KINGDOM 846</h1>
            <p className="mt-1 font-display text-sm tracking-[0.15em] text-gold md:text-base text-glow">One Crown. Four Alliances. Endless Glory.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => onNavigate('alliances')} className="btn-primary btn-royal sparkle-btn"><Icon name="shield" size={14} /> View Alliances</button>
              <button onClick={() => onNavigate('about')} className="btn-secondary gold-border-hover"><Icon name="castle" size={14} /> Kingdom</button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GraphicTile image="./assets/hero-alliances.png" label="Alliances" sublabel="View ranks" icon="shield" onClick={() => onNavigate('alliances')} />
        <GraphicTile image="./assets/hero-events.png" label="Events" sublabel="Next countdown" icon="calendar" onClick={() => onNavigate('events')} badge={{ label: 'Live', tone: 'red' }} />
        <GraphicTile image="./assets/hero-apply-chief.png" label="Apply" sublabel="Chief / Noble" icon="crown" onClick={() => onNavigate('apply')} />
        <GraphicTile image="./assets/hero-transfer.png" label="Transfer" sublabel="Join 846" icon="castle" onClick={() => onNavigate('transfer')} />
      </div>

      {/* Apply CTA */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => onNavigate('apply-chief')} className="lift-glow gold-border-hover btn-royal flex items-center gap-3 rounded-lg border border-gold/30 p-4 text-left transition">
          <span className="font-display text-2xl text-gold fire-glow">♛</span>
          <div><div className="font-display font-bold text-parchment">Apply for Chief Minister</div><div className="text-xs text-parchment/50">Coordinate leadership and keep the realm united.</div></div>
          <Icon name="arrow" size={14} className="ml-auto text-gold" />
        </button>
        <button onClick={() => onNavigate('apply-noble')} className="lift-glow gold-border-hover btn-royal flex items-center gap-3 rounded-lg border border-gold/30 p-4 text-left transition">
          <span className="font-display text-2xl text-gold fire-glow">♜</span>
          <div><div className="font-display font-bold text-parchment">Apply for Noble Advisor</div><div className="text-xs text-parchment/50">Support appointments, coordination and event planning.</div></div>
          <Icon name="arrow" size={14} className="ml-auto text-gold" />
        </button>
      </div>

      {/* Kingdom Performance — summary stats; full detail in About Kingdom */}
      <Panel glow className="glass-panel">
        <RoyalSectionHeader icon="trophy" eyebrow="Records" title="Kingdom Performance" action={<button onClick={() => onNavigate('about')} className="text-xs text-gold hover:underline">View About →</button>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KvKStat onClick={about} label="S-Tier Atlas" value={kingdom.atlasScore} sub={`Rank #${kingdom.atlasRank} · ${kingdom.atlasPercentile}`} icon="landmark" />
          <KvKStat onClick={about} label="Mystic Trials" value={kingdom.mysticScore.toLocaleString()} sub={`Rank #${kingdom.mysticRank} · ${kingdom.mysticPercentile}`} icon="trophy" />
          <KvKStat onClick={about} label="Total KvKs" value={kingdom.kvkOverview.totalKvks} sub="All-time" icon="crown" />
          <KvKStat onClick={about} label="Transfer Status" value={kingdom.transferStatus} sub="Last KvK" icon="shield" />
        </div>
      </Panel>

      {/* Main grid: Alliance Ranking + Event Countdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alliance Ranking — 4 clickable banners */}
        <Panel className="lift-glow lg:col-span-2">
          <RoyalSectionHeader icon="shield" eyebrow="The Council" title="Alliance Ranking" action={<button onClick={() => onNavigate('alliances')} className="text-xs text-gold hover:underline">All →</button>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {top4.map((a) => (
              <button key={a.slug} onClick={() => onNavigate('alliances')} className="lift group relative overflow-hidden rounded-lg border border-gold/20">
                <div className="aspect-square overflow-hidden">
                  <ArtImage src={a.art} alt={a.name} className="h-full w-full transition duration-500 group-hover:scale-110" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <div className="badge-shine absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md border border-gold/50 bg-ink/80 font-display text-[11px] font-bold text-gold">{a.rank}</div>
                <div className="absolute inset-x-0 bottom-0 p-2 text-center">
                  <div className="font-display text-[11px] font-bold tracking-wide text-gold">{a.tag}</div>
                  <div className="truncate text-[10px] text-parchment/80">{a.name}</div>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Event Countdown */}
        {featured && (
        <Panel glow className="aurora-border">
          <SectionTitle eyebrow="Upcoming Event" title="Castle Battle" action={<Pill tone="gold">{featured.category}</Pill>} />
          <div className="mb-4">
            <ArtImage src={featured.art} alt={featured.title} className="h-24 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <CountCell label="Days" value={cd.days} />
            <CountCell label="Hrs" value={cd.hours} />
            <CountCell label="Mins" value={cd.mins} />
            <CountCell label="Secs" value={cd.secs} />
          </div>
          <button onClick={() => onNavigate('events')} className="btn-secondary mt-4 w-full"><Icon name="calendar" size={14} /> All Events</button>
        </Panel>
        )}
      </div>

      {/* Kingdom Status (King + alliance banner) | Hall of Legends (players) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kingdom Status — King + leading-alliance banner, tall card */}
        <Panel glow className="relative overflow-hidden lg:col-span-1 min-h-[460px]" >
          <div className="absolute inset-0 z-0">
            <img src={kingBanner} alt={`${kingAlliance.name} banner`} className="h-full w-full object-cover" style={{ filter: 'brightness(1.4) contrast(1.15) saturate(1.3)' }} loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
            <div className="absolute inset-0 ring-1 ring-inset ring-gold/15" />
          </div>
          <div className="relative z-10 flex h-full min-h-[460px] flex-col p-5">
            <SectionTitle eyebrow="Realm" title="Kingdom Status" action={isAdmin ? <button onClick={() => onNavigate('console')} className="text-xs text-gold hover:underline" data-testid="button-edit-king-status" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>Edit →</button> : undefined} />
            <div className="flex flex-1 flex-col justify-center gap-!3 py-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-ink/70 px-3 py-1 ">
                <Icon name="crown" size={14} className="text-gold" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold/90">{kingTitle}</span>
              </div>
              <div className="font-display text-4xl font-bold text-parchment drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{kingName}</div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-gold drop-shadow">{leadingAlliance}</span>
              </div>
              <div className="max-w-xs text-[11px] leading-relaxed text-parchment/70">The realm's {isLeadingAlliance ? 'leading ' : ''}alliance — {kingAlliance.tagline}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-ink/60 px-2.5 py-0.5 text-[10px] text-gold/80">
                <Icon name="clock" size={11} />
                Crown rotates every 14 days · next change Aug 15 · {kc.days}d {kc.hours}h {kc.mins}m {kc.secs}s
              </div>
            </div>
          </div>
        </Panel>

        {/* Hall of Legends — top 5 players, each backed by their alliance banner */}
        <Panel className="p-3 sm:p-4 lg:col-span-2">
          <SectionTitle eyebrow="Hall of Legends" title="Commander Rankings" action={<button onClick={() => onNavigate('rankings')} className="text-xs text-gold hover:underline">Full Rankings →</button>} />
          {players.length > 0 ? (
            <>
              <p className="-mt-1 mb-3 text-[11px] text-parchment/40">Position and name — the kingdom's elite.</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {players.slice(0, 5).map((p) => {
                  const banner = BANNERS[p.slug] || BANNERS.ryo
                  return (
                    <div key={p.rank} data-testid={`hall-${p.rank}`} className="lift group relative overflow-hidden rounded-xl ring-1 ring-gold/15 bg-ink transition hover:ring-gold/50">
                      <div className="absolute inset-0 z-0">
                        <img src={banner} alt={`${p.alliance} banner`} className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:opacity-100 group-hover:scale-105" style={{ filter: 'brightness(1.35) contrast(1.15) saturate(1.3)' }} loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/35 to-transparent" />
                      </div>
                      <div className="relative z-10 flex items-center gap-3 p-3">
                        <div className="badge-shine grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-gold/40 bg-ink/70 font-display text-sm font-bold text-gold ">#{p.rank}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-base font-bold text-parchment drop-shadow"><span className="text-gold">{p.tag}</span>{p.name}</div>
                          <div className="truncate text-[11px] font-medium text-parchment drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{p.alliance}</div>
                        </div>
                        <Icon name="shield" size={15} className="flex-shrink-0 text-gold/50" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="grid place-items-center py-12">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold/60"><Icon name="trophy" size={22} /></div>
                <p className="mt-3 text-sm text-parchment/50">No commander rankings yet.</p>
                <p className="text-xs text-parchment/40">Leaders can upload rosters via the Leader Portal to populate rankings.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* News + Guides */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <SectionTitle eyebrow="Realm" title="Kingdom News" action={<button onClick={() => onNavigate('news')} className="text-xs text-gold hover:underline">All →</button>} />
          <div className="space-y-3">
            {displayNews.slice(0, 4).map((n) => (
              <button key={n.id} onClick={() => onNavigate('news')} className="block w-full text-left">
                <div className="flex items-center gap-2">
                  <Pill tone="muted">{n.category}</Pill>
                  <span className="text-[10px] text-parchment/40">{n.date}</span>
                </div>
                <div className="mt-1 text-sm font-medium leading-snug text-parchment/90">{n.title}</div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="Strategy" title="Guides & Playbooks" action={<button onClick={() => onNavigate('guides')} className="text-xs text-gold hover:underline">All →</button>} />
          <div className="grid gap-4 md:grid-cols-3">
            {displayGuides.slice(0, 3).map((g) => (
              <button key={g.id} onClick={() => onNavigate('guides')} className="panel overflow-hidden text-left transition hover:panel-glow">
                <div className="relative h-24">
                  <ArtImage src={g.art} alt={g.title} className="h-full w-full" />
                  <div className="absolute inset-x-0 bottom-0 p-2"><h3 className="text-sm font-bold text-parchment drop-shadow">{g.title}</h3></div>
                </div>
                <div className="p-3">
                  <div className="mb-1"><Pill tone="blue">{g.category}</Pill></div>
                  <p className="text-xs text-parchment/60">{g.excerpt}</p>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <EggToast message={statusEgg.eggMsg} />
    </div>
  )
}

function CountCell({ label, value }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-ink/60 p-3 text-center">
      <div className="font-display text-2xl font-bold text-gold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-parchment/50">{label}</div>
    </div>
  )
}

function KvKStat({ onClick, label, value, sub, icon }) {
  return (
    <button onClick={onClick} className="lift group rounded-lg border border-gold/15 bg-white/5 p-3 text-left transition hover:border-gold/40 hover:bg-white/10" data-testid={`stat-${label}`}>
      <div className="flex items-center justify-between">
        <Icon name={icon} size={14} className="text-gold/60" />
        <span className="text-[9px] uppercase tracking-wider text-parchment/30 transition group-hover:text-gold/60">About →</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold text-parchment">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</div>
      {sub && <div className="text-[10px] text-gold/60">{sub}</div>}
    </button>
  )
}
