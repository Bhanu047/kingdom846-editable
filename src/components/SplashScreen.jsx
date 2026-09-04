import { useEffect, useRef, useState } from 'react'

export default function SplashScreen({ onEnter }) {
  const [opening, setOpening] = useState(false)
  const [ready, setReady] = useState(false)

  // The shell re-renders every second -- the header carries a live clock -- and
  // hands this component a brand-new onEnter each time. The effect below used
  // to depend on it, so it tore down and re-ran once a second, and every one of
  // those teardowns ran its cleanup: the scroll lock was released and
  // re-applied, and the cover over the page was dropped.
  //
  // Dropped, in the first second, while the entrance behind it was still
  // fetching its crest. That is the "2 layers of welcome screen" -- the door
  // half-built, then the door. Hold onEnter in a ref and let the effect run
  // exactly once, so its cleanup means what it says: this screen is going away.
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter

  useEffect(() => {
    // Lock the page properly, not just with body{overflow:hidden}.
    //
    // iOS Safari ignores overflow:hidden on <body> -- the document keeps
    // scrolling behind the splash, and because the splash is position:fixed,
    // iOS does not repaint it until the scroll ends. Mid-scroll you get the
    // entrance sitting beside or above the dashboard with a hard edge between
    // them, which is exactly what it looks like: the app showing through.
    // Every other browser honoured the old rule, which is why this only ever
    // appeared on a phone.
    //
    // Pinning <body> is what actually holds on iOS. The scroll position is kept
    // and restored, so entering the realm does not also jump you to the top.
    const doc = document.documentElement
    const body = document.body
    const scrollY = window.scrollY || window.pageYOffset || 0
    const prev = {
      htmlOverflow: doc.style.overflow,
      htmlOverscroll: doc.style.overscrollBehavior,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }
    doc.style.overflow = 'hidden'
    doc.style.overscrollBehavior = 'none'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    const unlock = () => {
      doc.style.overflow = prev.htmlOverflow
      doc.style.overscrollBehavior = prev.htmlOverscroll
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'k846-enter-realm') return
      setOpening(true)
      setTimeout(() => {
        unlock()
        onEnterRef.current?.()
      }, 120)
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      unlock()
      try { window.__k846DropVeil?.() } catch { /* veil already gone */ }
      try { window.__k846DismissLaunch?.() } catch { /* already gone */ }
    }
    // Once. See the ref above -- a dependency here is a cleanup every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The front door is /royal-welcome-2/ -- the nine halls, one per week.
  // It was /perplexity-welcome/, a single fixed room, which is why the nine
  // were never seen by anyone who did not type their URL by hand. Both pages
  // hand off the same way (postMessage 'k846-enter-realm' to this parent), so
  // the swap is the src and nothing else.
  // The veil in index.html is covering the page until this says otherwise. It
  // comes down when the entrance has actually painted, not when React decides
  // to render -- an iframe that has not loaded yet is an empty rectangle, and
  // dropping the veil against it is what let the app behind show through.
  // The cover in index.html -- the hall of the week -- is what the visitor has
  // been looking at while the bundle and then this iframe loaded. It comes down
  // here, and the timing is the whole point.
  //
  // `load` on the iframe means its DOCUMENT is ready, not that the room is
  // furnished: the crest is the better part of a megabyte and is still on its
  // way. Revealing on `load` therefore showed the entrance twice -- once as a
  // dark rectangle with a hole where the crest goes, then again complete.
  // Reported exactly that way: "what is this 2 layers of welcome screen".
  //
  // So wait for the crest to actually decode before handing the screen over.
  // Same origin, so we can simply ask it. The wait is capped: a crest that will
  // not come is not a reason to stand in the doorway for ever, and the frame
  // underneath is no worse than what the cover was showing anyway.
  const REVEAL_CAP = 4000

  const revealNow = () => {
    setReady(true)
    try { window.__k846DropVeil?.() } catch { /* veil already gone */ }
    try { window.__k846DismissLaunch?.() } catch { /* already gone */ }
  }

  const reveal = (event) => {
    const frame = event?.currentTarget
    let doc
    // Cross-origin one day, or a frame torn down mid-load: reveal and move on.
    try { doc = frame?.contentDocument } catch { doc = null }
    const crest = doc?.querySelector('img.crest')
    if (!crest || (crest.complete && crest.naturalWidth > 0)) { revealNow(); return }

    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(cap)
      crest.removeEventListener('load', finish)
      crest.removeEventListener('error', finish)
      revealNow()
    }
    const cap = setTimeout(finish, REVEAL_CAP)
    crest.addEventListener('load', finish)
    // An error is a finish too: the crest has its own fallback inside the
    // entrance, and either way the door is as ready as it is going to get.
    crest.addEventListener('error', finish)
  }

  return (
    <section className={`royal-welcome-shell ${opening ? 'is-opening' : ''}`}>
      <iframe
        title="Kingdom 846 Royal Welcome"
        src="/royal-welcome-2/index.html"
        className={`royal-welcome-frame ${ready ? 'is-ready' : ''}`}
        allow="autoplay"
        onLoad={reveal}
      />
      <style>{`
        /* height, not just inset:0. On iOS a fixed element is laid out against
           the LAYOUT viewport, which with viewport-fit=cover is not the area
           you can actually see -- so the entrance came up short of the bottom
           of the screen. An explicit height wins over the bottom anchor when
           both are set, and dvh is the height that tracks Safari's toolbars.
           The vh line is the fallback for anything without dvh. */
        .royal-welcome-shell{position:fixed;inset:0;height:100vh;height:100dvh;
          z-index:9999;overflow:hidden;background:#060810;
          touch-action:none;overscroll-behavior:none}
        .royal-welcome-frame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#060810;opacity:0}
        .royal-welcome-frame.is-ready{opacity:1}
        .royal-welcome-shell.is-opening{pointer-events:none}
      `}</style>
    </section>
  )
}
