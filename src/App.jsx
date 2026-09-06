import { useState, useMemo, lazy, Suspense, useEffect, useRef, useCallback } from 'react'
import { trackPage, trackAction, installOutboundTracking } from './lib/analytics'
import { installSurfaceTracking } from './lib/surface'
import { installReveal } from './lib/reveal'
import { installStagger, playPageTransition, installTorch, bloomHeading, drawHeaderRule, installNavMark, openOverlay, installTapRipple, staggerIn } from './lib/motion'
import { installPressFeedback } from './lib/press'
import Sidebar from './components/Sidebar'
import AppHeader from './components/AppHeader'
import Icon from './components/Icon'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { PageSkeleton } from './components/Skeleton'
import SplashScreen from './components/SplashScreen'
import AppLaunch from './components/AppLaunch'
import ParticleField from './components/ParticleField'
import Aurora from './components/Aurora'
import ScrollProgress from './components/ScrollProgress'
import ChatAssistant from './components/ChatAssistant'
import InstallPrompt from './components/InstallPrompt'
import TabBar from './components/TabBar'
import { isAppMode } from './lib/appMode'
import NetworkBanner from './components/NetworkBanner'
import AllianceSetup from './components/AllianceSetup'
import BirthdayToast from './components/BirthdayToast'
import PullIndicator from './components/PullIndicator'
import { usePullToRefresh } from './lib/usePullToRefresh'
import { installNetworkWatch, probe } from './lib/network'
import { SiteDataProvider, useSiteData } from './context/SiteDataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { nav, timeline, guides, news } from './data/kingdom'


const Dashboard = lazy(() => import('./pages/Dashboard'))
const About = lazy(() => import('./pages/About'))
const Alliances = lazy(() => import('./pages/Alliances'))
const Events = lazy(() => import('./pages/Events'))
const Timeline = lazy(() => import('./pages/Timeline'))
const News = lazy(() => import('./pages/News'))
const Guides = lazy(() => import('./pages/Guides'))
const Rankings = lazy(() => import('./pages/Rankings'))
const Transfer = lazy(() => import('./pages/Transfer'))
const Apply = lazy(() => import('./pages/Apply'))
const Admin = lazy(() => import('./pages/Admin'))
const MasterConsole = lazy(() => import('./pages/MasterConsole'))
const LeaderPortal = lazy(() => import('./pages/LeaderPortal'))
const WarRoom = lazy(() => import('./pages/WarRoom'))
const BattleLab = lazy(() => import('./pages/BattleLabHub'))
const Settings = lazy(() => import('./pages/Settings'))
const Privacy = lazy(() => import('./pages/Privacy'))

const titles = {
  dashboard: 'Home', about: 'About Kingdom', kingdom: 'Kingdom', alliances: 'Alliances', events: 'Events', timeline: 'Timeline', news: 'News', guides: 'Guides', rankings: 'Rankings', transfer: 'Transfer', 'battle-lab': 'Battle Lab',
  'apply-chief': 'Apply · Chief Minister', 'apply-noble': 'Apply · Noble Advisor', apply: 'Apply', admin: 'Admin Editor', console: 'Master Console', settings: 'Settings', 'leader-portal': 'Event Schedule', 'war-room': 'War Room'
}

/* Wraps the routed view so a page change is a sequence rather than a swap.
   Keyed on `page`, so React remounts it on every navigation and the effect
   runs each time. The teardown matters: navigating again mid-flight must not
   leave the outgoing blocks stranded at opacity 0. */
function PageStage({ page, children }) {
  const ref = useRef(null)
  useEffect(() => {
    document.documentElement.classList.add('k846-js-page')
    // Both wait for the lazily-loaded page to actually mount before they touch
    // anything -- see whenPageReady in motion.js.
    const stopBlocks = playPageTransition(ref.current)
    const stopBloom = bloomHeading(ref.current)
    const stopRule = drawHeaderRule(ref.current)
    return () => { stopBlocks(); stopBloom(); stopRule() }
  }, [page])
  return (
    <div key={page} ref={ref} className="k846-page page-enter mx-auto max-w-6xl">
      {children}
    </div>
  )
}

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash || 'dashboard'
}

function navigateTo(page) { window.location.hash = '/' + page }

// Every hash the switch below handles. Kept next to it so adding a route and
// forgetting this list shows up as a phantom 404 in analytics, not silence.
const KNOWN_PAGES = new Set([
  'dashboard', 'about', 'privacy', 'alliances', 'events', 'timeline', 'news',
  'guides', 'rankings', 'transfer', 'battle-lab', 'apply', 'apply-chief',
  'apply-noble', 'admin', 'console', 'leader-portal', 'war-room', 'settings',
])

/**
 * Android's back button, and the browser's, should close what is open on top of
 * the screen before they leave the screen itself. Without this, dismissing the
 * navigation drawer on a phone means backing out of the page behind it.
 *
 * Opening an overlay pushes a history entry that stands for "an overlay is
 * open"; back pops it and closes the overlay instead of navigating. Closing it
 * from the UI instead removes that entry again, so a later back press is not
 * silently swallowed doing nothing.
 */
function useBackToClose(open, close) {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!open) return
    window.history.pushState({ k846Overlay: true }, '')
    let poppedByBack = false
    const onPop = () => { poppedByBack = true; closeRef.current?.() }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      // Only unwind our own entry, and only if it is still the current one --
      // navigating while the drawer is open pushes a real entry on top, and
      // going back through that would undo the navigation itself.
      if (!poppedByBack && window.history.state?.k846Overlay) window.history.back()
    }
  }, [open])
}

function Placeholder({ title, icon = 'bell', note }) {
  return (
    <div className="grid place-items-center py-20">
      <div className="panel panel-glow max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/10 text-gold"><Icon name={icon} size={26} /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-parchment">{title}</h1>
        <p className="mt-2 text-sm text-parchment/60">{note}</p>
      </div>
    </div>
  )
}

function Shell() {
  const { user, signOut, isAdmin, canUseWarRoom } = useAuth()
  // Fixed for the life of the shell: display-mode cannot change without the
  // document being reloaded into a different window, and re-rendering the whole
  // app because a media query flickered would be worse than being one launch
  // behind. lib/appMode.js still keeps the <html> attribute in step for CSS.
  const [appMode] = useState(isAppMode)
  const [showSplash, setShowSplash] = useState(true)
  const [page, setPage] = useState(getPageFromHash)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginMode, setLoginMode] = useState('leader')
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [Login, setLogin] = useState(null)
  const scrollRef = useRef(null)
  // Overlay stacking, so a layer added later does not land underneath one that
  // opened it: 60 tab bar · 70 nav drawer · 80 search · 90 login · 10010 setup
  // · 10020 birthday.
  const { reload: reloadSiteData } = useSiteData()

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (loginOpen && !Login) import('./components/Login').then((m) => setLogin(() => m.default))
  }, [loginOpen, Login])

  // A new screen starts at its top. The scrolling element is the shell, not the
  // page, so it keeps its offset when the page inside it is swapped -- which
  // meant arriving at Events from halfway down Rankings dropped you halfway
  // down Events, past its header.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [page])

  // One page view per navigation. Deliberately keyed on `page` rather than the
  // hash, so a re-render or a query-string tweak does not double-count.
  useEffect(() => { trackPage(page) }, [page])

  // One delegated listener for the whole app, attached once.
  useEffect(() => { installOutboundTracking() }, [])
  useEffect(() => { installNetworkWatch() }, [])
  useEffect(() => installSurfaceTracking(), [])
  useEffect(() => installReveal(), [])
  useEffect(() => installStagger(), [])

  /* The front door is an overlay and the app mounts behind it, so every
     entrance on the first page was playing to a closed door and was over before
     it opened. Anything that should be SEEN on arrival waits for this. */
  useEffect(() => {
    if (showSplash) return
    window.__k846Entered = true
    document.documentElement.classList.add('k846-entered')
    window.dispatchEvent(new Event('k846:entered'))
  }, [showSplash])
  useEffect(() => installTorch(), [])
  useEffect(() => installTapRipple(), [])
  useEffect(() => installNavMark('nav'), [])
  /* The tab bar's mark travels along its own axis, the same way the rail's
     does. Keyed on the splash too: the bar is only mounted once the front door
     has gone, so an install at mount finds nothing to mark. */
  useEffect(() => {
    if (!appMode || showSplash) return undefined
    return installNavMark('.app-tabbar', {
      item: '.app-tab', activeClass: 'is-active', markClass: 'app-tab-slider', axis: 'x', span: 0.46,
    })
  }, [appMode, showSplash])

  /* The two overlays open rather than appear. On a phone the drawer is the
     most-used thing on the site and was the one place nothing moved at all. */
  useEffect(() => {
    if (!mobileNav) return undefined
    const root = document.querySelector('.k846-drawer')
    return openOverlay(root?.querySelector('.k846-overlay-panel'), {
      backdrop: root?.querySelector('.k846-overlay-backdrop'),
      from: 'left',
      cascade: '.nav-item',
    })
  }, [mobileNav])

  useEffect(() => {
    if (!searchOpen) return undefined
    const root = document.querySelector('.k846-search-overlay')
    return openOverlay(root?.querySelector('.k846-overlay-panel'), {
      backdrop: root?.querySelector('.k846-overlay-backdrop'),
    })
  }, [searchOpen])

  /* Results cascade as they change. Every keystroke rewrites this list, so the
     cascade is short and the travel small -- a queue that takes half a second
     to settle is a search box you cannot type into. */
  const searchList = useRef(null)
  useEffect(() => {
    if (!searchOpen) return undefined
    return staggerIn(searchList.current, { step: 22, duration: 260, distance: 6 })
  }, [searchOpen, search])
  useEffect(() => installPressFeedback(), [])

  // A hash that matches no route silently falls through to the dashboard, so a
  // dead link from Discord looks like a normal visit. Record it instead.
  useEffect(() => {
    if (page && !KNOWN_PAGES.has(page)) trackAction('notfound', page)
  }, [page])

  const navigate = (p) => {
    navigateTo(p)
    setPage(p)
    setMobileNav(false)
  }

  // Tapping the tab you are already on scrolls that screen back to the top,
  // the way every native tab bar behaves. Without it the tab is simply dead on
  // its own page, which is the moment a tab bar stops feeling like one.
  const selectTab = useCallback((p) => {
    // A short tick under the thumb on tab change. Android honours it; iOS has
    // no Vibration API and ignores the call, which is why it is not guarded.
    try { navigator.vibrate?.(8) } catch {}
    if (p === page && !mobileNav) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    else navigate(p)
  }, [page, mobileNav])

  const index = useMemo(() => {
    const items = []
    nav.forEach((n) => items.push({ type: 'Page', label: n.label, page: n.id, icon: n.icon }))
    items.push({ type: 'Tool', label: 'Battle Lab', page: 'battle-lab', icon: 'crosshair' })
    items.push({ type: 'Page', label: 'Settings', page: 'settings', icon: 'settings' })
    items.push({ type: 'Page', label: 'Event Reminders', page: 'settings', icon: 'bell' })
    timeline.forEach((t) => items.push({ type: 'Timeline', label: t.name, page: 'timeline', icon: 'clock' }))
    guides.forEach((g) => items.push({ type: 'Guide', label: g.title, page: 'guides', icon: 'book' }))
    news.forEach((n) => items.push({ type: 'News', label: n.title, page: 'news', icon: 'newspaper' }))
    return items
  }, [])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return index.slice(0, 6)
    return index.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 8)
  }, [search, index])

  // Refreshing means refetching, not reloading the document: the screen you are
  // on, and where you are in it, both survive. Pages fetch their own data, so
  // they are told to as well rather than only the shared site content.
  const refresh = useCallback(async () => {
    await Promise.allSettled([
      probe(),
      reloadSiteData?.(),
      new Promise((resolve) => { window.dispatchEvent(new CustomEvent('k846-refresh')); resolve() }),
    ])
  }, [reloadSiteData])

  // App mode only: in a browser tab the platform still provides its own
  // pull-to-refresh, and two of them fighting over the same drag is worse than
  // either alone.
  const { pull, refreshing, threshold } = usePullToRefresh(scrollRef, refresh, appMode)

  // One history entry for "something is open", not one per overlay.
  //
  // Per-overlay entries looked equivalent and were not: opening the login from
  // the drawer closes one and opens the other in the same tick, so the drawer's
  // cleanup called history.back() while the login's effect pushed its own
  // entry. The resulting popstate arrived at the login's newly-registered
  // listener, which closed it again -- Royal Access dismissed the sidebar and
  // then appeared to do nothing at all.
  //
  // Keyed on whether any overlay is open, that exchange is a no-op: the value
  // never changes, so nothing is pushed or popped, and back still closes
  // whatever is showing.
  const overlayOpen = mobileNav || searchOpen || loginOpen
  const closeOverlays = useCallback(() => {
    setMobileNav(false)
    setSearchOpen(false)
    setLoginOpen(false)
  }, [])
  useBackToClose(overlayOpen, closeOverlays)


  function render() {
    const lazyEl = (() => {
      switch (page) {
        case 'dashboard': return <Dashboard onNavigate={navigate} />
        case 'about': return <About />
        case 'privacy': return <Privacy />
        case 'alliances': return <Alliances />
        case 'events': return <Events />
        case 'timeline': return <Timeline />
        case 'news': return <News />
        case 'guides': return <Guides />
        case 'rankings': return <Rankings />
        case 'transfer': return <Transfer />
        case 'battle-lab': return <BattleLab />
        case 'apply': return <Apply onNavigate={navigate} />
        case 'apply-chief': return <Apply type="chief_minister" onNavigate={navigate} />
        case 'apply-noble': return <Apply type="noble_advisor" onNavigate={navigate} />
        case 'admin': return isAdmin ? <Admin /> : <Placeholder title="Admin Access" icon="shieldCheck" note="Only the Sparta account can access the website editor." />
        case 'console': return isAdmin ? <MasterConsole /> : <Placeholder title="Master Console" icon="crown" note="Only the Sparta master account can access the console." />
        case 'leader-portal': return user?.role === 'leader' ? <LeaderPortal /> : <Placeholder title="Leader Access" icon="clock" note="Only alliance leaders can manage event schedules. Log in with your leader account." />
        case 'war-room': return canUseWarRoom ? <WarRoom /> : <Placeholder title="Private War Room" icon="shieldCheck" note="This command room is reserved for Sparta admin and the war room crew." />
        case 'settings': return <Settings />
        default: return <Dashboard onNavigate={navigate} />
      }
    })()
    return <ErrorBoundary key={page}><Suspense fallback={<PageSkeleton />}>{lazyEl}</Suspense></ErrorBoundary>
  }

  const sidebarUser = user ? { name: user.display_name || user.username, username: user.username, role: user.role, alliance_slug: user.alliance_slug } : null
  const handleSignOut = () => { signOut(); navigate('dashboard') }

  return (
    <>
      {showSplash && (appMode
        ? <AppLaunch onDone={() => setShowSplash(false)} />
        : <SplashScreen onEnter={() => setShowSplash(false)} />)}
      <Aurora />
      <ParticleField />
      <ScrollProgress />
      {/* The chat button carries z-index 9999, the same as the entrance and
          the launch screen, and it renders after both -- so it sat on top of
          them, a floating crown over a door nobody had opened yet. It has
          nothing to answer until there is a page behind it anyway. */}
      {!showSplash && <ChatAssistant />}
      {!showSplash && <InstallPrompt />}
      {!showSplash && <AllianceSetup appMode={appMode} />}
      {/* Above the alliance sheet in the stack, but it only ever appears on a
          birthday, so the two are almost never up together. */}
      {!showSplash && <BirthdayToast />}
      {appMode && !showSplash && (
        <div className="md:hidden">
          <TabBar active={page} onNavigate={selectTab} onOpenMore={() => setMobileNav(true)} moreOpen={mobileNav} />
        </div>
      )}
      <div className="app-shell flex overflow-hidden relative z-10">
        <div className="hidden md:flex">
          <Sidebar active={page} onNavigate={navigate} user={sidebarUser} onLogin={() => { setMobileNav(false); setLoginMode('admin'); setLoginOpen(true) }} onSignOut={handleSignOut} isAdmin={isAdmin} canWarRoom={canUseWarRoom} />
        </div>

        {mobileNav && (
          <div className="k846-drawer fixed inset-0 z-[70] md:hidden" onClick={() => setMobileNav(false)}>
            <div className="k846-overlay-backdrop absolute inset-0 bg-ink/70" />
            <div className="k846-overlay-panel absolute left-0 top-0 h-full" onClick={(e) => e.stopPropagation()}>
              <Sidebar active={page} onNavigate={navigate} user={sidebarUser} onLogin={() => { setMobileNav(false); setLoginMode('admin'); setLoginOpen(true) }} onSignOut={handleSignOut} isAdmin={isAdmin} canWarRoom={canUseWarRoom} />
            </div>
          </div>
        )}

        <main className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            page={page}
            title={titles[page] || 'Page'}
            appMode={appMode}
            isAdmin={isAdmin}
            user={user}
            sidebarUser={sidebarUser}
            onNavigate={navigate}
            onOpenMobileNav={() => setMobileNav(true)}
            onOpenSearch={() => setSearchOpen(true)}
            onSignOut={handleSignOut}
            onLogin={() => { setMobileNav(false); setLoginMode('leader'); setLoginOpen(true) }}
          />

          <NetworkBanner />

          <div ref={scrollRef} className="app-scroll relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-4 md:pt-6" style={{ WebkitOverflowScrolling: 'touch' }}>
            <PullIndicator pull={pull} refreshing={refreshing} threshold={threshold} />
            <div
              className="pull-shift"
              style={pull > 0 ? { transform: `translateY(${pull * 0.42}px)`, transition: refreshing ? 'transform .2s ease' : 'none' } : undefined}
            >
              <PageStage page={page}>{render()}</PageStage>
            <footer className="site-footer mt-12 pt-6 pb-4 relative">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-3"><span className="text-gold-bright float-anim"><Icon name="crown" size={20} /></span><span className="font-serif text-lg tracking-wider gradient-gold font-bold">Kingdom 846</span><span className="text-gold-bright float-anim" style={{ animationDelay: '2s' }}><Icon name="crown" size={20} /></span></div>
                <p className="text-[12px] text-gold/50 italic font-serif">Where legends are forged in fire and crowned in gold</p>
                <div className="footer-credits mt-2 flex items-center gap-2 text-[11px] text-parchment/50"><span>Crafted by</span><span className="text-gold/70 font-semibold">Spartan</span><span className="text-gold/30">◆</span><span>Forged for the realm</span><span className="text-gold/30">◆</span><a href="https://discord.gg/rcxJCh97A" target="_blank" rel="noreferrer" className="tap-y text-gold/60 hover:text-gold-bright transition">Discord</a><span className="text-gold/30">◆</span><a href="#/privacy" className="tap-y text-gold/60 hover:text-gold-bright transition">Privacy</a></div>
              </div>
            </footer>
            </div>
          </div>
        </main>

        {searchOpen && (
          <div className="k846-search-overlay fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]" onClick={() => setSearchOpen(false)}>
            {/* The wash is its own element now: fading the flex parent would
                fade the panel with it, and the panel has its own arrival. */}
            <div className="k846-overlay-backdrop absolute inset-0 bg-ink/80" />
            <div className="k846-overlay-panel relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="panel panel-glow overflow-hidden">
                <div className="flex items-center gap-2 border-b border-gold/15 p-3"><Icon name="search" size={16} className="text-gold" /><input autoFocus aria-label="Search the realm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages, timeline, guides, news…" className="w-full bg-transparent text-sm text-parchment outline-none placeholder:text-parchment/40" /><button onClick={() => setSearchOpen(false)} className="text-parchment/40 hover:text-parchment text-xs">Esc</button></div>
                <div ref={searchList} className="max-h-80 overflow-y-auto p-2">
                  {results.length === 0 ? <div className="p-6 text-center text-sm text-parchment/40">No results for "{search}"</div> : results.map((r, i) => <button key={i} onClick={() => { navigate(r.page); setSearchOpen(false); setSearch('') }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5"><Icon name={r.icon} size={15} className="text-gold/70" /><span className="flex-1 text-sm text-parchment">{r.label}</span><span className="text-[10px] uppercase tracking-wider text-parchment/30">{r.type}</span></button>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {loginOpen && Login && <Login onClose={() => setLoginOpen(false)} onSuccess={() => { if (loginMode === 'leader') navigate('leader-portal'); else navigate('console') }} mode={loginMode} />}
      </div>
    </>
  )
}

export default function App() {
  return <AuthProvider><SiteDataProvider><ToastProvider><Shell /></ToastProvider></SiteDataProvider></AuthProvider>
}
