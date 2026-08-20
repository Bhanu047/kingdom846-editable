const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

const TYPES = Object.keys(TROOP_META)

// Published Bear-formation coefficients from the supplied theory:
// D ∝ (Ainf/3)√finf + Acav√fcav + (4/3)Aarc√farc × archer modifiers.
// Kept exported for compatibility with existing UI/debug code.
const FORMATION_WEIGHTS = {
  infantry: 1 / 3,
  cavalry: 1,
  archers: 4 / 3,
}

const MIN_FORMATION_PERCENT = 0

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Attack-factor bridge used by the current Battle Lab. This is isolated on
// purpose: if the exact theory-crafting definition of A changes, only this
// function needs to be replaced while the Lagrange optimizer remains valid.
function attackFactor(stat = {}) {
  const attack = Math.max(0, number(stat.attack))
  const lethality = Math.max(0, number(stat.lethality))
  return (1 + attack / 100) * (1 + lethality / 100)
}

function isAboveT6(tier) {
  const value = String(tier || '').toUpperCase().replace(/\s+/g, '')
  if (!value) return false
  if (value === 'T1-T6') return false
  if (value === 'T7-T9' || value === 'T10' || value === 'T11') return true
  const match = value.match(/^T(\d+)$/)
  return match ? Number(match[1]) > 6 : false
}

export function archerBearMultiplier(tier = 'T10', tg = 0) {
  // Bear is full Infantry, so Archers receive the base 10% counter bonus.
  // The supplied theory notes an additional ×1.1 for >T6 / TG3+ troops.
  const base = 1.1
  const advanced = isAboveT6(tier) || Math.max(0, number(tg)) >= 3
  return base * (advanced ? 1.1 : 1)
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
      archers: factors.archers * (4 / 3) * arcMult,
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

export function computeBearDamageScore({ stats, tier = 'T10', tg = 0, ratio } = {}) {
  const normalized = normalizeRatio(ratio)
  const { coefficients } = coefficientsFor(stats, tier, tg)
  return TYPES.reduce((sum, type) => sum + coefficients[type] * Math.sqrt(normalized[type]), 0)
}

// Closed-form Lagrange solution:
// fi = ci² / Σ(c²), where c = [Ainf/3, Acav, (4/3)Aarc×modifiers].
function continuousOptimalFormation(stats = {}, tier = 'T10', tg = 0) {
  const { coefficients } = coefficientsFor(stats, tier, tg)
  const squares = Object.fromEntries(TYPES.map((type) => [type, coefficients[type] ** 2]))
  const denominator = TYPES.reduce((sum, type) => sum + squares[type], 0)
  if (!(denominator > 0)) return { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  return Object.fromEntries(TYPES.map((type) => [type, squares[type] / denominator]))
}

// Convert the continuous optimum to the same readable whole-percent style
// used by the reference tool while preserving an exact total of 100%.
function wholePercentApportionment(ratio) {
  const raw = TYPES.map((type) => ({ type, value: Math.max(0, number(ratio[type])) * 100 }))
  const whole = Object.fromEntries(raw.map(({ type, value }) => [type, Math.floor(value)]))
  let remaining = 100 - TYPES.reduce((sum, type) => sum + whole[type], 0)
  raw.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)))
  for (let i = 0; i < raw.length && remaining > 0; i += 1, remaining -= 1) whole[raw[i].type] += 1
  return whole
}

export function optimizeBearFormation(input = {}) {
  const capacity = Math.max(1, Math.floor(number(input.capacity, 1)))
  const tier = input.tier || 'T10'
  const tg = Math.max(0, Math.min(8, Math.floor(number(input.tg))))
  const { factors, coefficients, arcMult } = coefficientsFor(input.stats, tier, tg)
  const continuousRatio = continuousOptimalFormation(input.stats, tier, tg)
  const whole = wholePercentApportionment(continuousRatio)
  const ratio = {
    infantry: whole.infantry / 100,
    cavalry: whole.cavalry / 100,
    archers: whole.archers / 100,
  }

  const counts = {}
  let used = 0
  TYPES.slice(0, 2).forEach((type) => {
    counts[type] = Math.round(capacity * ratio[type])
    used += counts[type]
  })
  counts.archers = Math.max(0, capacity - used)

  const optimizedScore = computeBearDamageScore({ stats: input.stats, tier, tg, ratio })
  const balancedRatio = { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  const balancedScore = computeBearDamageScore({ stats: input.stats, tier, tg, ratio: balancedRatio })
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
    continuousRatio,
    whole,
    troops,
    counts,
    optimizedScore,
    balancedScore,
    gainVsBalanced,
    model: 'hunt-formation-lagrange-v2',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear ${result.capacity.toLocaleString()} — INF ${byType.infantry.percent.toFixed(0)}% (${byType.infantry.count.toLocaleString()}) · CAV ${byType.cavalry.percent.toFixed(0)}% (${byType.cavalry.count.toLocaleString()}) · ARC ${byType.archers.percent.toFixed(0)}% (${byType.archers.count.toLocaleString()})`
}

export { TROOP_META, FORMATION_WEIGHTS, MIN_FORMATION_PERCENT }
