// Run a report through the SHIPPED engine and print the recommendation.
// Same code path as the site, so what this prints is what kingdom846.com prints.
//
// usage: node research/quote.mjs <zone> <myInf,myCav,myArc> <A,L,D,H mine>
//                               <eInf,eCav,eArc> <A,L,D,H theirs> [myTier] [enemyTier]
// per-type lethality/health may be given as "388.1|388.5|399.0"
import { optimizeTrialSplit } from '../src/lib/combat/mysticTrials.js'
import { runBattle, TROOP_TYPES as T } from '../src/lib/combat/kingshotCombat.js'

const [zone, myC, myS, eC, eS, myTier = 'T10', eTier = 'T10'] = process.argv.slice(2)
if (!eS) { console.error('see header for usage'); process.exit(1) }
const nums = (s) => s.split(',').map(Number)
const per = (s) => (String(s).includes('|') ? String(s).split('|').map(Number) : [Number(s), Number(s), Number(s)])
const side = (statStr, tier) => {
  const [a, L, d, H] = statStr.split(',')
  const Ls = per(L), Hs = per(H)
  return Object.fromEntries(T.map((t, i) => [t, {
    attack: Number(a), lethality: Ls[i], defense: Number(d), health: Hs[i], tier }]))
}
const myCounts = nums(myC), eCounts = nums(eC)
const total = myCounts.reduce((x, y) => x + y, 0)
const yourStats = side(myS, myTier)
const es = side(eS, eTier)
const enemyArmy = Object.fromEntries(T.map((t, i) => [t, { count: eCounts[i], ...es[t] }]))

const r = optimizeTrialSplit({ totalTroops: total, yourStats, enemyArmy, zone, stepPercent: 1 })
const played = myCounts.map((c) => Math.round((c / total) * 100))
const armyOf = (s) => Object.fromEntries(T.map((t, k) => [t, { count: Math.round(total * s[k] / 100), ...yourStats[t] }]))
const scoreOf = (s) => runBattle(armyOf(s), enemyArmy, { maxTurns: 4000 }).survivalEdge * 100

const b = r.best
console.log(`\n  ${zone}   you ${total.toLocaleString()}  vs  ${eCounts.reduce((x,y)=>x+y,0).toLocaleString()}\n`)
console.log(`  RECOMMENDED   ${b.split.join(' / ')}`)
if (r.band && r.band.count > 1) console.log(`  also fine     ${r.band.infantry.join('–')} / ${r.band.cavalry.join('–')} / ${r.band.archers.join('–')}   (${r.band.count} of ${r.candidates.length} within a point)`)
console.log(`  you fielded   ${played.join(' / ')}`)
console.log(`\n  vs your split      ${(scoreOf(b.split) - scoreOf(played) >= 0 ? '+' : '')}${(scoreOf(b.split) - scoreOf(played)).toFixed(1)} pts`)
if (r.baseline) console.log(`  vs played opener   ${(b.survivalEdge - r.baseline.survivalEdge >= 0 ? '+' : '')}${((b.survivalEdge - r.baseline.survivalEdge) * 100).toFixed(1)} pts`)
console.log('\n  top splits:')
for (const c of r.candidates.slice(0, 5)) console.log(`    ${c.split.join('/').padEnd(10)} ${((c.survivalEdge - b.survivalEdge) * 100).toFixed(1).padStart(6)}`)
console.log('\n  (comparative only — nine real battles say the absolute number does not predict an outcome)')
