// DOES PREFERRED TARGETING SURVIVE CONTACT WITH THE REAL OUTCOMES?
//
// research/ablation.mjs reports that preferred targeting (each line attacks its
// preferred type if alive: inf->inf, cav->arc, arc->inf) nearly halves the
// distance to Frakinator's picks -- 111 down to 65, and 57 with the wider
// counter triangle. That is a large structural effect and worth acting on.
//
// But two things stop it being decisive:
//
//   1. ablation.mjs scores against FRAKINATOR'S PICKS, not against reality.
//      Another calculator agreeing with us is proxy evidence; the same file's
//      own notes say the optimizer's answer is not ground truth.
//   2. ablation.mjs runs a SIMPLIFIED simulator -- no front-row spill, no
//      Ambusher, its own kill formula. Its "ours" baseline is therefore not the
//      shipped engine, so its 111 is not our 47 and the deltas do not transfer.
//
// This file closes both gaps: preferred targeting is implemented as a variant of
// the SHIPPED resolveVolley, using the engine's own killsDealt, and scored
// against the eight controlled real comparisons -- two or more splits against
// the same beast, so the opponent cancels and only the ranking is tested.
//
// Ranking is the right target because ranking is what the tool outputs. The
// absolute level cannot be tested here: research/noise-floor.mjs puts the
// per-battle sd at ~28 points, so a level fit on this data is fitting noise.

import {
  TROOP_TYPES, killsDealt, cloneArmy, armyTotal,
  FRONT_ROW_SPILL, AMBUSH_SHARE,
} from '../src/lib/combat/kingshotCombat.js'

// inf beats cav, cav beats arc, arc beats inf -- so each line's preferred
// target is the type it counters.
const PREFERRED = { infantry: 'infantry', cavalry: 'archers', archers: 'infantry' }

function firstAlive(side) {
  return TROOP_TYPES.find((t) => side[t].count > 0) || null
}

// mode 'front'     -- the shipped rule: front row absorbs, 20% spills to the
//                     back rows, Cavalry's Ambusher share always reaches Archers
// mode 'preferred' -- each line hits its preferred type if that type is alive,
//                     otherwise the first line still standing
function resolveVolley(attacker, defender, mode) {
  const losses = { infantry: 0, cavalry: 0, archers: 0 }
  const standing = TROOP_TYPES.filter((t) => defender[t].count > 0)
  if (!standing.length) return losses

  const hit = (attackerType, defenderType, portion) => {
    if (portion <= 0 || !defenderType) return
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

  if (mode === 'preferred') {
    for (const attackerType of TROOP_TYPES) {
      if (attacker[attackerType].count <= 0) continue
      const want = PREFERRED[attackerType]
      hit(attackerType, defender[want].count > 0 ? want : firstAlive(defender), 1)
    }
    return losses
  }

  const front = standing[0]
  const back = standing.slice(1)
  const spill = back.length ? FRONT_ROW_SPILL : 0
  for (const attackerType of TROOP_TYPES) {
    if (attacker[attackerType].count <= 0) continue
    let remaining = 1
    if (attackerType === 'cavalry' && front !== 'archers' && defender.archers.count > 0) {
      hit('cavalry', 'archers', AMBUSH_SHARE)
      remaining = 1 - AMBUSH_SHARE
    }
    hit(attackerType, front, remaining * (1 - spill))
    for (const row of back) hit(attackerType, row, remaining * spill / back.length)
  }
  return losses
}

function battle(attackerArmy, defenderArmy, mode, maxTurns = 4000) {
  const attacker = cloneArmy(attackerArmy)
  const defender = cloneArmy(defenderArmy)
  const startA = armyTotal(attacker)
  const startD = armyTotal(defender)
  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (!armyTotal(attacker) || !armyTotal(defender)) break
    const dD = resolveVolley(attacker, defender, mode)
    const dA = resolveVolley(defender, attacker, mode)
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

// ---- the eight controlled real comparisons (same data as all-pairs.mjs) ----
const FOL = { infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
              cavalry: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
              archers: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } }
const CC = { infantry: { attack: 85, lethality: 640, defense: 85, health: 640 },
             cavalry: { attack: 85, lethality: 547.5, defense: 85, health: 547.5 },
             archers: { attack: 85, lethality: 640, defense: 85, health: 640 } }
const KN = { infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
             cavalry: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
             archers: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } }
const mine = (s, tier) => Object.fromEntries(TROOP_TYPES.map((t) => [t, { ...s[t], tier }]))
const foe = (a, l, c, tier) => Object.fromEntries(TROOP_TYPES.map((t, i) => [t, { count: c[i], attack: a, lethality: l, defense: a, health: l, tier }]))
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
]

function agreement(mode) {
  let right = 0, total = 0
  const rows = []
  for (const g of GROUPS) {
    const scored = g.arms.map((a) => ({ ...a, model: battle(withCounts(a.c, g.s), g.e, mode) }))
    for (let i = 0; i < scored.length; i += 1) {
      for (let j = i + 1; j < scored.length; j += 1) {
        const ok = Math.sign(scored[i].edge - scored[j].edge) === Math.sign(scored[i].model - scored[j].model)
        total += 1
        if (ok) right += 1
        rows.push({ room: g.room, beast: g.beast, a: scored[i].sp, b: scored[j].sp, ok })
      }
    }
  }
  return { right, total, rows }
}

console.log('PREFERRED TARGETING, tested against the eight controlled real comparisons\n')
const front = agreement('front')
const pref = agreement('preferred')

console.log('  comparison                                   shipped   preferred')
console.log('  ' + '-'.repeat(62))
for (let i = 0; i < front.rows.length; i += 1) {
  const f = front.rows[i], p = pref.rows[i]
  const label = `${f.room} ${f.beast}: ${f.a} vs ${f.b}`
  console.log(`  ${label.padEnd(42)} ${(f.ok ? 'agree' : 'DISAGREE').padEnd(9)} ${p.ok ? 'agree' : 'DISAGREE'}`)
}
console.log('  ' + '-'.repeat(62))
console.log(`  ${'pairwise agreement'.padEnd(42)} ${String(front.right + '/' + front.total).padEnd(9)} ${pref.right}/${pref.total}`)

console.log('\n  VERDICT')
if (pref.right > front.right) {
  console.log(`  Preferred targeting agrees with reality more often (${pref.right}/${pref.total} vs ${front.right}/${front.total}).`)
  console.log('  Worth adopting -- but see how many comparisons that is before trusting it.')
} else if (pref.right === front.right) {
  console.log(`  No difference on real outcomes: both ${front.right}/${front.total}.`)
  console.log('  ablation.mjs preferred it only because it scored against another')
  console.log('  calculator. On ground truth the two structures are indistinguishable,')
  console.log('  so there is no evidence here for changing the shipped rule.')
} else {
  console.log(`  Preferred targeting is WORSE on real outcomes (${pref.right}/${pref.total} vs ${front.right}/${front.total}).`)
  console.log('  Do not adopt it. Matching another calculator more closely made the')
  console.log('  agreement with reality worse, which is the whole reason ground truth')
  console.log('  outranks proxy references.')
}
console.log(`\n  Eight comparisons is a small sample: a one-comparison change is ~12 points`)
console.log('  of apparent accuracy. Treat any difference smaller than two as noise.')
