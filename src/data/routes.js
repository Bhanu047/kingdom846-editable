/**
 * The portal's public routes, and what each one says about itself.
 *
 * One list, read by three things that used to disagree or simply not exist:
 * the per-route <title> and description the browser sets on navigation, the
 * static HTML the build prerenders for crawlers, and sitemap.xml.
 *
 * `index: false` marks a screen that must never be indexed -- the admin
 * console, the war room, a leader's portal. Those are not secret by virtue of
 * being unlisted, but there is no reason to invite a crawler into them, and a
 * signed-out visitor arriving from a search result only ever sees a login
 * prompt.
 */
export const ROUTES = [
  {
    id: 'dashboard', path: '/', index: true, changefreq: 'daily', priority: '1.0',
    // "Kingdom 846" alone is unwinnable: chapter 846 of the Kingdom manga owns
    // every form of it. "Kingshot" and "K846" are what separate this from that,
    // and they are what a player actually types. The trackers that currently
    // outrank the portal for its own name use both.
    title: 'Kingdom 846 (K846) — Official Kingshot Kingdom Portal',
    description: "The official portal for Kingdom 846 (K846) in Kingshot: the crown, the four alliances, bear hunt and KvK schedules, rankings, transfer windows and guides.",
  },
  {
    id: 'about', path: '/about', index: true, changefreq: 'monthly', priority: '0.8',
    title: 'About Kingdom 846 (K846) — Kingshot Atlas Standing & KvK Record',
    description: "Kingdom 846's Kingshot Atlas standing, KvK win record, full match history, transfer windows and kingdom reputation, rebuilt from the public trackers.",
  },
  {
    id: 'alliances', path: '/alliances', index: true, changefreq: 'weekly', priority: '0.9',
    title: 'Kingdom 846 Alliances — Spiders, KamiKaze, Saints & IceHunters | Kingshot',
    description: 'The four alliances of Kingdom 846: leadership, power, bear hunt and rally schedules, and how to join each one.',
  },
  {
    id: 'events', path: '/events', index: true, changefreq: 'daily', priority: '0.9',
    title: 'Kingdom 846 Events — Bear Hunts, KvK & Competition Schedule',
    description: "Every scheduled event in Kingdom 846: bear hunts, rallies, KvK phases, Castle Battle and the competitions ahead, with live countdowns.",
  },
  {
    id: 'timeline', path: '/timeline', index: true, changefreq: 'daily', priority: '0.8',
    title: 'Kingdom 846 (K846) Timeline — Every Kingshot Milestone & Unlock Date',
    description: 'The full Kingshot milestone history of Kingdom 846 (K846): hero and pet generations, Truegold tiers, Masters, feature unlocks and KvK firsts, with the dates ahead.',
  },
  {
    id: 'news', path: '/news', index: true, changefreq: 'daily', priority: '0.8',
    title: 'Kingdom 846 News — Announcements from the Realm',
    description: 'Announcements, KvK results and kingdom news from Kingdom 846.',
  },
  {
    id: 'guides', path: '/guides', index: true, changefreq: 'weekly', priority: '0.9',
    title: 'Kingshot Guides — Bear Hunt, Combat, Heroes & Gear',
    description: 'Kingshot strategy guides collected for Kingdom 846: bear hunt formations, combat mechanics, hero gear, Truegold and KvK preparation.',
  },
  {
    id: 'rankings', path: '/rankings', index: true, changefreq: 'weekly', priority: '0.8',
    title: 'Kingdom 846 Rankings — Commanders & Alliance Standings',
    description: 'Commander rankings and alliance standings across Kingdom 846.',
  },
  {
    id: 'transfer', path: '/transfer', index: true, changefreq: 'monthly', priority: '0.7',
    title: 'Transfer to Kingdom 846 — Windows, Groups & Requirements',
    description: 'How to transfer into Kingdom 846: open transfer windows, transfer group, what the kingdom looks for, and how to request a place.',
  },
  {
    id: 'apply', path: '/apply', index: true, changefreq: 'monthly', priority: '0.6',
    title: 'Apply to Kingdom 846 — Chief Minister & Noble Advisor',
    description: 'Apply for a ministry position in Kingdom 846 — Chief Minister or Noble Advisor.',
  },
  {
    id: 'battle-lab', path: '/battle-lab', index: true, changefreq: 'weekly', priority: '0.7',
    title: 'Kingshot Battle Lab — Formation & Combat Calculators',
    description: 'Combat and formation tools for Kingshot: march composition, bear hunt formations, rally impact and mystic trial planning.',
  },
  {
    id: 'privacy', path: '/privacy', index: true, changefreq: 'monthly', priority: '0.3',
    title: 'Privacy — Kingdom 846',
    description: 'What the Kingdom 846 portal stores, why, and how to have it removed.',
  },

  // Signed-in surfaces. Routable, never indexed.
  { id: 'apply-chief',   path: '/apply-chief',   index: false, title: 'Apply: Chief Minister — Kingdom 846' },
  { id: 'apply-noble',   path: '/apply-noble',   index: false, title: 'Apply: Noble Advisor — Kingdom 846' },
  { id: 'admin',         path: '/admin',         index: false, title: 'Admin — Kingdom 846' },
  { id: 'console',       path: '/console',       index: false, title: 'Master Console — Kingdom 846' },
  { id: 'leader-portal', path: '/leader-portal', index: false, title: 'Leader Portal — Kingdom 846' },
  { id: 'war-room',      path: '/war-room',      index: false, title: 'War Room — Kingdom 846' },
  { id: 'settings',      path: '/settings',      index: false, title: 'Settings — Kingdom 846' },
]

export const SITE_ORIGIN = 'https://kingdom846.com'

export const routeById = (id) => ROUTES.find((r) => r.id === id)
export const indexableRoutes = () => ROUTES.filter((r) => r.index)
