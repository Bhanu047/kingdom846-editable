import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import ReminderSettings from '../components/ReminderSettings'
import PageHeader from '../components/PageHeader'
import { getNotificationPrefs, setNotificationPref } from '../lib/reminders'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  // These used to be component state with hard-coded defaults: nothing wrote
  // them down and nothing read them, so a toggle lasted until the app closed
  // and would not have sent anything if it had lasted. They now live on this
  // device's push subscription, which is also what receives the result.
  const [prefs, setPrefs] = useState(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)

  const loadPrefs = useCallback(async () => {
    setPrefs(await getNotificationPrefs())
    setPrefsLoading(false)
  }, [])
  useEffect(() => { loadPrefs() }, [loadPrefs])

  const toggleNotif = async (key, label) => {
    if (!prefs || savingKey) return
    const next = !prefs[key]
    setSavingKey(key)
    // Shown immediately, then reconciled with what the server actually stored —
    // a switch that waits on a round trip feels broken on a phone.
    setPrefs((p) => ({ ...p, [key]: next }))
    const result = await setNotificationPref(key, next)
    setSavingKey(null)
    if (result.ok) {
      setPrefs(result.prefs)
      toast(`${label} ${next ? 'on' : 'off'}`, 'info')
    } else {
      setPrefs((p) => ({ ...p, [key]: !next }))
      toast('Could not save that — try again in a moment.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your Seat in the Realm"
        title="Settings"
        subtitle="Your account, and what the kingdom is allowed to send you."
        art="./assets/hero-throne-room.webp"
        alt="The throne room of Kingdom 846"
      />

      <ReminderSettings />

      {/* Profile */}
      <Panel className="p-5">
        <SectionTitle eyebrow="Profile" title="Account Info" icon="users" />
        {user ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-gold/15 bg-white/5 p-3">
              <img
                src={user.role === 'admin' ? './assets/avatars/spartan.webp' : ({
                  'ryo': './assets/avatars/ryo-lord.webp',
                  'kzk': './assets/avatars/kzk-lord.webp',
                  'sas': './assets/avatars/sas-lord.webp',
                  'ice': './assets/avatars/ice-lord.webp',
                }[user.alliance_slug] || './assets/avatars/queen.webp')}
                alt={user.display_name || user.username}
                className="grid h-12 w-12 place-items-center rounded-full object-cover ring-2 ring-gold/50"
              />
              <div className="flex-1">
                <div className="font-display text-lg font-bold text-parchment">{user.display_name || user.username}</div>
                <div className="text-xs text-parchment/50">
                  {user.role === 'admin' ? 'Sovereign Admin' : user.role === 'warroom' ? 'War Room Crew' : 'Alliance Leader'}
                  {user.alliance_tag && ` · ${user.alliance_tag}`}
                </div>
              </div>
              <Pill tone="gold">{user.role}</Pill>
            </div>
            <button onClick={signOut} className="btn-secondary">
              <Icon name="logout" size={14} /> Sign Out
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-gold/15 bg-white/5 p-6 text-center">
            <p className="text-sm text-parchment/60">You are not signed in.</p>
            <p className="mt-1 text-xs text-parchment/40">Sign in via the top-right Login button or sidebar Royal Access.</p>
          </div>
        )}
      </Panel>

      {/* Notifications */}
      <Panel className="p-5">
        <SectionTitle eyebrow="Preferences" title="Notification Settings" icon="bell" />
        {prefsLoading ? (
          <div className="mt-3 py-6 text-center text-sm text-parchment/40">Checking this device…</div>
        ) : !prefs ? (
          <p className="mt-3 rounded-lg border border-gold/15 bg-white/5 p-3 text-xs leading-relaxed text-parchment/60">
            These need notifications switched on for this device first — use <strong className="text-gold/80">Event
            Reminders</strong> above. Each of these settings is remembered per device, so a phone and a laptop can
            be set differently.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {[
              { key: 'alert_arena', label: 'Arena Reset', desc: 'Ten and five minutes before the daily arena reset' },
              { key: 'alert_crown', label: 'A New Ruler', desc: 'When the crown changes hands after Castle Battle' },
              { key: 'alert_birthday', label: 'Birthdays', desc: 'One message on the day, when someone in the kingdom has a birthday' },
              { key: 'digest_weekly', label: 'Weekly News Digest', desc: 'A summary of kingdom news, Mondays at 12:00 UTC' },
            ].map((item) => (
              <div key={item.key} className="stagger-in flex items-center justify-between rounded-lg border border-gold/15 bg-white/5 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-parchment">{item.label}</div>
                  <div className="text-xs text-parchment/50">{item.desc}</div>
                </div>
                <button
                  onClick={() => toggleNotif(item.key, item.label)}
                  disabled={savingKey === item.key}
                  role="switch"
                  aria-checked={!!prefs[item.key]}
                  aria-label={item.label}
                  className={`relative ml-3 h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-50 ${prefs[item.key] ? 'bg-gold/60' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-parchment shadow transition ${prefs[item.key] ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* About This Portal */}
      <Panel className="p-5">
        <SectionTitle eyebrow="About" title="Kingdom 846 Portal" icon="crown" />
        <div className="mt-3 space-y-2 text-sm text-parchment/60">
          <p>This portal is the official community hub for Kingdom 846 (One Crown, Four Alliances) in the game Kingshot.</p>
        </div>
      </Panel>
    </div>
  )
}
