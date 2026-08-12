import { useState } from 'react'
import { Panel, SectionTitle, Pill, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { timeline, countdownTo, kingdom } from '../data/kingdom'

const catTone = {
  Heroes: 'gold', Pets: 'green', Truegold: 'blue', Feature: 'muted', PvP: 'red', Anniversary: 'gold'
}

const filters = ['All', 'Upcoming', 'Heroes', 'Pets', 'PvP', 'Truegold']

export default function Timeline() {
  const [filter, setFilter] = useState('Upcoming')

  const items = timeline.filter((t) => {
    if (filter === 'All') return true
    if (filter === 'Upcoming') return t.status !== 'past'
    return t.category === filter
  })

  const next = timeline.find((t) => t.status !== 'past')

  return (
    <div className="space-y-6">
      {/* Hero with next milestone countdown */}
      {next && (
        <Panel glow className="relative overflow-hidden p-0">
          <div className="relative h-52 md:h-64">
            <ArtImage src={next.art || './assets/art-castle-rotation.png'} alt={next.name} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6 md:p-10">
              <div className="eyebrow">Next Milestone</div>
              <h1 className="mt-1 font-display text-3xl font-bold text-parchment drop-shadow-lg md:text-4xl">{next.name}</h1>
              <div className="mt-1 text-sm text-gold-bright/90">{new Date(next.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="mt-3 flex gap-2">
                <Count label="Days" value={countdownTo(next.date).days} />
                <Count label="Hours" value={countdownTo(next.date).hours} />
                <Count label="Mins" value={countdownTo(next.date).mins} />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Intro + source */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="eyebrow">Realm Chronicle</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-parchment">Kingdom 846 Timeline</h2>
            <p className="mt-1 text-sm text-parchment/60">Founded {new Date(kingdom.created + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Day {kingdom.currentDay}. Every hero generation, truegold tier, feature unlock, and KvK first in the kingdom's history.</p>
          </div>
          <a href={kingdom.timelineSource} target="_blank" rel="noreferrer" className="btn-secondary"><Icon name="arrow" size={14} /> Live Timeline</a>
        </div>
      </Panel>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'border-gold/60 bg-gold/15 text-gold-bright' : 'border-white/10 text-parchment/50 hover:text-parchment'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Timeline list */}
      <Panel className="p-0">
        <div className="relative px-4 py-5 sm:px-6">
          <div className="absolute left-[26px] top-4 bottom-4 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent sm:left-[30px]" />
          <ul className="space-y-1">
            {items.map((t, i) => {
              const cd = t.status !== 'past' ? countdownTo(t.date) : null
              return (
                <li key={i} className="relative flex gap-4 py-2.5 sm:gap-5">
                  <div className="relative z-10 mt-0.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-gold/30 bg-ink-3 text-gold-bright">
                      <Icon name={iconFor(t.category)} size={13} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-parchment">{t.name}</span>
                      <Pill tone={catTone[t.category] || 'muted'}>{t.category}</Pill>
                      {t.status === 'predicted' && <Pill tone="muted">Predicted</Pill>}
                      {t.status === 'upcoming' && <Pill tone="gold">Upcoming</Pill>}
                      {t.status === 'future' && <Pill tone="blue">Future</Pill>}
                    </div>
                    <div className="mt-0.5 text-xs text-parchment/40">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {cd && cd.days > 0 && <span className="text-gold/70"> · in {cd.days} day{cd.days === 1 ? '' : 's'}</span>}
                      {cd && cd.days === 0 && <span className="text-gold/70"> · today</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">
        Timeline data from <a href={kingdom.timelineSource} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">Kingshot Optimizer</a>. Items marked "Predicted" are algorithmic estimates.
      </p>
    </div>
  )
}

function Count({ label, value }) {
  return (
    <div className="rounded-lg border border-gold/25 bg-ink-3/70 px-3 py-1.5 text-center">
      <div className="font-display text-xl font-bold text-gold-bright">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-parchment/50">{label}</div>
    </div>
  )
}

function iconFor(cat) {
  return { Heroes: 'crown', Pets: 'shield', Truegold: 'fire', Feature: 'castle', PvP: 'swords', Anniversary: 'trophy' }[cat] || 'clock'
}
