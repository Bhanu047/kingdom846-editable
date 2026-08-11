import { useState, useMemo, lazy, Suspense, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Icon from './components/Icon'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { PageSkeleton } from './components/Skeleton'
import SplashScreen from './components/SplashScreen'
import ParticleField from './components/ParticleField'
import ScrollProgress from './components/ScrollProgress'
import ChatAssistant from './components/ChatAssistant'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SiteDataProvider } from './context/SiteDataContext'
import { nav, timeline, guides, news } from './data/kingdom'

function useESTClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    function update() {
      const now = new Date()
      const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
      const h = utc.getHours()
      const m = utc.getMinutes()
      const s = utc.getSeconds()
      setTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UTC`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// Code-split pages for smaller initial bundle
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
const Settings = lazy(() => import('./pages/Settings'))

const titles = {
  dashboard: 'Home', about: 'About Kingdom', kingdom: 'Kingdom',
  alliances: 'Alliances', events: 'Events', timeline: 'Timeline', news: 'News',
  guides: 'Guides', rankings: 'Rankings',
  transfer: 'Transfer', 'apply-chief': 'Apply · Chief Minister', 'apply-noble': 'Apply · Noble Advisor', apply: 'Apply', admin: 'Admin Editor', console: 'Master Console', settings: 'Settings',
  'leader-portal': 'Event Schedule'
}

// Hash-based routing: #/dashboard, #/rankings, etc.
function getPageFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash || 'dashboard'
}

function navigateTo(page) {
  window.location.hash = '/' + page
}

function Placeholder({ title, icon = 'bell', note }) {
  return (
    <div className="grid place-items-center py-20">
      <div className="panel panel-glow max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/10 text-gold"><Icon name={icon} size={26} /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-parchment">{title}</h1>
        <p className="mt-2 text-sm text-parchment/60">{note}</p>
        <div className="mt-4 flex justify-center"><span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">Coming Soon</span></div>
      </div>
    </div>
  )
}

function Shell() {
  const { user, signOut, isAdmin } = useAuth()
  const estTime = useESTClock()
  const [showSplash, setShowSplash] = useState(true)
  const [page, setPage] = useState(getPageFromHash)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginMode, setLoginMode] = useState('leader')
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  // Sync state with hash changes (browser back/forward)
  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (p) => {
    navigateTo(p)
    setPage(p)
    setMobileNav(false)
  }

  const index = useMemo(() => {
    const items = []
    nav.forEach((n) => items.push({ type: 'Page', label: n.label, page: n.id, icon: n.icon }))
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

  function render() {
    const lazyEl = (() => {
      switch (page) {
        case 'dashboard': return <Dashboard onNavigate={navigate} />
        case 'about': return <About />
        case 'alliances': return <Alliances />
        case 'events': return <Events />
        case 'timeline': return <Timeline />
        case 'news': return <News />
        case 'guides': return <Guides />
        case 'rankings': return <Rankings />
        case 'transfer': return <Transfer />
        case 'apply': return <Apply onNavigate={navigate} />
        case 'apply-chief': return <Apply type="chief_minister" onNavigate={navigate} />
        case 'apply-noble': return <Apply type="noble_advisor" onNavigate={navigate} />
        case 'admin': return isAdmin ? <Admin /> : <Placeholder title="Admin Access" icon="shieldCheck" note="Only the Sparta account can access the website editor." />
        case 'console': return isAdmin ? <MasterConsole /> : <Placeholder title="Master Console" icon="crown" note="Only the Sparta master account can access the console." />
        case 'leader-portal': return user?.role === 'leader' ? <LeaderPortal /> : <Placeholder title="Leader Access" icon="clock" note="Only alliance leaders can manage event schedules. Log in with your leader account." />
        case 'settings': return <Settings />
        default: return <Dashboard onNavigate={navigate} />
      }
    })()
    return (
      <ErrorBoundary key={page}>
        <Suspense fallback={<PageSkeleton />}>
          {lazyEl}
        </Suspense>
      </ErrorBoundary>
    )
  }

  const sidebarUser = user ? { name: user.display_name || user.username, role: user.role } : null
  const handleSignOut = () => { signOut(); navigate('dashboard') }

  // Lazy-load Login modal only when needed
  const [Login, setLogin] = useState(null)
  useEffect(() => {
    if (loginOpen && !Login) {
      import('./components/Login').then((m) => setLogin(() => m.default))
    }
  }, [loginOpen, Login])

  return (
    <>
      {showSplash && <SplashScreen onEnter={() => setShowSplash(false)} />}
      {/* Canvas particle system + mouse glow */}
      <ParticleField />
      <ScrollProgress />
      <ChatAssistant />
      <div className="flex h-screen overflow-hidden relative z-10">
      <div className="hidden md:flex">
        <Sidebar active={page} onNavigate={navigate} user={sidebarUser} onLogin={() => { setLoginMode('admin'); setLoginOpen(true) }} onSignOut={handleSignOut} isAdmin={isAdmin} />
      </div>

      {mobileNav && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-ink/70" />
          <div className="absolute left-0 top-0 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar active={page} onNavigate={navigate} user={sidebarUser} onLogin={() => { setLoginMode('admin'); setLoginOpen(true) }} onSignOut={handleSignOut} isAdmin={isAdmin} />
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="royal-header flex items-center gap-3 px-4 py-3 md:px-6">
          <button onClick={() => setMobileNav(true)} className="text-parchment/70 hover:text-parchment md:hidden">
            <Icon name="home" size={20} />
          </button>
          <img src="./assets/crest-846.png" alt="" className="crest-pulse h-8 w-8 hidden sm:block" />
          <div className="flex-1">
            <div className="eyebrow">Kingdom 846 · {titles[page] || 'Page'}</div>
            <div className="font-display text-base font-bold text-gold-bright">{titles[page] || 'Page'}</div>
          </div>
          {/* Live EST Clock */}
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[9px] uppercase tracking-wider text-gold/50">Kingdom Time</span>
            <span className="font-mono text-xs font-semibold text-gold-bright tabular-nums">{estTime}</span>
          </div>
          {isAdmin && page !== 'admin' && (
            <button onClick={() => navigate('admin')} className="hidden items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:flex">
              <Icon name="sparkles" size={13} /> Edit Site
            </button>
          )}
          {isAdmin && page !== 'console' && (
            <button onClick={() => navigate('console')} className="hidden items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:flex" data-testid="button-master-console">
              <Icon name="crown" size={13} /> Master
            </button>
          )}
          <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-lg border border-gold/20 bg-ink/60 px-3 py-1.5 text-xs text-parchment/50 hover:text-parchment">
            <Icon name="search" size={14} /> <span className="hidden sm:inline">Search the realm…</span>
          </button>
          {user ? (
            <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-lg border border-gold/20 px-3 py-1.5 text-xs text-parchment/70 hover:text-parchment hover:bg-white/5">
              <Icon name="logout" size={13} /> {sidebarUser?.name}
            </button>
          ) : (
            <button onClick={() => { setLoginMode('leader'); setLoginOpen(true) }} className="btn-primary !py-1.5 !text-xs" data-testid="button-leader-login">
              <Icon name="shield" size={13} /> Login
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div key={page} className="page-enter mx-auto max-w-6xl">{render()}</div>
          {/* Footer */}
          <footer className="mt-12 border-t border-gold/10 pt-4 pb-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2 text-gold/60">
                <span className="text-lg">👑</span>
                <span className="font-serif text-sm tracking-wide gradient-gold font-semibold">Kingdom 846</span>
                <span className="text-lg">👑</span>
              </div>
              <p className="text-[11px] text-parchment/30 italic">Where legends are forged in fire and crowned in gold</p>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-parchment/25">
                <span>Crafted by</span>
                <span className="text-gold/40 font-medium">Spartan</span>
                <span>·</span>
                <span>Forged for the realm</span>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/80 p-4 pt-[12vh]" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="panel panel-glow overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gold/15 p-3">
                <Icon name="search" size={16} className="text-gold" />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pages, timeline, guides, news…" className="w-full bg-transparent text-sm text-parchment outline-none placeholder:text-parchment/40" />
                <button onClick={() => setSearchOpen(false)} className="text-parchment/40 hover:text-parchment text-xs">Esc</button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <div className="p-6 text-center text-sm text-parchment/40">No results for "{search}"</div>
                ) : (
                  results.map((r, i) => (
                    <button key={i} onClick={() => { navigate(r.page); setSearchOpen(false); setSearch('') }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5">
                      <Icon name={r.icon} size={15} className="text-gold/70" />
                      <span className="flex-1 text-sm text-parchment">{r.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-parchment/30">{r.type}</span>
                    </button>
                  ))
                )}
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
  return (
    <AuthProvider>
      <SiteDataProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </SiteDataProvider>
    </AuthProvider>
  )
}
