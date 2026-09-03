import { useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import Icon from './Icon'
import { alliances } from '../data/kingdom'
import {
  remindersSupported, permission, reminderStatus,
  enableReminders, changeAlliance, disableReminders, sendTestNotification,
} from '../lib/reminders'

/* Where reminders live once the one-time setup has been answered — turning them
 * on if it was skipped, switching alliance after a transfer, or turning them
 * off. The state shown is the server's answer rather than what was last written
 * down locally: the two drift the moment someone clears site data or reinstalls,
 * and a settings screen confidently reporting the wrong thing is worse than one
 * that has to ask.
 */
export default function ReminderSettings() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  async function refresh() { setStatus(await reminderStatus()) }
  useEffect(() => { refresh() }, [])

  if (!remindersSupported()) {
    return (
      <Panel className="p-5">
        <SectionTitle eyebrow="Reminders" title="Event Reminders" />
        <p className="mt-3 text-sm text-parchment/55">
          This browser cannot deliver event reminders. Install Kingdom 846 to your home screen and open it from there
          — on iPhone, reminders need iOS 16.4 or later and the app added to the Home Screen.
        </p>
      </Panel>
    )
  }

  const blocked = permission() === 'denied'
  const on = !!status?.subscribed
  const current = status?.alliance || null

  async function pick(slug) {
    if (busy) return
    setBusy(true); setNote(null)
    const result = on ? await changeAlliance(slug) : await enableReminders(slug)
    setBusy(false)
    if (result.ok) { setNote(on ? 'Alliance updated.' : 'Reminders are on.'); await refresh() }
    else if (result.reason === 'denied') setNote('Notifications are blocked. Turn them on for Kingdom 846 in your phone settings, then come back.')
    else setNote('Could not update reminders just now. Try again in a moment.')
  }

  // A notification is the one thing here nobody can check before it matters:
  // without this you find out whether it works at 23:50 on the night you were
  // counting on it. The sample is the real five-minute Bear Hunt reminder.
  async function sendTest() {
    setBusy(true); setNote(null)
    const result = await sendTestNotification()
    setBusy(false)
    if (result.ok) setNote('Sent — it should appear in a second or two. If nothing arrives, check Kingdom 846 is allowed to notify you in your phone settings.')
    else if (result.reason === 'no-subscription') setNote('Turn reminders on first, then try again.')
    else setNote(result.detail || 'Could not send the test just now.')
  }

  async function turnOff() {
    setBusy(true); setNote(null)
    await disableReminders()
    setBusy(false)
    setNote('Reminders are off.')
    await refresh()
  }

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle eyebrow="Reminders" title="Event Reminders" />
        <Pill tone={on ? 'green' : 'muted'}>{on ? 'On' : 'Off'}</Pill>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-parchment/60">
        Your phone buzzes <strong className="text-gold/80">10 minutes</strong> and{' '}
        <strong className="text-gold/80">5 minutes</strong> before your alliance's events — Bear Hunt, Vikings
        Vengeance, Tri-Alliance Clash and Swordland Showdown — even when the app is closed. Times come from your
        alliance leader's schedule.
      </p>

      {blocked && (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/5 p-3 text-xs leading-relaxed text-rose-200/90">
          Notifications are blocked for Kingdom 846. Allow them in your phone's settings for this app, then reopen
          this page — nothing here can work until then.
        </p>
      )}

      <div className="mt-4 grid gap-2">
        {alliances.map((a) => {
          const selected = current === a.slug && on
          return (
            <button
              key={a.slug}
              type="button"
              disabled={busy || blocked}
              onClick={() => pick(a.slug)}
              className={`setup-option ${selected ? 'is-picked' : ''} disabled:opacity-40`}
              aria-pressed={selected}
            >
              <span className="setup-tag">{a.tag}</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-parchment">{a.name}</span>
                <span className="block truncate text-[11px] text-parchment/45">
                  {selected ? 'Reminders on for this alliance' : `Led by ${a.leader}`}
                </span>
              </span>
              {selected && <Icon name="shieldCheck" size={16} className="shrink-0 text-gold" />}
            </button>
          )
        })}
      </div>

      {note && <p className="mt-3 text-xs text-parchment/60">{note}</p>}

      {on && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gold/10 pt-4">
          <button onClick={sendTest} disabled={busy} className="btn-primary !py-1.5 !text-xs disabled:opacity-40">
            {busy ? 'Sending…' : 'Send me a test reminder'}
          </button>
          <span className="text-[11px] text-parchment/40">See exactly what arrives before it matters.</span>
          <button onClick={turnOff} disabled={busy} className="ml-auto rounded-lg border border-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">
            Turn off
          </button>
        </div>
      )}
    </Panel>
  )
}
