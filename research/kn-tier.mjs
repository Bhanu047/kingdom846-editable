// THE TIER TEST. Two Knowledge Nexus battles vs Mad Scholar (222 flat, T10),
// fought at T11 with 185,200 troops against their 150,000 -- a 23% headcount
// advantage AND a tier advantage. Both were total defeats.
//
//   R  46/21/33  85,192/38,892/61,116   DEFEAT  my losses 185,200  theirs 111,481
//   S  50/15/35  92,600/27,780/64,820   DEFEAT  my losses 185,200  theirs 132,400
//
// Knowledge Nexus is the ONLY room fought at T11, so it is the only thing that
// can test TIER_STAT_MULTIPLIER.T11 = 1.175 -- a number extrapolated, never
// sourced, and until now never checked against a magnitude.
import { runBattle, TROOP_TYPES as T, TIER_STAT_MULTIPLIER } from '../src/lib/combat/kingshotCombat.js'
const MINE = {
  infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
  cavalry:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
  archers:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 },
}
const B = [
  { id: 'R', counts: [85192, 38892, 61116], split: '46/21/33', myLoss: 185200, theirLoss: 111481 },
  { id: 'S', counts: [92600, 27780, 64820], split: '50/15/35', myLoss: 185200, theirLoss: 132400 },
  // T is the third split against the SAME beast, and it WON. Three points
  // against one controlled opponent, monotone in Infantry share.
  { id: 'T', counts: [105564, 27780, 51856], split: '57/15/28', myLoss: 167288, theirLoss: 150000 },
]
const MY_TOTAL = 185200, THEIR_TOTAL = 150000
const foe = () => Object.fromEntries(T.map((t, k) => [t, {
  count: [60000, 45000, 45000][k], attack: 222, lethality: 222, defense: 222, health: 222, tier: 'T10' }]))
const army = (c, tier) => Object.fromEntries(T.map((t, k) => [t, { count: c[k], ...MINE[t], tier }]))

for (const b of B) b.actual = ((MY_TOTAL - b.myLoss) / MY_TOTAL - (THEIR_TOTAL - b.theirLoss) / THEIR_TOTAL) * 100

console.log('REALITY\n')
console.log('  id  split      result    my survivors   their survivors   edge')
for (const b of B) console.log(`  ${b.id}   ${b.split}   ${b.myLoss >= MY_TOTAL ? 'DEFEAT' : 'VICTORY'}   ${String(MY_TOTAL - b.myLoss).padStart(7)}        ${String(THEIR_TOTAL - b.theirLoss).padStart(7)}        ${b.actual.toFixed(1).padStart(6)}`)
console.log('\n  MONOTONE IN INFANTRY: 46 -> 50 -> 57 gives -25.7 -> -11.7 -> +9.7.')
console.log('  Three splits, one controlled opponent, ordered and crossing zero.')

console.log('\n\nWHAT THE MODEL SAYS, PER T11 MULTIPLIER\n')
console.log('  T11 mult      R 46/21   S 50/15   T 57/15   order right   mean error')
const saved = TIER_STAT_MULTIPLIER.T11
for (const m of [1.175, 1.15, 1.12, 1.10, 1.05, 1.00]) {
  TIER_STAT_MULTIPLIER.T11 = m
  const p = B.map((b) => runBattle(army(b.counts, 'T11'), foe(), { maxTurns: 4000 }).survivalEdge * 100)
  const errs = B.map((b, i) => p[i] - b.actual)
  const mean = errs.reduce((s, x) => s + x, 0) / errs.length
  const mono = p[2] > p[1] && p[1] > p[0]
  console.log(`   ${m.toFixed(3)}    ${p.map((x) => x.toFixed(1).padStart(8)).join('  ')}     ${mono ? 'yes' : 'NO '}       ${mean.toFixed(1).padStart(7)}`)
}
TIER_STAT_MULTIPLIER.T11 = saved
console.log(`\n  shipped value is ${saved}. Positive mean error = we are too optimistic.`)
