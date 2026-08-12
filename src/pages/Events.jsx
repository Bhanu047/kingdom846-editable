import { useEffect, useState } from 'react'
import { Panel, Pill, ArtImage, ArtCard } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import { timeline, countdownTo, kingdom } from '../data/kingdom'
import { useSiteData } from '../context/SiteDataContext'

// Re-render every second so all countdowns tick live (no manual refresh needed)
function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  return now
}

function milestoneDesc(t) {
  if (t.category === 'Anniversary') return 'Kingdom 846 celebrates one year since founding. Anniversary rewards and a kingdom-wide celebration event.'
  if (t.category === 'Heroes') return 'A new hero generation unlocks — new commanders become available for recruitment and rallies.'
  if (t.category === 'Pets') return 'New pets enter the roster. Plan your pet materials and bonding resources ahead of release.'
  if (t.category === 'PvP') return 'A new competitive event begins. Prepare your marches, shields, and rally compositions.'
  if (t.category === 'Truegold') return 'A new Truegold tier or research unlock advances the kingdom gear economy.'
  return 'A new kingdom milestone unlocks across the realm.'
}

// Merge curated events with real upcoming timeline milestones into one upcoming list
function buildUpcoming(events) {
  return [
    ...timeline.filter((t) => t.status === 'upcoming' || t.status === 'future').map((t) => ({
      id: 'tl-' + t.date,
      title: t.name,
      type: t.category.toUpperCase(),
      art: t.art || './assets/art-kvk-prep.png',
      startsIn: countdownTo(t.date),
      date: t.date,
      description: milestoneDesc(t),
      rules: [],
      featured: !!t.featured
    })),
    ...events.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.category.toUpperCase(),
      art: e.art || './assets/art-kvk-prep.png',
      startsIn: countdownTo(e.date),
      date: e.date,
      description: e.desc,
      rules: [],
      featured: !!e.featured,
      time: e.time
    }))
  ].sort((a, b) => (a.startsIn.total || 0) - (b.startsIn.total || 0))
}

export default function Events() {
  useNow()
  const { data } = useSiteData()
  const upcoming = buildUpcoming(data.events)
  const featured = upcoming.filter((e) => e.featured).slice(0, 3)
  const rest = upcoming.filter((e) => !e.featured)
  return (
    <div className="space-y-6">
      <Panel glow className="relative overflow-hidden p-0 gold-corners">
        <div className="relative h-48 hero-shimmer">
          <ArtImage src="./assets/hero-events.webp" alt="Castle battle" className="h-full w-full drift-slow" />
          <div className="hero-overlay absolute inset-0" />
          <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10">
            <div className="eyebrow text-glow">War Calendar</div>
            <h1 className="mt-1 font-display text-3xl font-bold gradient-gold glow-pulse drop-shadow-lg">Upcoming Events</h1>
            <p className="mt-2 max-w-lg text-sm text-parchment/70">Live milestone schedule synced from the official Kingdom 846 timeline. Countdowns update in real time.</p>
          </div>
        </div>
      </Panel>

      {featured.length > 0 && (
        <div className="grid gap-5 md:grid-cols-3">
          {featured.map((e) => (
            <div key={e.id} className="royal-grid-card overflow-hidden">
              <div className="relative h-44">
                <ArtImage src={e.art} alt={e.title} className="h-full w-full" />
                <div className="absolute right-3 top-3"><Pill tone="gold">Featured</Pill></div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-display font-bold text-parchment">{e.title}</h3>
                  <Pill tone={toneFor(e.type)}>{e.type}</Pill>
                </div>
                {e.date && <div className="mt-1 text-xs text-parchment/40">{new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{e.time ? <span className="text-gold/70"> · {e.time}</span> : null}</div>}
                <p className="mt-2 text-sm text-parchment/60">{e.description}</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Count label="Days" value={e.startsIn.days} />
                  <Count label="Hours" value={e.startsIn.hours} />
                  <Count label="Mins" value={e.startsIn.mins} />
                  <Count label="Secs" value={e.startsIn.secs} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Panel>
        <RoyalSectionHeader icon="calendar" eyebrow="On the Horizon" title="All Upcoming Milestones" action={<Pill tone="muted">{upcoming.length} events</Pill>} />
        {/* Vertical glowing timeline */}
        <div className="relative space-y-3 pl-6">
          {/* Gold line */}
          <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" />
          {rest.map((e, i) => (
            <div key={e.id} className="relative stagger-in" style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
              {/* Glowing dot */}
              <div className="absolute -left-[18px] top-3 h-2.5 w-2.5 rounded-full bg-gold border border-gold-bright" style={{ boxShadow: '0 0 8px rgba(212,175,55,.5)' }} />
              <ArtCard
                src={e.art}
                alt={e.title}
              title={e.title}
              action={
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <Count label="D" value={e.startsIn.days} small />
                    <Count label="H" value={e.startsIn.hours} small />
                    <Count label="M" value={e.startsIn.mins} small />
                    <Count label="S" value={e.startsIn.secs} small />
                  </div>
                  <Pill tone={toneFor(e.type)}>{e.type}</Pill>
                </div>
              }
            >
              <p className="text-xs text-parchment/60">{e.description}</p>
            </ArtCard>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-center text-[10px] text-parchment/30">
        Schedule synced from the <a href={kingdom.timelineSource} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold-bright underline">official Kingdom 846 timeline</a>. Countdowns are live estimates.
      </p>
    </div>
  )
}

function Count({ label, value, small }) {
  return (
    <div className={`royal-count ${small ? 'px-2 py-1' : 'px-2 py-2'}`}>
      <span className={`royal-count-num ${small ? 'text-sm' : 'text-2xl'}`}>{String(value).padStart(small ? 1 : 2, '0')}</span>
      <span className="royal-count-label">{label}</span>
    </div>
  )
}

function toneFor(t) {
  return { PVP: 'red', SEASON: 'gold', PVE: 'green', BOSS: 'blue', HEROES: 'gold', PETS: 'green', TRUEGOLD: 'blue', ANNIVERSARY: 'gold', 'CASTLE BATTLE': 'red', FEATURE: 'muted' }[t] || 'muted'
}
