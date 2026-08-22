// PvP field battle — your army against another player's. A different system
// from Mystic Trials (see COMBAT-RESEARCH.md §6 and mysticTrials.js), and it
// no longer borrows the Trials optimizer the way it used to.
//
// What is different here, and why it needs its own module:
//   - Both sides bring their OWN troops, at their own tier and march size.
//     There is no fixed pool handed out.
//   - Heroes and up to four joiners apply, so SkillMod is live on both sides.
//   - Losses are permanent, so how much you lose matters as much as who wins.
//     A Trial has no hospital bill; a rally does.
//   - Both compositions are given. The optimizer answers a narrower question:
//     given a total you are willing to commit, how should it be split.

import { TROOP_TYPES, runBattle, armyTotal, DEFAULT_TIER, NEAR_OPTIMAL_TOLERANCE, simulateOutcomes } from './kingshotCombat.js'

const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f)

/**
 * [IMPL] SkillMod = (1 + DamageUp)(1 + OppDefenseDown)
 *                 / ((1 + OppDamageDown)(1 + DefenseUp))
 *
 * Percentages in, multiplier out. Effects of the same kind add together
 * before the division, which is why stacking two damage skills is worth less
 * than the two figures suggest.
 */
export function skillModifier({ damageUp = 0, opponentDefenseDown = 0, opponentDamageDown = 0, defenseUp = 0 } = {}) {
  const numerator = (1 + num(damageUp) / 100) * (1 + num(opponentDefenseDown) / 100)
  const denominator = (1 + num(opponentDamageDown) / 100) * (1 + num(defenseUp) / 100)
  return denominator === 0 ? numerator : numerator / denominator
}

/** One PvP engagement between two fully-specified armies. */
export function simulatePvpBattle({ attacker, defender, attackerSkills = {}, defenderSkills = {} } = {}) {
  const attackerSkillMod = skillModifier(attackerSkills)
  const defenderSkillMod = skillModifier(defenderSkills)
  const result = runBattle(attacker, defender, { attackerSkillMod, defenderSkillMod })

  // Losses are permanent here, so surface them as first-class numbers rather
  // than leaving the player to subtract remaining from starting.
  return {
    ...result,
    attackerSkillMod,
    defenderSkillMod,
    attackerLossRate: result.startingAttacker ? result.attackerLosses / result.startingAttacker : 0,
    defenderLossRate: result.startingDefender ? result.defenderLosses / result.startingDefender : 0,
  }
}

/**
 * Given a total you are willing to march, how should it be split?
 *
 * Distinct from the Trials search in what it optimises: a Trial costs you
 * nothing, so there the only question is whether you clear the stage. A rally
 * costs real troops, so a split that wins while losing far more of your army
 * is not obviously the better one. Candidates are therefore ranked on
 * survival edge but carry their own loss rate, and `bestByLosses` is offered
 * alongside `best` so a cheaper win is visible when one exists.
 */
export function optimizePvpComposition({
  totalTroops,
  yourStats,
  enemyArmy,
  attackerSkills = {},
  defenderSkills = {},
  stepPercent = 5,
  yourTier = DEFAULT_TIER,
  bounds = null,
} = {}) {
  const total = Math.max(0, Math.floor(num(totalTroops)))
  if (total <= 0 || armyTotal(enemyArmy) <= 0) {
    return { candidates: [], best: null, bestByLosses: null, totalTroops: total }
  }
  const step = Math.min(25, Math.max(1, num(stepPercent, 5)))

  const within = (inf, cav, arc) => {
    if (!bounds) return true
    const ok = (v, lo, hi) => v >= num(lo, 0) - 1e-9 && v <= num(hi, 100) + 1e-9
    return ok(inf, bounds.minInfantry, bounds.maxInfantry)
      && ok(cav, bounds.minCavalry, bounds.maxCavalry)
      && ok(arc, bounds.minArchers, bounds.maxArchers)
  }

  const candidates = []
  for (let inf = 0; inf <= 100; inf += step) {
    for (let cav = 0; inf + cav <= 100; cav += step) {
      const arc = 100 - inf - cav
      if (!within(inf, cav, arc)) continue
      const composition = { infantry: inf / 100, cavalry: cav / 100, archers: arc / 100 }
      const army = Object.fromEntries(TROOP_TYPES.map((type) => [type, {
        count: Math.round(total * composition[type]),
        attack: num(yourStats?.[type]?.attack),
        lethality: num(yourStats?.[type]?.lethality),
        defense: num(yourStats?.[type]?.defense),
        health: num(yourStats?.[type]?.health),
        tier: yourStats?.[type]?.tier || yourTier,
      }]))
      const result = simulatePvpBattle({ attacker: army, defender: enemyArmy, attackerSkills, defenderSkills })
      candidates.push({
        split: [inf, cav, arc],
        composition,
        result,
        survivalEdge: result.survivalEdge,
        wins: result.attackerWins,
        lossRate: result.attackerLossRate,
        troopsLost: result.attackerLosses,
      })
    }
  }
  candidates.sort((a, b) => b.survivalEdge - a.survivalEdge)

  const winners = candidates.filter((c) => c.wins)
  const bestByLosses = winners.length
    ? winners.reduce((cheapest, c) => (c.lossRate < cheapest.lossRate ? c : cheapest), winners[0])
    : null

  // Same flat-objective problem as Mystic Trials: a lot of splits score within
  // noise of the winner, so a single one quoted to the percent overstates what
  // the model actually knows. Hand back the whole near-optimal band.
  const best = candidates[0] || null
  const near = best
    ? candidates.filter((c) => c.survivalEdge >= best.survivalEdge - NEAR_OPTIMAL_TOLERANCE
        && Number(c.wins) === Number(best.wins))
    : []
  const spanOf = (i) => (near.length
    ? [Math.min(...near.map((c) => c.split[i])), Math.max(...near.map((c) => c.split[i]))]
    : [0, 0])

  const distribution = best
    ? simulateOutcomes(
        Object.fromEntries(TROOP_TYPES.map((type) => [type, {
          count: Math.round(total * best.composition[type]),
          attack: num(yourStats?.[type]?.attack), lethality: num(yourStats?.[type]?.lethality),
          defense: num(yourStats?.[type]?.defense), health: num(yourStats?.[type]?.health),
          tier: yourStats?.[type]?.tier || yourTier,
        }])), enemyArmy, { trials: 300 })
    : null

  return {
    candidates,
    best,
    bestByLosses,
    distribution,
    anyWins: winners.length > 0,
    band: {
      count: near.length,
      tolerance: NEAR_OPTIMAL_TOLERANCE,
      infantry: spanOf(0),
      cavalry: spanOf(1),
      archers: spanOf(2),
    },
    totalTroops: total,
    step,
  }
}
