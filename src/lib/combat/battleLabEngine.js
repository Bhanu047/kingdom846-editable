const TYPES = ['infantry', 'cavalry', 'archers']

export const TROOP_LABELS = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

// KNOWN GAPS between this simulator and Kingshot's actual combat, from
// published mechanics guides. Recorded because the optimizer's persistent
// "0% Cavalry" answer is a symptom of these, not of the counter bonus being
// too small -- raising that bonus to force Cavalry in was fitting around the
// gaps instead of closing them, and contradicted the real +10% figure.
//
//  1. Cavalry "Ambusher": ~20% chance to bypass Infantry and strike Archers
//     directly. Not modelled. This is likely most of Cavalry's real value --
//     here every attack is walled by the enemy's front line, so Cavalry never
//     reaches the target it counters and looks worthless.
//  2. Archers: ~10% chance to fire twice in a round. Not modelled.
//  3. Infantry "Master Brawler": bonus damage and mitigation vs Cavalry.
//     Not modelled.
//  4. Defense is documented as having real diminishing returns at high
//     values. Here it divides linearly, so the 900%+ Defense on late-game
//     reports is worth far more than it should be.
//  5. The per-type base values below are the load-bearing input to every
//     result and are NOT sourced game data -- see the note on T10_BASE.
//
// Until 1-4 are closed against real values, treat the composition ranking as
// indicative and the win/lose verdict as unreliable.

// UNVERIFIED. These are constructed numbers, not extracted game data: attack
// runs 472 / 1416 / 1888 (exactly 1x, 3x, 4x) and hp 1416 / 472 / 354
// (exactly 4x, 4/3x, 1x), so attack x hp is identical for all three types --
// a hand-built balance, not a measurement. Lethality and Defense are a flat
// 10 for every type, which contradicts the documented profile that Infantry
// carry the highest base Health AND Defense while Cavalry and Archers do not.
// Every number this simulator produces rests on these, so they are the first
// thing to replace with real per-tier values.
const T10_BASE = {
  infantry: { attack: 472, hp: 1416, lethality: 10, defense: 10 },
  cavalry: { attack: 1416, hp: 472, lethality: 10, defense: 10 },
  archers: { attack: 1888, hp: 354, lethality: 10, defense: 10 },
}

export const MYSTIC_TRIALS = {
  coliseum: {
    label: 'Coliseum',
    sources: ['heroes', 'heroGear', 'widgets'],
    note: 'Hero, hero gear, and widget-focused trial.',
  },
  forest: {
    label: 'Forest of Life',
    sources: ['pets', 'petSkills'],
    note: 'Pet and pet-skill focused trial.',
  },
  crystal: {
    label: 'Crystal Cave',
    sources: ['charms'],
    note: 'Governor Charm-focused trial.',
  },
  nexus: {
    label: 'Knowledge Nexus',
    sources: ['academy', 'warAcademy'],
    note: 'Academy and War Academy research-focused trial.',
  },
  molten: {
    label: 'Molten Fort',
    sources: ['governorGear'],
    note: 'Governor Gear-focused trial.',
  },
  radiant: {
    label: 'Radiant Spire',
    sources: ['heroes', 'heroGear', 'widgets', 'pets', 'petSkills', 'charms', 'academy', 'warAcademy', 'governorGear'],
    note: 'Combined progression trial.',
  },
}

export const SOURCE_LABELS = {
  heroes: 'Heroes',
  heroGear: 'Hero Gear',
  widgets: 'Widgets',
  pets: 'Pets',
  petSkills: 'Pet Skills',
  charms: 'Governor Charms',
  academy: 'Academy',
  warAcademy: 'War Academy',
  governorGear: 'Governor Gear',
}

function n(value, fallback = 0) {
  const result = Number(value)
  return Number.isFinite(result) ? result : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Infantry > Cavalry > Archers > Infantry. See calculateCasualties for why
// this has to be well above 1.0 rather than a token bonus.
const COUNTER_MULT = 1.1

function counters(attacker, defender) {
  return (
    (attacker === 'infantry' && defender === 'cavalry') ||
    (attacker === 'cavalry' && defender === 'archers') ||
    (attacker === 'archers' && defender === 'infantry')
  )
}

function allocate(capacity, coefficients, minimums = {}) {
  const cap = Math.max(1, Math.floor(n(capacity, 1)))
  const floors = Object.fromEntries(TYPES.map((type) => [type, Math.max(0, Math.floor(n(minimums[type], 0)))]))
  const floorTotal = TYPES.reduce((sum, type) => sum + floors[type], 0)
  if (floorTotal > cap) throw new Error('Minimum troop counts cannot exceed march capacity.')

  const free = new Set(TYPES)
  const fixed = new Set()
  const raw = {}

  while (true) {
    const fixedTotal = [...fixed].reduce((sum, type) => sum + floors[type], 0)
    const remaining = cap - fixedTotal
    const freeTypes = [...free]
    const squareSum = freeTypes.reduce((sum, type) => sum + Math.max(0, coefficients[type]) ** 2, 0)

    freeTypes.forEach((type) => {
      raw[type] = squareSum > 0
        ? remaining * (Math.max(0, coefficients[type]) ** 2) / squareSum
        : remaining / Math.max(1, freeTypes.length)
    })
    fixed.forEach((type) => { raw[type] = floors[type] })

    const violations = freeTypes.filter((type) => raw[type] < floors[type])
    if (!violations.length) break
    violations.forEach((type) => { free.delete(type); fixed.add(type) })
    if (!free.size) break
  }

  const counts = {}
  let used = 0
  TYPES.forEach((type) => {
    counts[type] = Math.max(floors[type], Math.floor(raw[type] || floors[type]))
    used += counts[type]
  })

  const fractions = TYPES
    .map((type) => ({ type, fraction: (raw[type] || 0) - Math.floor(raw[type] || 0) }))
    .sort((a, b) => b.fraction - a.fraction)

  let remaining = cap - used
  let i = 0
  while (remaining > 0) {
    counts[fractions[i % fractions.length].type] += 1
    i += 1
    remaining -= 1
  }
  while (remaining < 0) {
    const type = TYPES.filter((key) => counts[key] > floors[key]).sort((a, b) => counts[b] - counts[a])[0]
    if (!type) break
    counts[type] -= 1
    remaining += 1
  }
  return counts
}

export function optimizeFormation({ capacity, stats, targetType = 'infantry', minimums = {} }) {
  const coefficients = {}
  TYPES.forEach((type) => {
    const attack = Math.max(0, n(stats?.[type]?.attack))
    const lethality = Math.max(0, n(stats?.[type]?.lethality))
    const offensive = (1 + attack / 100) * (1 + lethality / 100)
    const counter = counters(type, targetType) ? 1.1 : 1
    coefficients[type] = offensive * counter
  })

  const counts = allocate(capacity, coefficients, minimums)
  const cap = TYPES.reduce((sum, type) => sum + counts[type], 0)
  return {
    capacity: cap,
    targetType,
    coefficients,
    counts,
    troops: TYPES.map((type) => ({
      type,
      ...TROOP_LABELS[type],
      count: counts[type],
      percent: counts[type] / cap * 100,
      coefficient: coefficients[type],
      counter: counters(type, targetType),
    })),
    model: 'general-sqrt-counter-v1',
  }
}

export function calculateHeroSynergy(effects = []) {
  const normalized = effects
    .map((effect, index) => ({
      id: effect.id || `effect-${index}`,
      group: String(effect.group || 'A').trim().toUpperCase() || 'A',
      percent: Math.max(0, n(effect.percent)),
    }))
    .filter((effect) => effect.percent > 0)

  const groups = {}
  normalized.forEach((effect) => {
    groups[effect.group] = (groups[effect.group] || 0) + effect.percent
  })

  const multiplier = Object.values(groups).reduce((product, percent) => product * (1 + percent / 100), 1)
  const flatPercent = normalized.reduce((sum, effect) => sum + effect.percent, 0)
  const flatMultiplier = 1 + flatPercent / 100

  return {
    groups,
    multiplier,
    flatMultiplier,
    improvementVsFlat: flatMultiplier > 0 ? (multiplier / flatMultiplier - 1) * 100 : 0,
  }
}

export function calculateMysticEligibility(trialId, sourceBonuses = {}) {
  const trial = MYSTIC_TRIALS[trialId] || MYSTIC_TRIALS.radiant
  const eligible = trial.sources.map((key) => ({
    key,
    label: SOURCE_LABELS[key],
    value: Math.max(0, n(sourceBonuses[key])),
  }))
  const ignored = Object.keys(SOURCE_LABELS)
    .filter((key) => !trial.sources.includes(key))
    .map((key) => ({ key, label: SOURCE_LABELS[key], value: Math.max(0, n(sourceBonuses[key])) }))

  return {
    trial,
    eligible,
    ignored,
    eligibleTotal: eligible.reduce((sum, item) => sum + item.value, 0),
    ignoredTotal: ignored.reduce((sum, item) => sum + item.value, 0),
  }
}

function cloneArmy(army) {
  const result = {}
  TYPES.forEach((type) => {
    result[type] = {
      count: Math.max(0, Math.floor(n(army?.[type]?.count))),
      attack: Math.max(0, n(army?.[type]?.attack)),
      lethality: Math.max(0, n(army?.[type]?.lethality)),
      defense: Math.max(0, n(army?.[type]?.defense)),
      health: Math.max(0, n(army?.[type]?.health)),
    }
  })
  return result
}

function totalTroops(army) {
  return TYPES.reduce((sum, type) => sum + Math.max(0, army[type]?.count || 0), 0)
}

function firstAliveTarget(army) {
  return TYPES.find((type) => (army[type]?.count || 0) > 0) || null
}

function calculateCasualties(attackerType, attackerLine, targetType, targetLine, round) {
  if (!attackerLine?.count || !targetLine?.count) return 0
  const atkBase = T10_BASE[attackerType]
  const defBase = T10_BASE[targetType]

  const attackPower = atkBase.attack * (1 + attackerLine.attack / 100)
    * atkBase.lethality * (1 + attackerLine.lethality / 100) / 100
  const defensePower = defBase.defense * (1 + targetLine.defense / 100)
    * defBase.hp * (1 + targetLine.health / 100) / 100
  // Damage scales with how many troops are actually swinging -- the standard
  // aimed-fire attrition assumption. This used to be
  // sqrt(count * min(bothArmyTotals)), which quietly discarded most of any
  // numerical advantage: it turned a 4x bigger army into only 2x the damage,
  // while the stat bonuses either side of it kept their full linear weight
  // (attack x lethality against defense x health, so a bonus gap counts
  // twice over). Percentages could therefore never lose to troop count. On a
  // real report -- 185,200 troops at ~178% against 150,000 at 222% -- the old
  // curve read a 23.5% troop lead as 11% and called an even fight a
  // -80,092 rout with zero winnable splits out of 231; the player won it.
  const armyFactor = attackerLine.count
  // +10% when you counter, which is the documented in-game figure (Archers'
  // Ranged Strike is +10% into Infantry, Cavalry's Charge +10% into Archers).
  // It was briefly raised to 2.7x here, fitted so the optimizer would stop
  // returning 0% Cavalry -- that was fitting our numbers to another
  // calculator's output against the actual game rule, and it made the one
  // real outcome we can check (a Knowledge Nexus fight the player won) score
  // as a 30% rout. The 0% Cavalry result is a genuine symptom and is left
  // visible rather than tuned away: see MODEL_GAPS for what is missing.
  const typeBonus = counters(attackerType, targetType) ? COUNTER_MULT : 1
  const fatigue = 1 + Math.max(0, round - 1) * 0.0001
  const raw = armyFactor * (attackPower / Math.max(0.000001, defensePower)) * typeBonus * fatigue / 100
  return clamp(Math.ceil(raw), 0, targetLine.count)
}

function attacksFor(snapshotA, snapshotB, round) {
  const losses = { infantry: 0, cavalry: 0, archers: 0 }
  TYPES.forEach((attackerType) => {
    const line = snapshotA[attackerType]
    if (!line?.count) return
    const targetType = firstAliveTarget(snapshotB)
    if (!targetType) return
    losses[targetType] += calculateCasualties(attackerType, line, targetType, snapshotB[targetType], round)
  })
  TYPES.forEach((type) => { losses[type] = Math.min(losses[type], snapshotB[type].count) })
  return losses
}

export function simulateT10Battle({ attacker, defender, maxRounds = 50 }) {
  const a = cloneArmy(attacker)
  const d = cloneArmy(defender)
  const startingA = totalTroops(a)
  const startingD = totalTroops(d)
  const armyMin = Math.max(1, Math.min(startingA, startingD))
  const rounds = []

  for (let round = 1; round <= Math.max(1, Math.floor(n(maxRounds, 50))); round += 1) {
    if (!totalTroops(a) || !totalTroops(d)) break
    const snapshotA = cloneArmy(a)
    const snapshotD = cloneArmy(d)
    const defenderLosses = attacksFor(snapshotA, snapshotD, round)
    const attackerLosses = attacksFor(snapshotD, snapshotA, round)

    TYPES.forEach((type) => {
      a[type].count = Math.max(0, a[type].count - attackerLosses[type])
      d[type].count = Math.max(0, d[type].count - defenderLosses[type])
    })

    rounds.push({
      round,
      attackerLosses,
      defenderLosses,
      attackerRemaining: totalTroops(a),
      defenderRemaining: totalTroops(d),
    })
  }

  const remainingA = totalTroops(a)
  const remainingD = totalTroops(d)
  // This sim is deterministic; the real fight is not. Declaring a winner off a
  // margin thinner than the model's own resolution is how a coin-flip reads as
  // a defeat -- a 0.7%-of-force gap is not a verdict, and calling it one sends
  // players away from fights they win. Inside the band, say it's close.
  // A side actually wiped out is always decisive, however thin the gap.
  const wipe = remainingA === 0 || remainingD === 0
  const parityBand = wipe ? 0 : Math.max(startingA, startingD) * 0.02
  let outcome = 'draw'
  if (remainingA - remainingD > parityBand) outcome = 'attacker'
  if (remainingD - remainingA > parityBand) outcome = 'defender'

  return {
    outcome,
    rounds,
    attacker: a,
    defender: d,
    startingA,
    startingD,
    remainingA,
    remainingD,
    attackerLosses: startingA - remainingA,
    defenderLosses: startingD - remainingD,
    armyMin,
    model: 'experimental-t10-expedition-v1',
  }
}

// A Mystic Trial fight is a fixed-size army (yours) against a fixed opponent
// army — the only thing you control is how you split your own troop total
// across Infantry/Cavalry/Archers. This grid-searches that split.
//
// frakinator's version runs Monte Carlo battles per candidate split because
// its underlying sim has randomness; simulateT10Battle here is deterministic
// (same inputs always produce the same outcome), so repeating a candidate
// doesn't change its result — there's no "number of battles" to vary. Sparsity
// and the fraction bounds still do real work: sparsity sets the grid step,
// and the bounds skip compositions outside a plausible range up front
// (mirrors frakinator's stated reason: those splits are rarely competitive,
// so skipping them saves search time).
export function optimizeMysticComposition({ yourArmy, opponentArmy, sparsity = 0.05, minInfantryFraction = 0, maxInfantryFraction = 1, minCavalryFraction = 0, maxCavalryFraction = 1, minArchersFraction = 0, maxArchersFraction = 1, maxRounds = 50 } = {}) {
  const yours = cloneArmy(yourArmy)
  const opponent = cloneArmy(opponentArmy)
  const totalYourTroops = totalTroops(yours)
  const step = clamp(n(sparsity, 0.05), 0.005, 0.5)
  const minInf = clamp(n(minInfantryFraction, 0), 0, 1)
  const maxInf = clamp(n(maxInfantryFraction, 1), minInf, 1)
  const minCav = clamp(n(minCavalryFraction, 0), 0, 1)
  const maxCav = clamp(n(maxCavalryFraction, 1), minCav, 1)
  // Archers take whatever Infantry and Cavalry leave, so bounding only those
  // two still lets Archers run to any share -- both sitting at the bottom of
  // their windows hands Archers the rest. Bounding the remainder too is what
  // actually keeps the search inside the intended window.
  const minArc = clamp(n(minArchersFraction, 0), 0, 1)
  const maxArc = clamp(n(maxArchersFraction, 1), minArc, 1)
  if (totalYourTroops <= 0) return { candidates: [], best: null, totalYourTroops: 0 }

  const candidates = []
  for (let inf = minInf; inf <= maxInf + 1e-9; inf += step) {
    const infClamped = Math.min(maxInf, inf)
    for (let cav = minCav; cav + infClamped <= 1 + 1e-9 && cav <= maxCav + 1e-9; cav += step) {
      const arc = Math.max(0, 1 - infClamped - cav)
      if (arc < minArc - 1e-9 || arc > maxArc + 1e-9) continue
      const composition = { infantry: infClamped, cavalry: cav, archers: arc }
      const army = {}
      TYPES.forEach((type) => {
        army[type] = { ...yours[type], count: Math.round(totalYourTroops * composition[type]) }
      })
      const result = simulateT10Battle({ attacker: army, defender: opponent, maxRounds })
      const margin = result.remainingA - result.remainingD
      candidates.push({ composition, result, margin })
    }
  }

  candidates.sort((a, b) => b.margin - a.margin)

  // A 50/25/25 split shows up constantly as the "obvious" default guess —
  // running it alongside the search gives a concrete before/after instead of
  // just the optimum in isolation.
  const classicalComposition = { infantry: .5, cavalry: .25, archers: .25 }
  const classicalArmy = {}
  TYPES.forEach((type) => { classicalArmy[type] = { ...yours[type], count: Math.round(totalYourTroops * classicalComposition[type]) } })
  const classicalResult = simulateT10Battle({ attacker: classicalArmy, defender: opponent, maxRounds })
  const classical = { composition: classicalComposition, result: classicalResult, margin: classicalResult.remainingA - classicalResult.remainingD }

  return { candidates, best: candidates[0] || null, classical, totalYourTroops }
}
