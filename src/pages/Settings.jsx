import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import ReminderSettings from '../components/ReminderSettings'
import PageHeader from '../components/PageHeader'
import { getNotificationPrefs, setNotificationPref } from '../lib/reminders'
import { avatarFor } from '../lib/avatars'

export default function Settings() {
  const { user, signOut, changeOwnCredentials } = useAuth()
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

  // Changing your own login, for whoever is signed in.
  //
  // The server has always allowed this for any account -- /api/me/set-password
  // even tells people to "use Settings" when they try to set a first password
  // twice -- but the only form that called it lived in the Master Console,
  // which is Sparta's alone. So a leader or one of the war room crew could set
  // a password once, on their first login, and then had to ask Sparta to change
  // it ever again. Now they do not.
  const [curPw, setCurPw] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPw, setNewPw] = useState('')
  const [credSaving, setCredSaving] = useState(false)
  const [credErr, setCredErr] = useState(null)
  const [credMsg, setCredMsg] = useState(null)

  const saveCredentials = async (e) => {
    e.preventDefault()
    setCredErr(null); setCredMsg(null)
    if (!curPw) { setCredErr('Enter your current password.'); return }
    if (!newUser && !newPw) { setCredErr('Enter a new username or a new password.'); return }
    if (newPw && newPw.length < 6) { setCredErr('New password must be at least 6 characters.'); return }
    setCredSaving(true)
    try {
      await changeOwnCredentials(curPw, newUser || user.username, newPw)
      setCurPw(''); setNewUser(''); setNewPw('')
      // The token still works, but it is signed for the account -- not the old
      // username -- so nothing forces a sign-out here. Say what changed instead.
      setCredMsg(newPw && newUser
        ? 'Username and password updated. Use them the next time you sign in.'
        : newPw ? 'Password updated. Use it the next time you sign in.'
        : 'Username updated. Use it the next time you sign in.')
      toast('Your login is updated.', 'info')
    } catch (err) { setCredErr(err.message) }
    finally { setCredSaving(false) }
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
                src={avatarFor(user)}
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

            {/* Your own login, changeable as often as you like. */}
            <form onSubmit={saveCredentials} className="rounded-lg border border-gold/15 bg-white/5 p-3">
              <div className="eyebrow">Your Login</div>
              <p className="mt-1 text-xs text-parchment/50">
                Signed in as <span className="font-semibold text-gold">{user.username}</span>. Change your username,
                your password, or both — you only need your current password to do it.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-parchment/50">Current Password</span>
                  <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} data-testid="input-current-password"
                    className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-parchment/50">New Username</span>
                  <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Leave blank to keep" data-testid="input-new-username"
                    className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-parchment/50">New Password</span>
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters, blank to keep" data-testid="input-change-password"
                    className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40" />
                </label>
                <div className="flex items-end">
                  <button type="submit" disabled={credSaving} className="btn-primary w-full" data-testid="button-save-credentials">
                    {credSaving ? 'Saving…' : 'Update My Login'}
                  </button>
                </div>
              </div>
              {credErr && <div className="mt-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{credErr}</div>}
              {credMsg && <div className="mt-3 rounded-md bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{credMsg}</div>}
            </form>
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
