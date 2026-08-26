// THE CONTROLLED PAIR THAT FALSIFIES OUR RECOMMENDATION.
//
// Crystal Cave, Cesares Prospector, 2026-08-25. Two battles eight minutes
// apart against the SAME beast with the SAME 150,000 troops and the SAME
// stats -- only the split differs. Both sides T10.
//
//   20:22:46  60/15/25  (our recommendation)         DEFEAT
//             mine 150,000 lost of 150,000 (wiped), theirs 97,869 of 150,000
//             edge = 0/150000 - 52131/150000 = -34.75
//
//   20:30:25  52/21/27  (Frakinator's recommendation) VICTORY
//             mine 101,682 lost, theirs 150,000 (wiped)
//             edge = 48318/150000 - 0/150000 = +32.21
//
// This is the strongest single piece of evidence in the data set. The opponent
// is controlled, the army size is controlled, the stats are controlled, and the
// outcome flips. It also carries LOSSES on both sides, which is what makes a
// battle usable for a level fit rather than only a ranking one.
//
// Two things it decides:
//
//   1. Our recommendation was WRONG on this fight, and the other tool's was
//      right. Not "within the noise band" -- our split was annihilated.
//   2. It is the FIRST counterexample to the "lower cavalry always wins"
//      pattern in all-pairs.mjs. That was four for four across three rooms;
//      here cavalry 21 beat cavalry 15 decisively.

import { runBattle, TROOP_TYPES } from '../src/lib/combat/kingshotCombat.js'

// Mine: Attack/Defense +88.5 on every type; Lethality/Health +654.0 except
// Cavalry at +625.7. Theirs: +79.0 Attack/Defense, +712.0 Lethality/Health.
const MINE = {
  infantry: { attack: 88.5, lethality: 654.0, defense: 88.5, health: 654.0, tier: 'T10' },
  cavalry: { attack: 88.5, lethality: 625.7, defense: 88.5, health: 625.7, tier: 'T10' },
  archers: { attack: 88.5, lethality: 654.0, defense: 88.5, health: 654.0, tier: 'T10' },
}
const ENEMY = Object.fromEntries(TROOP_TYPES.map((t, i) => [t, {
  count: [60000, 45000, 45000][i],
  attack: 79.0, lethality: 712.0, defense: 79.0, health: 712.0, tier: 'T10',
}]))

const army = (counts) => Object.fromEntries(TROOP_TYPES.map((t, i) => [t, { ...MINE[t], count: counts[i] }]))

const BATTLES = [
  { split: '60/15/25', counts: [90000, 22500, 37500], source: 'ours',       result: 'DEFEAT',  myLost: 150000, theirLost: 97869 },
  { split: '52/21/27', counts: [78000, 31500, 40500], source: 'Frakinator', result: 'VICTORY', myLost: 101682, theirLost: 150000 },
]

console.log('CRYSTAL CAVE / CESARES PROSPECTOR -- controlled pair, 150,000 v 150,000\n')
console.log('  split      source       real result   real edge   model edge   model says')
console.log('  ' + '-'.repeat(74))

const scored = BATTLES.map((b) => {
  const realEdge = ((150000 - b.myLost) / 150000 - (150000 - b.theirLost) / 150000) * 100
  const r = runBattle(army(b.counts), ENEMY, { maxTurns: 4000 })
  return { ...b, realEdge, modelEdge: r.survivalEdge * 100, modelWins: r.attackerWins, outcome: r.outcome }
})

for (const s of scored) {
  console.log(
    `  ${s.split}   ${s.source.padEnd(11)}  ${s.result.padEnd(12)}  ${s.realEdge.toFixed(2).padStart(8)}   ` +
    `${s.modelEdge.toFixed(2).padStart(9)}   ${s.outcome}`
  )
}

const [ours, frak] = scored
console.log('\n  RANKING')
const realOrder = ours.realEdge > frak.realEdge ? 'ours' : 'Frakinator'
const modelOrder = ours.modelEdge > frak.modelEdge ? 'ours' : 'Frakinator'
console.log(`    reality ranks ${realOrder} first   (${ours.realEdge.toFixed(1)} vs ${frak.realEdge.toFixed(1)})`)
console.log(`    model   ranks ${modelOrder} first   (${ours.modelEdge.toFixed(1)} vs ${frak.modelEdge.toFixed(1)})`)
console.log(`    ${realOrder === modelOrder ? 'AGREE' : 'DISAGREE -- the model ranked the losing split above the winning one'}`)

console.log('\n  LEVEL')
for (const s of scored) {
  console.log(`    ${s.split}  real ${s.realEdge.toFixed(1).padStart(7)}   model ${s.modelEdge.toFixed(1).padStart(7)}   error ${(s.modelEdge - s.realEdge).toFixed(1).padStart(7)}`)
}
const mae = scored.reduce((sum, s) => sum + Math.abs(s.modelEdge - s.realEdge), 0) / scored.length
console.log(`    MAE ${mae.toFixed(1)} points (noise floor from replicated fights is ~28)`)

console.log('\n  CAVALRY')
console.log('    all-pairs.mjs: "four for four, the lower-cavalry split won every time".')
console.log(`    here: cavalry 21 (${frak.realEdge > 0 ? 'WON' : 'lost'}) vs cavalry 15 (${ours.realEdge > 0 ? 'won' : 'LOST'})`)
console.log('    -> first counterexample. The pattern was not a law.')

console.log('\n  WHAT SEPARATES THE TWO SPLITS')
console.log('    ours       90,000 / 22,500 / 37,500')
console.log('    Frakinator 78,000 / 31,500 / 40,500')
console.log('    difference -12,000 infantry, +9,000 cavalry, +3,000 archers')
console.log('    The enemy is 40/30/30 -- cavalry-heavy for a Crystal Cave beast.')
console.log('    Infantry counters cavalry, so our engine loaded infantry; the winning')
console.log('    split did the opposite and still won, which is the part to explain.')
