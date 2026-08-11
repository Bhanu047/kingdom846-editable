import { useState, useEffect } from 'react'
import { Panel, Pill } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { useSiteData } from '../context/SiteDataContext'
import { apiJson } from '../lib/api'

function toneFor(c) {
  return { ANNIVERSARY: 'gold', HEROES: 'gold', PVP: 'red', KVK: 'blue', FEATURE: 'muted', ANNOUNCEMENT: 'blue' }[c] || 'muted'
}

export default function News() {
  const { data } = useSiteData()
  const [active, setActive] = useState(null)
  const [synced, setSynced] = useState(null)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setSyncing(false) } }).catch(() => { if (!cancelled) setSyncing(false) })
    return () => { cancelled = true }
  }, [])

  // Merge: kingdom-specific news first, then synced Kingshot news
  const allNews = [...(data.news || []), ...(synced?.news || [])]

  return (
    <div className="space-y-6">
      <Panel glow>
        <div className="eyebrow">Kingdom Chronicle</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-parchment">News & Dispatches</h1>
        <p className="mt-2 text-sm text-parchment/60">
          Kingdom updates plus auto-synced news from Kingshot sources.{' '}
          {synced?.synced_at && <span className="text-gold/60">Last synced: {new Date(synced.synced_at + 'Z').toLocaleString()}</span>}
          {syncing && <span className="text-gold/50"> Syncing latest...</span>}
        </p>
      </Panel>

      <div className="space-y-4">
        {allNews.map((n) => (
          <Panel key={n.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={toneFor(n.category)}>{n.category}</Pill>
              <span className="text-[10px] text-parchment/40">{n.date}</span>
              {n.id.startsWith('ks-') && <span className="text-[9px] text-gold/50 border border-gold/20 rounded px-1.5 py-0.5">AUTO-SYNCED</span>}
            </div>
            <h2 className="mt-2 text-lg font-bold text-parchment">{n.title}</h2>
            <p className="mt-1 text-sm text-parchment/60">{n.excerpt}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {n.body && n.body !== n.excerpt && (
                <button onClick={() => setActive(n)} className="btn-ghost px-0">
                  Read full dispatch <Icon name="arrow" size={13} />
                </button>
              )}
              {n.source && (
                <a href={n.source} target="_blank" rel="noreferrer" className="text-[11px] text-gold/70 hover:text-gold underline">
                  Source <Icon name="arrow" size={11} />
                </a>
              )}
            </div>
          </Panel>
        ))}
        {!syncing && allNews.length === 0 && (
          <Panel><p className="text-sm text-parchment/50 text-center py-8">No news yet. Check back after the next sync.</p></Panel>
        )}
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        eyebrow={active?.category}
        title={active?.title || ''}
        footer={
          active?.source ? (
            <a href={active.source} target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14} /> View Source</a>
          ) : undefined
        }
      >
        <p className="leading-relaxed">{active?.body}</p>
        {active?.date && <p className="mt-4 text-[11px] text-parchment/40">Published {active.date}</p>}
      </Modal>
    </div>
  )
}
