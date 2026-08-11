import { useState } from 'react'
import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import { Embers } from '../components/Embers'
import { Modal } from '../components/RosterPending'
import Icon from '../components/Icon'
import { useSiteData } from '../context/SiteDataContext'
import { buildSchedule } from '../data/kingdom'

const colorMap = {
  gold: { ring: 'ring-gold/40', text: 'text-gold', bg: 'bg-gold/10', grad: 'from-gold/30 to-gold/5' },
  violet: { ring: 'ring-violet-400/40', text: 'text-violet-300', bg: 'bg-violet-400/10', grad: 'from-violet-400/30 to-violet-400/5' },
  crimson: { ring: 'ring-rose-400/40', text: 'text-rose-300', bg: 'bg-rose-400/10', grad: 'from-rose-400/30 to-rose-400/5' },
  blue: { ring: 'ring-sky-400/40', text: 'text-sky-300', bg: 'bg-sky-400/10', grad: 'from-sky-400/30 to-sky-400/5' }
}

function chunkPairs(arr) {
  const out = []
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2))
  return out
}

function RankBadge({ rank }) {
  const styles = { 1: 'bg-gold text-ink', 2: 'bg-parchment/80 text-ink', 3: 'bg-amber-600 text-parchment', 4: 'bg-ink-700 text-parchment' }
  return (
    <div className={`badge-shine relative grid h-9 w-9 place-items-center rounded-md border-2 border-gold/40 font-display text-sm font-bold ${styles[rank] || styles[4]}`}>
      {rank}
      <div className="absolute -inset-1 rounded-md border border-gold/20" />
    </div>
  )
}

export default function Alliances() {
  const { data } = useSiteData()
  const alliances = data.alliances
  const [active, setActive] = useState(null)
  const activeColor = active ? (colorMap[active.color] || colorMap.blue) : colorMap.blue
  return (
    <div className="space-y-6">
      <Panel glow className="reveal-clip aurora-border">
        <Embers count={10} />
        <div className="eyebrow">The Council</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-parchment">Alliances of 846</h1>
        <p className="mt-2 text-sm text-parchment/60">The four pillars of Kingdom 846 — the alliances and the council that hold the realm together.</p>
      </Panel>

      <div className="reveal-clip grid gap-4 lg:grid-cols-2">
        {alliances.map((a) => {
          const c = colorMap[a.color] || colorMap.blue
          return (
            <button key={a.slug} onClick={() => setActive(a)} className="lift panel group overflow-hidden text-left">
              <div className="relative h-28">
                <ArtImage src={a.art} alt={a.name} className="h-full w-full" />
                <div className={`absolute inset-0 bg-gradient-to-r ${c.grad}`} />
                <div className="absolute inset-y-0 left-0 flex items-center gap-3 p-4">
                  <RankBadge rank={a.rank} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-lg font-bold ${c.text}`}>{a.tag}</span>
                      <span className="text-sm font-semibold text-parchment">{a.name}</span>
                    </div>
                    <div className="text-[11px] text-parchment/70">{a.tagline}</div>
                  </div>
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ink/60 px-2 py-1 text-[10px] text-parchment/70 backdrop-blur">
                  <Icon name="clock" size={11} /> Event Times
                </div>
              </div>
              <div className="p-4">
                <div className="text-center">
                  <Field label="Leader" value={a.leader} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <Modal open={!!active} onClose={() => setActive(null)}>
        {active && (
          <div className="-m-5 mb-0">
            <div className="relative h-32">
              <ArtImage src={active.art} alt={active.name} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
              <button onClick={() => setActive(null)} className="absolute right-3 top-3 rounded-full bg-ink/60 p-1.5 text-parchment/70 backdrop-blur hover:text-parchment">
                <Icon name="chevron" size={16} className="rotate-90" />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="flex items-center gap-2">
                  <span className={`font-display text-xl font-bold ${activeColor.text}`}>{active.tag}</span>
                  <span className="text-base font-semibold text-parchment">{active.name}</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-parchment/60">Event Schedule (UTC)</div>
              </div>
            </div>
            <div className="space-y-2 p-5">
              {chunkPairs(buildSchedule(active.schedule)).map((pair, pi) => (
                <div key={pi} className="grid grid-cols-2 gap-2">
                  {pair.map((s, si) => (
                    <div key={si} className="rounded-lg border border-gold/15 bg-white/5 p-3 text-center">
                      <div className="text-[11px] font-semibold leading-tight text-parchment">{s.event}</div>
                      <div className="mt-1 text-sm font-bold text-gold">{s.time || 'TBA'}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 py-2">
      <div className="text-sm font-bold text-parchment">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-parchment/40">{label}</div>
    </div>
  )
}
