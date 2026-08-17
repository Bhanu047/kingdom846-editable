import { useState } from 'react'
import { Panel, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { Embers } from '../components/Embers'
import { Modal } from '../components/RosterPending'
import { useSiteData } from '../context/SiteDataContext'
import { buildSchedule } from '../data/kingdom'

const colorMap = {
  gold: { ring: 'ring-gold/40', text: 'text-gold', bg: 'bg-gold/10', grad: 'from-gold/30 to-gold/5' },
  violet: { ring: 'ring-violet-400/40', text: 'text-violet-300', bg: 'bg-violet-400/10', grad: 'from-violet-400/30 to-violet-400/5' },
  crimson: { ring: 'ring-rose-400/40', text: 'text-rose-300', bg: 'bg-rose-400/10', grad: 'from-rose-400/30 to-rose-400/5' },
  blue: { ring: 'ring-sky-400/40', text: 'text-sky-300', bg: 'bg-sky-400/10', grad: 'from-sky-400/30 to-sky-400/5' }
}

function RankBadge({ rank }) {
  const styles = { 1: 'bg-gold text-ink', 2: 'bg-parchment/80 text-ink', 3: 'bg-amber-600 text-parchment', 4: 'bg-ink-700 text-parchment' }
  return <div className={`badge-shine relative grid h-9 w-9 place-items-center rounded-md border-2 border-gold/40 font-display text-sm font-bold ${styles[rank] || styles[4]}`}>{rank}<div className="absolute -inset-1 rounded-md border border-gold/20" /></div>
}

export default function Alliances() {
  const { data } = useSiteData()
  const alliances = data.alliances
  const [active, setActive] = useState(null)
  const activeColor = active ? (colorMap[active.color] || colorMap.blue) : colorMap.blue

  return (
    <div className="space-y-6">
      <Panel glow className="aurora-border gold-corners relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30"><img src="./assets/hero-council.webp" alt="" className="h-full w-full object-cover drift-slow" loading="lazy" /></div>
        <div className="relative z-10"><Embers count={10} /><div className="eyebrow text-glow">The Council</div><h1 className="mt-1 font-display text-3xl font-bold gradient-gold glow-pulse">Alliances of 846</h1><p className="mt-2 text-sm text-parchment/60">The four pillars of Kingdom 846 — the alliances and the council that hold the realm together.</p></div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {alliances.map((a) => {
          const c = colorMap[a.color] || colorMap.blue
          return (
            <button key={a.slug} onClick={() => setActive(a)} className="royal-grid-card group overflow-hidden text-left cursor-pointer">
              <div className="relative h-28">
                <ArtImage src={a.art} alt={a.name} className="h-full w-full" />
                <div className={`absolute inset-0 bg-gradient-to-r ${c.grad}`} />
                <div className="absolute inset-y-0 left-0 flex items-center gap-3 p-4"><RankBadge rank={a.rank} /><div><div className="flex items-center gap-2"><span className={`font-display text-lg font-bold ${c.text}`}>{a.tag}</span><span className="text-sm font-semibold text-parchment">{a.name}</span></div><div className="text-[11px] text-parchment/70">{a.tagline}</div></div></div>
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ink/60 px-2 py-1 text-[10px] text-parchment/70"><Icon name="clock" size={11} /> Event Times</div>
              </div>
              <div className="p-4"><div className="text-center"><div className="royal-plaque" style={{ padding: '0.625rem' }}><div className="text-sm font-display font-bold text-parchment">{a.leader}</div><div className="text-[9px] uppercase tracking-wider text-gold/50">Leader</div></div></div></div>
            </button>
          )
        })}
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} noScroll>
        {active && (
          <div className="-m-5 mb-0">
            <div className="relative h-24"><ArtImage src={active.art} alt={active.name} className="h-full w-full" /><div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" /><button onClick={() => setActive(null)} className="absolute right-3 top-2 rounded-full bg-ink/60 p-1.5 text-parchment/70 hover:text-parchment"><Icon name="chevron" size={14} className="rotate-90" /></button><div className="absolute inset-x-0 bottom-0 px-4 pb-2"><div className="flex items-center gap-2"><span className={`font-display text-lg font-bold ${activeColor.text}`}>{active.tag}</span><span className="text-sm font-semibold text-parchment">{active.name}</span></div><div className="text-[10px] uppercase tracking-wider text-gold/60">Event Schedule (UTC)</div></div></div>
            <div className="p-3"><div className="grid grid-cols-2 gap-1.5">{buildSchedule(active.schedule).map((s, si) => { const meta = getEventMetaLocal(s.event); return <div key={si} className="royal-plaque text-center" style={{ padding: '0.5rem 0.375rem' }}><div className="royal-icon-circle mx-auto mb-0.5" style={{ width: '1.5rem', height: '1.5rem' }}><Icon name={meta.icon} size={11} className="text-gold-bright" /></div><div className="text-[8px] font-semibold leading-tight text-parchment/80">{s.event}</div><div className="mt-0.5 royal-time" style={{ fontSize: '0.75rem' }}>{s.time || 'TBA'}</div></div> })}</div></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function getEventMetaLocal(name) {
  const map = { 'Bear Hunt': { icon: 'paw' }, 'Vikings': { icon: 'axe' }, 'Tri-Alliance': { icon: 'shield' }, 'Swordland': { icon: 'swords' } }
  for (const key of Object.keys(map)) if (name && name.includes(key)) return map[key]
  return { icon: 'flag' }
}
