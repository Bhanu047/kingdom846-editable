import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { players } from '../data/kingdom'

const colorMap = {
  gold: 'from-gold/40 to-gold/5 text-gold ring-gold/40',
  silver: 'from-slate-300/40 to-slate-300/5 text-slate-200 ring-slate-300/40',
  crimson: 'from-rose-400/40 to-rose-400/5 text-rose-300 ring-rose-400/40',
  blue: 'from-sky-400/40 to-sky-400/5 text-sky-300 ring-sky-400/40',
  violet: 'from-violet-400/40 to-violet-400/5 text-violet-300 ring-violet-400/40'
}

function initials(name) {
  return name.slice(0, 2).toUpperCase()
}

export default function Players() {
  return (
    <div className="space-y-6">
      <Panel glow>
        <div className="eyebrow">Top Governors</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-parchment">Players of 846</h1>
        <p className="mt-2 text-sm text-parchment/60">The kingdom's strongest commanders. Sample roster data.</p>
      </Panel>

      <div className="reveal-clip grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => {
          const grad = colorMap[p.color] || colorMap.blue
          return (
            <div key={p.rank} className="panel lift group overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className={`grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br ${grad} ring-1 font-display text-sm font-bold`}>
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-gold">#{p.rank}</span>
                    <span className="truncate font-semibold text-parchment">{p.name}</span>
                  </div>
                  <div className="truncate text-[11px] text-parchment/50">{p.tag}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 border-t border-gold/15 px-4 py-3">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-parchment/40">Title</div>
                  <div className="text-sm font-semibold text-gold/90">{p.title}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
