import { useEffect, useState } from 'react'

export default function SplashScreen({ onEnter }) {
  const [opening, setOpening] = useState(false)
  const [ready, setReady] = useState(false)

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
        onEnter?.()
      }, 120)
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      unlock()
      try { window.__k846DropVeil?.() } catch { /* veil already gone */ }
    }
  }, [onEnter])

  // The front door is /royal-welcome-2/ -- the nine halls, one per week.
  // It was /perplexity-welcome/, a single fixed room, which is why the nine
  // were never seen by anyone who did not type their URL by hand. Both pages
  // hand off the same way (postMessage 'k846-enter-realm' to this parent), so
  // the swap is the src and nothing else.
  // The veil in index.html is covering the page until this says otherwise. It
  // comes down when the entrance has actually painted, not when React decides
  // to render -- an iframe that has not loaded yet is an empty rectangle, and
  // dropping the veil against it is what let the app behind show through.
  const reveal = () => {
    setReady(true)
    try { window.__k846DropVeil?.() } catch { /* veil already gone */ }
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
        .royal-welcome-shell{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#060810;
          touch-action:none;overscroll-behavior:none}
        .royal-welcome-frame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#060810;opacity:0}
        .royal-welcome-frame.is-ready{opacity:1}
        .royal-welcome-shell.is-opening{pointer-events:none}
      `}</style>
    </section>
  )
}
