// THE FIRST REAL CALIBRATION DATA. Three Forest of Life battles with known
// outcomes, all fought with the SAME split (50/15/35, the played opener),
// against near-identical opponents. Transcribed from Battle Details screens.
import { runBattle, TROOP_TYPES as T, simulateOutcomes } from '../src/lib/combat/kingshotCombat.js'

const MINE = {
  infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6, tier: 'T10' },
  cavalry:  { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5, tier: 'T10' },
  archers:  { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8, tier: 'T10' },
}
const MY_COUNTS = [81750, 24525, 57225]           // 50 / 15 / 35, total 163,500
const MY_TOTAL = 163500

const BATTLES = [
  { id: 'A', beast: 'Ferocious', them: { a: 400.0, L: 566.7 }, counts: [64920, 48690, 48690],
    result: 'DEFEAT',  myLoss: 163500, theirLoss: 156919, theirTotal: 162300 },
  { id: 'B', beast: 'Starving',  them: { a: 398.0, L: 563.8 }, counts: [64880, 48660, 48660],
    result: 'VICTORY', myLoss: 105793, theirLoss: 162200, theirTotal: 162200 },
  // Bonus Details was cut off below Infantry Attack; enemy Lethality inferred
  // from the ratio that holds exactly in every other report (Leth = Atk x 1.4167).
  { id: 'C', beast: 'Frenzied',  them: { a: 395.0, L: 559.6, inferred: true }, counts: [64840, 48630, 48630],
    result: 'VICTORY', myLoss: 142826, theirLoss: 162100, theirTotal: 162100 },
  // D and E are the SAME FIGHT. Same beast, same stats, same counts, same
  // split -- and opposite outcomes. Nothing distinguishes them as inputs.
  { id: 'D', beast: 'One-Eyed',  them: { a: 398.0, L: 564.8 }, counts: [64800, 48600, 48600],
    result: 'VICTORY', myLoss: 138697, theirLoss: 162000, theirTotal: 162000 },
  { id: 'E', beast: 'One-Eyed',  them: { a: 398.0, L: 564.8 }, counts: [64800, 48600, 48600],
    result: 'DEFEAT',  myLoss: 163500, theirLoss: 115785, theirTotal: 162000 },
  { id: 'F', beast: 'Enraged',   them: { a: 396.0, L: 561.0 }, counts: [64760, 48570, 48570],
    result: 'VICTORY', myLoss: 122245, theirLoss: 161900, theirTotal: 161900 },
  { id: 'G', beast: 'Ferocious', them: { a: 393.0, L: 557.1 }, counts: [64720, 48540, 48540],
    result: 'VICTORY', myLoss:  98126, theirLoss: 161800, theirTotal: 161800 },
]

const army = () => Object.fromEntries(T.map((t, k) => [t, { count: MY_COUNTS[k], ...MINE[t] }]))
const foe = (b) => Object.fromEntries(T.map((t, k) => [t, {
  count: b.counts[k], attack: b.them.a, defense: b.them.a, lethality: b.them.L, health: b.them.L, tier: 'T10' }]))

console.log('SEVEN REAL OUTCOMES — same split 50/15/35 every time\n')
console.log('  id  enemy atk  RESULT    my survivors      their survivors   ACTUAL edge')
for (const b of BATTLES) {
  const mySurv = MY_TOTAL - b.myLoss, theirSurv = b.theirTotal - b.theirLoss
  const edge = mySurv / MY_TOTAL - theirSurv / b.theirTotal
  b.actualEdge = edge
  console.log(`  ${b.id}   ${String(b.them.a).padStart(6)}${b.them.inferred ? '*' : ' '}   ${b.result.padEnd(8)}  ${String(mySurv.toLocaleString()).padStart(7)} (${(mySurv/MY_TOTAL*100).toFixed(1)}%)   ${String(theirSurv.toLocaleString()).padStart(7)} (${(theirSurv/b.theirTotal*100).toFixed(1)}%)   ${(edge*100).toFixed(1).padStart(6)}%`)
}

console.log('\nWHAT OUR MODEL SAYS ABOUT THE SAME SEVEN FIGHTS\n')
console.log('  id  predicted edge   predicted outcome   ACTUAL edge   ACTUAL     error')
let errs = []
for (const b of BATTLES) {
  const r = runBattle(army(), foe(b), { maxTurns: 4000 })
  const pred = r.survivalEdge
  const err = pred - b.actualEdge
  errs.push(err)
  const po = r.attackerWins ? 'WIN' : r.defenderWins ? 'LOSS' : 'draw'
  console.log(`  ${b.id}   ${(pred*100).toFixed(1).padStart(11)}%   ${po.padEnd(17)}   ${(b.actualEdge*100).toFixed(1).padStart(9)}%   ${b.result.padEnd(8)}  ${(err*100).toFixed(1).padStart(7)} pts`)
}
console.log(`\n  mean error: ${(errs.reduce((a,x)=>a+x,0)/errs.length*100).toFixed(1)} points  (negative = we are too pessimistic)`)

console.log('\nHOW MUCH DOES REALITY ACTUALLY VARY?\n')
const acts = BATTLES.map(b => b.actualEdge*100)
console.log(`  same split, seven fights: ${acts.map(a=>a.toFixed(1)+'%').join('  ')}`)
console.log(`  real spread: ${(Math.max(...acts)-Math.min(...acts)).toFixed(1)} points, and it crosses zero (one loss, two wins)`)
const d = simulateOutcomes(army(), foe(BATTLES[1]), { trials: 300 })
console.log(`  our simulated spread on the same fight: +/-${(d.stdDev*100).toFixed(1)} points, ${(d.winRate*100).toFixed(0)}% wins`)
