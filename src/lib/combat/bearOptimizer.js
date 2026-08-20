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

const NEUTRAL_MULTIPLIERS = Object.freeze({ infantry: 1, cavalry: 1, archers: 1 })
const neutral = (reason) => ({ multipliers: NEUTRAL_MULTIPLIERS, ratioNeutral: true, reason })
const relative = (multipliers, reason) => ({ multipliers, ratioNeutral: false, reason })

// Every hero exposed by the Lead Hero selectors has an explicit Bear entry.
// Effects that apply equally to all troop types are ratio-neutral because they
// change total damage but not the optimal INF/CAV/ARC split.
const LEAD_HERO_BEAR_EFFECTS = {
  None: neutral('No lead-hero modifier.'),

  // Infantry heroes
  Alcar: relative({ infantry: 2.00, cavalry: 1.10, archers: 1.10 }, 'Praetorian Will: Infantry +100% damage; Cavalry/Archers +10%.'),
  Amadeus: neutral('Attack, Lethality and damage effects apply to all squads equally.'),
  Charles: neutral('Bear-relevant expedition effects are defensive/all-squad and do not change troop weighting.'),
  Eric: neutral('Bear-relevant expedition effects are defensive/all-squad and do not change troop weighting.'),
  Forrest: neutral('Expedition skills are economy/gathering focused.'),
  Helga: neutral('Attack/Lethality effects apply to all squads equally.'),
  Howard: neutral('Expedition effects reduce incoming/enemy damage rather than changing relative Bear damage.'),
  'Long Fei': neutral('Damage proc applies to all squads equally; other expedition effects are defensive.'),
  Seth: neutral('Expedition skills are economy/gathering focused.'),
  Triton: neutral('Skill-damage/defensive effects do not create a troop-specific Bear ratio advantage.'),
  Zoe: neutral('Attack and damage-taken effects apply to all squads equally.'),

  // Cavalry heroes
  Ava: neutral('Lethality/enemy-defense effects apply to the whole squad equally.'),
  Chenko: neutral('Lethality/defensive effects apply to the whole squad equally.'),
  Edwin: neutral('Expedition skills are economy/gathering focused.'),
  Fahd: neutral('Bear-relevant expedition effects are all-squad/utility.'),
  Gordon: neutral('Attack/health effects apply to all squads equally.'),
  Hilde: neutral('Attack and damage proc effects apply to all squads equally.'),
  Jabel: neutral('Damage/Lethality effects apply to all squads equally.'),
  Margot: relative({ infantry: 1, cavalry: 1.50, archers: 1 }, 'Cavalry proc: 25% chance of 200% extra damage ≈ +50% long-run Cavalry damage.'),
  Petra: neutral('Damage and enemy-damage-taken procs apply to all squads equally.'),
  Sophia: relative({ infantry: 1, cavalry: 2.00, archers: 1 }, 'Terror-cycle Cavalry damage effect.'),
  Thrud: relative({ infantry: 1.15, cavalry: 1.20, archers: 1.15 }, 'Troop-relative repeated-hit effect.'),

  // Archer heroes
  Amane: neutral('Total Attack applies to all squads equally; other expedition effects are utility.'),
  Diana: neutral('Expedition skills are stamina/march-speed focused.'),
  Jaeger: neutral('Damage proc applies to all squads equally.'),
  Marlin: neutral('Damage proc/enemy debuff applies to all squads equally.'),
  Olive: neutral('Expedition skills are economy/gathering focused.'),
  Quinn: neutral('Damage proc applies to all squads equally.'),
  Rosa: relative({ infantry: 1, cavalry: 1, archers: 1.30 }, 'Golden Rhythm: Archers total Attack +30%.'),
  Saul: neutral('Lethality/defensive effects apply to all squads or do not alter lead-Bear troop weighting.'),
  Vivian: relative({ infantry: 1, cavalry: 1, archers: 1.15 }, 'Archers repeated-hit average damage effect.'),
  'Wee & Woo': neutral('Against the Infantry Bear target, damage bonuses apply to all squad troop types equally.'),
  Yang: relative({ infantry: 1, cavalry: 1, archers: 1.40 }, 'Archers repeated-hit average damage effect.'),
  Yeonwoo: neutral('Lethality applies to all squads equally; other expedition effects are utility.'),
}

const LEAD_HERO_RELATIVE_MULTIPLIERS = Object.fromEntries(
  Object.entries(LEAD_HERO_BEAR_EFFECTS).map(([hero, effect]) => [hero, effect.multipliers]),
)

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
  if (/^TG\d+(?:-TG\d+)?$/.test(value)) return true
  const match = value.match(/^T(\d+)$/)
  return match ? Number(match[1]) > 6 : false
}

export function archerBearMultiplier(tier = 'T10', tg = 0) {
  // Bear is Infantry: Archers receive the natural 10% counter advantage.
  // The supplied theory adds one further 10% Archer factor for post-T6 / TG3+
  // troop rules. Do not stack extra invented tier multipliers here.
  const base = 1.1
  const advanced = isAboveT6(tier) || Math.max(0, number(tg)) >= 3
  return base * (advanced ? 1.1 : 1)
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

function coefficientsFor(stats = {}, tier = 'T10', tg = 0, leadHeroes = {}) {
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

// The UI reports whole percentages. Instead of forcing a hand-written rounding
// rule, evaluate every legal integer formation (INF + CAV + ARC = 100) against
// the same Bear damage equation and choose the true maximum. This is a tiny
// search (5,151 combinations) and contains no reference-output fitting.
function exactDiscretePercentOptimum(stats = {}, tier = 'T10', tg = 0, leadHeroes = {}) {
  let best = { infantry: 0, cavalry: 0, archers: 100, score: -Infinity }
  for (let infantry = MIN_FORMATION_PERCENT; infantry <= 100; infantry += 1) {
    for (let cavalry = MIN_FORMATION_PERCENT; cavalry <= 100 - infantry; cavalry += 1) {
      const archers = 100 - infantry - cavalry
      if (archers < MIN_FORMATION_PERCENT) continue
      const ratio = { infantry: infantry / 100, cavalry: cavalry / 100, archers: archers / 100 }
      const score = computeBearDamageScore({ stats, tier, tg, ratio, leadHeroes })
      if (score > best.score + 1e-12) best = { infantry, cavalry, archers, score }
    }
  }
  return best
}

export function optimizeBearFormation(input = {}) {
  const capacity = Math.max(1, Math.floor(number(input.capacity, 1)))
  const tier = input.tier || 'T10'
  const tg = Math.max(0, Math.min(10, Math.floor(number(input.tg))))
  const leadHeroes = input.leadHeroes || {}
  const { factors, coefficients, arcMult, heroMult, heroEffects } = coefficientsFor(input.stats, tier, tg, leadHeroes)
  const continuousRatio = continuousOptimalFormation(input.stats, tier, tg, leadHeroes)
  const discrete = exactDiscretePercentOptimum(input.stats, tier, tg, leadHeroes)
  const whole = { infantry: discrete.infantry, cavalry: discrete.cavalry, archers: discrete.archers }
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

  const optimizedScore = discrete.score
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
    model: 'hunt-formation-lagrange-v6-exact-discrete-search',
  }
}

export function buildBearChatMessage(result) {
  if (!result) return ''
  const byType = Object.fromEntries(result.troops.map((troop) => [troop.type, troop]))
  return `Bear Formation — INF ${byType.infantry.percent.toFixed(0)}% · CAV ${byType.cavalry.percent.toFixed(0)}% · ARC ${byType.archers.percent.toFixed(0)}%`
}

export { TROOP_META, FORMATION_WEIGHTS, MIN_FORMATION_PERCENT, LEAD_HERO_BEAR_EFFECTS, LEAD_HERO_RELATIVE_MULTIPLIERS }
