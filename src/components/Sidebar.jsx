import Icon from './Icon'
import { nav } from '../data/kingdom'

// Map leader to their alliance-themed avatar
function getLeaderAvatar(user) {
  if (!user) return './assets/avatars/king.webp'
  if (user.role === 'admin') return './assets/avatars/spartan.webp'
  const slug = user.alliance_slug || ''
  const map = {
    'ryo': './assets/avatars/ryo-lord.webp',
    'kzk': './assets/avatars/kzk-lord.webp',
    'sas': './assets/avatars/sas-lord.webp',
    'ice': './assets/avatars/ice-lord.webp',
  }
  return map[slug] || './assets/avatars/queen.webp'
}

export default function Sidebar({ active, onNavigate, onLogin, onSignOut, user, isAdmin }) {
  const isShoni = user?.role === 'leader' && user?.username === 'shoni'

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gold/15 bg-ink-2/90 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/8 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gold/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/15 to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3 px-3.5 py-4">
        <div className="relative grid h-[70px] w-[70px] shrink-0 place-items-center">
          <div
            className="pointer-events-none absolute inset-1 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(232,199,102,.18) 0%, rgba(212,175,55,.08) 42%, transparent 72%)',
              filter: 'blur(6px)',
            }}
          />
          <img
            src="./assets/crest-846.png"
            alt="Kingdom 846 crest"
            className="sidebar-crest relative h-[66px] w-[66px] object-contain float-anim"
            style={{
              background: 'transparent',
              border: 0,
              borderRadius: 0,
              filter: 'brightness(1.10) saturate(1.10) drop-shadow(0 0 7px rgba(232,199,102,.36)) drop-shadow(0 7px 10px rgba(0,0,0,.55))',
            }}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="gradient-gold whitespace-nowrap font-display text-[15px] font-bold tracking-[0.035em]">KINGDOM 846</div>
          <div className="mt-1 whitespace-nowrap text-[9px] uppercase tracking-[0.22em] text-gold/55">Royal Portal</div>
        </div>
      </div>

      <div className="gold-divider mx-4" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 relative z-10">
        <div className="eyebrow px-3 pb-2">Command</div>
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => onNavigate(n.id)}
            className={`nav-item w-full text-left ${active === n.id ? 'active nav-glow' : ''}`}
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
            <button onClick={() => onNavigate('leader-portal')} className={`nav-item w-full text-left ${active === 'leader-portal' ? 'active nav-glow' : ''}`}>
              <Icon name="clock" size={17} /><span>Event Schedule</span>
            </button>
            {isShoni && (
              <button onClick={() => onNavigate('war-room')} className={`nav-item w-full text-left ${active === 'war-room' ? 'active nav-glow' : ''}`}>
                <Icon name="swords" size={17} /><span>War Room</span>
              </button>
            )}
          </>
        )}
      </nav>

      {/* User / Login */}
      <div className="border-t border-gold/15 p-3 relative z-10">
        {user ? (
          <div className="flex items-center gap-3 rounded-lg border border-gold/10 bg-white/5 p-2">
            <img
              src={getLeaderAvatar(user)}
              alt={user.name}
              className="grid h-9 w-9 place-items-center rounded-full object-cover ring-2 ring-gold/50 shadow-lg"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold text-parchment">{user.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-gold/70">{user.role === 'admin' ? 'Sovereign Admin' : 'Alliance Leader'}</div>
            </div>
            <button onClick={onSignOut} title="Sign out" className="text-parchment/50 hover:text-parchment"><Icon name="logout" size={16} /></button>
          </div>
        ) : (
          <button onClick={onLogin} className="btn-primary btn-royal w-full sparkle-btn">
            <Icon name="crown" size={15} /> Royal Access
          </button>
        )}
      </div>
    </aside>
  )
}
