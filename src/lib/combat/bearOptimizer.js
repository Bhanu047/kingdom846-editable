const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

const TYPES = Object.keys(TROOP_META)

// ---------------------------------------------------------------------------
// THE BEAR MODEL, MEASURED RATHER THAN ASSUMED.
//
// Everything below was calibrated by driving the reference Bear calculator
// (Frakinator) directly over its own websocket, setting each widget to a
// controlled value and reading the answer back. research/bear-reference.md
// lists every probe and its output. What that measurement changed:
//
//   1. The Archer weight is 4.4/3, and it does NOT move with troop tier.
//      This file used to apply an extra x1.1 above T6, so a T10 account got
//      3/27/70 where the reference says 3/31/66 for the same stats. Four tier
//      settings, three stat sets, same answer every time.
//   2. Lead heroes do not enter the composition at all. Alcar was carrying a
//      x2.80 Infantry coefficient here -- enough to swing a recommendation by
//      fifty points -- and the reference returns an identical split, and an
//      identical damage distribution, with Alcar selected and without it.
//      The dropdowns stay (the report records who led) but they are inert.
//
// Three independent stat sets now reproduce the reference exactly, including
// its whole-percent rounding: 2/38/60, 60/7/33 and 3/31/66.
// ---------------------------------------------------------------------------

// Composition weights: D ∝ (Ainf/3)√finf + Acav√fcav + (4.4/3)Aarc√farc.
// The 4.4 is the published 4/3 Archer weight carrying the +10% Archers hold
// over the Bear, which is Infantry.
const RATIO_WEIGHTS = {
  infantry: 1 / 3,
  cavalry: 1,
  archers: 4.4 / 3,
}

// Damage weights carry one further x1.1 on Archers -- the Volley proc, worth
// 0.9x1 + 0.1x2 in expectation. Measured, not assumed: at equal stats the
// reference's damage distribution puts Archers 1.60x above Cavalry (three
// repeats) where the composition weights alone predict 1.47x. The composition
// tool leaves the proc out, so the two coefficients genuinely differ; matching
// the reference means keeping both rather than picking one and being wrong
// about either the split or the damage.
const DAMAGE_WEIGHTS = {
  ...RATIO_WEIGHTS,
  archers: 4.4 * 1.1 / 3,
}

// Damage points per √troop per unit of stat factor, from single-type rallies
// at 100k/200k/800k troops (each within 2% of this constant).
export const BEAR_DAMAGE_COEFFICIENT = 565

// Lethality passes through in full -- doubling (1 + LET) doubles the damage,
// exactly. Attack does not: across bonuses of 100/200/400/800/1600% the
// reference's damage rises by 0.789 per 100% rather than 1.0, i.e. about a
// fifth of Bear damage is not attack-scaled at all. This only applies to the
// damage figure; the composition tool weights the two stats equally, and
// using the diluted factor there moves its answer off the reference.
const ATTACK_RESPONSE = 0.789

// Fielding a type at all is worth ~6% on top of what its own troops add:
// measured 1.06x for two types present and 1.12x for three, against the sum of
// the same troops sent alone (six scenarios). It is a property of the
// reference's round-by-round simulation that the closed-form equation does not
// carry, so it is applied as the measured factor rather than derived.
const TYPE_SYNERGY = 0.06
const PRESENT_SHARE = 0.005

const MIN_FORMATION_PERCENT = 0

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// The "widget" field is the rally-wide ATK/LET % from a hero's Exclusive Gear
// widget skill, entered manually because it's absent from a solo beast-attack
// battle report (a terror-rally report already includes it, so it should stay
// 0 there). Each widget boosts exactly one stat, not both — widgetStat picks
// which one this particular hero's widget affects.
function statPair(stat = {}) {
  const widget = Math.max(0, number(stat.widget))
  const widgetStat = stat.widgetStat === 'lethality' ? 'lethality' : 'attack'
  return {
    attack: Math.max(0, number(stat.attack)) + (widgetStat === 'attack' ? widget : 0),
    lethality: Math.max(0, number(stat.lethality)) + (widgetStat === 'lethality' ? widget : 0),
  }
}

function attackFactor(stat = {}) {
  const { attack, lethality } = statPair(stat)
  return (1 + attack / 100) * (1 + lethality / 100)
}

function damageFactor(stat = {}) {
  const { attack, lethality } = statPair(stat)
  return (1 + ATTACK_RESPONSE * attack / 100) * (1 + lethality / 100)
}

function normalizedTierGroup(tier = 'TG5-TG7', tg = 0) {
  const value = String(tier || '').toUpperCase().replace(/\s+/g, '')
  if (value === 'T1-T6') return 'T1-T6'
  if (value === 'T7-TG2' || value === 'T7-T9' || value === 'T10' || value === 'T11') return 'T7-TG2'
  if (value === 'TG3-TG4') return 'TG3-TG4'
  if (value === 'TG5-TG7') return 'TG5-TG7'

  const tgMatch = value.match(/^TG(\d+)(?:-TG(\d+))?$/)
  const tgLevel = tgMatch ? Number(tgMatch[1]) : Math.max(0, number(tg))
  if (tgLevel >= 5) return 'TG5-TG7'
  if (tgLevel >= 3) return 'TG3-TG4'
  if (tgLevel > 0) return 'T7-TG2'

  const tMatch = value.match(/^T(\d+)$/)
  if (tMatch && Number(tMatch[1]) <= 6) return 'T1-T6'
  return 'T7-TG2'
}

function coefficientsFor(stats = {}) {
  const factors = Object.fromEntries(TYPES.map((type) => [type, attackFactor(stats?.[type])]))
  return {
    factors,
    coefficients: Object.fromEntries(TYPES.map((type) => [type, factors[type] * RATIO_WEIGHTS[type]])),
  }
}

function damageCoefficientsFor(stats = {}) {
  const factors = Object.fromEntries(TYPES.map((type) => [type, damageFactor(stats?.[type])]))
  return {
    factors,
    coefficients: Object.fromEntries(TYPES.map((type) => [type, factors[type] * DAMAGE_WEIGHTS[type]])),
  }
}

function typeSynergy(ratio = {}) {
  const present = TYPES.filter((type) => number(ratio[type]) >= PRESENT_SHARE).length
  return 1 + TYPE_SYNERGY * Math.max(0, present - 1)
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

/**
 * Damage per √troop for a given split -- the shape of the damage curve, with
 * the army size factored out. Multiply by √(total troops) and
 * BEAR_DAMAGE_COEFFICIENT for damage in Bear points; see computeBearDamage.
 */
export function computeBearDamageScore({ stats, ratio } = {}) {
  const normalized = normalizeRatio(ratio)
  const { coefficients } = damageCoefficientsFor(stats)
  const base = TYPES.reduce((sum, type) => sum + coefficients[type] * Math.sqrt(normalized[type]), 0)
  return base * typeSynergy(normalized)
}

/** Total Bear damage in points, the same figure the reference calculator plots. */
export function computeBearDamage({ stats, ratio, totalTroops = 0 } = {}) {
  const troops = Math.max(0, number(totalTroops))
  if (troops <= 0) return 0
  return BEAR_DAMAGE_COEFFICIENT * Math.sqrt(troops) * computeBearDamageScore({ stats, ratio })
}

function continuousOptimalFormation(stats = {}) {
  const { coefficients } = coefficientsFor(stats)
  const squares = Object.fromEntries(TYPES.map((type) => [type, coefficients[type] ** 2]))
  const denominator = TYPES.reduce((sum, type) => sum + squares[type], 0)
  if (!(denominator > 0)) return { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  return Object.fromEntries(TYPES.map((type) => [type, squares[type] / denominator]))
}

// Frakinator publishes the analytical Lagrange solution as fractions and then
// presents a whole-percent 100-point composition. Keep the analytical optimum
// intact and only quantize for display: conservative Infantry floor, nearest
// Cavalry, Archer remainder. This is a projection of the continuous solution,
// not a lookup table or a per-report override.
function projectContinuousRatio(ratio = {}) {
  const rawInf = Math.max(0, number(ratio.infantry)) * 100
  const rawCav = Math.max(0, number(ratio.cavalry)) * 100
  let infantry = Math.max(MIN_FORMATION_PERCENT, Math.min(100, Math.floor(rawInf + 1e-9)))
  let cavalry = Math.max(MIN_FORMATION_PERCENT, Math.min(100 - infantry, Math.round(rawCav)))
  let archers = 100 - infantry - cavalry
  if (archers < MIN_FORMATION_PERCENT) {
    cavalry = Math.max(MIN_FORMATION_PERCENT, cavalry + archers)
    archers = 100 - infantry - cavalry
  }
  return { infantry, cavalry, archers }
}

export function optimizeBearFormation(input = {}) {
  const capacity = Math.max(1, Math.floor(number(input.capacity, 1)))
  const tier = input.tier || 'TG5-TG7'
  const tg = Math.max(0, Math.min(10, Math.floor(number(input.tg))))
  const leadHeroes = input.leadHeroes || {}
  // With every stat blank the coefficients collapse to the structural weights
  // alone, and the model returns a confident-looking split derived from no
  // player data at all. BearSuite guards this at the form (`validStats`), but
  // the library was happy to answer `undefined`, so any other caller got a
  // fabricated recommendation. The split is still returned -- callers that only
  // want the shape keep working -- but it is now labelled.
  const hasStats = TYPES.some((type) => number(input.stats?.[type]?.attack) > 0 || number(input.stats?.[type]?.lethality) > 0)
  const { factors, coefficients } = coefficientsFor(input.stats)
  const continuousRatio = continuousOptimalFormation(input.stats)
  const whole = projectContinuousRatio(continuousRatio)
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

  const optimizedScore = computeBearDamageScore({ stats: input.stats, ratio: continuousRatio })
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
    tier: normalizedTierGroup(tier, tg),
    tg,
    leadHeroes,
    ratio,
    continuousRatio,
    whole,
    troops,
    counts,
    optimizedScore,
    balancedScore,
    gainVsBalanced,
    // False when no attack/lethality figure was supplied: the split below is
    // structural, not a recommendation derived from this player's stats.
    hasStats,
    model: 'hunt-formation-lagrange-v8-reference-calibrated',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear Formation — INF ${byType.infantry.percent.toFixed(0)}% · CAV ${byType.cavalry.percent.toFixed(0)}% · ARC ${byType.archers.percent.toFixed(0)}%`
}
