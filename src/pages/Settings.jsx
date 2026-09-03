import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import ReminderSettings from '../components/ReminderSettings'
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
      <Panel glow className="lift-glow gold-corners">
        <div className="eyebrow text-glow">Account</div>
        <h1 className="mt-1 font-display text-3xl font-bold gradient-gold glow-pulse">Settings</h1>
        <p className="mt-2 text-sm text-parchment/60">Manage your profile, notifications, and preferences.</p>
      </Panel>

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
                  {user.role === 'admin' ? 'Sovereign Admin' : 'Alliance Leader'}
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
              { key: 'digest_weekly', label: 'Weekly News Digest', desc: 'A summary of kingdom news, Mondays at 12:00 UTC' },
              // The two below only ever fire for leadership, so they are shown
              // only to a device signed in as a leader or Sparta rather than
              // offering everyone a switch that can do nothing for them.
              ...(prefs.is_leadership ? [
                { key: 'alert_transfers', label: 'Transfer Requests', desc: 'When someone asks to transfer into the kingdom' },
                { key: 'alert_applications', label: 'Ministry Applications', desc: 'When someone applies for Chief Minister or Noble Advisor' },
              ] : []),
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg border border-gold/15 bg-white/5 p-3">
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
            {!prefs.is_leadership && (
              <p className="pt-1 text-[11px] text-parchment/35">
                Transfer and application alerts appear here once you sign in as an alliance leader or Sparta on this device.
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* About This Portal */}
      <Panel className="p-5">
        <SectionTitle eyebrow="About" title="Kingdom 846 Portal" icon="crown" />
        <div className="mt-3 space-y-2 text-sm text-parchment/60">
          <p>This portal is the official community hub for Kingdom 846 (One Crown, Four Alliances) in the game Kingshot.</p>
          <p className="text-xs text-parchment/40">Built with React + Vite + Tailwind CSS · Express + SQLite backend</p>
        </div>
      </Panel>
    </div>
  )
}
