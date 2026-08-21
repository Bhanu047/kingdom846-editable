import { useCountUp } from '../lib/chartAnim'

// Small reusable wrapper so a plain KPI number can count up on reveal
// without every call site wiring its own useCountUp + format call.
export default function CountUp({ value, format = (v) => Math.round(v).toLocaleString(), duration = 900, className }) {
  const animated = useCountUp(value, duration)
  return <span className={className}>{format(animated)}</span>
}
