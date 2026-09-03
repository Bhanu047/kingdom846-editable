import { useEffect, useRef } from 'react'

/* The launch screen shown when the portal opens as an installed app.
 *
 * The website's entrance -- the nine halls and ENTER THE REALM -- is a front
 * door, and a front door is right for somewhere you arrive at. An app is
 * somewhere you already live: you tap the icon because you want the rankings,
 * and being asked to knock every single time is the single loudest thing
 * saying "this is a web page in disguise".
 *
 * The screen itself is no longer here. It is markup and inline CSS in
 * index.html, because a React component cannot be drawn until 370 kB of JS and
 * CSS has arrived -- and every deploy renames those files, so a phone fetches
 * them fresh from Oregon while the screen it is meant to be showing does not
 * yet exist. That is the "black screen, white screen, then the home page"
 * three separate reports described.
 *
 * So this component holds the timing and nothing else: it lets the screen stand
 * for a beat once the app behind it is actually ready, then takes it away.
 */
export default function AppLaunch({ onDone }) {
  // The shell re-renders every second (the header carries a live clock), which
  // hands this component a brand-new onDone each time. Depending on it would
  // tear down and restart the timers below once a second, so the launch screen
  // would never finish and the app would never appear. Hold it in a ref and run
  // the timers exactly once.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    // Measured from mount, not from page load: by the time React is running,
    // the screen has usually been on display for a while already, and adding a
    // fixed delay on top of a slow start is how a launch screen becomes a wait.
    const hold = setTimeout(() => { try { window.__k846DismissLaunch?.() } catch { /* already gone */ } }, 700)
    const done = setTimeout(() => onDoneRef.current?.(), 1120)
    // The boot veil in index.html is still covering the document; this screen
    // has replaced its job, so let it go or it sits over everything forever.
    try { window.__k846DropVeil?.() } catch { /* veil already gone */ }
    return () => { clearTimeout(hold); clearTimeout(done) }
  }, [])

  return null
}
