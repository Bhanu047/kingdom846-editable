import { useEffect, useState } from 'react'

export default function SplashScreen({ onEnter }) {
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'k846-enter-realm') return
      setOpening(true)
      setTimeout(() => {
        document.body.style.overflow = ''
        onEnter?.()
      }, 120)
    }
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      document.body.style.overflow = ''
    }
  }, [onEnter])

  // The front door is /royal-welcome-2/ -- the nine halls, one per week.
  // It was /perplexity-welcome/, a single fixed room, which is why the nine
  // were never seen by anyone who did not type their URL by hand. Both pages
  // hand off the same way (postMessage 'k846-enter-realm' to this parent), so
  // the swap is the src and nothing else.
  return (
    <section className={`royal-welcome-shell ${opening ? 'is-opening' : ''}`}>
      <iframe
        title="Kingdom 846 Royal Welcome"
        src="/royal-welcome-2/index.html"
        className="royal-welcome-frame"
        allow="autoplay"
      />
      <style>{`
        .royal-welcome-shell{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#060810}
        .royal-welcome-frame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#060810}
        .royal-welcome-shell.is-opening{pointer-events:none}
      `}</style>
    </section>
  )
}
