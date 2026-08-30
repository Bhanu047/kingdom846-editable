// RE-FIT FRONT_ROW_SPILL WITH THE PROSPECTOR PAIR INCLUDED.
//
// spill-pairs.mjs fitted this constant on the ranking evidence, and its case
// rested on one observation repeated four times: "Reality says cavalry is worse
// than we model it -- four for four, the lower-cavalry split won." Cavalry lives
// in the back row, FRONT_ROW_SPILL sets how much damage reaches the back row,
// so spill was the dial that could express "cavalry is worse than we think".
//
// research/cc-prospector.mjs breaks that streak. Crystal Cave, Cesares
// Prospector, same beast and same 150,000 troops eight minutes apart:
//
//   60/15/25  cavalry 15   DEFEAT   edge -34.75
//   52/21/27  cavalry 21   VICTORY  edge +32.21
//
// Five for five becomes four for five, and the exception is the most decisive
// margin in the set. So the fit has to be re-run rather than assumed to hold.
//
// Sweeping the constant needs it injectable, which it is not -- it is a module
// constant. So the volley is reimplemented here with spill as a parameter,
// using the engine's own killsDealt so the damage formula is identical. At
// spill 0.20 this reproduces the shipped engine, which is asserted below.

import { killsDealt, cloneArmy, armyTotal, TROOP_TYPES, runBattle, AMBUSH_SHARE } from '../src/lib/combat/kingshotCombat.js'

function resolveVolley(attacker, defender, spill) {
  const losses = { infantry: 0, cavalry: 0, archers: 0 }
  const standing = TROOP_TYPES.filter((t) => defender[t].count > 0)
  if (!standing.length) return losses
  const front = standing[0]
  const back = standing.slice(1)
  const effectiveSpill = back.length ? spill : 0

  const hit = (attackerType, defenderType, portion) => {
    if (portion <= 0) return
    losses[defenderType] += killsDealt({
      attackerCount: attacker[attackerType].count,
      attackerStats: attacker[attackerType],
      defenderStats: defender[defenderType],
      attackerType,
      defenderType,
      skillMod: 1,
      specialMultiplier: portion * (attackerType === 'archers' ? 1.10 : 1),
    })
  }

  for (const attackerType of TROOP_TYPES) {
    if (attacker[attackerType].count <= 0) continue
    let remaining = 1
    if (attackerType === 'cavalry' && front !== 'archers' && defender.archers.count > 0) {
      hit('cavalry', 'archers', AMBUSH_SHARE)
      remaining = 1 - AMBUSH_SHARE
    }
    hit(attackerType, front, remaining * (1 - effectiveSpill))
    for (const row of back) hit(attackerType, row, remaining * effectiveSpill / back.length)
  }
  return losses
}

function edgeAt(attackerArmy, defenderArmy, spill) {
  const attacker = cloneArmy(attackerArmy)
  const defender = cloneArmy(defenderArmy)
  const startA = armyTotal(attacker)
  const startD = armyTotal(defender)
  for (let turn = 0; turn < 4000; turn += 1) {
    if (!armyTotal(attacker) || !armyTotal(defender)) break
    const dD = resolveVolley(attacker, defender, spill)
    const dA = resolveVolley(defender, attacker, spill)
    let moved = false
    for (const t of TROOP_TYPES) {
      const a = Math.floor(dA[t]), d = Math.floor(dD[t])
      if (a > 0 || d > 0) moved = true
      defender[t].count = Math.max(0, defender[t].count - d)
      attacker[t].count = Math.max(0, attacker[t].count - a)
    }
    if (!moved) break
  }
  return ((startA ? armyTotal(attacker) / startA : 0) - (startD ? armyTotal(defender) / startD : 0)) * 100
}

// ---------------------------------------------------------------- the data
const FOL = { infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
              cavalry: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
              archers: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } }
const CC = { infantry: { attack: 85, lethality: 640, defense: 85, health: 640 },
             cavalry: { attack: 85, lethality: 547.5, defense: 85, health: 547.5 },
             archers: { attack: 85, lethality: 640, defense: 85, health: 640 } }
const KN = { infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
             cavalry: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
             archers: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } }
// Prospector, 2026-08-25: Attack/Defense +88.5 throughout, Lethality/Health
// +654.0 except Cavalry at +625.7.
const PROS = { infantry: { attack: 88.5, lethality: 654.0, defense: 88.5, health: 654.0 },
               cavalry: { attack: 88.5, lethality: 625.7, defense: 88.5, health: 625.7 },
               archers: { attack: 88.5, lethality: 654.0, defense: 88.5, health: 654.0 } }

const mine = (s, tier) => Object.fromEntries(TROOP_TYPES.map((t) => [t, { ...s[t], tier }]))
const foe = (a, l, c, tier) => Object.fromEntries(TROOP_TYPES.map((t, i) => [t, { count: c[i], attack: a, lethality: l, defense: a, health: l, tier }]))
const foe4 = (a, l, d, h, c, tier) => Object.fromEntries(TROOP_TYPES.map((t, i) => [t, { count: c[i], attack: a, lethality: l, defense: d, health: h, tier }]))
const withCounts = (c, s) => Object.fromEntries(TROOP_TYPES.map((t, i) => [t, { count: c[i], ...s[t] }]))

const GROUPS = [
  { room: 'FoL', beast: 'Starving', e: foe(391, 553.3, [64680, 48510, 48510], 'T10'), s: mine(FOL, 'T10'), arms: [
    { sp: '50/15/35', c: [81750, 24525, 57225], edge: 24.0 },
    { sp: '46/21/33', c: [75210, 34335, 53955], edge: -20.8 }] },
  { room: 'CC', beast: 'Appraiser', e: foe(77, 690, [60000, 45000, 45000], 'T10'), s: mine(CC, 'T10'), arms: [
    { sp: '50/15/35', c: [75000, 22500, 52500], edge: 33.3 },
    { sp: '52/15/33', c: [78000, 22500, 49500], edge: -20.1 },
    { sp: '46/21/33', c: [69000, 31500, 49500], edge: -38.4 }] },
  { room: 'KN', beast: 'Mad Scholar', e: foe(222, 222, [60000, 45000, 45000], 'T10'), s: mine(KN, 'T11'), arms: [
    { sp: '57/15/28', c: [105564, 27780, 51856], edge: 9.7 },
    { sp: '50/15/35', c: [92600, 27780, 64820], edge: -11.7 },
    { sp: '46/21/33', c: [85192, 38892, 61116], edge: -25.7 }] },
  { room: 'KN', beast: 'Craftsman', e: foe(220, 220, [60000, 45000, 45000], 'T10'), s: mine(KN, 'T11'), arms: [
    { sp: '50/15/35', c: [92600, 27780, 64820], edge: 8.3 },
    { sp: '45/20/35', c: [83340, 37040, 64820], edge: -17.7 }] },
  // NEW, 2026-08-25 -- the controlled pair that broke the cavalry streak
  { room: 'CC', beast: 'Prospector', e: foe4(79.0, 712.0, 79.0, 712.0, [60000, 45000, 45000], 'T10'), s: mine(PROS, 'T10'), arms: [
    { sp: '60/15/25', c: [90000, 22500, 37500], edge: -34.75 },
    { sp: '52/21/27', c: [78000, 31500, 40500], edge: 32.21 }] },
]

// Sanity: at spill 0.20 this must reproduce the shipped engine.
{
  const g = GROUPS[4], a = g.arms[0]
  const here = edgeAt(withCounts(a.c, g.s), g.e, 0.20)
  const shipped = runBattle(withCounts(a.c, g.s), g.e, { maxTurns: 4000 }).survivalEdge * 100
  const ok = Math.abs(here - shipped) < 1e-9
  console.log(`sanity: reimplementation at spill 0.20 matches shipped engine -- ${ok ? 'yes' : 'NO (' + here + ' vs ' + shipped + ')'}\n`)
  if (!ok) process.exit(1)
}

function scoreAt(spill, groups) {
  let right = 0, total = 0, absErr = 0, n = 0
  for (const g of groups) {
    const scored = g.arms.map((a) => ({ ...a, model: edgeAt(withCounts(a.c, g.s), g.e, spill) }))
    for (const s of scored) { absErr += Math.abs(s.model - s.edge); n += 1 }
    for (let i = 0; i < scored.length; i += 1) {
      for (let j = i + 1; j < scored.length; j += 1) {
        total += 1
        if (Math.sign(scored[i].edge - scored[j].edge) === Math.sign(scored[i].model - scored[j].model)) right += 1
      }
    }
  }
  return { right, total, mae: absErr / n }
}

const OLD = GROUPS.slice(0, 4)
console.log('FRONT_ROW_SPILL swept against the ranking evidence\n')
console.log('  spill   without Prospector      with Prospector         MAE (all)')
console.log('  ' + '-'.repeat(64))
let best = null
for (const spill of [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50]) {
  const a = scoreAt(spill, OLD)
  const b = scoreAt(spill, GROUPS)
  if (!best || b.right > best.b.right) best = { spill, b }
  const mark = spill === 0.20 ? '  <- shipped' : ''
  console.log(`   ${spill.toFixed(2)}    ${String(a.right + '/' + a.total).padEnd(22)} ${String(b.right + '/' + b.total).padEnd(23)} ${b.mae.toFixed(1)}${mark}`)
}

console.log('\n  BEST on the full set: spill ' + best.spill.toFixed(2) + ` (${best.b.right}/${best.b.total})`)
const shipped = scoreAt(0.20, GROUPS)
console.log(`  SHIPPED 0.20:         ${shipped.right}/${shipped.total}`)
if (best.b.right > shipped.right) {
  console.log(`\n  A different spill would score ${best.b.right - shipped.right} comparison(s) better.`)
  console.log('  One comparison out of nine is ~11 points of apparent accuracy, and')
  console.log('  noise-floor.mjs already found the model fitting noise on sixteen')
  console.log('  observations. Do not move the constant on this alone -- record it and')
  console.log('  see whether the next controlled pair points the same way.')
} else {
  console.log('\n  No spill value beats the shipped 0.20 on the full set. The new pair')
  console.log('  does not, on its own, justify moving the constant.')
}
