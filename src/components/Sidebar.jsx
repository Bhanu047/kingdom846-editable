import { Fragment } from 'react'
import Icon from './Icon'
import { nav } from '../data/kingdom'
import { avatarFor } from '../lib/avatars'

export default function Sidebar({ active, onNavigate, onLogin, onSignOut, user, isAdmin, canWarRoom }) {
  // Who sees the War Room link. The room itself and the server both decide this
  // the same way; the prop carries that one answer here rather than a third
  // copy of the rule.
  const showWarRoom = canWarRoom ?? (user?.role === 'admin' || user?.username?.toLowerCase() === 'shoni')

  function openBattleLab() {
    try {
      sessionStorage.removeItem('kingdom846.battleLab.requestedModule')
    } catch {}
    onNavigate('battle-lab')
  }

  return (
    <aside className="royal-rail flex h-full w-64 flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/8 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gold/5 to-transparent pointer-events-none" />
      {/* The rail sat next to the content with a plain hairline. A gilt edge
          with a bright waist reads as the spine of a bound volume, which is
          what the rest of the chrome is now dressed as. */}
      <div className="royal-rail-edge pointer-events-none" />
      {/* The crest, very faint and very large, so the empty stretch below the
          nav is a watermark rather than a void. */}
      <div className="royal-rail-mark pointer-events-none" aria-hidden="true" />

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
            src="./assets/crest-846-sm.webp"
            alt="Kingdom 846 crest"
            className="sidebar-crest relative h-[66px] w-[66px] object-contain float-anim"
            style={{
              background: 'transparent',
              border: 0,
              borderRadius: 0,
              /* The filter that used to sit here is in .sidebar-crest now --
                 sidebar-glow animates `filter`, so an inline one never applied. */
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
          <Fragment key={n.id}>
            <button
              onClick={() => onNavigate(n.id)}
              className={`nav-item w-full text-left ${active === n.id ? 'active nav-glow' : ''}`}
            >
              <Icon name={n.icon} size={17} />
              <span>{n.label}</span>
            </button>

            {n.id === 'guides' && (
              <button onClick={openBattleLab} className={`nav-item w-full text-left ${active === 'battle-lab' ? 'active nav-glow' : ''}`}>
                <Icon name="crosshair" size={17} /><span>Battle Lab</span>
              </button>
            )}
          </Fragment>
        ))}

        <button onClick={() => onNavigate('settings')} className={`nav-item w-full text-left ${active === 'settings' ? 'active nav-glow' : ''}`}>
          <Icon name="settings" size={17} /><span>Settings</span>
        </button>

        {isAdmin && (
          <>
            <div className="gold-divider my-3" />
            <div className="eyebrow px-3 pb-2">Admin</div>
            <button onClick={() => onNavigate('admin')} className={`nav-item w-full text-left ${active === 'admin' ? 'active' : ''}`}>
              <Icon name="sparkles" size={17} /><span>Edit Website</span>
            </button>
            <button onClick={() => onNavigate('war-room')} className={`nav-item w-full text-left ${active === 'war-room' ? 'active nav-glow' : ''}`}>
              <Icon name="swords" size={17} /><span>War Room</span>
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
            {showWarRoom && (
              <button onClick={() => onNavigate('war-room')} className={`nav-item w-full text-left ${active === 'war-room' ? 'active nav-glow' : ''}`}>
                <Icon name="swords" size={17} /><span>War Room</span>
              </button>
            )}
          </>
        )}

        {/* The war-room accounts have exactly one room to go to, so it is their
            whole section rather than an extra line under someone else's. */}
        {user?.role === 'warroom' && showWarRoom && (
          <>
            <div className="gold-divider my-3" />
            <div className="eyebrow px-3 pb-2">War Room</div>
            <button onClick={() => onNavigate('war-room')} className={`nav-item w-full text-left ${active === 'war-room' ? 'active nav-glow' : ''}`}>
              <Icon name="swords" size={17} /><span>War Room</span>
            </button>
          </>
        )}
      </nav>

      {/* User / Login */}
      <div className="border-t border-gold/15 p-3 relative z-10">
        {user ? (
          <div className="flex items-center gap-3 rounded-lg border border-gold/10 bg-white/5 p-2">
            <img
              src={avatarFor(user)}
              alt={user.name}
              className="grid h-9 w-9 place-items-center rounded-full object-cover ring-2 ring-gold/50 shadow-lg"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold text-parchment">{user.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-gold/70">{user.role === 'admin' ? 'Sovereign Admin' : user.role === 'warroom' ? 'War Room Crew' : 'Alliance Leader'}</div>
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
