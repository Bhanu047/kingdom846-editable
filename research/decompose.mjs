// The sensitivity sweep showed the optimum barely moves across the full range
// of our sourced constants, and never comes near the other tools' answers. So
// the disagreement is STRUCTURAL. This decomposes a single fight to name the
// structure responsible, rather than guessing at it again.
import { runBattle, TROOP_TYPES, armyTotal } from '../src/lib/combat/kingshotCombat.js'
const T = TROOP_TYPES
const R = { total: 163500, tier: 'T10', enemyTier: 'T10',
  you: { infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
         cavalry: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
         archers: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } },
  them: { attack: 403.0, lethality: 570.5, defense: 403.0, health: 570.5 }, counts: [64960, 48720, 48720] }
const enemy = Object.fromEntries(T.map((t, i) => [t, { count: R.counts[i], ...R.them, tier: R.enemyTier }]))
const mine = (s) => Object.fromEntries(T.map((t, k) => [t, { count: Math.round(R.total * s[k] / 100), ...R.you[t], tier: R.tier }]))

console.log('FOREST OF LIFE — me 163,500 vs them 162,400')
console.log('split        turns  my dmg dealt  their dmg dealt  enemy left  my opening dmg/turn')
for (const s of [[65,17,18],[46,21,33],[50,15,35],[33,33,34],[100,0,0],[0,0,100],[80,10,10]]) {
  const b = runBattle(mine(s), enemy, { maxTurns: 4000 })
  const dealt = b.startingDefender - b.remainingDefender
  const taken = b.startingAttacker - b.remainingAttacker
  const open = b.rounds[0] ? T.reduce((x, t) => x + b.rounds[0].defenderLosses[t], 0) : 0
  console.log(` ${s.join('/').padEnd(12)}${String(b.turns).padStart(5)}  ${String(Math.round(dealt)).padStart(12)}  ${String(Math.round(taken)).padStart(15)}  ${String(Math.round(b.remainingDefender)).padStart(10)}  ${open.toFixed(0).padStart(19)}`)
}

// THE STRUCTURAL QUESTION: damage depends on the ATTACKER's count only. The
// defender's headcount never enters the formula. So a troop parked behind the
// front line deals its FULL output every round until the wall in front of it
// collapses -- which is exactly what makes a fat Infantry wall optimal here.
// Measure how much of the army's total output comes from the protected rows.
console.log('\nwhere the damage comes from, by row (share of total dealt)')
console.log('split        infantry  cavalry  archers   turns front row survives')
for (const s of [[65,17,18],[46,21,33],[33,33,34]]) {
  const b = runBattle(mine(s), enemy, { maxTurns: 4000 })
  // Re-run accumulating per-attacker-type output is not exposed, so approximate
  // from the opening volley shares, which hold while all three rows are alive.
  const start = mine(s)
  const share = T.map((t) => Math.sqrt(start[t].count))
  const tot = share.reduce((a, x) => a + x, 0)
  let frontTurns = 0
  for (const r of b.rounds) { if (r.attackerRemaining <= 0) break; frontTurns++; if (r.attackerLosses.cavalry > 0.5) break }
  console.log(` ${s.join('/').padEnd(12)}${share.map((x) => ((x / tot) * 100).toFixed(1) + '%').map((x) => x.padStart(8)).join(' ')}   ${frontTurns} of ${b.turns}`)
}
