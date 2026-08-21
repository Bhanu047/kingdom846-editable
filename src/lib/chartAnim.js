import { useEffect, useState } from 'react'

// Flips true one paint after mount, so a CSS transition has a real "from"
// state to animate away from instead of the element popping in fully
// formed. Since chart components typically live behind a conditional
// (only rendered once a result exists), React fully unmounts/remounts them
// on every recalculation, so the reveal genuinely replays each time.
export function useReveal() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

// Eases a number up from 0 to target over `duration`ms via rAF, for
// KPI-style figures that should count up on reveal instead of appearing
// instantly. Caller formats the returned raw number as needed.
export function useCountUp(target, duration = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, start
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(target * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return v
}

// Uniform Catmull-Rom -> cubic Bezier conversion, so a handful of sample
// points reads as a smooth curve instead of a jagged straight-line path.
export function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}
