import { computeBearDamageScore, optimizeBearFormation } from './bearOptimizer'

const TYPES = ['infantry', 'cavalry', 'archers']

export const HUNT_JOINER_HEROES = ['None', 'Amane', 'Chenko', 'Yeonwoo', 'Amadeus', 'Other']

const JOINER_EFFECTS = {
  None: { type: 'none', values: [0, 0, 0, 0, 0], skill: '—' },
  Other: { type: 'none', values: [0, 0, 0, 0, 0], skill: 'Unmodeled' },
  Amane: { type: 'attack', values: [5, 10, 15, 20, 25], skill: 'Tri Phalanx' },
  Chenko: { type: 'lethality', values: [5, 10, 15, 20, 25], skill: 'Stand of Arms' },
  Yeonwoo: { type: 'lethality', values: [5, 10, 15, 20, 25], skill: 'On Guard' },
  Amadeus: { type: 'lethality', values: [5, 10, 15, 20, 25], skill: 'Way of the Blade' },
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getJoinerBonuses(joiners = []) {
  return joiners.reduce((acc, slot) => {
    const hero = slot?.hero || 'None'
    const level = Math.max(1, Math.min(5, Math.floor(number(slot?.skillLevel, 5))))
    const effect = JOINER_EFFECTS[hero] || JOINER_EFFECTS.Other
    const bonus = effect.values[level - 1] || 0
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
  }]))
}

export function computeHuntImpact({ stats, tier, tg = 0, ratio, leadHeroes = {}, troopCounts = {}, capacity = 0, participants = 0, joiners = [] } = {}) {
  const adjustedStats = applyJoinerBonuses(stats, joiners)
  const totalTroops = TYPES.reduce((sum, type) => sum + Math.max(0, number(troopCounts?.[type])), 0)
  const actualScore = computeBearDamageScore({ stats: adjustedStats, tier, tg, ratio, leadHeroes })
  const optimal = optimizeBearFormation({ stats: adjustedStats, tier, tg, leadHeroes, capacity: Math.max(1, totalTroops) })
  const efficiency = optimal.optimizedScore > 0 ? actualScore / optimal.optimizedScore * 100 : 0
  const impactIndex = totalTroops > 0 ? actualScore * Math.sqrt(totalTroops) : 0
  const rallyCapacity = Math.max(0, number(capacity))
  const participantCount = Math.max(0, Math.floor(number(participants)))
  const fillRate = rallyCapacity > 0 ? totalTroops / rallyCapacity * 100 : 0
  const perParticipant = participantCount > 0 ? totalTroops / participantCount : 0

  return {
    adjustedStats,
    joinerBonuses: getJoinerBonuses(joiners),
    actualScore,
    optimalScore: optimal.optimizedScore,
    optimalRatio: optimal.continuousRatio,
    efficiency,
    impactIndex,
    totalTroops,
    fillRate,
    perParticipant,
    model: 'hunt-impact-v1-relative-damage',
  }
}

export { JOINER_EFFECTS }
