import { useState } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState({
    transferRequests: true,
    applications: true,
    newsDigest: false,
  })

  const toggleNotif = (key) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      toast(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} ${next[key] ? 'enabled' : 'disabled'}`, 'info')
      return next
    })
  }

  return (
    <div className="space-y-6">
      <Panel glow className="lift-glow gold-corners">
        <div className="eyebrow text-glow">Account</div>
        <h1 className="mt-1 font-display text-3xl font-bold gradient-gold glow-pulse">Settings</h1>
        <p className="mt-2 text-sm text-parchment/60">Manage your profile, notifications, and preferences.</p>
      </Panel>

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
        <div className="mt-3 space-y-2">
          {[
            { key: 'transferRequests', label: 'Transfer Requests', desc: 'Get notified when new transfer requests come in' },
            { key: 'applications', label: 'Ministry Applications', desc: 'Get notified when someone applies for a ministry role' },
            { key: 'newsDigest', label: 'Weekly News Digest', desc: 'Receive a summary of kingdom news each week' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-gold/15 bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-parchment">{item.label}</div>
                <div className="text-xs text-parchment/50">{item.desc}</div>
              </div>
              <button
                onClick={() => toggleNotif(item.key)}
                className={`relative ml-3 h-6 w-11 flex-shrink-0 rounded-full transition ${notifications[item.key] ? 'bg-gold/60' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-parchment shadow transition ${notifications[item.key] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
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
