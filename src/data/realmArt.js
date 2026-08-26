// The room the whole site is set in.
//
// The entrance, the home hero and the About banner should all be the same
// place -- that was the point of the hall artwork, and it is why they were
// built around one image. Keeping the path in one module means switching the
// realm's look is a single edit here rather than a hunt through three pages
// that would inevitably drift apart.
//
// The entrance stopped being a fixed room. /royal-welcome-2/ now walks through
// nine halls, one per week, turning at 00:00 UTC on Monday -- so a hard-coded
// hall here would put the home hero in a different room from the door you just
// came through, which is exactly the drift the note above warns about. The rule
// is unchanged; what satisfies it is now a calculation instead of a constant.
//
// This repeats the rotation rather than importing it because the other copy
// lives in a static HTML file that Vite never bundles. The two must agree:
// K846_HALLS / K846_CYCLE_START in public/royal-welcome-2/index.html are the
// original, and ROTATION_START below is the same Monday. Change one, change both.
export const REALM_HALLS = [
  'sapphire', 'coronation', 'moonlit', 'embers', 'cathedral',
  'storm', 'dragongate', 'warcamp', 'celestial',
]

/* Monday 24 Aug 2026, 00:00 UTC -- the week the rotation started, on Sapphire. */
const ROTATION_START = Date.UTC(2026, 7, 24)
const WEEK_MS = 604800000

// The hall the entrance is showing right now. Derived from the date every call,
// so there is nothing to store and nothing to schedule.
export function currentHall(now = Date.now()) {
  const n = REALM_HALLS.length
  const week = Math.floor((now - ROTATION_START) / WEEK_MS)
  // Double modulo: a clock set before the start date gives a negative week,
  // and -1 % 9 is -1 in JS, which would index nothing.
  return REALM_HALLS[((week % n) + n) % n]
}

// Served straight out of the welcome screen's own asset folder. Copying nine
// halls into /assets would duplicate 1.8MB of images that are already shipped
// and already on disk one directory over, and would leave two sets to keep in
// step. Only hall-sapphire.webp was ever copied there; the other eight never
// existed at that path, which is why this could not simply be parameterised.
export function hallImageFor(hall) {
  return `/royal-welcome-2/assets/hall-${hall}.webp`
}

// Deliberately no exported `hallImage` constant. A module-scope const is
// evaluated once when the bundle loads, which would freeze the hall at whatever
// it was when the tab opened -- a tab left open across Monday would then show
// last week's room. Call currentHall() where you render instead.

// The realm itself, for the About page. Deliberately NOT the hall: the hall is
// the room you walk into (entrance and home hero), while About Kingdom is about
// the kingdom, so it gets the kingdom. This plate was already in the repo,
// unused, at 2.6MB of PNG; it is now a 253KB WebP.
export const realmImage = './assets/kingdom-realm.webp'
