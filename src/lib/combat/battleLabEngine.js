const TYPES = ['infantry', 'cavalry', 'archers']

export const TROOP_LABELS = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

// Expedition-style T10 base values used only by the experimental battle simulator.
// Battle Lab keeps them isolated so additional tiers can be added without changing UI code.
export const T10_BASE = {
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

function calculateCasualties(attackerType, attackerLine, targetType, targetLine, armyMin, round) {
  if (!attackerLine?.count || !targetLine?.count) return 0
  const atkBase = T10_BASE[attackerType]
  const defBase = T10_BASE[targetType]

  const attackPower = atkBase.attack * (1 + attackerLine.attack / 100)
    * atkBase.lethality * (1 + attackerLine.lethality / 100) / 100
  const defensePower = defBase.defense * (1 + targetLine.defense / 100)
    * defBase.hp * (1 + targetLine.health / 100) / 100
  const armyFactor = Math.sqrt(attackerLine.count * Math.max(1, armyMin))
  const typeBonus = counters(attackerType, targetType) ? 1.1 : 1
  const fatigue = 1 + Math.max(0, round - 1) * 0.0001
  const raw = armyFactor * (attackPower / Math.max(0.000001, defensePower)) * typeBonus * fatigue / 100
  return clamp(Math.ceil(raw), 0, targetLine.count)
}

function attacksFor(snapshotA, snapshotB, armyMin, round) {
  const losses = { infantry: 0, cavalry: 0, archers: 0 }
  TYPES.forEach((attackerType) => {
    const line = snapshotA[attackerType]
    if (!line?.count) return
    const targetType = firstAliveTarget(snapshotB)
    if (!targetType) return
    losses[targetType] += calculateCasualties(attackerType, line, targetType, snapshotB[targetType], armyMin, round)
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
    const defenderLosses = attacksFor(snapshotA, snapshotD, armyMin, round)
    const attackerLosses = attacksFor(snapshotD, snapshotA, armyMin, round)

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
  let outcome = 'draw'
  if (remainingA > remainingD) outcome = 'attacker'
  if (remainingD > remainingA) outcome = 'defender'

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

export function armyFromProfile(profile, counts) {
  const army = {}
  TYPES.forEach((type) => {
    army[type] = {
      count: Math.max(0, Math.floor(n(counts?.[type]))),
      attack: Math.max(0, n(profile?.stats?.[type]?.attack)),
      lethality: Math.max(0, n(profile?.stats?.[type]?.lethality)),
      defense: Math.max(0, n(profile?.stats?.[type]?.defense)),
      health: Math.max(0, n(profile?.stats?.[type]?.health)),
    }
  })
  return army
}
