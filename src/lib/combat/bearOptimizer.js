const TROOP_META = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

const TYPES = Object.keys(TROOP_META)

// Published Bear-formation equation supplied with the reference calculator:
// D ∝ (Ainf/3)√finf + Acav√fcav + (4/3)Aarc√farc × Archer modifiers.
const FORMATION_WEIGHTS = {
  infantry: 1 / 3,
  cavalry: 1,
  archers: 4 / 3,
}

const NEUTRAL_MULTIPLIERS = Object.freeze({ infantry: 1, cavalry: 1, archers: 1 })
const neutral = (reason) => ({ multipliers: NEUTRAL_MULTIPLIERS, ratioNeutral: true, reason })
const relative = (multipliers, reason) => ({ multipliers, ratioNeutral: false, reason })

// Hunt Formation only exposes troop-specialist heroes whose expedition kit changes
// relative INF/CAV/ARC Bear damage. Equal all-squad buffs cancel out of the ratio.
// The factors below represent expected relative damage over repeated Bear attacks,
// not raw hero stat percentages.
const LEAD_HERO_BEAR_EFFECTS = {
  None: neutral('Generic/Other lead hero: no troop-relative Bear modifier.'),
  Other: neutral('Generic/Other lead hero: no troop-relative Bear modifier.'),

  Alcar: relative(
    { infantry: 2.80, cavalry: 1.10, archers: 1.10 },
    'Praetorian Will plus the repeated Infantry damage contribution of Carpe Diem; Cavalry/Archers keep the 10% Praetorian Will bonus.',
  ),

  Margot: relative(
    { infantry: 1, cavalry: 1.50, archers: 1 },
    'Sleight Hand: 25% chance of an extra 200% Cavalry attack gives +50% expected Cavalry damage.',
  ),

  Thrud: relative(
    { infantry: 1.15, cavalry: 1.00, archers: 1.15 },
    'Battle Hunger directly raises Infantry and Archer damage by 15%; the Cavalry proc is not treated as a permanent coefficient in the formation equation.',
  ),

  Rosa: relative(
    { infantry: 1, cavalry: 1, archers: 1.30 },
    'Golden Rhythm increases Archer total Attack by 30%; all-squad effects are ratio-neutral.',
  ),

  Vivian: relative(
    { infantry: 1, cavalry: 1, archers: 1.15 },
    'Trap of Greed contributes 60% extra Archer damage every fourth attack, averaging +15%; all-squad effects cancel from the ratio.',
  ),

  Yang: relative(
    { infantry: 1, cavalry: 1, archers: 1.35 },
    'Expected Archer-specific repeated-hit contribution used by the Bear formation model; all-squad procs are ratio-neutral.',
  ),
}

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
function attackFactor(stat = {}) {
  const widget = Math.max(0, number(stat.widget))
  const widgetStat = stat.widgetStat === 'lethality' ? 'lethality' : 'attack'
  const attack = Math.max(0, number(stat.attack)) + (widgetStat === 'attack' ? widget : 0)
  const lethality = Math.max(0, number(stat.lethality)) + (widgetStat === 'lethality' ? widget : 0)
  return (1 + attack / 100) * (1 + lethality / 100)
}

function normalizedTierGroup(tier = 'TG5-TG7', tg = 0) {
  const value = String(tier || '').toUpperCase().replace(/\s+/g, '')
  if (value === 'T1-T6') return 'T1-T6'
  if (value === 'T7-TG2' || value === 'T7-T9' || value === 'T10' || value === 'T11') return 'T7-TG2'
  if (value === 'TG3-TG4') return 'TG3-TG4'
  if (value === 'TG5-TG7') return 'TG5-TG7'

  // Reached only when `tier` is not one of the labels above. An explicit label
  // therefore always wins over `tg`, and `tg` acts purely as a fallback for
  // callers that pass a raw tier number instead of a group name.
  const tgMatch = value.match(/^TG(\d+)(?:-TG(\d+))?$/)
  const tgLevel = tgMatch ? Number(tgMatch[1]) : Math.max(0, number(tg))
  if (tgLevel >= 5) return 'TG5-TG7'
  if (tgLevel >= 3) return 'TG3-TG4'
  if (tgLevel > 0) return 'T7-TG2'

  const tMatch = value.match(/^T(\d+)$/)
  if (tMatch && Number(tMatch[1]) <= 6) return 'T1-T6'
  return 'T7-TG2'
}

// [UNCALIBRATED] This resolves to exactly two values -- 1.10 for T1-T6 and
// 1.21 for everything above it. The four groups `normalizedTierGroup` parses
// therefore produce only two distinct results: T7-TG2, TG3-TG4 and TG5-TG7 are
// numerically identical, and so are the T7/T10/T11 labels that map onto them.
// The tier selector consequently looks finer-grained in the UI than the model
// actually is. Splitting those groups apart needs measured per-tier Bear damage
// that we do not have, so they are deliberately left equal rather than given
// invented coefficients. tests/combat.test.mjs pins the collapse ("bear tier
// groups above T6 are still uncalibrated and identical") so it cannot be
// mistaken for calibrated behaviour: if real per-tier data lands, that test
// SHOULD fail and this note should go with it.
function archerBearMultiplier(tier = 'TG5-TG7', tg = 0) {
  // Bear is Infantry, so Archers receive the natural 10% counter advantage.
  // Post-T6 / True-Gold troop families receive the additional 10% Archer factor
  // described by the supplied Bear theory. It is one additional factor, not one
  // factor per TG breakpoint.
  const group = normalizedTierGroup(tier, tg)
  return 1.1 * (group === 'T1-T6' ? 1 : 1.1)
}

function selectedHeroEffects(leadHeroes = {}) {
  return Object.fromEntries(TYPES.map((slotType) => {
    const hero = leadHeroes?.[slotType] || 'None'
    return [slotType, { hero, ...(LEAD_HERO_BEAR_EFFECTS[hero] || LEAD_HERO_BEAR_EFFECTS.None) }]
  }))
}

function leadHeroMultipliers(leadHeroes = {}) {
  const combined = { infantry: 1, cavalry: 1, archers: 1 }
  const effects = selectedHeroEffects(leadHeroes)
  TYPES.forEach((slotType) => {
    const effect = effects[slotType]
    TYPES.forEach((type) => {
      combined[type] *= Math.max(0.01, number(effect.multipliers?.[type], 1))
    })
  })
  return { combined, effects }
}

function coefficientsFor(stats = {}, tier = 'TG5-TG7', tg = 0, leadHeroes = {}) {
  const factors = {
    infantry: attackFactor(stats.infantry),
    cavalry: attackFactor(stats.cavalry),
    archers: attackFactor(stats.archers),
  }
  const arcMult = archerBearMultiplier(tier, tg)
  const { combined: heroMult, effects: heroEffects } = leadHeroMultipliers(leadHeroes)
  return {
    factors,
    arcMult,
    heroMult,
    heroEffects,
    coefficients: {
      infantry: factors.infantry * FORMATION_WEIGHTS.infantry * heroMult.infantry,
      cavalry: factors.cavalry * FORMATION_WEIGHTS.cavalry * heroMult.cavalry,
      archers: factors.archers * FORMATION_WEIGHTS.archers * arcMult * heroMult.archers,
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

export function computeBearDamageScore({ stats, tier = 'TG5-TG7', tg = 0, ratio, leadHeroes = {} } = {}) {
  const normalized = normalizeRatio(ratio)
  const { coefficients } = coefficientsFor(stats, tier, tg, leadHeroes)
  return TYPES.reduce((sum, type) => sum + coefficients[type] * Math.sqrt(normalized[type]), 0)
}

function continuousOptimalFormation(stats = {}, tier = 'TG5-TG7', tg = 0, leadHeroes = {}) {
  const { coefficients } = coefficientsFor(stats, tier, tg, leadHeroes)
  const squares = Object.fromEntries(TYPES.map((type) => [type, coefficients[type] ** 2]))
  const denominator = TYPES.reduce((sum, type) => sum + squares[type], 0)
  if (!(denominator > 0)) return { infantry: 1 / 3, cavalry: 1 / 3, archers: 1 / 3 }
  return Object.fromEntries(TYPES.map((type) => [type, squares[type] / denominator]))
}

// The analytical optimum is continuous; the card shows whole percents. The
// projection down to 100 points has to be the NEAREST split, or the number on
// screen is not the answer the model computed.
//
// The previous version floored Infantry and rounded Cavalry. Because the
// Infantry share is usually a fraction of a point, flooring it drove it to
// zero or one below its true value in 217 of 450 sampled stat combinations --
// a continuous 2.99/26.93/70.08 was displayed as 2/27/71, and 0.99/39.82/59.19
// as 0/40/60. The damage cost of being one point out is negligible; being
// visibly one point off the optimum every other time is not, because it is
// what makes the card disagree with any other calculator a player checks.
//
// Largest remainder rounds every share to its nearest point and still totals
// exactly 100. Ties break toward the earlier troop type so the same stats
// always project the same way.
function projectContinuousRatio(ratio = {}) {
  const raw = TYPES.map((type) => Math.max(0, number(ratio[type])))
  const sum = raw.reduce((total, value) => total + value, 0)
  const points = sum > 0 ? raw.map((value) => (value / sum) * 100) : TYPES.map(() => 100 / 3)

  const whole = points.map((value) => Math.floor(value))
  let left = 100 - whole.reduce((total, value) => total + value, 0)
  const order = points
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
  for (let k = 0; left > 0; k += 1, left -= 1) whole[order[k % order.length].i] += 1

  return Object.fromEntries(TYPES.map((type, i) => [type, Math.max(MIN_FORMATION_PERCENT, whole[i])]))
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
  const { factors, coefficients, arcMult, heroMult, heroEffects } = coefficientsFor(input.stats, tier, tg, leadHeroes)
  const continuousRatio = continuousOptimalFormation(input.stats, tier, tg, leadHeroes)
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

  const optimizedScore = computeBearDamageScore({ stats: input.stats, tier, tg, ratio: continuousRatio, leadHeroes })
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
    tier: normalizedTierGroup(tier, tg),
    tg,
    leadHeroes,
    heroMult,
    heroEffects,
    arcMult,
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
    model: 'hunt-formation-lagrange-v8-nearest-projection',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear Formation — INF ${byType.infantry.percent.toFixed(0)}% · CAV ${byType.cavalry.percent.toFixed(0)}% · ARC ${byType.archers.percent.toFixed(0)}%`
}
