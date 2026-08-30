// TWO SETS OF FRAKINATOR OBSERVATIONS THAT CANNOT BOTH BE RIGHT.
//
// The calibration in research/bear-reference.md concluded that the reference
// tool's split is TIER-INDEPENDENT: "All four of the reference's tier settings
// (T1-T6, T7-TG2, TG3-TG4, TG5-TG7) return the same answer for the same stats."
// The Archer coefficient became a flat 4.4/3 and the extra 1.1 above T6 was
// removed, explicitly calling 3/27/70 the wrong answer and 3/31/66 the right one.
//
// On 2026-08-25 the player ran the reference tool twice by hand, at TG5-TG7,
// and screenshotted the results:
//
//   INF 577.3/388.1  CAV 577.3/388.5  ARC 577.3/399.0   ->  2/26/72
//   INF 180.5/166.5  CAV 180.5/155.5  ARC 180.5/155.5   ->  3/27/70
//
// The calibrated model returns 3/30/67 and 3/31/66 for those inputs. The
// pre-calibration model returned exactly 2/26/72 and 3/27/70.
//
// This is not a rounding disagreement. Both models are the same closed form and
// differ in one factor only:
//
//   pre-calibration   archer weight (4/3) x 1.1 x 1.1  = 1.6133  above T6
//                     archer weight (4/3) x 1.1        = 1.4667  at T1-T6
//   calibrated        archer weight 4.4/3              = 1.4667  at every tier
//
// 4/3 x 1.1 is exactly 4.4/3, so the calibrated model IS the old model's T1-T6
// branch. The entire dispute is whether a second 1.1 applies above T6 -- and
// each side has direct observations of the reference tool saying it does not
// and does.
//
// Neither set is dismissible. The bear-reference.md measurements were read back
// over the tool's own websocket across three stat sets and every hero option;
// the 2026-08-25 measurements are screenshots of the tool's own output for
// stats taken from real battle reports.
//
// THE MEASUREMENT THAT SETTLES IT
//
// One run, changing nothing but the tier control:
//
//   INF 577.3/388.1  CAV 577.3/388.5  ARC 577.3/399.0   at T1-T6
//
// The calibrated model says T1-T6 gives the same 3/30/67 as every other tier.
// The pre-calibration model says T1-T6 gives 3/30/67 and TG5-TG7 gives 2/26/72
// -- the same stats already returned 2/26/72 at TG5-TG7, so if T1-T6 now returns
// something different, tier-independence is false and the second 1.1 is real.
//
//   same answer at both tiers  -> the calibration is right, and the 2026-08-25
//                                 screenshots were taken at a different setting
//                                 than recorded
//   different answers          -> tier-independence is wrong, the second 1.1
//                                 belongs back, and the calibration needs redoing
//
// Until that is run, the shipped model is the calibrated one: it rests on more
// measurements, and it is what main carries.

import { optimizeBearFormation } from '../src/lib/combat/bearOptimizer.js'

const S = (a, l) => ({ attack: a, lethality: l, widget: '0', widgetStat: 'attack' })
const show = (r) => `${r.whole.infantry}/${r.whole.cavalry}/${r.whole.archers}`

const HAND_MEASURED = [
  { label: 'INF 577.3/388.1 CAV 577.3/388.5 ARC 577.3/399.0',
    stats: { infantry: S(577.3, 388.1), cavalry: S(577.3, 388.5), archers: S(577.3, 399.0) },
    observed: '2/26/72' },
  { label: 'INF 180.5/166.5 CAV 180.5/155.5 ARC 180.5/155.5',
    stats: { infantry: S(180.5, 166.5), cavalry: S(180.5, 155.5), archers: S(180.5, 155.5) },
    observed: '3/27/70' },
]

const WEBSOCKET_MEASURED = [
  { label: 'INF 250/140 CAV 310/190 ARC 180/260',
    stats: { infantry: S(250, 140), cavalry: S(310, 190), archers: S(180, 260) }, observed: '2/38/60' },
  { label: 'INF 500/500 CAV 100/100 ARC 300/50 ',
    stats: { infantry: S(500, 500), cavalry: S(100, 100), archers: S(300, 50) }, observed: '60/7/33' },
  { label: 'all zero                            ',
    stats: { infantry: S(0, 0), cavalry: S(0, 0), archers: S(0, 0) }, observed: '3/31/66' },
]

const run = (set, title) => {
  console.log(`\n  ${title}`)
  let agree = 0
  for (const c of set) {
    const got = show(optimizeBearFormation({ stats: c.stats, tier: 'TG5-TG7', capacity: 150000 }))
    const ok = got === c.observed
    if (ok) agree += 1
    console.log(`    ${c.label}   observed ${c.observed.padEnd(8)} shipped ${got.padEnd(8)} ${ok ? 'agree' : 'DISAGREE'}`)
  }
  console.log(`    ${agree}/${set.length} reproduced`)
  return agree
}

console.log('THE SHIPPED (CALIBRATED) MODEL AGAINST BOTH SETS OF OBSERVATIONS')
const a = run(WEBSOCKET_MEASURED, 'read over the websocket (research/bear-reference.md)')
const b = run(HAND_MEASURED, 'screenshotted by hand at TG5-TG7 (2026-08-25)')

console.log('\n  The shipped model reproduces one set and not the other.')
console.log(`    websocket set  ${a}/${WEBSOCKET_MEASURED.length}`)
console.log(`    hand set       ${b}/${HAND_MEASURED.length}`)
console.log('\n  Tier-independence, as the shipped model implements it:')
const stats = HAND_MEASURED[0].stats
for (const tier of ['T1-T6', 'T7-TG2', 'TG3-TG4', 'TG5-TG7']) {
  console.log(`    ${tier.padEnd(9)} ${show(optimizeBearFormation({ stats, tier, capacity: 150000 }))}`)
}
console.log('\n  RUN THIS IN THE REFERENCE TOOL:')
console.log('    INF 577.3/388.1  CAV 577.3/388.5  ARC 577.3/399.0   at T1-T6')
console.log('    It already returned 2/26/72 at TG5-TG7 on 2026-08-25.')
console.log('    Same answer at T1-T6 -> tier-independence holds, calibration stands.')
console.log('    Different answer     -> tier-independence is false and the')
console.log('                            calibration needs redoing.')
