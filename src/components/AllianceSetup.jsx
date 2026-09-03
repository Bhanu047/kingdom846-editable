import { useEffect, useState } from 'react'
import Icon from './Icon'
import { alliances } from '../data/kingdom'
import { remindersSupported, permission, savedAlliance, enableReminders, reminderStatus } from '../lib/reminders'

const SEEN_KEY = 'k846-reminder-setup-seen'

/* Asked once, shortly after the app is installed: which alliance are you in?
 *
 * Everything about the reminders depends on this one answer — the events are
 * per-alliance and the times differ between them, so a reminder for the wrong
 * alliance is worse than no reminder. It is asked here rather than buried in
 * Settings because a feature nobody turns on may as well not exist, and it is
 * asked once: declining is remembered, and Settings is where it lives after.
 */
export default function AllianceSetup({ appMode }) {
  const [show, setShow] = useState(false)
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!appMode || !remindersSupported()) return
    // Never ask someone who has already answered, already subscribed, or has
    // permanently blocked notifications at the browser level — in that last
    // case the prompt cannot be shown again and the button would do nothing.
    let cancelled = false
    const seen = (() => { try { return localStorage.getItem(SEEN_KEY) } catch { return null } })()
    if (seen || savedAlliance() || permission() === 'denied') return
    reminderStatus().then((status) => {
      if (cancelled || status.subscribed) return
      // A beat after launch, so it does not land on top of the launch screen.
      setTimeout(() => { if (!cancelled) setShow(true) }, 2600)
    })
    return () => { cancelled = true }
  }, [appMode])

  function remember() {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch {}
  }

  async function confirm() {
    if (!picked || busy) return
    setBusy(true)
    setError(null)
    const result = await enableReminders(picked)
    setBusy(false)
    if (result.ok) { remember(); setShow(false); return }
    if (result.reason === 'denied') {
      setError('Notifications are blocked for this app. Turn them on in your phone settings, then try again from Settings.')
      remember()
      return
    }
    if (result.reason === 'dismissed') { setError('Permission was dismissed. Tap again when you are ready.'); return }
    setError('Could not set up reminders just now. You can try again from Settings.')
  }

  function skip() { remember(); setShow(false) }

  if (!show) return null

  return (
    <div className="setup-veil" role="dialog" aria-modal="true" aria-label="Choose your alliance">
      <div className="setup-card panel panel-glow gold-corners">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold"><Icon name="bell" size={22} /></div>
          <h2 className="mt-3 font-display text-lg font-bold text-parchment">Never miss an event</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-parchment/60">
            Pick your alliance and your phone will buzz <strong className="text-gold/80">10 minutes</strong> and{' '}
            <strong className="text-gold/80">5 minutes</strong> before each of its events — even with the app closed.
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          {alliances.map((a) => {
            const selected = picked === a.slug
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => { setPicked(a.slug); setError(null) }}
                className={`setup-option ${selected ? 'is-picked' : ''}`}
                aria-pressed={selected}
              >
                <span className="setup-tag">{a.tag || `[${a.slug.toUpperCase()}]`}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-parchment">{a.name}</span>
                  {a.leader && <span className="block truncate text-[11px] text-parchment/45">Led by {a.leader}</span>}
                </span>
                {selected && <Icon name="shieldCheck" size={16} className="shrink-0 text-gold" />}
              </button>
            )
          })}
        </div>

        {error && <p className="mt-3 text-[11px] leading-relaxed text-rose-300/90">{error}</p>}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={confirm} disabled={!picked || busy} className="btn-primary flex-1 !py-2 !text-xs disabled:opacity-35">
            {busy ? 'Setting up…' : 'Turn on reminders'}
          </button>
          <button onClick={skip} className="rounded-lg px-3 py-2 text-xs font-semibold text-parchment/50 hover:text-parchment/80">
            Not now
          </button>
        </div>
        <p className="mt-2.5 text-center text-[10px] text-parchment/35">
          You can change your alliance or turn this off any time in Settings.
        </p>
      </div>
    </div>
  )
}
