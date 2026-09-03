import Icon from './Icon'

// The top bar. Extracted from App so its layout can be exercised at a real
// phone width without booting the whole app behind a login.
//
// Every child here is fighting for the same row, and on a narrow screen the
// row loses. The rules that keep it on one line:
//
//   * the title block is `min-w-0` -- a flex child defaults to
//     `min-width: auto`, which refuses to shrink below its own text, so
//     `flex-1` alone was not enough and the long titles wrapped instead;
//   * everything to its right is `shrink-0`, so the title is the only thing
//     that gives;
//   * the eyebrow is hidden on phones. It reads "Kingdom 846 - War Room"
//     directly above a title reading "War Room", so on the width where
//     something has to go, it is the half that is already said;
//   * the signed-in name is capped and truncated. "Sparta (Sovereign)" is
//     wider than the button it sits in.
export default function AppHeader({
  page, title, estTime, isAdmin, user, sidebarUser, appMode,
  onNavigate, onOpenMobileNav, onOpenSearch, onSignOut, onLogin,
}) {
  return (
    <header className="royal-header flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
      {/* In app mode the tab bar's More opens the same rail from the bottom of
          the screen, where a thumb already is -- two controls for one drawer,
          one of them out of reach in the top corner, is the website layout. */}
      {!appMode && <button onClick={onOpenMobileNav} aria-label="Open navigation" className="tap-target shrink-0 text-parchment/70 hover:text-parchment md:hidden"><Icon name="home" size={20} /></button>}
      {appMode && <img src="./assets/crest-846.png" alt="" className="h-7 w-7 shrink-0 sm:hidden" />}
      <img src="./assets/crest-846.png" alt="" className="crest-pulse h-8 w-8 hidden sm:block shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="eyebrow hidden truncate sm:block">Kingdom 846 · {title}</div>
        <div className="truncate font-display text-base font-bold text-gold-bright">{title}</div>
      </div>
      <div className="mr-1 flex shrink-0 flex-col items-end sm:mr-2">
        <span className="hidden text-[9px] uppercase tracking-wider text-gold/50 sm:block">Kingdom Time</span>
        <span className="font-mono text-xs font-semibold text-gold-bright tabular-nums">{estTime}</span>
      </div>
      {isAdmin && page !== 'admin' && <button onClick={() => onNavigate('admin')} className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:flex"><Icon name="sparkles" size={13} /> Edit Site</button>}
      {isAdmin && page !== 'console' && <button onClick={() => onNavigate('console')} className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:flex" data-testid="button-master-console"><Icon name="crown" size={13} /> Master</button>}
      <button onClick={onOpenSearch} aria-label="Search the realm" className={appMode
        ? 'tap-target shrink-0 text-gold/70 hover:text-gold-bright'
        : 'flex shrink-0 items-center gap-2 rounded-lg border border-gold/20 bg-ink/60 px-2.5 py-1.5 text-xs text-parchment/50 hover:text-parchment sm:px-3'}>
        <Icon name="search" size={appMode ? 19 : 14} />{!appMode && <span className="hidden sm:inline">Search the realm…</span>}
      </button>
      {user ? (
        <button onClick={onSignOut} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gold/20 px-2.5 py-1.5 text-xs text-parchment/70 hover:bg-white/5 hover:text-parchment sm:px-3">
          <Icon name="logout" size={13} />
          <span className="hidden max-w-[8rem] truncate sm:inline">{sidebarUser?.name}</span>
        </button>
      ) : (
        <button onClick={onLogin} className="btn-primary shrink-0 !py-1.5 !text-xs" data-testid="button-leader-login"><Icon name="shield" size={13} /> Login</button>
      )}
    </header>
  )
}
