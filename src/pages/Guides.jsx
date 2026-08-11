import { useState, useEffect } from 'react'
import { Panel, Pill, ArtImage } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { useSiteData } from '../context/SiteDataContext'
import { apiJson } from '../lib/api'

export default function Guides() {
  const { data } = useSiteData()
  const [active, setActive] = useState(null)
  const [synced, setSynced] = useState(null)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setSyncing(false) } }).catch(() => { if (!cancelled) setSyncing(false) })
    return () => { cancelled = true }
  }, [])

  // Merge: kingdom-specific guides first, then synced Kingshot guides
  const allGuides = [...(data.guides || []), ...(synced?.guides || [])]

  return (
    <div className="space-y-6">
      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-44">
          <ArtImage src="./assets/strategy-war-academy.png" alt="War academy strategy map" className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
          <div className="absolute inset-0 flex flex-col justify-center p-6">
            <div className="eyebrow">Royal Library</div>
            <h1 className="mt-1 font-display text-3xl font-bold text-parchment drop-shadow-lg">Strategy & Guides</h1>
            <p className="mt-2 max-w-md text-sm text-parchment/80">
              Battle-tested playbooks plus auto-synced guides from Kingshot Wiki.{' '}
              {synced?.synced_at && <span className="text-gold/60">Last sync: {new Date(synced.synced_at + 'Z').toLocaleDateString()}</span>}
            </p>
          </div>
        </div>
      </Panel>

      <div className="reveal-clip grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {allGuides.map((g) => (
          <button key={g.id} onClick={() => setActive(g)} className="lift panel group overflow-hidden text-left">
            <div className="relative h-40">
              <ArtImage src={g.art || './assets/strategy-war-academy.png'} alt={g.title} className="h-full w-full" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="text-base font-bold text-parchment drop-shadow">{g.title}</h3>
              </div>
              {g.id.startsWith('ks-') && (
                <div className="absolute top-2 right-2 text-[9px] text-gold bg-ink/80 border border-gold/30 rounded px-1.5 py-0.5">SYNCED</div>
              )}
            </div>
            <div className="p-4">
              <div className="mb-2"><Pill tone="blue">{g.category}</Pill></div>
              <p className="text-xs text-parchment/60">{g.excerpt}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-gold"><Icon name="book" size={13} /> {g.read || '5 min'} read</div>
            </div>
          </button>
        ))}
      </div>

      {syncing && allGuides.length === 0 && (
        <Panel><p className="text-sm text-parchment/50 text-center py-8">Loading guides...</p></Panel>
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
        <div className="space-y-3">
          {active?.body ? (
            active.body.split('\n\n').map((para, i) => (
              <p key={i} className={i === 0 ? 'text-sm text-parchment/90' : 'text-sm text-parchment/60'}>{para}</p>
            ))
          ) : active?.excerpt ? (
            <p className="text-sm text-parchment/60">{active.excerpt}</p>
          ) : (
            <p className="text-sm text-parchment/60">Click "Read Full Guide" to view the complete guide on the source website.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
