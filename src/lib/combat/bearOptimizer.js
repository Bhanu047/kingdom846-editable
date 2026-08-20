const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

const TYPES = Object.keys(TROOP_META)

// Published Bear-formation coefficients from the supplied theory:
// D ∝ (Ainf/3)√finf + Acav√fcav + (4/3)Aarc√farc × archer modifiers.
const FORMATION_WEIGHTS = {
  infantry: 1 / 3,
  cavalry: 1,
  archers: 4 / 3,
}

// Lead-hero effects that change the relative value of one troop type vs the others.
// All-squad-only buffs are intentionally omitted here because multiplying every
// coefficient by the same amount does not change the optimal formation ratio.
// Proc effects are represented by their long-run expected value for Bear hunts.
const LEAD_HERO_RELATIVE_MULTIPLIERS = {
  Alcar: { infantry: 2.0, cavalry: 1.10, archers: 1.10 },
  Margot: { cavalry: 1.50 },
  Rosa: { archers: 1.30 },
  Thrud: { infantry: 1.15, cavalry: 1.20, archers: 1.15 },
  Vivian: { archers: 1.15 },
  Yang: { archers: 1.40 },
}

const MIN_FORMATION_PERCENT = 0

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

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
  const base = 1.1
  const advanced = isAboveT6(tier) || Math.max(0, number(tg)) >= 3
  return base * (advanced ? 1.1 : 1)
}

function leadHeroMultipliers(leadHeroes = {}) {
  const combined = { infantry: 1, cavalry: 1, archers: 1 }
  TYPES.forEach((slotType) => {
    const hero = leadHeroes?.[slotType]
    const effect = LEAD_HERO_RELATIVE_MULTIPLIERS[hero]
    if (!effect) return
    TYPES.forEach((type) => {
      combined[type] *= Math.max(0.01, number(effect[type], 1))
    })
  })
  return combined
}

function coefficientsFor(stats = {}, tier = 'T10', tg = 0, leadHeroes = {}) {
  const factors = {
    infantry: attackFactor(stats.infantry),
    cavalry: attackFactor(stats.cavalry),
    archers: attackFactor(stats.archers),
  }
  const arcMult = archerBearMultiplier(tier, tg)
  const heroMult = leadHeroMultipliers(leadHeroes)
  return {
    factors,
    arcMult,
    heroMult,
    coefficients: {
      infantry: (factors.infantry / 3) * heroMult.infantry,
      cavalry: factors.cavalry * heroMult.cavalry,
      archers: factors.archers * (4 / 3) * arcMult * heroMult.archers,
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

export function computeBearDamageScore({ stats, tier = 'T10', tg = 0, ratio, leadHeroes = {} } = {}) {
  const normalized = normalizeRatio(ratio)
  const { coefficients } = coefficientsFor(stats, tier, tg, leadHeroes)
  return TYPES.reduce((sum, type) => sum + coefficients[type] * Math.sqrt(normalized[type]), 0)
}

function continuousOptimalFormation(stats = {}, tier = 'T10', tg = 0, leadHeroes = {}) {
  const { coefficients } = coefficientsFor(stats, tier, tg, leadHeroes)
  const squares = Object.fromEntries(TYPES.map((type) => [type, coefficients[type] ** 2]))
  const denominator = TYPES.reduce((sum, type) => sum + squares[type], 0)
  if (!(denominator > 0)) return { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  return Object.fromEntries(TYPES.map((type) => [type, squares[type] / denominator]))
}

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
  const leadHeroes = input.leadHeroes || {}
  const { factors, coefficients, arcMult, heroMult } = coefficientsFor(input.stats, tier, tg, leadHeroes)
  const continuousRatio = continuousOptimalFormation(input.stats, tier, tg, leadHeroes)
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

  const optimizedScore = computeBearDamageScore({ stats: input.stats, tier, tg, ratio, leadHeroes })
  const balancedRatio = { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  const balancedScore = computeBearDamageScore({ stats: input.stats, tier, tg, ratio: balancedRatio, leadHeroes })
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
    heroMultiplier: heroMult[type],
  }))

  return {
    capacity,
    tier,
    tg,
    leadHeroes,
    heroMult,
    arcMult,
    ratio,
    continuousRatio,
    whole,
    troops,
    counts,
    optimizedScore,
    balancedScore,
    gainVsBalanced,
    model: 'hunt-formation-lagrange-v3-heroes',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear Formation — INF ${byType.infantry.percent.toFixed(0)}% · CAV ${byType.cavalry.percent.toFixed(0)}% · ARC ${byType.archers.percent.toFixed(0)}%`
}

export { TROOP_META, FORMATION_WEIGHTS, MIN_FORMATION_PERCENT, LEAD_HERO_RELATIVE_MULTIPLIERS }
