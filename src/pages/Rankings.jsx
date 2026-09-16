import { useState, useEffect } from 'react'
import { Panel } from '../components/ui'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'
import { useSiteData } from '../context/SiteDataContext'
import { BANNERS } from '../data/kingdom'
import { strikePodium } from '../lib/motion'
import PageHeader from '../components/PageHeader'

const PODIUM = {
  1: { grad: 'from-gold/25 via-amber-500/10 to-transparent', ring: 'ring-gold/60', badge: 'bg-gradient-to-b from-gold-bright to-gold text-ink shadow-[0_0_18px_-2px_rgba(212,175,55,.6)]', crown: true, label: 'text-gold' },
  2: { grad: 'from-slate-300/20 via-slate-400/10 to-transparent', ring: 'ring-slate-300/50', badge: 'bg-gradient-to-b from-slate-100 to-slate-400 text-ink', crown: false, label: 'text-slate-200' },
  3: { grad: 'from-amber-700/25 via-amber-800/10 to-transparent', ring: 'ring-amber-600/50', badge: 'bg-gradient-to-b from-amber-400 to-amber-800 text-ink', crown: false, label: 'text-amber-300' },
}

// One row, used by both boards below. They are the same shape -- rank, face,
// tag, name, alliance, and one number on the right -- and the only thing that
// differs is whether that number is a stage count or a position.
function BoardRow({ p }) {
  const s = PODIUM[p.rank]
  const isTop3 = !!s
  const banner = BANNERS[p.slug] || BANNERS.ryo
  return (
    <div data-testid={`rank-row-${p.rank}`} className={`lift relative overflow-hidden rounded-xl ring-1 ${isTop3 ? s.ring + ' ' + s.grad : 'ring-gold/15'} bg-gradient-to-r p-3 transition hover:ring-gold/40`}>
      <div className="absolute inset-0 z-0"><img src={banner} alt={`${p.alliance} banner`} className="h-full w-full object-cover opacity-25" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" /></div>
      <div className="relative z-10 flex items-center gap-3">
        <div className={`rank-badge badge-shine relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg font-display text-base font-bold ${isTop3 ? s.badge : 'border border-gold/30 bg-ink/70 text-parchment/80'}`}>{isTop3 && s.crown && <Icon name="crown" size={12} className="absolute -top-2 left-1/2 -translate-x-1/2 text-gold" />}{p.rank}</div>
        <div className="flex-shrink-0"><img src={`./assets/avatars/${p.avatar || 'warrior'}.webp`} alt={p.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-gold/30" loading="lazy" /></div>
        <div className="min-w-0 flex-1"><div className={`truncate font-display text-base font-bold ${isTop3 ? s.label : 'text-parchment'}`}><span className="text-gold/80">{p.tag}</span>{p.name}</div><div className="truncate text-[11px] text-parchment/50">{p.alliance}</div></div>
        <div className={`flex-shrink-0 text-right ${isTop3 ? s.label : 'text-parchment/40'}`}><div className="text-[10px] uppercase tracking-wider">{p.stages == null ? 'Position' : 'Total Stages'}</div><div className="font-display text-sm font-bold tabular-nums">{p.stages == null ? `#${p.rank}` : p.stages.toLocaleString()}</div></div>
      </div>
    </div>
  )
}

export default function Rankings() {
  const { data } = useSiteData()
  const alliances = data.alliances

  // The Mystic Trial board. It is not state any more, because it was being
  // replaced: any alliance leader having ever uploaded a roster meant this list
  // was thrown away a moment after the page loaded, and the Trial ranking --
  // the thing the page is titled after -- was never what anybody saw. An
  // alliance roster is a membership list with positions in it, not Trial
  // results, so the two were never the same board and should not have been
  // competing for one.
  const list = data.players

  // Uploaded rosters still appear; they have their own board underneath, which
  // is the point of the upload feature and the only place it surfaces publicly.
  const [roster, setRoster] = useState([])

  useEffect(() => strikePodium(document.querySelector('.rankings-board')), [list])

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
          members.forEach((m) => uploaded.push({ rank: m.position ?? uploaded.length + 1, name: m.name, tag: a.tag, slug: a.slug, alliance: a.name }))
        }
        setRoster(uploaded)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hall of Legends"
        title="Commander Rankings"
        subtitle="Mystic Trial — total stages cleared. The kingdom's elite."
        art="./assets/hero-rankings.webp"
        alt="Commander Rankings"
      />

      <Panel className="p-3 sm:p-4">
        {list.length === 0 ? (
          <div className="grid place-items-center py-16"><div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold/60"><Icon name="trophy" size={22} /></div><p className="mt-3 text-sm text-parchment/50">No rankings available yet.</p><p className="text-xs text-parchment/40">Alliance leaders can upload rosters to populate the leaderboard.</p></div></div>
        ) : (
          <div className="rankings-board space-y-2.5">
            {list.map((p) => <BoardRow key={`trial-${p.rank}`} p={p} />)}
          </div>
        )}
      </Panel>

      {roster.length > 0 && (
        <Panel className="p-3 sm:p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold/70">Alliance Rosters</div>
              <p className="mt-0.5 text-xs text-parchment/45">Uploaded by alliance leaders — membership and position, not Trial stages.</p>
            </div>
            <span className="flex-shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] text-emerald-300">Live</span>
          </div>
          <div className="space-y-2.5">
            {roster.map((p) => <BoardRow key={`roster-${p.slug}-${p.rank}`} p={p} />)}
          </div>
        </Panel>
      )}
    </div>
  )
}
