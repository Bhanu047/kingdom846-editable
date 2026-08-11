import { useState, useEffect, useRef } from 'react'
import { Panel, Pill } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import { apiJson } from '../lib/api'
import Icon from '../components/Icon'

export default function Guides() {
  const [activeId, setActiveId] = useState(null)
  const [synced, setSynced] = useState(null)
  const [loading, setLoading] = useState(true)
  const activeRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setLoading(false) } }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const allGuides = synced?.guides || []

  // Scroll the expanded item into view smoothly
  useEffect(() => {
    if (activeId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeId])

  return (
    <div className="space-y-4">
      <Panel glow className="gold-corners">
        <RoyalSectionHeader icon="book" eyebrow="Knowledge Base" title="Strategy & Guides" />
        <p className="text-sm text-parchment/50">
          Auto-synced from Kingshot Wiki · {allGuides.length} guides available
        </p>
      </Panel>

      <div className="royal-divider"><span className="royal-divider-icon">◆</span></div>

      {/* Compact list with inline expand */}
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
        {allGuides.map((g, i) => {
          const isActive = activeId === g.id
          return (
            <div key={g.id} ref={isActive ? activeRef : null} className="stagger-in" style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}>
              <button
                onClick={() => setActiveId(isActive ? null : g.id)}
                className={`royal-plaque w-full flex items-center gap-3 text-left group ${isActive ? '!border-gold/50' : ''}`}
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
                  <p className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-gold-bright' : 'text-parchment group-hover:text-gold-bright'}`}>{g.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-gold/60 font-semibold">{g.category}</span>
                    <span className="text-parchment/20">·</span>
                    <span className="text-[10px] text-parchment/40">{g.read || '5 min'}</span>
                  </div>
                </div>
                <Icon name="arrow" size={14} className={`text-gold/30 transition-transform flex-shrink-0 ${isActive ? 'rotate-90' : ''}`} />
              </button>

              {/* Inline expand - no popup, no scroll */}
              {isActive && (
                <div className="mt-1 mb-1 p-3 rounded-lg border border-gold/30 bg-ink-2/80 stagger-in space-y-3 gold-corners">
                  <div className="relative h-24 rounded-lg overflow-hidden">
                    <img src={g.art || './assets/guide-strategy.png'} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-transparent to-transparent" />
                    <Pill tone="blue">{g.category}</Pill>
                  </div>
                  <p className="text-sm text-parchment/60">{g.excerpt}</p>
                  <div className="flex items-center gap-3">
                    {g.source && (
                      <a href={g.source} target="_blank" rel="noreferrer" className="btn-primary text-xs">
                        <Icon name="arrow" size={12} /> Read Full Guide
                      </a>
                    )}
                    <span className="text-xs text-parchment/40 flex items-center gap-1"><Icon name="book" size={12} /> {g.read || '5 min'} read</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
