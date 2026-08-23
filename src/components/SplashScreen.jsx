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

  return (
    <section className={`perplexity-welcome-shell ${opening ? 'is-opening' : ''}`}>
      <iframe
        title="Kingdom 846 Royal Welcome"
        src="/perplexity-welcome/index.html"
        className="perplexity-welcome-frame"
        allow="autoplay"
      />
      <style>{`
        .perplexity-welcome-shell{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#060810}
        .perplexity-welcome-frame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#060810}
        .perplexity-welcome-shell.is-opening{pointer-events:none}
      `}</style>
    </section>
  )
}
