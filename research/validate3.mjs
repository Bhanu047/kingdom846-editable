// Validates the SHIPPED engine (imported, not re-typed) against the player's
// three real reports, before and after the one change the sources actually
// support.
//
// THE BUG: our INFANTRY_VS_CAVALRY_MITIGATION divides incoming Cavalry damage
// by 1.10, credited to Infantry's "Master Brawler". But Master Brawler is
// documented as "Increases damage against Cavalry by 10%" -- an ATTACK bonus,
// and it is the counter-triangle bonus we already apply via COUNTER_BONUS.
// The same is true of the other two: Archers' "Ranged Strike" (+10% into
// Infantry) and Cavalry's "Charge" (+10% into Archers) ARE the triangle, named
// per troop type. There is no documented defensive term anywhere.
//
// So Infantry has been getting its counter advantage twice: once as +10% out,
// again as -10% in. That is an unsourced boost to exactly the troop our
// recommendations lean on too hard.
import { runBattle, TROOP_TYPES } from '../src/lib/combat/kingshotCombat.js'

const [INF, CAV, ARC] = TROOP_TYPES
const REPORTS = [
  { zone: 'Knowledge Nexus', total: 185200, frak: [57, 15, 27], opener: [50, 20, 30], tier: 'T11', enemyTier: 'T10', realOutcome: 'player won',
    you: { [INF]: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
           [CAV]: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
           [ARC]: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } },
    them: { attack: 222, lethality: 222, defense: 222, health: 222 }, counts: [60000, 45000, 45000] },
  { zone: 'Molten Fort', total: 150000, frak: [52, 21, 27], opener: [60, 15, 25], tier: 'T10', enemyTier: 'T10', realOutcome: 'unknown',
    you: { [INF]: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 },
           [CAV]: { attack: 859.2, lethality: 205, defense: 865.3, health: 205 },
           [ARC]: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 } },
    them: { attack: 1051, lethality: 186, defense: 1051, health: 186 }, counts: [60000, 45000, 45000] },
  { zone: 'Forest of Life', total: 163500, frak: [46, 21, 33], opener: [50, 15, 35], tier: 'T10', enemyTier: 'T10', realOutcome: 'unknown',
    you: { [INF]: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
           [CAV]: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
           [ARC]: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } },
    them: { attack: 403.0, lethality: 570.5, defense: 403.0, health: 570.5 }, counts: [64960, 48720, 48720] },
]
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])

function armies(r) {
  const enemy = Object.fromEntries(TROOP_TYPES.map((t, i) => [t, { count: r.counts[i], ...r.them, tier: r.enemyTier }]))
  const mine = (split) => Object.fromEntries(TROOP_TYPES.map((t, k) => [t, {
    count: Math.round(r.total * split[k] / 100), ...r.you[t], tier: r.tier }]))
  return { enemy, mine }
}
function sweep(r) {
  const { enemy, mine } = armies(r)
  const all = []
  for (let i = 0; i <= 100; i++) for (let c = 0; c + i <= 100; c++) {
    const b = runBattle(mine([i, c, 100 - i - c]), enemy, { maxTurns: 4000 })
    all.push({ split: [i, c, 100 - i - c], edge: b.survivalEdge, win: b.attackerWins, turns: b.turns })
  }
  all.sort((x, y) => y.edge - x.edge)
  return { all, best: all[0], anyWin: all.some((x) => x.win) }
}

console.log('SHIPPED ENGINE vs three real reports (1% grid, 5151 splits each)\n')
console.log('zone              our best      vs Frak  vs opener  any split wins?  best turns')
let totalFrak = 0, totalOpener = 0
for (const r of REPORTS) {
  const s = sweep(r)
  const dF = dist(s.best.split, r.frak), dO = dist(s.best.split, r.opener)
  totalFrak += dF; totalOpener += dO
  console.log(` ${r.zone.padEnd(17)}${s.best.split.join('/').padEnd(14)}${String(dF).padEnd(9)}${String(dO).padEnd(11)}${(s.anyWin ? 'YES' : 'no  ').padEnd(17)}${s.best.turns}`)
}
console.log(`\n TOTAL distance:  vs Frakinator ${totalFrak}   vs community openers ${totalOpener}`)
console.log(`\n Knowledge Nexus is the only fight with a known real outcome: ${REPORTS[0].realOutcome}.`)
