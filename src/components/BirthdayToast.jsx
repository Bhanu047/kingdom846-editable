import { useEffect, useState } from 'react'
import Icon from './Icon'
import { apiJson } from '../lib/api'
import { BANNERS } from '../data/kingdom'

/* The birthday, on the crest.
 *
 * Shown once per person per day, not on every open: a celebration you have to
 * dismiss four times stops being one. The record of having seen it is a single
 * date in local storage, so it costs nothing and is wrong in the harmless
 * direction — clear your site data and you see today's again.
 *
 * It waits a moment before appearing. Landing on the dashboard at the same
 * instant as the page paints reads as a bug; arriving just after reads as the
 * kingdom noticing.
 */
const SEEN_KEY = 'k846.birthday.seen'

/* The one-time alliance question owns the screen while it is up: it is how
 * somebody gets reminders at all, and a cake landing on top of it buries the
 * thing they actually needed to do.
 *
 * This asks the page whether that sheet is actually on screen rather than
 * guessing from a stored flag. The first attempt read the key AllianceSetup
 * writes, which is never written on the website -- that sheet only appears in
 * the installed app -- so the card would have waited for something that was
 * never coming and no website visitor would ever have seen a birthday. It also
 * never gets written for anyone already subscribed, who skips the sheet.
 */
const SETUP_SELECTOR = '.setup-veil'
const SETUP_POLL_MS = 1500
const SETUP_GIVE_UP_MS = 2 * 60 * 1000

/* When to look again.
 *
 * Checking once at startup was not enough, and the first real use showed why:
 * Sparta learned a birthday, opened the console, saved it -- and the app it was
 * already running never looked again, so no card appeared. Nobody restarts an
 * app to see whether something they just entered worked.
 *
 * So it also looks when the app comes back to the foreground, which is what a
 * member does after the notification buzzes, and immediately when a birthday is
 * saved in the console, which is what Sparta does.
 */
export const BIRTHDAYS_CHANGED = 'k846:birthdays-changed'

export default function BirthdayToast() {
  const [people, setPeople] = useState([])
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timers = []
    let showing = false

    const check = () => {
      if (cancelled || showing) return
      apiJson('/api/birthdays/today').then((data) => {
        if (cancelled || showing || !data?.people?.length) return
        let seen = null
        try { seen = localStorage.getItem(SEEN_KEY) } catch { /* private mode */ }
        if (seen === data.date) return
        setPeople(data.people)

        // A beat after landing. Appearing in the same frame as the page paints
        // reads as a bug; arriving just after reads as the kingdom noticing.
        const waitedFrom = Date.now()
        const show = () => {
          if (cancelled) return
          const setupUp = typeof document !== 'undefined' && document.querySelector(SETUP_SELECTOR)
          if (setupUp && Date.now() - waitedFrom < SETUP_GIVE_UP_MS) {
            timers.push(setTimeout(show, SETUP_POLL_MS))
            return
          }
          showing = true
          setOpen(true)
        }
        timers.push(setTimeout(show, 900))
      }).catch(() => {})
    }

    check()

    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    window.addEventListener(BIRTHDAYS_CHANGED, check)

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
      window.removeEventListener(BIRTHDAYS_CHANGED, check)
    }
  }, [])

  function dismiss() {
    setLeaving(true)
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString().slice(0, 10)) } catch { /* nothing to do */ }
    setTimeout(() => { setOpen(false); setLeaving(false) }, 260)
  }

  if (!open || !people.length) return null

  const single = people.length === 1

  /* Their alliance's banner behind the card.
   *
   * The alliance is already on the entry, so the card may as well be theirs
   * rather than the same throne room for everyone -- a [RYO] player's day looks
   * like [RYO]. Two people from different alliances get the throne room rather
   * than one of their banners: picking the first would quietly say the day
   * belongs to them, and the throne room belongs to all four.
   */
  const slugs = [...new Set(people.map((p) => p.alliance_slug).filter(Boolean))]
  const shared = slugs.length === 1 && people.every((p) => p.alliance_slug)
  // The throne room when they do not share one: it belongs to all four, and it
  // is the picture the notification carries in the same case, so the buzz and
  // the card show the same thing.
  const banner = shared ? BANNERS[slugs[0]] : './assets/hero-throne-room.webp'
  const names = people.map((p) => (
    <span key={p.id} className="inline-flex items-baseline gap-1">
      <span className="font-display font-bold text-gold-bright">{p.name}</span>
      {p.alliance_slug && <span className="text-[10px] font-semibold text-parchment/45">[{p.alliance_slug.toUpperCase()}]</span>}
    </span>
  ))

  return (
    <div className={`bday-veil ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Birthday in the kingdom">
      <div className="bday-card gold-corners has-banner">
        {banner && (
          <div className="bday-banner" aria-hidden="true">
            <img src={banner} alt="" />
            <span className="bday-banner-scrim" />
          </div>
        )}
        <div className="bday-sparks" aria-hidden="true">
          {['8%', '24%', '41%', '58%', '75%', '92%'].map((left, i) => (
            <span key={left} className="bday-spark" style={{ left, animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>

        <div className="bday-cake" aria-hidden="true">🎂</div>

        <p className="bday-eyebrow">{single ? 'A birthday in the realm' : 'Birthdays in the realm'}</p>

        <h2 className="bday-title">
          {names.map((n, i) => (
            <span key={i}>
              {n}
              {i < names.length - 2 ? ', ' : i === names.length - 2 ? ' and ' : ''}
            </span>
          ))}
        </h2>

        <p className="bday-line">
          {single ? 'Raise a horn — the kingdom wishes you well.' : 'Raise a horn — the kingdom wishes you all well.'}
        </p>

        <button onClick={dismiss} className="btn-primary mt-4 !py-2 !text-xs">
          <Icon name="sparkles" size={13} /> Raise a horn
        </button>
      </div>
    </div>
  )
}
