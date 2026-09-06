import { useEffect, useState } from 'react'
import Icon from './Icon'

// The kingdom clock, as its own component.
//
// It ticks once a second, and it used to tick as state held in App -- so every
// second the whole application re-rendered: the header, the sidebar, and the
// entire lazily-loaded page below it. On the Battle Lab, where a result screen
// is thousands of nodes, that alone was enough to make scrolling stutter. The
// clock is the only thing on the page that changes each second, so it is the
// only thing that should re-render.
function KingdomClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const d = new Date()
      setTime(
        `${String(d.getUTCHours()).padStart(2, '0')}:` +
        `${String(d.getUTCMinutes()).padStart(2, '0')}:` +
        `${String(d.getUTCSeconds()).padStart(2, '0')} UTC`
      )
    }
    update()
    // A hidden tab has no clock to read; browsers clamp the interval anyway,
    // which leaves the displayed time wrong on return. Stopping and resyncing
    // is both cheaper and more accurate than being clamped.
    let id = setInterval(update, 1000)
    const onVisibility = () => {
      clearInterval(id)
      if (document.hidden) return
      update()
      id = setInterval(update, 1000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])
  return <span className="font-mono text-xs font-semibold text-gold-bright tabular-nums">{time}</span>
}

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
  page, title, isAdmin, user, sidebarUser, appMode,
  onNavigate, onOpenMobileNav, onOpenSearch, onSignOut, onLogin,
}) {
  return (
    <header className="royal-header flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
      {/* In app mode the tab bar's More opens the same rail from the bottom of
          the screen, where a thumb already is -- two controls for one drawer,
          one of them out of reach in the top corner, is the website layout. */}
      {!appMode && <button onClick={onOpenMobileNav} aria-label="Open navigation" className="tap-target shrink-0 text-parchment/70 hover:text-parchment md:hidden"><Icon name="home" size={20} /></button>}
      {/* The small crest, not the full one. This mark renders at 28-32 CSS
          pixels and the full file is 600x900 and 227 kB -- a quarter of a
          megabyte, on every page, for something the size of a favicon. The
          192px variant is 27 kB and is still oversampled on a 3x phone. */}
      {appMode && <img src="./assets/crest-846-sm.webp" alt="" width="28" height="28" className="h-7 w-7 shrink-0 sm:hidden" />}
      <img src="./assets/crest-846-sm.webp" alt="" width="32" height="32" className="crest-pulse h-8 w-8 hidden sm:block shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="eyebrow hidden truncate sm:block">Kingdom 846 · {title}</div>
        <div className="truncate font-display text-base font-bold text-gold-bright">{title}</div>
      </div>
      <div className="mr-1 flex shrink-0 flex-col items-end sm:mr-2">
        <span className="hidden text-[9px] uppercase tracking-wider text-gold/50 sm:block">Kingdom Time</span>
        <KingdomClock />
      </div>
      {isAdmin && page !== 'admin' && <button onClick={() => onNavigate('admin')} className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:flex"><Icon name="sparkles" size={13} /> Edit Site</button>}
      {isAdmin && page !== 'console' && <button onClick={() => onNavigate('console')} className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:flex" data-testid="button-master-console"><Icon name="crown" size={13} /> Master</button>}
      <button onClick={onOpenSearch} aria-label="Search the realm" className={appMode
        ? 'tap-target shrink-0 text-gold/70 hover:text-gold-bright'
        : 'tap-xy flex shrink-0 items-center gap-2 rounded-lg border border-gold/20 bg-ink/60 px-2.5 py-1.5 text-xs text-parchment/50 hover:text-parchment sm:px-3'}>
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
