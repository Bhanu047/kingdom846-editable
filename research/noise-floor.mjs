// TWO independent replications now exist -- the same fight fought twice, with
// nothing distinguishing the inputs, finishing on opposite sides of the result.
// This is the only kind of data that measures the noise directly, and it puts a
// hard ceiling on how well ANY model can do here, ours included.
//
//   Forest of Life, One-Eyed 398/564.8, 50/15/35   D +15.2   E -28.5   gap 43.7
//   Crystal Cave,  Prospector 76/685,  58/15/27    Q +18.9   P -17.0   gap 35.9
//
// Both flipped the outcome. Neither had any input difference to explain it.
const PAIRS = [
  { room: 'Forest of Life', ids: 'D vs E', a:  15.2, b: -28.5 },
  { room: 'Crystal Cave',   ids: 'P vs Q', a:  18.9, b: -17.0 },
]
const gaps = PAIRS.map((p) => Math.abs(p.a - p.b))
console.log('replicated fights (identical inputs, opposite outcomes)\n')
for (const [i, p] of PAIRS.entries()) {
  console.log(`  ${p.ids.padEnd(8)} ${p.room.padEnd(16)} ${p.a.toFixed(1).padStart(6)}  vs ${p.b.toFixed(1).padStart(6)}   gap ${gaps[i].toFixed(1)}`)
}
// For a matched pair, sd = |d| / sqrt(2). Pooling k pairs: sd^2 = sum(d^2)/(2k).
const k = gaps.length
const variance = gaps.reduce((s, d) => s + d * d, 0) / (2 * k)
const sd = Math.sqrt(variance)
console.log(`\n  pooled per-battle sd = sqrt( sum(d^2) / 2k ) = ${sd.toFixed(1)} points   (${k} pairs, ${k} df)`)

// A PERFECT model -- one that predicts each battle's true conditional mean --
// still has error, because the battle itself is random. For a normal, that
// floor is E|X - mu| = sd * sqrt(2/pi).
const floor = sd * Math.sqrt(2 / Math.PI)
console.log(`  best MAE any model can reach = sd * sqrt(2/pi) = ${floor.toFixed(1)} points`)
console.log(`  our MAE over 14 battles                        = 18.1 points`)
console.log(`\n  => we are ${(floor - 18.1).toFixed(1)} points BELOW the floor, which is not skill.`)
console.log('     Two constants were fitted on sixteen points; that is the sign of')
console.log('     fitting noise, and it means no further constant should be fitted.')

// Honesty about how little 2 pairs pins down. chi-square CI on sd with k df.
const CHI = { lo: 0.0506, hi: 7.378 } // 2.5% / 97.5% points of chi2 with 2 df
console.log(`\n  BUT: 2 pairs is 2 degrees of freedom. 95% CI on the sd runs`)
console.log(`  ${(sd * Math.sqrt(k / CHI.hi)).toFixed(0)} to ${(sd * Math.sqrt(k / CHI.lo)).toFixed(0)} points. The direction is solid, the value is not.`)
console.log('  More replicated pairs is the single most valuable thing to collect.')
