// Regression tests for the combat engines.
//
// Each block pins a defect that was live before this suite existed; the
// comment says what the old behaviour was, so a failure here reads as "the bug
// came back" rather than "a number moved".

import test from 'node:test'
import assert from 'node:assert/strict'

import { allocateCounts, percentAxis, simulateOutcomes, TROOP_TYPES } from '../src/lib/combat/kingshotCombat.js'
import { optimizeBearFormation } from '../src/lib/combat/bearOptimizer.js'
import { armyFromSplit, optimizeTrialSplit } from '../src/lib/combat/mysticTrials.js'
import { optimizePvpComposition } from '../src/lib/combat/pvpBattle.js'
import { computeHuntImpact, HUNT_JOINER_HEROES } from '../src/lib/combat/huntImpact.js'
import { runBattle } from '../src/lib/combat/kingshotCombat.js'
import { skillModifier, simulatePvpBattle } from '../src/lib/combat/pvpBattle.js'

const sum = (o) => TROOP_TYPES.reduce((t, k) => t + o[k], 0)
const flatStats = Object.fromEntries(TROOP_TYPES.map((t) => [t, { attack: 120, lethality: 110, defense: 100, health: 100 }]))
const enemy = Object.fromEntries(TROOP_TYPES.map((t) => [t, { count: 20000, attack: 115, lethality: 105, defense: 100, health: 100, tier: 'T10' }]))

// ---------------------------------------------------------------- allocation
// Was: each type rounded on its own, so 100 split three ways fielded 99 troops
// and 0.505/0.005/0.49 of 100 fielded 101.
test('allocateCounts always totals exactly the requested size', () => {
  const splits = [
    { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 },
    { infantry: 0.505, cavalry: 0.005, archers: 0.49 },
    { infantry: 0.333, cavalry: 0.333, archers: 0.334 },
    { infantry: 1, cavalry: 0, archers: 0 },
  ]
  for (const total of [0, 1, 7, 100, 999, 99999, 150000]) {
    for (const split of splits) assert.equal(sum(allocateCounts(total, split)), total, `${total} / ${JSON.stringify(split)}`)
  }
})

test('allocateCounts keeps every type within one troop of its exact share', () => {
  const split = { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  const counts = allocateCounts(100, split)
  for (const type of TROOP_TYPES) assert.ok(Math.abs(counts[type] - 100 / 3) < 1, `${type}=${counts[type]}`)
})

test('allocateCounts is deterministic across repeated calls', () => {
  const split = { infantry: 0.4, cavalry: 0.3, archers: 0.3 }
  const first = JSON.stringify(allocateCounts(12345, split))
  for (let i = 0; i < 20; i += 1) assert.equal(JSON.stringify(allocateCounts(12345, split)), first)
})

test('allocateCounts normalises shares that do not add to 1', () => {
  assert.equal(sum(allocateCounts(100, { infantry: 2, cavalry: 2, archers: 2 })), 100)
  assert.equal(sum(allocateCounts(100, { infantry: 0.1, cavalry: 0.1, archers: 0.1 })), 100)
})

// --------------------------------------------------------------- search grid
// Was: `for (v = 0; v <= 100; v += step)` dropped the 100 endpoint whenever the
// step did not divide it, so at step 7 the search stopped at 98 and an
// all-one-type split could never be recommended.
test('percentAxis spans 0..100 inclusive for every step', () => {
  for (const step of [1, 3, 5, 7, 10, 25, 50]) {
    const axis = percentAxis(step)
    assert.equal(axis[0], 0, `step ${step} misses 0`)
    assert.equal(axis[axis.length - 1], 100, `step ${step} misses 100`)
    assert.equal(new Set(axis).size, axis.length, `step ${step} has duplicates`)
  }
})

// ----------------------------------------------------------------------- rng
// Was: `seed * 1103515245` overflowed float64 (526x past 2^53), collapsing the
// stream to 29 distinct low-10-bit values and a 419-draw cycle -- shorter than
// the 300-400 trials callers request, so trials silently replayed each other.
test('the simulation RNG keeps full 32-bit precision', () => {
  let seed = 99
  const next = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed }
  const low = new Set()
  for (let i = 0; i < 4096; i += 1) low.add(next() & 1023)
  assert.equal(low.size, 1024, 'low bits are degenerate — is Math.imul still in use?')
})

test('the RNG cycle outlasts the trial counts callers ask for', () => {
  let seed = 99
  const seen = new Map()
  for (let i = 0; i < 5000; i += 1) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    assert.ok(!seen.has(seed), `cycled after ${i} draws, below the 400-trial default`)
    seen.set(seed, i)
  }
})

test('simulateOutcomes stays deterministic for identical armies', () => {
  const army = Object.fromEntries(TROOP_TYPES.map((t) => [t, { count: 10000, attack: 120, lethality: 110, defense: 100, health: 100, tier: 'T10' }]))
  const a = simulateOutcomes(army, enemy, { trials: 50 })
  const b = simulateOutcomes(army, enemy, { trials: 50 })
  assert.deepEqual(a, b)
})

// ---------------------------------------------------------------------- bear
// Was: Infantry floored while Cavalry rounded, so the displayed split was not
// the nearest projection of the optimum in 217 of 450 sampled stat pairs --
// continuous 2.99/26.93/70.08 was shown as 2/27/71.
const bearStats = (i, c, a) => ({
  infantry: { attack: i[0], lethality: i[1], widget: '0', widgetStat: 'attack' },
  cavalry: { attack: c[0], lethality: c[1], widget: '0', widgetStat: 'attack' },
  archers: { attack: a[0], lethality: a[1], widget: '0', widgetStat: 'attack' },
})

// [VALIDATED] Frakinator observations recorded in research/bear-reference.md,
// replayed against the calibrated model. These three pin the damage weights;
// the archer weight of 4.4/3 is what reproduces them.
test('bear formation reproduces the reference calculator', () => {
  const cases = [
    { stats: bearStats([250, 140], [310, 190], [180, 260]), expect: [2, 38, 60] },
    { stats: bearStats([500, 500], [100, 100], [300, 50]), expect: [60, 7, 33] },
    { stats: bearStats([0, 0], [0, 0], [0, 0]), expect: [3, 31, 66] },
  ]
  for (const { stats, expect } of cases) {
    const r = optimizeBearFormation({ stats, tier: 'TG5-TG7', capacity: 150000 })
    assert.deepEqual([r.whole.infantry, r.whole.cavalry, r.whole.archers], expect)
  }
})

// The projection rule: Infantry floors, Cavalry rounds, Archers take what is
// left. This case is chosen because its Cavalry fraction is .8265, which floors
// and rounds differently -- 4 against 5 -- so it actually discriminates.
test('bear formation floors Infantry and rounds Cavalry', () => {
  const r = optimizeBearFormation({
    stats: bearStats([100, 80], [125, 100], [300, 240]),
    tier: 'TG5-TG7',
    capacity: 150000,
  })
  const c = r.continuousRatio
  assert.ok(Math.abs(c.infantry * 100 - 0.3432) < 0.001)
  assert.ok(Math.abs(c.cavalry * 100 - 4.8265) < 0.001)
  assert.deepEqual([r.whole.infantry, r.whole.cavalry, r.whole.archers], [0, 5, 95])
  assert.notEqual(r.whole.cavalry, 4, 'Cavalry was floored — it should round')
})

test('bear whole-percent split always totals 100, with Infantry floored', () => {
  const cases = [
    bearStats([100, 100], [100, 100], [100, 100]),
    bearStats([150, 120], [160, 130], [180, 150]),
    bearStats([577.3, 388.1], [577.3, 388.5], [577.3, 399.0]),
    bearStats([300, 280], [120, 100], [110, 90]),
    bearStats([120, 100], [130, 110], [260, 240]),
    bearStats([1709.7, 1792.1], [1598.7, 1669.3], [1713.2, 1821.3]),
  ]
  for (const stats of cases) {
    const r = optimizeBearFormation({ stats, tier: 'TG5-TG7', capacity: 150000 })
    const whole = [r.whole.infantry, r.whole.cavalry, r.whole.archers]
    assert.equal(whole.reduce((x, y) => x + y, 0), 100, `does not total 100: ${whole}`)
    // Archers absorb the remainder, so only Infantry and Cavalry track their
    // own exact shares.
    assert.equal(r.whole.infantry, Math.floor(r.continuousRatio.infantry * 100 + 1e-9),
      `Infantry should be floored, got ${r.whole.infantry} for ${(r.continuousRatio.infantry * 100).toFixed(4)}`)
  }
})

test('bear troop counts total the march capacity', () => {
  for (const capacity of [1, 999, 150000]) {
    const r = optimizeBearFormation({ stats: bearStats([150, 120], [160, 130], [180, 150]), tier: 'TG5-TG7', capacity })
    assert.equal(sum(r.counts), capacity)
  }
})

// Was: undefined / {} / all-zero stats returned a confident split with no way
// for a caller to tell it came from no data.
test('bear flags a result computed from no player stats', () => {
  for (const stats of [undefined, {}, bearStats([0, 0], [0, 0], [0, 0])]) {
    assert.equal(optimizeBearFormation({ stats, capacity: 1000 }).hasStats, false)
  }
  assert.equal(optimizeBearFormation({ stats: bearStats([150, 120], [160, 130], [180, 150]), capacity: 1000 }).hasStats, true)
})

// [VALIDATED] research/bear-reference.md: all four of the reference tool's tier
// settings return the same split for the same stats. The model previously
// multiplied the Archer coefficient by an extra 1.1 above T6; that is gone, and
// this pins its absence.
//
// [OPEN] Two Frakinator runs on 2026-08-25 at TG5-TG7 returned 2/26/72 and
// 3/27/70, which this tier-independent model does not reproduce and the
// pre-calibration model did. See research/tier-contradiction.mjs — the two sets
// of observations disagree and one decisive measurement would settle it.
test('bear tier setting does not change the split', () => {
  const stats = bearStats([150, 120], [160, 130], [180, 150])
  const split = (tier) => {
    const r = optimizeBearFormation({ stats, tier, capacity: 150000 })
    return [r.whole.infantry, r.whole.cavalry, r.whole.archers].join('/')
  }
  const base = split('T1-T6')
  for (const tier of ['T7-TG2', 'TG3-TG4', 'TG5-TG7']) {
    assert.equal(split(tier), base, `${tier} differs from T1-T6`)
  }
})

// -------------------------------------------------------------------- mystic
test('armyFromSplit fields exactly the troops it was given', () => {
  for (const total of [7, 100, 1000, 99999]) {
    for (const split of [{ infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }, { infantry: 0.5, cavalry: 0.2, archers: 0.3 }]) {
      const army = armyFromSplit(total, split, flatStats)
      assert.equal(TROOP_TYPES.reduce((t, k) => t + army[k].count, 0), total)
    }
  }
})

test('the trial search reaches an all-one-type split at any step', () => {
  for (const stepPercent of [5, 7, 3]) {
    const r = optimizeTrialSplit({ totalTroops: 30000, yourStats: flatStats, enemyArmy: enemy, stepPercent })
    assert.ok(r.candidates.some((c) => c.split[0] === 100), `step ${stepPercent} never tries 100% infantry`)
  }
})

// ----------------------------------------------------------------------- pvp
test('every PvP candidate marches exactly the committed total', () => {
  const r = optimizePvpComposition({ totalTroops: 80000, yourStats: flatStats, enemyArmy: enemy, stepPercent: 10 })
  assert.ok(r.candidates.length > 0)
  for (const c of r.candidates) {
    assert.equal(c.result.startingAttacker, 80000, `split ${c.split} marched ${c.result.startingAttacker}`)
  }
})

test('the PvP search reaches an all-one-type split at any step', () => {
  for (const stepPercent of [5, 7, 3]) {
    const r = optimizePvpComposition({ totalTroops: 60000, yourStats: flatStats, enemyArmy: enemy, stepPercent })
    assert.ok(r.candidates.some((c) => c.split[0] === 100), `step ${stepPercent} never tries 100% infantry`)
  }
})

// ------------------------------------------------------------- hunt impact
const huntStats = {
  infantry: { attack: 577.3, lethality: 388.1, widget: '0', widgetStat: 'attack' },
  cavalry: { attack: 577.3, lethality: 388.5, widget: '0', widgetStat: 'attack' },
  archers: { attack: 577.3, lethality: 399.0, widget: '0', widgetStat: 'attack' },
}
const huntCounts = { infantry: 81750, cavalry: 24525, archers: 57225 }
const joiner = (hero) => ({ hero, skillLevel: 5 })

test('hunt efficiency is 100% exactly at the optimal ratio', () => {
  const played = computeHuntImpact({
    stats: huntStats, tier: 'TG5-TG7', ratio: { infantry: 0.5, cavalry: 0.15, archers: 0.35 },
    troopCounts: huntCounts, capacity: 200000, participants: 20,
  })
  const atOptimum = computeHuntImpact({
    stats: huntStats, tier: 'TG5-TG7', ratio: played.optimalRatio,
    troopCounts: huntCounts, capacity: 200000, participants: 20,
  })
  assert.ok(Math.abs(atOptimum.efficiency - 100) < 1e-9,
    `optimum scored ${atOptimum.efficiency} — efficiency is mis-normalised`)
  assert.ok(played.efficiency < 100)
})

// Was: seven of the ten selectable joiners contribute nothing, and the caller
// had no way to know — the control looked broken rather than unmodelled.
test('hunt impact names the joiners that contributed nothing', () => {
  const r = computeHuntImpact({
    stats: huntStats, tier: 'TG5-TG7', ratio: { infantry: 0.5, cavalry: 0.15, archers: 0.35 },
    troopCounts: huntCounts, capacity: 200000, participants: 20,
    joiners: [joiner('Chenko'), joiner('Gordon'), joiner('Thrud'), joiner('Amane')],
  })
  assert.deepEqual(r.unmodeledJoiners, ['Gordon', 'Thrud'])

  const modelled = computeHuntImpact({
    stats: huntStats, tier: 'TG5-TG7', ratio: { infantry: 0.5, cavalry: 0.15, archers: 0.35 },
    troopCounts: huntCounts, capacity: 200000, participants: 20,
    joiners: [joiner('Chenko'), joiner('Amane')],
  })
  assert.deepEqual(modelled.unmodeledJoiners, [])
})

test('hunt impact flags a score computed from no player stats', () => {
  assert.equal(computeHuntImpact({}).hasStats, false)
  assert.equal(computeHuntImpact({
    stats: huntStats, tier: 'TG5-TG7', ratio: { infantry: 0.5, cavalry: 0.15, archers: 0.35 },
    troopCounts: huntCounts, capacity: 200000, participants: 20,
  }).hasStats, true)
})

test('every selectable joiner is a known hero', () => {
  assert.ok(HUNT_JOINER_HEROES.includes('None'))
  assert.equal(new Set(HUNT_JOINER_HEROES).size, HUNT_JOINER_HEROES.length)
})

// ------------------------------------------------- engine-wide invariants
//
// Mystic Trials and PvP have no reference calculator to check against, so
// these pin properties that must hold whatever the true formula turns out to
// be. A violation here is a bug even without external ground truth.

const fullArmy = (n, atk = 120, leth = 110) => Object.fromEntries(TROOP_TYPES.map(
  (t) => [t, { count: n, attack: atk, lethality: leth, defense: 100, health: 100, tier: 'T10' }]))
const fullStats = (atk = 120, leth = 110) => Object.fromEntries(TROOP_TYPES.map(
  (t) => [t, { attack: atk, lethality: leth, defense: 100, health: 100 }]))

test('identical armies favour neither side', () => {
  const r = runBattle(fullArmy(20000), fullArmy(20000))
  assert.ok(Math.abs(r.survivalEdge) < 1e-9, `edge ${r.survivalEdge}`)
  assert.ok(!r.attackerWins && !r.defenderWins, `outcome ${r.outcome}`)
})

test('survival edge never decreases as your army grows', () => {
  let prev = -Infinity
  for (const n of [5000, 10000, 20000, 40000, 80000]) {
    const edge = runBattle(fullArmy(n), fullArmy(20000)).survivalEdge
    assert.ok(edge >= prev - 1e-9, `${n} troops scored ${edge}, below ${prev}`)
    prev = edge
  }
})

test('survival edge never decreases as your attack grows', () => {
  let prev = -Infinity
  for (const atk of [50, 100, 200, 400, 800]) {
    const edge = runBattle(fullArmy(20000, atk), fullArmy(20000)).survivalEdge
    assert.ok(edge >= prev - 1e-9, `${atk}% attack scored ${edge}, below ${prev}`)
    prev = edge
  }
})

test('the optimizers return the best candidate they found', () => {
  const enemyArmy = fullArmy(20000)
  const m = optimizeTrialSplit({ totalTroops: 60000, yourStats: fullStats(), enemyArmy, stepPercent: 10 })
  const clearing = m.candidates.filter((c) => c.clears)
  const pool = clearing.length ? clearing : m.candidates
  const trueBest = pool.reduce((best, c) => (c.survivalEdge > best.survivalEdge ? c : best), pool[0])
  assert.ok(m.best.survivalEdge >= trueBest.survivalEdge - 1e-12)
  assert.equal(Number(m.best.clears), Number(trueBest.clears))

  const p = optimizePvpComposition({ totalTroops: 60000, yourStats: fullStats(), enemyArmy, stepPercent: 10 })
  const pBest = p.candidates.reduce((best, c) => (c.survivalEdge > best.survivalEdge ? c : best), p.candidates[0])
  assert.ok(p.best.survivalEdge >= pBest.survivalEdge - 1e-12)
})

test('bounds actually constrain both searches', () => {
  const enemyArmy = fullArmy(20000)
  const bounds = { minInfantry: 20, maxInfantry: 40, minCavalry: 0, maxCavalry: 100, minArchers: 0, maxArchers: 100 }
  for (const [label, result] of [
    ['mystic', optimizeTrialSplit({ totalTroops: 60000, yourStats: fullStats(), enemyArmy, stepPercent: 5, bounds })],
    ['pvp', optimizePvpComposition({ totalTroops: 60000, yourStats: fullStats(), enemyArmy, stepPercent: 5, bounds })],
  ]) {
    assert.ok(result.candidates.length > 0, `${label} found nothing`)
    for (const c of result.candidates) {
      assert.ok(c.split[0] >= 20 && c.split[0] <= 40, `${label} produced infantry ${c.split[0]}, outside 20..40`)
    }
  }
})

test('skillModifier algebra holds', () => {
  assert.equal(skillModifier({}), 1)
  assert.ok(Math.abs(skillModifier({ damageUp: 100 }) - 2) < 1e-12)
  // Raising your damage and cutting theirs by the same amount are inverses.
  const up = skillModifier({ damageUp: 50 })
  const down = skillModifier({ opponentDamageDown: 50 })
  assert.ok(Math.abs(up * down - 1) < 1e-12, `${up} * ${down}`)
  for (const v of [0, 50, 100, 500, -50]) assert.ok(skillModifier({ damageUp: v }) > 0)
})

test('losses reconcile with starting and remaining counts', () => {
  const r = simulatePvpBattle({ attacker: fullArmy(30000), defender: fullArmy(25000) })
  assert.equal(r.attackerLosses, r.startingAttacker - r.remainingAttacker)
  assert.equal(r.defenderLosses, r.startingDefender - r.remainingDefender)
  for (const rate of [r.attackerLossRate, r.defenderLossRate]) {
    assert.ok(rate >= 0 && rate <= 1, `loss rate ${rate} outside [0,1]`)
  }
})

test('the mystic optimizer is deterministic', () => {
  const run = () => JSON.stringify(optimizeTrialSplit({
    totalTroops: 40000, yourStats: fullStats(), enemyArmy: fullArmy(20000), stepPercent: 10,
  }).best.split)
  const first = run()
  for (let i = 0; i < 3; i += 1) assert.equal(run(), first)
})
