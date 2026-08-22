// Does the tier error actually reach the user? The tool shows a RANKING and a
// band, never the absolute score. If the recommendation is the same at 1.175
// and at the value the battles imply, the level error is recorded but harmless.
// If it moves, the tool is giving bad advice and that is a different problem.
import { optimizeTrialSplit } from '../src/lib/combat/mysticTrials.js'
import { TROOP_TYPES as T, TIER_STAT_MULTIPLIER } from '../src/lib/combat/kingshotCombat.js'
const MINE = {
  infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5, tier: 'T11' },
  cavalry:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5, tier: 'T11' },
  archers:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0, tier: 'T11' },
}
const foe = Object.fromEntries(T.map((t, k) => [t, {
  count: [60000, 45000, 45000][k], attack: 222, lethality: 222, defense: 222, health: 222, tier: 'T10' }]))
const saved = TIER_STAT_MULTIPLIER.T11
console.log(' T11 mult   recommends      band                       best score')
for (const m of [1.175, 1.15, 1.10, 1.05, 1.00]) {
  TIER_STAT_MULTIPLIER.T11 = m
  const r = optimizeTrialSplit({ totalTroops: 185200, yourStats: MINE, enemyArmy: foe, zone: 'Knowledge Nexus', stepPercent: 1 })
  const b = r.band
  console.log(`  ${m.toFixed(3)}    ${r.best.split.join('/').padEnd(12)}    ${(b.infantry.join('-')+' / '+b.cavalry.join('-')+' / '+b.archers.join('-')).padEnd(24)}  ${(r.best.survivalEdge*100).toFixed(1).padStart(6)}`)
}
TIER_STAT_MULTIPLIER.T11 = saved
console.log('\n  played: R 46/21/33 (edge -25.7)   S 50/15/35 (edge -11.7)')
