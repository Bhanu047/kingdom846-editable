import { useState } from 'react'
import { Panel, Pill, ArtImage } from '../components/ui'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { useSiteData } from '../context/SiteDataContext'

export default function Guides() {
  const { data } = useSiteData()
  const guides = data.guides
  const [active, setActive] = useState(null)
  return (
    <div className="space-y-6">
      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-44">
          <ArtImage src="./assets/strategy-war-academy.png" alt="War academy strategy map" className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
          <div className="absolute inset-0 flex flex-col justify-center p-6">
            <div className="eyebrow">Royal Library</div>
            <h1 className="mt-1 font-display text-3xl font-bold text-parchment drop-shadow-lg">Strategy & Guides</h1>
            <p className="mt-2 max-w-md text-sm text-parchment/80">Battle-tested Kingshot playbooks. Select a guide to read the full content.</p>
          </div>
        </div>
      </Panel>

      <div className="reveal-clip grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <button key={g.id} onClick={() => setActive(g)} className="lift panel group overflow-hidden text-left">
            <div className="relative h-40">
              <ArtImage src={g.art} alt={g.title} className="h-full w-full" />
              <div className="absolute inset-x-0 bottom-0 p-3"><h3 className="text-base font-bold text-parchment drop-shadow">{g.title}</h3></div>
            </div>
            <div className="p-4">
              <div className="mb-2"><Pill tone="blue">{g.category}</Pill></div>
              <p className="text-xs text-parchment/60">{g.excerpt}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-gold"><Icon name="book" size={13} /> {g.read} read</div>
            </div>
          </button>
        ))}
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        eyebrow={active?.category}
        title={active?.title || ''}
        footer={<span className="text-[11px] text-parchment/40"><Icon name="book" size={12} className="mr-1" />{active?.read} read</span>}
      >
        <div className="space-y-3">
          {active?.body ? (
            active.body.split('\n\n').map((para, i) => (
              <p key={i} className={i === 0 ? 'text-sm text-parchment/90' : 'text-sm text-parchment/60'}>{para}</p>
            ))
          ) : (
            <p className="text-sm text-parchment/60">{active?.excerpt}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
