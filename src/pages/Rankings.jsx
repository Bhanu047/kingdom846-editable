import { useState, useEffect, useRef, useCallback } from 'react'
import { Panel } from '../components/ui'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'
import { useSiteData } from '../context/SiteDataContext'
import { BANNERS } from '../data/kingdom'
import { EggToast } from '../lib/useEgg'

// Top-3 special styling (gold / silver / bronze)
const PODIUM = {
  1: {
    grad: 'from-gold/25 via-amber-500/10 to-transparent',
    ring: 'ring-gold/60',
    badge: 'bg-gradient-to-b from-gold-bright to-gold text-ink shadow-[0_0_18px_-2px_rgba(212,175,55,.6)]',
    crown: true,
    label: 'text-gold',
  },
  2: {
    grad: 'from-slate-300/20 via-slate-400/10 to-transparent',
    ring: 'ring-slate-300/50',
    badge: 'bg-gradient-to-b from-slate-100 to-slate-400 text-ink',
    crown: false,
    label: 'text-slate-200',
  },
  3: {
    grad: 'from-amber-700/25 via-amber-800/10 to-transparent',
    ring: 'ring-amber-600/50',
    badge: 'bg-gradient-to-b from-amber-400 to-amber-800 text-ink',
    crown: false,
    label: 'text-amber-300',
  },
}

export default function Rankings() {
  const { data } = useSiteData()
  const alliances = data.alliances
  const [list, setList] = useState(data.players)
  const [source, setSource] = useState('curated')

  // Easter egg: click #1 ranked player 3x
  const [eggMsg, setEggMsg] = useState(null)
  const rank1ClicksRef = useRef(0)
  const onRank1Click = useCallback(() => {
    rank1ClicksRef.current++
    if (rank1ClicksRef.current >= 3) {
      rank1ClicksRef.current = 0
      setEggMsg('To be first is to be a target. Stay sharp, champion. The realm watches.')
      setTimeout(() => setEggMsg(null), 6000)
    }
    setTimeout(() => { if (rank1ClicksRef.current > 0) rank1ClicksRef.current = 0 }, 3000)
  }, [])

  // Keep in sync with admin edits (Website Editor → Players)
  useEffect(() => { setList(data.players) }, [data.players])

  useEffect(() => {
    let active = true
    apiJson('/api/roster')
      .then((d) => {
        if (!active) return
        const rosters = d?.rosters || {}
        const uploaded = []
        for (const a of alliances) {
          const members = rosters[a.slug]
          if (!Array.isArray(members) || !members.length) continue
          members.forEach((m) => {
            uploaded.push({
              rank: m.position ?? uploaded.length + 1,
              name: m.name,
              tag: a.tag,
              slug: a.slug,
              alliance: a.name,
            })
          })
        }
        if (uploaded.length) {
          setList(uploaded)
          setSource('live')
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="relative h-40 hero-shimmer">
          <img src="./assets/hero-rankings.png" alt="Commander Rankings" className="h-full w-full drift-slow object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6 md:p-10">
            <div className="eyebrow text-glow">Hall of Legends</div>
            <h1 className="gradient-gold glow-pulse mt-1 font-display text-3xl font-bold md:text-4xl">Commander Rankings</h1>
            <p className="mt-1 text-sm text-parchment/60">Position and name — the kingdom's elite.</p>
          </div>
        </div>
      </Panel>

      {/* Leaderboard */}
      <Panel className="p-3 sm:p-4">
        {source === 'live' && (
          <div className="mb-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-300">
            Live roster — synced from alliance leader uploads.
          </div>
        )}
        {list.length === 0 ? (
          <div className="grid place-items-center py-16">
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold/60"><Icon name="trophy" size={22} /></div>
              <p className="mt-3 text-sm text-parchment/50">No rankings available yet.</p>
              <p className="text-xs text-parchment/40">Alliance leaders can upload rosters to populate the leaderboard.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((p) => {
              const s = PODIUM[p.rank]
              const isTop3 = !!s
              const banner = BANNERS[p.slug] || BANNERS.ryo
              return (
                <div
                  key={`${p.slug}-${p.rank}`}
                  data-testid={`rank-row-${p.rank}`}
                  onClick={p.rank === 1 ? onRank1Click : undefined}
                  style={p.rank === 1 ? { cursor: 'pointer' } : undefined}
                  className={`lift relative overflow-hidden rounded-xl ring-1 ${isTop3 ? s.ring + ' ' + s.grad : 'ring-gold/15'} bg-gradient-to-r p-3 transition hover:ring-gold/40`}
                >
                  {/* Alliance banner background */}
                  <div className="absolute inset-0 z-0">
                    <img src={banner} alt={`${p.alliance} banner`} className="h-full w-full object-cover opacity-25" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
                  </div>

                  <div className="relative z-10 flex items-center gap-3">
                    {/* Rank badge */}
                    <div className={`badge-shine relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg font-display text-base font-bold ${isTop3 ? s.badge : 'border border-gold/30 bg-ink/70 text-parchment/80'}`}>
                      {isTop3 && s.crown && <Icon name="crown" size={12} className="absolute -top-2 left-1/2 -translate-x-1/2 text-gold" />}
                      {p.rank}
                    </div>

                    {/* Name + alliance */}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-display text-base font-bold ${isTop3 ? s.label : 'text-parchment'}`}>
                        <span className="text-gold/80">{p.tag}</span>{p.name}
                      </div>
                      <div className="truncate text-[11px] text-parchment/50">{p.alliance}</div>
                    </div>

                    {/* Position label */}
                    <div className={`hidden flex-shrink-0 text-right sm:block ${isTop3 ? s.label : 'text-parchment/40'}`}>
                      <div className="text-[10px] uppercase tracking-wider">Position</div>
                      <div className="font-display text-sm font-bold">#{p.rank}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
      <EggToast message={eggMsg} />
    </div>
  )
}
