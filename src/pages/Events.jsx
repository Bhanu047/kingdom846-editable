import { useEffect, useState, useRef } from 'react'
import { rollDigit } from '../lib/motion'
import { Panel, Pill, ArtImage, ArtCard } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import { timeline, countdownTo, hasPassed } from '../data/kingdom'
import { useSiteData } from '../context/SiteDataContext'
import PageHeader from '../components/PageHeader'

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

function resolveEventArt(item) {
  const title = item?.title || item?.name || ''
  if (title === 'First Anniversary') return './assets/art-season-opening.webp'
  if (title === 'Generation 6 Heroes (Triton, Sophia, Yang)') return './assets/art-heroes.webp'
  if (title === 'First Flamedragon Tyrant Competition') return './assets/art-fire-tyrant.webp'
  return item?.art || './assets/art-kvk-prep.webp'
}

function buildUpcoming(events) {
  return [
    ...timeline.filter((t) => (t.status === 'upcoming' || t.status === 'future') && !hasPassed(t.date)).map((t, i) => ({
      // Two milestones legitimately launch on the same date (e.g. a hero
      // generation and its matching pet generation both on 2026-08-17) --
      // date alone isn't a unique key, so fold in the loop index too.
      id: 'tl-' + t.date + '-' + i,
      title: t.name,
      type: t.category.toUpperCase(),
      art: resolveEventArt(t),
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
      art: resolveEventArt(e),
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
      <PageHeader
        eyebrow="War Calendar"
        title="Upcoming Events"
        subtitle="Kingdom milestone schedule with live countdowns for upcoming events."
        art="./assets/hero-events.webp"
        alt="Castle battle"
      />

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
        <div className="relative space-y-3 pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" />
          {rest.map((e, i) => (
            <div key={e.id} className="relative stagger-in" style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
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

      <p className="text-center text-[10px] text-parchment/30">Kingdom 846 milestone schedule · live countdowns</p>
    </div>
  )
}

function Count({ label, value, small }) {

  // Answers whenever the figure changes. The compact ones in the list only
  // breathe -- see rollDigit: a dozen cards dropping a seconds digit every
  // second flickers, where a dozen cards brightening one reads as a clock.
  const ref = useRef(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    rollDigit(ref.current, { subtle: small })
  }, [value])

  return (
    <div className={`royal-count ${small ? 'px-2 py-1' : 'px-2 py-2'}`}>
      <span ref={ref} className={`royal-count-num ${small ? 'text-sm' : 'text-2xl'}`}>{String(value).padStart(small ? 1 : 2, '0')}</span>
      <span className="royal-count-label">{label}</span>
    </div>
  )
}

function toneFor(t) {
  return { PVP: 'red', SEASON: 'gold', PVE: 'green', BOSS: 'blue', HEROES: 'gold', PETS: 'green', TRUEGOLD: 'blue', ANNIVERSARY: 'gold', 'CASTLE BATTLE': 'red', FEATURE: 'muted' }[t] || 'muted'
}
