import { useEffect } from 'react'

/**
 * useScrollReveal — IntersectionObserver-based scroll reveal.
 * Adds 'reveal-hidden' class to .reveal elements, then 'reveal-visible' when they enter viewport.
 * Unobserves after first reveal. No animation-timeline (mobile-safe).
 *
 * Usage: just call useScrollReveal() in App.jsx once. Any element with className="reveal"
 * will animate in on scroll. Falls back to visible if JS fails.
 */
export default function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (els.length === 0) return

    // Start hidden
    els.forEach(el => el.classList.add('reveal-hidden'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-hidden')
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
