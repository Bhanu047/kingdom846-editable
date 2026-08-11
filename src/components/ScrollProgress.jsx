import { useEffect, useState } from 'react'

/**
 * Gold scroll progress bar at top of viewport.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = document.querySelector('main')
      if (!el) return
      const scrollTop = el.scrollTop
      const scrollHeight = el.scrollHeight - el.clientHeight
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0)
    }

    const el = document.querySelector('main')
    if (el) el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (el) el.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div
      className="fixed top-0 left-0 z-50 h-[2px] transition-[width] duration-100 ease-out"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #D4AF37, #E8C766, #D4AF37)',
        boxShadow: '0 0 8px rgba(212,175,55,0.6)',
      }}
    />
  )
}
