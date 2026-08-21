import { computeBearDamageScore, optimizeBearFormation } from './bearOptimizer'

const TYPES = ['infantry', 'cavalry', 'archers']

// The real joiner pool (confirmed against a reference calculator's own
// documentation): Yeonwoo and Amadeus are strictly equivalent to Chenko as
// joiners, and Amane is strictly equivalent to Margot, so only one of each
// equivalent pair needs to be a selectable option. Gordon, Howard, Saul,
// Fahd, Eric, Petra and Thrud are real joiner options too, but we don't yet
// have a verified per-level attack/lethality value for them — they're
// selectable (so the roster is accurate) but contribute 0 until modeled,
// same convention as "no verified modifier" elsewhere in this codebase.
export const HUNT_JOINER_HEROES = ['None', 'Chenko', 'Amane', 'Hilde', 'Gordon', 'Howard', 'Saul', 'Fahd', 'Eric', 'Petra', 'Thrud']

const JOINER_EFFECTS = {
  None: { type: 'none', values: [0, 0, 0, 0, 0], skill: '—', modeled: true },
  Chenko: { type: 'lethality', values: [5, 10, 15, 20, 25], skill: 'Stand of Arms', modeled: true },
  Amane: { type: 'attack', values: [5, 10, 15, 20, 25], skill: 'Tri Phalanx', modeled: true },
  Hilde: { type: 'attack', values: [3, 6, 9, 12, 15], skill: 'Noble Path', modeled: true },
  Gordon: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
  Howard: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
  Saul: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
  Fahd: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
  Eric: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
  Petra: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
  Thrud: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Not yet modeled', modeled: false },
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeJoiners(joiners = []) {
  return Array.from({ length: 4 }, (_, i) => {
    const slot = joiners[i]
    if (typeof slot === 'string') return { hero: HUNT_JOINER_HEROES.includes(slot) ? slot : 'None', skillLevel: 5 }
    const hero = HUNT_JOINER_HEROES.includes(slot?.hero) ? slot.hero : 'None'
    const skillLevel = Math.max(1, Math.min(5, Math.floor(number(slot?.skillLevel, 5))))
    return { hero, skillLevel }
  })
}

function getJoinerBonuses(joiners = []) {
  return normalizeJoiners(joiners).reduce((acc, slot) => {
    const effect = JOINER_EFFECTS[slot.hero] || JOINER_EFFECTS.None
    const bonus = effect.values[slot.skillLevel - 1] || 0
    if (effect.type === 'attack') acc.attack += bonus
    if (effect.type === 'lethality') acc.lethality += bonus
    return acc
  }, { attack: 0, lethality: 0 })
}

export function applyJoinerBonuses(stats = {}, joiners = []) {
  const bonus = getJoinerBonuses(joiners)
  return Object.fromEntries(TYPES.map((type) => [type, {
    attack: Math.max(0, number(stats?.[type]?.attack)) + bonus.attack,
    lethality: Math.max(0, number(stats?.[type]?.lethality)) + bonus.lethality,
    widget: Math.max(0, number(stats?.[type]?.widget)),
    widgetStat: stats?.[type]?.widgetStat === 'lethality' ? 'lethality' : 'attack',
  }]))
}

export function computeHuntImpact({ stats, tier, tg = 0, ratio, leadHeroes = {}, troopCounts = {}, capacity = 0, participants = 0, joiners = [] } = {}) {
  const normalizedJoiners = normalizeJoiners(joiners)
  const adjustedStats = applyJoinerBonuses(stats, normalizedJoiners)
  const totalTroops = TYPES.reduce((sum, type) => sum + Math.max(0, number(troopCounts?.[type])), 0)
  const actualScore = computeBearDamageScore({ stats: adjustedStats, tier, tg, ratio, leadHeroes })
  const optimal = optimizeBearFormation({ stats: adjustedStats, tier, tg, leadHeroes, capacity: Math.max(1, totalTroops) })
  const efficiency = optimal.optimizedScore > 0 ? actualScore / optimal.optimizedScore * 100 : 0
  const impactIndex = totalTroops > 0 ? actualScore * Math.sqrt(totalTroops) : 0
  const optimalImpactIndex = totalTroops > 0 ? optimal.optimizedScore * Math.sqrt(totalTroops) : 0
  const rallyCapacity = Math.max(0, number(capacity))
  const participantCount = Math.max(0, Math.floor(number(participants)))
  const fillRate = rallyCapacity > 0 ? totalTroops / rallyCapacity * 100 : 0
  const perParticipant = participantCount > 0 ? totalTroops / participantCount : 0

  return {
    adjustedStats,
    normalizedJoiners,
    joinerBonuses: getJoinerBonuses(normalizedJoiners),
    actualScore,
    optimalScore: optimal.optimizedScore,
    optimalRatio: optimal.continuousRatio,
    efficiency,
    impactIndex,
    optimalImpactIndex,
    totalTroops,
    fillRate,
    perParticipant,
    model: 'hunt-impact-v2-joiner-aware-relative-index',
  }
}
