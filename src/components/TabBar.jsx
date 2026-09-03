import Icon from './Icon'

/* The bottom tab bar — app mode only.
 *
 * More than anything else on screen, this is what separates an app from a
 * website on a phone. A website hides its navigation behind a hamburger in the
 * top corner, because a website is a document you read top to bottom. An app
 * puts its four or five real destinations under your thumb, permanently, and
 * you move between them without ever opening a menu.
 *
 * Five slots is the ceiling before the labels stop being readable at phone
 * width. Four of them are the pages people actually come back for; the fifth
 * opens the full rail for everything else, which is where Transfer, Apply,
 * Timeline, About and the leader pages live.
 */
const TABS = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'rankings', label: 'Ranks', icon: 'trophy' },
  { id: 'guides', label: 'Guides', icon: 'book' },
]

export default function TabBar({ active, onNavigate, onOpenMore, moreOpen }) {
  return (
    <nav className="app-tabbar" aria-label="Primary">
      {TABS.map((tab) => {
        const selected = !moreOpen && active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`app-tab ${selected ? 'is-active' : ''}`}
            aria-current={selected ? 'page' : undefined}
          >
            {/* The lit bar above the active tab, rather than a filled pill —
                the chrome here is gilt-on-ink, and a solid block of gold at the
                bottom of the screen fights the gold in the content above it. */}
            <span className="app-tab-mark" aria-hidden="true" />
            <Icon name={tab.icon} size={20} />
            <span className="app-tab-label">{tab.label}</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={onOpenMore}
        className={`app-tab ${moreOpen ? 'is-active' : ''}`}
        aria-expanded={moreOpen}
      >
        <span className="app-tab-mark" aria-hidden="true" />
        <Icon name="layers" size={20} />
        <span className="app-tab-label">More</span>
      </button>
    </nav>
  )
}
