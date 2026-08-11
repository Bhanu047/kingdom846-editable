import { useState, useEffect } from 'react'
import { Panel, Pill } from '../components/ui'
import { apiJson } from '../lib/api'
import Icon from '../components/Icon'

export default function Guides() {
  const [active, setActive] = useState(null)
  const [synced, setSynced] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setLoading(false) } }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const allGuides = synced?.guides || []

  return (
    <div className="space-y-4">
      <Panel glow>
        <h1 className="section-ornate font-display text-xl font-bold text-parchment">Strategy & Guides</h1>
        <p className="mt-2 text-sm text-parchment/50">
          Auto-synced from Kingshot Wiki · {allGuides.length} guides available
        </p>
      </Panel>

      {/* Compact list with thumbnails */}
      <div className="space-y-2">
        {loading && [1,2,3].map((i) => (
          <div key={i} className="panel p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
        {!loading && allGuides.length === 0 && (
          <Panel><p className="text-sm text-parchment/50 text-center py-4">No guides available yet.</p></Panel>
        )}
        {allGuides.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setActive(g)}
            className={`guide-row stagger-in w-full flex items-center gap-3 p-3 rounded-lg border border-gold/15 bg-ink-2/50 hover:bg-ink-2 hover:border-gold/40 transition-colors text-left group ${active?.id === g.id ? 'border-gold/50 bg-ink-2' : ''}`}
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <div className="relative flex-shrink-0">
              <img
                src={g.art || './assets/guide-strategy.png'}
                alt=""
                className="w-14 h-14 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-lg ring-1 ring-gold/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-parchment truncate group-hover:text-gold-bright transition-colors">{g.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] uppercase tracking-wider text-gold/60 font-semibold">{g.category}</span>
                <span className="text-parchment/20">·</span>
                <span className="text-[10px] text-parchment/40">{g.read || '5 min'}</span>
              </div>
            </div>
            <Icon name="arrow" size={14} className="text-gold/30 group-hover:text-gold transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Guide detail popup */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70" onClick={() => setActive(null)}>
          <Panel glow className="max-w-lg w-full mt-8 stagger-in" >
            <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
              <img src={active.art || './assets/guide-strategy.png'} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-transparent to-transparent" />
              <button onClick={() => setActive(null)} className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-ink/80 text-parchment/60 hover:text-parchment text-lg leading-none">×</button>
            </div>
            <Pill tone="blue">{active.category}</Pill>
            <h3 className="mt-2 text-lg font-bold text-parchment">{active.title}</h3>
            <p className="mt-1 text-sm text-parchment/60">{active.excerpt}</p>
            <div className="mt-4 flex items-center gap-3">
              {active.source && (
                <a href={active.source} target="_blank" rel="noreferrer" className="btn-primary text-xs">
                  <Icon name="arrow" size={12} /> Read Full Guide
                </a>
              )}
              <span className="text-xs text-parchment/40 flex items-center gap-1"><Icon name="book" size={12} /> {active.read || '5 min'} read</span>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
