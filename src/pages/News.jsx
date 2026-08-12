import { useState, useEffect } from 'react'
import { Panel, Pill } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'

function toneFor(c) {
  return { EVENT: 'gold', UPDATE: 'blue', PVP: 'red', FEATURE: 'muted', ANNOUNCEMENT: 'blue', GUIDE: 'gold' }[c] || 'muted'
}

export default function News() {
  const [active, setActive] = useState(null)
  const [synced, setSynced] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setLoading(false) } }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const allNews = synced?.news || []

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <Panel className="reveal" glow className="hero-frame relative overflow-hidden p-0">
        <div className="relative h-36 sm:h-44">
          <img src="./assets/hero-news.webp" alt="News" className="h-full w-full object-cover" />
          <div className="hero-overlay absolute inset-0" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6">
            <div className="eyebrow">Kingdom Chronicle</div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold gradient-gold">News & Dispatches</h1>
            <p className="mt-1 text-sm text-parchment/50">
              {synced?.synced_at && <span>Last synced: {new Date(synced.synced_at + 'Z').toLocaleString()}</span>}
              {loading && <span className="text-gold/50"> Loading...</span>}
            </p>
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        {allNews.map((n, i) => (
          <Panel key={n.id} className="lift-glow gold-border-hover stagger-in" >
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={toneFor(n.category)}>{n.category}</Pill>
              {n.date && <span className="text-[10px] text-parchment/40">{n.date}</span>}
              <span className="text-[9px] text-gold/50 border border-gold/20 rounded px-1.5 py-0.5">AUTO-SYNCED</span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-parchment">{n.title}</h2>
            <p className="mt-1 text-sm text-parchment/60">{n.excerpt}</p>
            {n.source && (
              <a href={n.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] text-gold/70 hover:text-gold underline">
                Source <Icon name="arrow" size={11} />
              </a>
            )}
          </Panel>
        ))}
        {loading && (
          <Panel><p className="text-sm text-parchment/50 text-center py-8">Fetching latest news from Kingshot sources...</p></Panel>
        )}
        {!loading && allNews.length === 0 && (
          <Panel><p className="text-sm text-parchment/50 text-center py-8">No news available. Check back after the next sync.</p></Panel>
        )}
      </div>
    </div>
  )
}
