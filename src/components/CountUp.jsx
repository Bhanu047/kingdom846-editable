import { useEffect, useRef, useState } from 'react'

// Animated count-up that triggers when the element scrolls into view.
// `value` can be a number or a string like "2.564" / "7/10" / "#66".
// We animate the numeric portion and preserve any prefix/suffix.
export function useCountUp(value, { duration = 900 } = {}) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(value)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const match = String(value).match(/^([^\d.-]*)(-?\d+(?:\.\d+)?)(.*)$/)
    if (!match) { setDisplay(value); return }
    const [, prefix, numStr, suffix] = match
    const target = parseFloat(numStr)
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) { setDisplay(value); return }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const tick = (now) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3)
            const current = target * eased
            setDisplay(prefix + current.toFixed(decimals) + suffix)
            if (t < 1) requestAnimationFrame(tick)
            else setDisplay(value)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return [ref, display]
}

// Usage: <span ref={ref}>{display}</span>
export function CountUp({ value, className }) {
  const [ref, display] = useCountUp(value)
  return <span ref={ref} className={className}>{display}</span>
}
