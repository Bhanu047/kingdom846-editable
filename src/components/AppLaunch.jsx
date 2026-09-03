import { useEffect, useRef, useState } from 'react'

/* The launch screen shown when the portal opens as an installed app.
 *
 * The website's entrance — the nine halls and ENTER THE REALM — is a front
 * door, and a front door is right for somewhere you arrive at. An app is
 * somewhere you already live: you tap the icon because you want the rankings,
 * and being asked to knock every single time is the single loudest thing
 * saying "this is a web page in disguise".
 *
 * So in app mode the door is replaced by this: the crest, held for a beat
 * while the first screen composes itself behind, then gone. No button, no
 * waiting on a click. It is the same brand, doing the job a splash screen does
 * in a real app.
 */
export default function AppLaunch({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  // The shell re-renders every second (the header carries a live clock), which
  // hands this component a brand-new onDone each time. Depending on it would
  // tear down and restart the timers below once a second, so the launch screen
  // would never finish and the app would never appear. Hold it in a ref and run
  // the timers exactly once.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    // Long enough to register as deliberate branding, short enough that nobody
    // taps the icon twice thinking it did not open. The fade is on top of this.
    const hold = setTimeout(() => setLeaving(true), 900)
    const done = setTimeout(() => onDoneRef.current?.(), 1320)
    // The boot veil in index.html is still covering the document; this screen
    // has replaced its job, so let it go or it sits over everything forever.
    try { window.__k846DropVeil?.() } catch {}
    return () => { clearTimeout(hold); clearTimeout(done) }
  }, [])

  return (
    <section className={`app-launch ${leaving ? 'is-leaving' : ''}`} aria-label="Kingdom 846 starting">
      <div className="app-launch-body">
        <img src="./assets/crest-846.webp" alt="" className="app-launch-crest" />
        <div className="app-launch-word">KINGDOM 846</div>
        <div className="app-launch-rule" aria-hidden="true"><i /></div>
      </div>
      <div className="app-launch-foot">One Crown · Four Alliances</div>
    </section>
  )
}
