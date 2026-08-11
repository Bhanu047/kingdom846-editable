import Icon from './Icon'
import { nav } from '../data/kingdom'

export default function Sidebar({ active, onNavigate, onLogin, onSignOut, user, isAdmin }) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gold/15 bg-ink-2/90">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <img src="./assets/crest-846.png" alt="Kingdom 846 crest" className="h-10 w-10 rounded-md" />
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-wide text-gold-bright">KINGDOM 846</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-parchment/50">Royal Portal</div>
        </div>
      </div>

      <div className="gold-divider mx-4" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="eyebrow px-3 pb-2">Command</div>
        {nav.filter((n) => !n.auth || (user?.role === 'admin' || user?.role === 'leader')).map((n) => (
          <button
            key={n.id}
            onClick={() => onNavigate(n.id)}
            className={`nav-item w-full text-left ${active === n.id ? 'active' : ''}`}
          >
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
          </button>
        ))}

        {isAdmin && (
          <>
            <div className="gold-divider my-3" />
            <div className="eyebrow px-3 pb-2">Admin</div>
            <button onClick={() => onNavigate('admin')} className={`nav-item w-full text-left ${active === 'admin' ? 'active' : ''}`}>
              <Icon name="sparkles" size={17} /><span>Edit Website</span>
            </button>
          </>
        )}

        {user?.role === 'leader' && (
          <>
            <div className="gold-divider my-3" />
            <div className="eyebrow px-3 pb-2">Leader</div>
            <button onClick={() => onNavigate('leader-portal')} className={`nav-item w-full text-left ${active === 'leader-portal' ? 'active' : ''}`}>
              <Icon name="upload" size={17} /><span>My Roster</span>
            </button>
          </>
        )}
      </nav>

      {/* User / Login */}
      <div className="border-t border-gold/15 p-3">
        {user ? (
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-gold-bright to-gold text-xs font-bold text-ink">
              {String(user.name).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold text-parchment">{user.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-gold/70">{user.role === 'admin' ? 'Sovereign Admin' : 'Alliance Leader'}</div>
            </div>
            <button onClick={onSignOut} title="Sign out" className="text-parchment/50 hover:text-parchment"><Icon name="logout" size={16} /></button>
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary w-full">
            <Icon name="crown" size={15} /> Royal Access
          </button>
        )}
      </div>
    </aside>
  )
}
