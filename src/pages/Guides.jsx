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
      <h1 className="font-display text-xl font-bold text-parchment">Strategy & Guides</h1>

      {/* Compact list of guides */}
      <div className="space-y-2">
        {loading && <p className="text-sm text-parchment/50">Loading guides...</p>}
        {!loading && allGuides.length === 0 && <p className="text-sm text-parchment/50">No guides available.</p>}
        {allGuides.map((g) => (
          <button
            key={g.id}
            onClick={() => setActive(g)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gold/15 bg-ink-2/50 hover:bg-ink-2 hover:border-gold/40 transition-colors text-left group"
          >
            <img
              src={g.art || './assets/guide-strategy.png'}
              alt=""
              className="w-12 h-12 rounded object-cover flex-shrink-0"
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-parchment truncate group-hover:text-gold transition-colors">{g.title}</p>
              <p className="text-[11px] text-parchment/40">{g.category} · {g.read || '5 min'}</p>
            </div>
            <Icon name="arrow" size={14} className="text-gold/40 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Compact inline panel instead of modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60" onClick={() => setActive(null)}>
          <Panel className="max-w-lg w-full mt-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <Pill tone="blue">{active.category}</Pill>
                <h3 className="mt-1 text-lg font-bold text-parchment">{active.title}</h3>
              </div>
              <button onClick={() => setActive(null)} className="text-parchment/40 hover:text-parchment text-xl leading-none flex-shrink-0">×</button>
            </div>
            <p className="text-sm text-parchment/60 mb-4">{active.excerpt}</p>
            {active.source && (
              <a href={active.source} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
                <Icon name="arrow" size={14} /> Read Full Guide
              </a>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
