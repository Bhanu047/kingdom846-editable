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

// [VALIDATED] Ground truth from frakinator.streamlit.app, 2026-08-25. With
// these leader stats the exact optimum is 2.8987/26.1310/70.9703 and the
// reference tool displays 2/26/72 -- Infantry floored, not rounded. A nearest
// projection gives 3/26/71 and was briefly shipped here; this test exists so
// that mistake cannot be made twice.
test('bear formation reproduces the reference calculator', () => {
  const r = optimizeBearFormation({
    stats: bearStats([577.3, 388.1], [577.3, 388.5], [577.3, 399.0]),
    tier: 'TG5-TG7',
    capacity: 150000,
  })
  assert.deepEqual([r.whole.infantry, r.whole.cavalry, r.whole.archers], [2, 26, 72])
  // The continuous solution behind it, pinned so a change to the damage model
  // shows up here as well as in the projected split.
  assert.ok(Math.abs(r.continuousRatio.infantry * 100 - 2.8987) < 0.001)
  assert.ok(Math.abs(r.continuousRatio.cavalry * 100 - 26.1310) < 0.001)
  assert.ok(Math.abs(r.continuousRatio.archers * 100 - 70.9703) < 0.001)
})

// [VALIDATED] Second Frakinator measurement, 2026-08-25. This is the case that
// determines Cavalry: at 26.8548 the reference tool shows 27, so Cavalry rounds
// while Infantry floors. Together with the case above the projection rule is
// fully pinned -- floor Infantry, round Cavalry, Archers take the remainder.
test('bear formation matches the reference calculator on cavalry rounding', () => {
  const r = optimizeBearFormation({
    stats: bearStats([180.5, 166.5], [180.5, 155.5], [180.5, 155.5]),
    tier: 'TG5-TG7',
    capacity: 150000,
  })
  assert.deepEqual([r.whole.infantry, r.whole.cavalry, r.whole.archers], [3, 27, 70])
  assert.ok(Math.abs(r.continuousRatio.infantry * 100 - 3.2463) < 0.001)
  assert.ok(Math.abs(r.continuousRatio.cavalry * 100 - 26.8548) < 0.001)
  // The discriminating assertion: 26.8548 rounds up, it is not truncated.
  assert.notEqual(r.whole.cavalry, 26, 'Cavalry was floored — it should round')
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

// [UNCALIBRATED] Pins the known limitation rather than a verified mechanic:
// the archer multiplier has only two values, so every tier above T6 behaves
// identically. If real per-tier data ever lands, this test SHOULD fail.
test('bear tier groups above T6 are still uncalibrated and identical', () => {
  const stats = bearStats([150, 120], [160, 130], [180, 150])
  const score = (tier) => optimizeBearFormation({ stats, tier, capacity: 150000 }).optimizedScore
  const above = ['T7-TG2', 'TG3-TG4', 'TG5-TG7'].map(score)
  assert.ok(above.every((v) => v === above[0]), 'tiers above T6 now differ — update the [UNCALIBRATED] note')
  assert.notEqual(score('T1-T6'), above[0], 'T1-T6 should still differ from the rest')
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
