const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

const TYPES = Object.keys(TROOP_META)

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function attackFactor(stat = {}) {
  const attack = Math.max(0, number(stat.attack))
  const lethality = Math.max(0, number(stat.lethality))
  return (1 + attack / 100) * (1 + lethality / 100)
}

export function archerBearMultiplier(tier = 'T10', tg = 0) {
  const highTier = tier === 'T7-T9' || tier === 'T10' || tier === 'T11'
  return highTier && number(tg) >= 3 ? 1.21 : 1.1
}

function coefficientsFor(stats = {}, tier = 'T10', tg = 0) {
  const factors = {
    infantry: attackFactor(stats.infantry),
    cavalry: attackFactor(stats.cavalry),
    archers: attackFactor(stats.archers),
  }
  const arcMult = archerBearMultiplier(tier, tg)
  return {
    factors,
    arcMult,
    coefficients: {
      infantry: factors.infantry / 3,
      cavalry: factors.cavalry,
      archers: (4.4 / 3) * factors.archers * arcMult,
    },
  }
}

function normalizeRatio(ratio = {}) {
  const values = {
    infantry: Math.max(0, number(ratio.infantry)),
    cavalry: Math.max(0, number(ratio.cavalry)),
    archers: Math.max(0, number(ratio.archers)),
  }
  const sum = TYPES.reduce((total, type) => total + values[type], 0)
  if (sum <= 0) return { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  return Object.fromEntries(TYPES.map((type) => [type, values[type] / sum]))
}

export function computeBearDamageScore({ stats, ratio, tier = 'T10', tg = 0 } = {}) {
  const normalized = normalizeRatio(ratio)
  const { coefficients } = coefficientsFor(stats, tier, tg)
  return TYPES.reduce((sum, type) => sum + coefficients[type] * Math.sqrt(normalized[type]), 0)
}

export function optimizeBearFormation(input = {}) {
  const capacity = Math.max(1, Math.floor(number(input.capacity, 1)))
  const tier = input.tier || 'T10'
  const tg = Math.max(0, Math.min(8, Math.floor(number(input.tg))))
  const { factors, coefficients, arcMult } = coefficientsFor(input.stats, tier, tg)
  const sumSq = TYPES.reduce((sum, type) => sum + coefficients[type] ** 2, 0)
  const ratio = sumSq > 0
    ? Object.fromEntries(TYPES.map((type) => [type, coefficients[type] ** 2 / sumSq]))
    : { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }

  const counts = {}
  let used = 0
  TYPES.slice(0, 2).forEach((type) => {
    counts[type] = Math.round(capacity * ratio[type])
    used += counts[type]
  })
  counts.archers = Math.max(0, capacity - used)

  const optimizedScore = computeBearDamageScore({ stats: input.stats, ratio, tier, tg })
  const balancedRatio = { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  const balancedScore = computeBearDamageScore({ stats: input.stats, ratio: balancedRatio, tier, tg })
  const gainVsBalanced = balancedScore > 0 ? ((optimizedScore / balancedScore) - 1) * 100 : 0

  const troops = TYPES.map((type) => ({
    type,
    ...TROOP_META[type],
    count: counts[type],
    percent: ratio[type] * 100,
    attack: Math.max(0, number(input.stats?.[type]?.attack)),
    lethality: Math.max(0, number(input.stats?.[type]?.lethality)),
    factor: factors[type],
    coefficient: coefficients[type],
  }))

  return {
    capacity,
    tier,
    tg,
    arcMult,
    ratio,
    troops,
    counts,
    optimizedScore,
    balancedScore,
    gainVsBalanced,
    model: 'bear-ratio-damage-v2',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear ${result.capacity.toLocaleString()} — INF ${byType.infantry.percent.toFixed(1)}% (${byType.infantry.count.toLocaleString()}) · CAV ${byType.cavalry.percent.toFixed(1)}% (${byType.cavalry.count.toLocaleString()}) · ARC ${byType.archers.percent.toFixed(1)}% (${byType.archers.count.toLocaleString()})`
}

export { TROOP_META }
