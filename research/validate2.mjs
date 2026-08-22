import { optimizeTrialSplit, MYSTIC_ZONES } from '../src/lib/combat/mysticTrials.js'
import { simulatePvpBattle, optimizePvpComposition } from '../src/lib/combat/pvpBattle.js'

const T = ['infantry', 'cavalry', 'archers']
const line = (c, s) => ({ count: c, ...s })
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])

const REPORTS = [
  { zone: 'Knowledge Nexus', total: 185200, frak: [57, 15, 27], truth: 'player WON',
    you: { infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
           cavalry: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
           archers: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } },
    them: Object.fromEntries(T.map((t, i) => [t, line([60000, 45000, 45000][i], { attack: 222, lethality: 222, defense: 222, health: 222 })])) },
  { zone: 'Molten Fort', total: 150000, frak: [52, 21, 27], truth: 'Frakinator ~20% win',
    you: { infantry: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 },
           cavalry: { attack: 859.2, lethality: 205, defense: 865.3, health: 205 },
           archers: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 } },
    them: Object.fromEntries(T.map((t, i) => [t, line([60000, 45000, 45000][i], { attack: 1051, lethality: 186, defense: 1051, health: 186 })])) },
]

console.log('=========== MYSTIC TRIALS MODEL ===========')
for (const r of REPORTS) {
  const o = optimizeTrialSplit({ totalTroops: r.total, yourStats: r.you, enemyArmy: r.them, zone: r.zone, stepPercent: 1 })
  const opener = MYSTIC_ZONES[r.zone].opener
  console.log(`\n${r.zone}  (${r.truth})`)
  console.log(`  zone stats      ${MYSTIC_ZONES[r.zone].sources.join(', ')}`)
  console.log(`  our best        ${o.best.split.join('/').padEnd(10)} edge ${(o.best.survivalEdge * 100).toFixed(1)}%  clears: ${o.best.clears}`)
  console.log(`  Frakinator      ${r.frak.join('/').padEnd(10)} off by ${dist(o.best.split, r.frak)}`)
  console.log(`  played opener   ${opener.join('/').padEnd(10)} edge ${(o.baseline.survivalEdge * 100).toFixed(1)}%  off by ${dist(o.best.split, opener)}`)
  console.log(`  cavalry         ${o.best.split[1]}%`)
  console.log(`  candidates      ${o.candidates.length}, clearing: ${o.candidates.filter((c) => c.clears).length}`)
}

console.log('\n\n=========== PVP MODEL (separate) ===========')
const a = Object.fromEntries(T.map((t, i) => [t, line([50000, 30000, 40000][i], { attack: 300, lethality: 280, defense: 250, health: 260 })]))
const d = Object.fromEntries(T.map((t, i) => [t, line([45000, 35000, 40000][i], { attack: 280, lethality: 260, defense: 270, health: 250 })]))
const noSkill = simulatePvpBattle({ attacker: a, defender: d })
const withSkill = simulatePvpBattle({ attacker: a, defender: d, attackerSkills: { damageUp: 25, opponentDefenseDown: 15 } })
console.log(`  no hero skills   ${noSkill.outcome.padEnd(10)} you lost ${(noSkill.attackerLossRate * 100).toFixed(1)}%  enemy lost ${(noSkill.defenderLossRate * 100).toFixed(1)}%`)
console.log(`  +25% dmg joiner  ${withSkill.outcome.padEnd(10)} you lost ${(withSkill.attackerLossRate * 100).toFixed(1)}%  enemy lost ${(withSkill.defenderLossRate * 100).toFixed(1)}%  skillMod ${withSkill.attackerSkillMod.toFixed(3)}`)
console.log(`  -> heroes change the result: ${noSkill.outcome !== withSkill.outcome || Math.abs(noSkill.attackerLossRate - withSkill.attackerLossRate) > 0.01}`)

const po = optimizePvpComposition({ totalTroops: 120000, yourStats: Object.fromEntries(T.map((t) => [t, { attack: 300, lethality: 280, defense: 250, health: 260 }])), enemyArmy: d, stepPercent: 5 })
console.log(`\n  best split       ${po.best.split.join('/')}  edge ${(po.best.survivalEdge * 100).toFixed(1)}%  you lose ${(po.best.lossRate * 100).toFixed(1)}%`)
console.log(`  cheapest win     ${po.bestByLosses ? po.bestByLosses.split.join('/') + '  you lose ' + (po.bestByLosses.lossRate * 100).toFixed(1) + '%' : 'no winning split'}`)
console.log(`  -> PvP surfaces troop cost, Mystic does not (no casualties there)`)
