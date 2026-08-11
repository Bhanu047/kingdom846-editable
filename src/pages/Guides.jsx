import { useState, useEffect } from 'react'
import { Panel, Pill, ArtImage } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'

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
    <div className="space-y-6">
      <Panel glow>
        <div className="eyebrow">Royal Library</div>
        <h1 className="mt-1 font-display text-2xl font-bold text-parchment">Strategy & Guides</h1>
        <p className="mt-1 text-sm text-parchment/60">
          Auto-synced from Kingshot Wiki.{' '}
          {synced?.synced_at && <span className="text-gold/60">Last sync: {new Date(synced.synced_at + 'Z').toLocaleDateString()}</span>}
        </p>
      </Panel>

      <div className="reveal-clip grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {allGuides.map((g) => (
          <button key={g.id} onClick={() => setActive(g)} className="lift panel group overflow-hidden text-left">
            <div className="relative h-40">
              <ArtImage src={g.art || './assets/guide-strategy.png'} alt={g.title} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="text-base font-bold text-parchment drop-shadow">{g.title}</h3>
              </div>
              <div className="absolute top-2 right-2 text-[9px] text-gold bg-ink/80 border border-gold/30 rounded px-1.5 py-0.5">SYNCED</div>
            </div>
            <div className="p-4">
              <div className="mb-2"><Pill tone="blue">{g.category}</Pill></div>
              <p className="text-xs text-parchment/60">{g.excerpt}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-gold"><Icon name="book" size={13} /> {g.read || '5 min'} read</div>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <Panel><p className="text-sm text-parchment/50 text-center py-8">Loading guides from Kingshot sources...</p></Panel>
      )}

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        eyebrow={active?.category}
        title={active?.title || ''}
        footer={
          <div className="flex items-center gap-3">
            {active?.source && (
              <a href={active.source} target="_blank" rel="noreferrer" className="btn-secondary">
                <Icon name="arrow" size={14} /> Read Full Guide
              </a>
            )}
            <span className="text-[11px] text-parchment/40"><Icon name="book" size={12} className="mr-1" />{active?.read || '5 min'} read</span>
          </div>
        }
      >
        <p className="text-sm text-parchment/60">
          {active?.excerpt || 'Click "Read Full Guide" to view the complete guide on the source website.'}
        </p>
      </Modal>
    </div>
  )
}
