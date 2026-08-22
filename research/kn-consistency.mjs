// The T11 multiplier exists to explain ONE thing: a Knowledge Nexus stage the
// player cleared that no model reproduced. Any replacement value must keep
// explaining it, or we have traded one unexplained report for another.
//
// That win has no recorded split or losses -- it is an outcome bit. So the test
// is weak by construction: does a win remain PLAUSIBLE across the splits the
// player might have fielded?
import { runBattle, TROOP_TYPES as T, TIER_STAT_MULTIPLIER } from '../src/lib/combat/kingshotCombat.js'
const MINE = {
  infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5, tier: 'T11' },
  cavalry:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5, tier: 'T11' },
  archers:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0, tier: 'T11' },
}
const foe = () => Object.fromEntries(T.map((t, k) => [t, {
  count: [60000, 45000, 45000][k], attack: 222, lethality: 222, defense: 222, health: 222, tier: 'T10' }]))
const army = (s) => Object.fromEntries(T.map((t, k) => [t, { count: Math.round(185200 * s[k] / 100), ...MINE[t] }]))
const SPLITS = [[57,15,27],[50,20,30],[50,15,35],[46,21,33],[60,15,25]]
const saved = TIER_STAT_MULTIPLIER.T11
console.log('  T11     ' + SPLITS.map((s) => s.join('/').padStart(9)).join('  '))
for (const m of [1.175, 1.15, 1.12, 1.10, 1.05, 1.00]) {
  TIER_STAT_MULTIPLIER.T11 = m
  const row = SPLITS.map((s) => (runBattle(army(s), foe(), { maxTurns: 4000 }).survivalEdge * 100).toFixed(1).padStart(9))
  console.log(`  ${m.toFixed(3)} ` + row.join('  '))
}
TIER_STAT_MULTIPLIER.T11 = saved
console.log('\n  KNOWN REAL RESULTS in this room, same enemy, same own stats:')
console.log('    one stage CLEARED  (split and losses not recorded -- outcome bit only)')
console.log('    R  46/21/33  DEFEAT, edge -25.7')
console.log('    S  50/15/35  DEFEAT, edge -11.7')
console.log('\n  A value has to leave the clear plausible AND the two defeats plausible.')
