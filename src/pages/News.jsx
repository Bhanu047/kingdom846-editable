import { useState, useEffect, useRef } from 'react'
import { Panel, Pill } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'
import PageHeader from '../components/PageHeader'
import { turnPages } from '../lib/motion'

function toneFor(c) {
  return { EVENT: 'gold', UPDATE: 'blue', PVP: 'red', FEATURE: 'muted', ANNOUNCEMENT: 'blue', GUIDE: 'gold' }[c] || 'muted'
}

export default function News() {
  const list = useRef(null)
  const [active, setActive] = useState(null)
  const [synced, setSynced] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setLoading(false) } }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const allNews = synced?.news || []

  // Dispatches turn like leaves of the chronicle, once they have loaded. Below
  // allNews, not above it: a hook that reads it from the top of the component
  // hits the temporal dead zone and takes the whole page down with it.
  useEffect(() => turnPages(list.current), [allNews.length])

  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <PageHeader
        eyebrow="Kingdom Chronicle"
        title="News &amp; Dispatches"
        subtitle="Dispatches from the realm, synced from the Kingshot wiki."
        art="./assets/hero-news.webp"
        alt="News"
      >
        <p className="mt-2 text-xs text-parchment/45">
          {synced?.synced_at && <span>Last synced: {new Date(synced.synced_at + 'Z').toLocaleString()}</span>}
          {loading && <span className="text-gold/50"> Loading…</span>}
        </p>
      </PageHeader>

      <div ref={list} className="space-y-4">
        {allNews.map((n, i) => (
          <Panel key={n.id} className="lift-glow gold-border-hover k846-leaf" >
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
