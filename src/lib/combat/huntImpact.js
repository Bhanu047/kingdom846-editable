import { computeBearDamageScore, optimizeBearFormation } from './bearOptimizer'

const TYPES = ['infantry', 'cavalry', 'archers']

// Only heroes whose FIRST Expedition skill contributes offensive rally value.
// These are the joiner choices used by the Bear calculator; lead-hero lists are separate.
export const HUNT_JOINER_HEROES = ['None', 'Chenko', 'Amane', 'Hilde', 'Yeonwoo', 'Margot']

const JOINER_EFFECTS = {
  None: { type: 'none', values: [0, 0, 0, 0, 0], skill: '—' },
  Chenko: { type: 'lethality', values: [5, 10, 15, 20, 25], skill: 'Stand of Arms' },
  Amane: { type: 'attack', values: [5, 10, 15, 20, 25], skill: 'Tri Phalanx' },
  Hilde: { type: 'attack', values: [3, 6, 9, 12, 15], skill: 'Noble Path' },
  Yeonwoo: { type: 'lethality', values: [5, 10, 15, 20, 25], skill: 'On Guard' },
  Margot: { type: 'attack', values: [5, 10, 15, 20, 25], skill: 'Warbringer' },
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeJoiners(joiners = []) {
  return Array.from({ length: 4 }, (_, i) => {
    const slot = joiners[i]
    if (typeof slot === 'string') return { hero: HUNT_JOINER_HEROES.includes(slot) ? slot : 'None', skillLevel: 5 }
    const hero = HUNT_JOINER_HEROES.includes(slot?.hero) ? slot.hero : 'None'
    const skillLevel = Math.max(1, Math.min(5, Math.floor(number(slot?.skillLevel, 5))))
    return { hero, skillLevel }
  })
}

export function getJoinerBonuses(joiners = []) {
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

export { JOINER_EFFECTS }
