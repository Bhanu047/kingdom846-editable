import { useMemo } from 'react'

// Floating gold ember particles for hero/banner backgrounds
export function Embers({ count = 14 }) {
  const embers = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const left = (i * 67 + 13) % 100
      const size = 2 + ((i * 7) % 4)
      const delay = (i * 1.3) % 7
      const dur = 6 + ((i * 5) % 5)
      return { left, size, delay, dur, id: i }
    }),
    [count]
  )
  return (
    <div className="ember-field" aria-hidden="true">
      {embers.map((e) => (
        <span
          key={e.id}
          className="ember"
          style={{
            left: `${e.left}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.dur}s`,
          }}
        />
      ))}
    </div>
  )
}
