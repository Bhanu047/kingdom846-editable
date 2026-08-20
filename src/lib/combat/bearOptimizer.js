const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

const TYPES = Object.keys(TROOP_META)

// Black-box calibrated formation weights derived from the verified Frakinator
// Bear Ratio examples supplied by the site owner. The optimizer intentionally
// searches whole-percent compositions because Frakinator reports results such
// as 3/23/74 rather than exposing a continuous decimal optimum.
const FORMATION_WEIGHTS = {
  infantry: 0.275,
  cavalry: 1,
  archers: (4.4 / 3) * 1.1,
}

const MIN_FORMATION_PERCENT = 1

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function attackFactor(stat = {}) {
  const attack = Math.max(0, number(stat.attack))
  const lethality = Math.max(0, number(stat.lethality))
  return (1 + attack / 100) * (1 + lethality / 100)
}

// Kept as a public helper for the existing UI. The current Hunt Formation
// calibration uses the observed Bear-ratio behaviour and therefore keeps the
// formation-side archer multiplier fixed at 1.10.
export function archerBearMultiplier() {
  return 1.1
}

function coefficientsFor(stats = {}) {
  const factors = {
    infantry: attackFactor(stats.infantry),
    cavalry: attackFactor(stats.cavalry),
    archers: attackFactor(stats.archers),
  }
  const arcMult = 1.1
  return {
    factors,
    arcMult,
    coefficients: {
      infantry: factors.infantry * FORMATION_WEIGHTS.infantry,
      cavalry: factors.cavalry * FORMATION_WEIGHTS.cavalry,
      archers: factors.archers * FORMATION_WEIGHTS.archers,
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

export function computeBearDamageScore({ stats, ratio } = {}) {
  const normalized = normalizeRatio(ratio)
  const { coefficients } = coefficientsFor(stats)
  return TYPES.reduce((sum, type) => sum + coefficients[type] * Math.sqrt(normalized[type]), 0)
}

function bestWholePercentFormation(stats = {}) {
  let best = null

  for (let infantry = MIN_FORMATION_PERCENT; infantry <= 100 - MIN_FORMATION_PERCENT * 2; infantry += 1) {
    for (let cavalry = MIN_FORMATION_PERCENT; cavalry <= 100 - infantry - MIN_FORMATION_PERCENT; cavalry += 1) {
      const archers = 100 - infantry - cavalry
      if (archers < MIN_FORMATION_PERCENT) continue

      const ratio = {
        infantry: infantry / 100,
        cavalry: cavalry / 100,
        archers: archers / 100,
      }
      const score = computeBearDamageScore({ stats, ratio })

      if (!best || score > best.score) {
        best = { score, ratio, whole: { infantry, cavalry, archers } }
      }
    }
  }

  return best
}

export function optimizeBearFormation(input = {}) {
  const capacity = Math.max(1, Math.floor(number(input.capacity, 1)))
  const tier = input.tier || 'T10'
  const tg = Math.max(0, Math.min(8, Math.floor(number(input.tg))))
  const { factors, coefficients, arcMult } = coefficientsFor(input.stats)
  const best = bestWholePercentFormation(input.stats)
  const ratio = best?.ratio || { infantry: 0.33, cavalry: 0.33, archers: 0.34 }

  const counts = {}
  let used = 0
  TYPES.slice(0, 2).forEach((type) => {
    counts[type] = Math.round(capacity * ratio[type])
    used += counts[type]
  })
  counts.archers = Math.max(0, capacity - used)

  const optimizedScore = best?.score || computeBearDamageScore({ stats: input.stats, ratio })
  const balancedRatio = { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  const balancedScore = computeBearDamageScore({ stats: input.stats, ratio: balancedRatio })
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
    whole: best?.whole,
    troops,
    counts,
    optimizedScore,
    balancedScore,
    gainVsBalanced,
    model: 'hunt-formation-frakinator-calibrated-v1',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear ${result.capacity.toLocaleString()} — INF ${byType.infantry.percent.toFixed(0)}% (${byType.infantry.count.toLocaleString()}) · CAV ${byType.cavalry.percent.toFixed(0)}% (${byType.cavalry.count.toLocaleString()}) · ARC ${byType.archers.percent.toFixed(0)}% (${byType.archers.count.toLocaleString()})`
}

export { TROOP_META, FORMATION_WEIGHTS, MIN_FORMATION_PERCENT }
