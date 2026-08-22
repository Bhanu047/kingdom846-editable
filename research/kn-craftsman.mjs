// THE REVERSAL TEST. sec.14a set T11 = 1.10 on three battles against ONE beast
// (Mad Scholar 222) and named the condition that would overturn it: T11
// Knowledge Nexus battles against a DIFFERENT beast. If 1.10 turns pessimistic
// there, the error belonged to Mad Scholar and 1.175 comes back.
//
// Untouchable Craftsman, 220 flat, T10, 60000/45000/45000. Two battles.
// NOTE: battle U was fought with Infantry Health 150.0, V with 155.5 -- the
// player's own bonuses moved slightly between them, so each carries its own.
import { runBattle, TROOP_TYPES as T, TIER_STAT_MULTIPLIER } from '../src/lib/combat/kingshotCombat.js'
const stats = (infH) => ({
  infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: infH, tier: 'T11' },
  cavalry:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5, tier: 'T11' },
  archers:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0, tier: 'T11' },
})
const MY_TOTAL = 185200, THEIR_TOTAL = 150000
const foe = (a) => Object.fromEntries(T.map((t, k) => [t, {
  count: [60000, 45000, 45000][k], attack: a, lethality: a, defense: a, health: a, tier: 'T10' }]))
const army = (c, s) => Object.fromEntries(T.map((t, k) => [t, { count: c[k], ...s[t] }]))
const B = [
  // Mad Scholar 222 -- the three that set 1.10
  { id:'R', beast:'Mad Scholar', a:222, split:'46/21/33', counts:[85192,38892,61116], infH:155.5, myLoss:185200, theirLoss:111481 },
  { id:'S', beast:'Mad Scholar', a:222, split:'50/15/35', counts:[92600,27780,64820], infH:155.5, myLoss:185200, theirLoss:132400 },
  { id:'T', beast:'Mad Scholar', a:222, split:'57/15/28', counts:[105564,27780,51856], infH:155.5, myLoss:167288, theirLoss:150000 },
  // Untouchable Craftsman 220 -- THE NEW, INDEPENDENT OPPONENT
  { id:'U', beast:'Untouchable Craftsman', a:220, split:'45/20/35', counts:[83340,37040,64820], infH:150.0, myLoss:185200, theirLoss:123469 },
  { id:'V', beast:'Untouchable Craftsman', a:220, split:'50/15/35', counts:[92600,27780,64820], infH:155.5, myLoss:169762, theirLoss:150000 },
]
for (const b of B) b.actual = ((MY_TOTAL - b.myLoss)/MY_TOTAL - (THEIR_TOTAL - b.theirLoss)/THEIR_TOTAL) * 100
console.log('ALL FIVE T11 KNOWLEDGE NEXUS BATTLES\n')
console.log('  id  beast                  split      result    edge')
for (const b of B) console.log(`  ${b.id}   ${b.beast.padEnd(21)} ${b.split}   ${b.myLoss>=MY_TOTAL?'DEFEAT ':'VICTORY'}  ${b.actual.toFixed(1).padStart(6)}`)
console.log('\n  NEW BEAST, SAME PATTERN: 45/20/35 -> -17.7,  50/15/35 -> +8.3.')
console.log('  More Infantry, better result -- for the third opponent running.')

const saved = TIER_STAT_MULTIPLIER.T11
console.log('\n\nDOES 1.10 SURVIVE THE NEW OPPONENT?\n')
console.log('  T11      U 45/20/35   V 50/15/35   Craftsman err   Mad Scholar err   ALL FIVE')
for (const m of [1.175, 1.15, 1.12, 1.10, 1.08, 1.05]) {
  TIER_STAT_MULTIPLIER.T11 = m
  const p = B.map((b) => runBattle(army(b.counts, stats(b.infH)), foe(b.a), { maxTurns: 4000 }).survivalEdge * 100)
  const err = B.map((b, i) => p[i] - b.actual)
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
  const mae = (xs) => mean(xs.map(Math.abs))
  console.log(`  ${m.toFixed(3)}  ${p[3].toFixed(1).padStart(9)}    ${p[4].toFixed(1).padStart(9)}   ${mean(err.slice(3)).toFixed(1).padStart(11)}   ${mean(err.slice(0,3)).toFixed(1).padStart(13)}   MAE ${mae(err).toFixed(1)}`)
}
TIER_STAT_MULTIPLIER.T11 = saved
console.log(`\n  shipped value is ${saved}.  Positive = too optimistic, negative = too pessimistic.`)
console.log('  per-battle sd from replicated fights is ~28, so |error| under 28 is inside the noise.')
