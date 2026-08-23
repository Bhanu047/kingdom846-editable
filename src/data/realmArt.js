// The room the whole site is set in.
//
// The entrance, the home hero and the About banner should all be the same
// place -- that was the point of the hall artwork, and it is why they were
// built around one image. Keeping the path in one module means switching the
// realm's look is a single edit here rather than a hunt through three pages
// that would inevitably drift apart.
//
// Must stay in step with CONFIG.theme in public/royal-welcome/index.html: the
// welcome screen picks its hall from its own theme table, so if these two
// disagree the entrance opens into a different room than the one it showed.
export const REALM_THEME = 'sapphire'

// Halls shipped with the welcome-screen package. Any of these can be the
// realm's look; only the one named above is copied into /assets.
export const REALM_HALLS = [
  'sapphire', 'coronation', 'moonlit', 'embers', 'cathedral',
  'storm', 'dragongate', 'warcamp', 'celestial', 'frost',
]

export const hallImage = `./assets/hall-${REALM_THEME}.webp`

// The realm itself, for the About page. Deliberately NOT the hall: the hall is
// the room you walk into (entrance and home hero), while About Kingdom is about
// the kingdom, so it gets the kingdom. This plate was already in the repo,
// unused, at 2.6MB of PNG; it is now a 253KB WebP.
export const realmImage = './assets/kingdom-realm.webp'
