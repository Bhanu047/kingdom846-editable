const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF', weight: 1 / 3 },
  cavalry: { label: 'Cavalry', short: 'CAV', weight: 1 },
  archers: { label: 'Archers', short: 'ARC', weight: 4 / 3 },
}

const TYPES = Object.keys(TROOP_META)

function clampNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function scoreFormation(counts, coefficients) {
  return TYPES.reduce((sum, type) => {
    return sum + coefficients[type] * Math.sqrt(Math.max(0, counts[type] || 0))
  }, 0)
}

function roundToCapacity(raw, capacity, minimums, freeTypes) {
  const result = {}
  let used = 0

  TYPES.forEach((type) => {
    const floored = Math.max(minimums[type], Math.floor(raw[type] || 0))
    result[type] = floored
    used += floored
  })

  const candidates = (freeTypes.length ? freeTypes : TYPES)
    .map((type) => ({ type, fraction: (raw[type] || 0) - Math.floor(raw[type] || 0) }))
    .sort((a, b) => b.fraction - a.fraction)

  let remaining = capacity - used
  let index = 0
  while (remaining > 0) {
    const target = candidates[index % candidates.length]?.type || 'archers'
    result[target] += 1
    remaining -= 1
    index += 1
  }

  while (remaining < 0) {
    const target = TYPES
      .filter((type) => result[type] > minimums[type])
      .sort((a, b) => result[b] - result[a])[0]
    if (!target) break
    result[target] -= 1
    remaining += 1
  }

  return result
}

function optimizeWithMinimums(capacity, coefficients, minimums) {
  const active = new Set()
  const free = new Set(TYPES)
  const raw = {}

  while (true) {
    let fixedTotal = 0
    active.forEach((type) => { fixedTotal += minimums[type] })

    const remainingCapacity = capacity - fixedTotal
    const freeTypes = [...free]
    if (freeTypes.length === 0) {
      TYPES.forEach((type) => { raw[type] = minimums[type] })
      break
    }

    const weightSum = freeTypes.reduce((sum, type) => sum + coefficients[type] ** 2, 0)
    freeTypes.forEach((type) => {
      raw[type] = weightSum > 0
        ? remainingCapacity * (coefficients[type] ** 2) / weightSum
        : remainingCapacity / freeTypes.length
    })
    active.forEach((type) => { raw[type] = minimums[type] })

    const violators = freeTypes.filter((type) => raw[type] < minimums[type])
    if (violators.length === 0) break

    violators.forEach((type) => {
      free.delete(type)
      active.add(type)
    })
  }

  return roundToCapacity(raw, capacity, minimums, [...free])
}

function evenFormation(capacity, minimums) {
  const counts = { ...minimums }
  let remaining = capacity - TYPES.reduce((sum, type) => sum + minimums[type], 0)
  let index = 0
  while (remaining > 0) {
    counts[TYPES[index % TYPES.length]] += 1
    index += 1
    remaining -= 1
  }
  return counts
}

export function optimizeBearFormation(input) {
  const capacity = Math.max(1, Math.floor(clampNumber(input?.capacity, 1)))
  const stats = input?.stats || {}
  const minimumInput = input?.minimums || {}

  const minimums = {
    infantry: Math.max(0, Math.floor(clampNumber(minimumInput.infantry, 0))),
    cavalry: Math.max(0, Math.floor(clampNumber(minimumInput.cavalry, 0))),
    archers: Math.max(0, Math.floor(clampNumber(minimumInput.archers, 0))),
  }

  const minimumTotal = TYPES.reduce((sum, type) => sum + minimums[type], 0)
  if (minimumTotal > capacity) {
    throw new Error('Minimum troop counts cannot exceed march capacity.')
  }

  const factors = {}
  const coefficients = {}

  TYPES.forEach((type) => {
    const attack = Math.max(0, clampNumber(stats[type]?.attack, 0))
    const lethality = Math.max(0, clampNumber(stats[type]?.lethality, 0))
    const factor = (1 + attack / 100) * (1 + lethality / 100)
    factors[type] = factor
    coefficients[type] = factor * TROOP_META[type].weight
  })

  const counts = optimizeWithMinimums(capacity, coefficients, minimums)
  const balanced = evenFormation(capacity, minimums)
  const optimizedScore = scoreFormation(counts, coefficients)
  const balancedScore = scoreFormation(balanced, coefficients)
  const gainVsBalanced = balancedScore > 0
    ? ((optimizedScore / balancedScore) - 1) * 100
    : 0

  const troops = TYPES.map((type) => ({
    type,
    ...TROOP_META[type],
    count: counts[type],
    percent: counts[type] / capacity * 100,
    attack: Math.max(0, clampNumber(stats[type]?.attack, 0)),
    lethality: Math.max(0, clampNumber(stats[type]?.lethality, 0)),
    factor: factors[type],
    coefficient: coefficients[type],
  }))

  return {
    capacity,
    troops,
    counts,
    balanced,
    optimizedScore,
    balancedScore,
    gainVsBalanced,
    model: 'community-bear-sqrt-v1',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear ${result.capacity.toLocaleString()} — INF ${byType.infantry.percent.toFixed(1)}% (${byType.infantry.count.toLocaleString()}) · CAV ${byType.cavalry.percent.toFixed(1)}% (${byType.cavalry.count.toLocaleString()}) · ARC ${byType.archers.percent.toFixed(1)}% (${byType.archers.count.toLocaleString()})`
}

export { TROOP_META }
