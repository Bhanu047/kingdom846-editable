// Replays every controlled probe taken against the reference Bear calculator
// and prints our answer beside it. Run: node research/bear-reference-check.mjs
import { computeBearDamage, optimizeBearFormation } from '../src/lib/combat/bearOptimizer.js'

const stat = (attack, lethality) => ({ attack, lethality, widget: 0, widgetStat: 'attack' })

// Composition: reference output is a whole-percent INF/CAV/ARC split.
const RATIO_CASES = [
  { name: 'inf 250/140, cav 310/190, arc 180/260', stats: { infantry: stat(250, 140), cavalry: stat(310, 190), archers: stat(180, 260) }, expect: '2/38/60' },
  { name: 'inf 500/500, cav 100/100, arc 300/50', stats: { infantry: stat(500, 500), cavalry: stat(100, 100), archers: stat(300, 50) }, expect: '60/7/33' },
  { name: 'all zero stats', stats: { infantry: stat(0, 0), cavalry: stat(0, 0), archers: stat(0, 0) }, expect: '3/31/66' },
]

// Damage: the reference plots a distribution, so each case is the observed
// range across repeats at 400% attack / 400% lethality on every type.
const s400 = { infantry: stat(400, 400), cavalry: stat(400, 400), archers: stat(400, 400) }
const DAMAGE_CASES = [
  { name: 'infantry only, 200k', counts: { infantry: 200000, cavalry: 0, archers: 0 }, lo: 1.71e6, hi: 1.79e6 },
  { name: 'infantry only, 800k', counts: { infantry: 800000, cavalry: 0, archers: 0 }, lo: 3.45e6, hi: 3.60e6 },
  { name: 'cavalry only, 200k', counts: { infantry: 0, cavalry: 200000, archers: 0 }, lo: 5.11e6, hi: 5.33e6 },
  { name: 'archers only, 200k', counts: { infantry: 0, cavalry: 0, archers: 200000 }, lo: 8.18e6, hi: 8.58e6 },
  { name: '100k of each', counts: { infantry: 100000, cavalry: 100000, archers: 100000 }, lo: 11.99e6, hi: 12.42e6 },
  { name: '100k cav + 100k arc', counts: { infantry: 0, cavalry: 100000, archers: 100000 }, lo: 10.05e6, hi: 10.43e6 },
  { name: '100k inf + 100k arc', counts: { infantry: 100000, cavalry: 0, archers: 100000 }, lo: 7.27e6, hi: 7.55e6 },
]

const m = (v) => `${(v / 1e6).toFixed(2)}M`
let failed = 0

console.log('Composition (reference -> ours)')
for (const { name, stats, expect } of RATIO_CASES) {
  const { whole } = optimizeBearFormation({ stats, capacity: 1000 })
  const got = `${whole.infantry}/${whole.cavalry}/${whole.archers}`
  const ok = got === expect
  if (!ok) failed += 1
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${expect} -> ${got}`)
}

console.log('\nDamage (reference range -> ours)')
for (const { name, counts, lo, hi } of DAMAGE_CASES) {
  const total = counts.infantry + counts.cavalry + counts.archers
  const got = computeBearDamage({ stats: s400, ratio: counts, totalTroops: total })
  const mid = (lo + hi) / 2
  const err = (got / mid - 1) * 100
  const ok = Math.abs(err) <= 6
  if (!ok) failed += 1
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${m(lo)}-${m(hi)} -> ${m(got)} (${err >= 0 ? '+' : ''}${err.toFixed(1)}% vs midpoint)`)
}

console.log(failed ? `\n${failed} case(s) outside tolerance` : '\nall cases within tolerance')
process.exit(failed ? 1 : 0)
