import { useState } from 'react'
import { Panel, Pill } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { useSiteData } from '../context/SiteDataContext'

function toneFor(c) {
  return { ANNIVERSARY: 'gold', HEROES: 'gold', PVP: 'red', KVK: 'blue', FEATURE: 'muted' }[c] || 'muted'
}

export default function News() {
  const { data } = useSiteData()
  const news = data.news
  const [active, setActive] = useState(null)
  return (
    <div className="space-y-6">
      <Panel glow>
        <div className="eyebrow">Kingdom Chronicle</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-parchment">News & Dispatches</h1>
        <p className="mt-2 text-sm text-parchment/60">Real kingdom updates derived from the official timeline and KvK results — no fabricated reports.</p>
      </Panel>

      <div className="space-y-4">
        {news.map((n) => (
          <Panel key={n.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={toneFor(n.category)}>{n.category}</Pill>
              <span className="text-[10px] text-parchment/40">{n.date}</span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-parchment">{n.title}</h2>
            <p className="mt-1 text-sm text-parchment/60">{n.excerpt}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button onClick={() => setActive(n)} className="btn-ghost px-0">
                Read full dispatch <Icon name="arrow" size={13} />
              </button>
              {n.source && (
                <a href={n.source} target="_blank" rel="noreferrer" className="text-[11px] text-gold/70 hover:text-gold underline">
                  Source
                </a>
              )}
            </div>
          </Panel>
        ))}
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
