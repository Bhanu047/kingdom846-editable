// Mystic Trials — a PvE system, NOT a PvP battle. See COMBAT-RESEARCH.md §6.
//
// It used to share PvP's simulator (PvP's own optimizer literally called
// optimizeMysticComposition), which is wrong on nearly every axis:
//
//   Mystic Trials                        PvP field battle
//   ------------------------------------ -----------------------------------
//   Game supplies T10 troops [DOC]       Your own army
//   (Radiant Spire is the exception --   Your own tier and march size
//    it uses your trained troops, so
//    tier and army size both matter)
//   Only that zone's stat sources        All of your combat stats
//   No heroes, except Coliseum and       Lead heroes plus 4 joiners
//   Radiant Spire [DOC]
//   No casualties, no hospital [DOC]     Real, permanent losses
//   Fixed NPC per stage                  Another player
//   You choose only the split            Composition, heroes, joiners, size
//
// The practical consequence: in a Trial you are not deciding whether to
// commit an army, you are dividing a fixed one. So this module optimizes a
// split and never asks the player about heroes or march size.

import { TROOP_TYPES, runBattle, armyTotal, DEFAULT_TIER } from './kingshotCombat.js'

// [DOC] Each zone draws on a different pool of your bonuses, which is why the
// same account reports ~180% in Knowledge Nexus and ~897% in Molten Fort.
// Both are correct. The report's Bonus Details already shows the EFFECTIVE
// figures for that zone, so what the player transcribes is the right input
// and needs no further filtering here -- `sources` is for explaining the
// result, not for computing it.
export const MYSTIC_ZONES = {
  'Coliseum': { sources: ['Heroes', 'Hero Gear', 'Widgets'], opener: [50, 10, 40], heroesApply: true, ownTroops: false },
  'Forest of Life': { sources: ['Pets', 'Pet Skills'], opener: [50, 15, 35], heroesApply: false, ownTroops: false },
  'Crystal Cave': { sources: ['Governor Charms'], opener: [60, 20, 20], heroesApply: false, ownTroops: false },
  'Knowledge Nexus': { sources: ['Academy', 'War Academy'], opener: [50, 20, 30], heroesApply: false, ownTroops: false },
  'Molten Fort': { sources: ['Governor Gear'], opener: [60, 15, 25], heroesApply: false, ownTroops: false },
  'Radiant Spire': { sources: ['All progression'], opener: [50, 15, 35], heroesApply: true, ownTroops: true },
}

export const MYSTIC_ZONE_NAMES = Object.keys(MYSTIC_ZONES)

// [DOC] Players report 50/20/30 as the general baseline across zones.
export const BASELINE_SPLIT = [50, 20, 30]

const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f)
const clampFraction = (v) => Math.min(1, Math.max(0, v))

/** Builds an army of `total` troops split by fractions, all sharing per-type stats. */
export function armyFromSplit(total, split, statsByType, tier = DEFAULT_TIER) {
  return Object.fromEntries(TROOP_TYPES.map((type) => [type, {
    count: Math.round(Math.max(0, num(total)) * clampFraction(num(split[type]))),
    attack: num(statsByType?.[type]?.attack),
    lethality: num(statsByType?.[type]?.lethality),
    defense: num(statsByType?.[type]?.defense),
    health: num(statsByType?.[type]?.health),
    tier: statsByType?.[type]?.tier || tier,
  }]))
}

/**
 * Runs one stage attempt. No heroes outside Coliseum and Radiant Spire, so
 * SkillMod stays 1 -- a Trial is decided by the stat pool the zone draws on,
 * not by hero skills you cannot bring.
 */
export function runTrialStage({ yourArmy, enemyArmy, zone = 'Knowledge Nexus', yourSkillMod = 1 }) {
  const config = MYSTIC_ZONES[zone] || MYSTIC_ZONES['Knowledge Nexus']
  const skillMod = config.heroesApply ? num(yourSkillMod, 1) : 1
  return runBattle(yourArmy, enemyArmy, { attackerSkillMod: skillMod, defenderSkillMod: 1 })
}

/**
 * Searches how to divide a fixed troop total across the three types.
 *
 * Ranked by survival edge (what share of your force lives vs what share of
 * theirs does), not by raw surviving headcount. Headcount ranking quietly
 * rewards whatever type tanks best regardless of whether it kills anything,
 * which is how the old optimizer ended up recommending compositions no player
 * would field.
 *
 * `stepPercent` is the grid resolution in percentage points. Bounds are
 * optional and expressed in percentage points too.
 */
export function optimizeTrialSplit({
  totalTroops,
  yourStats,
  enemyArmy,
  zone = 'Knowledge Nexus',
  yourSkillMod = 1,
  stepPercent = 5,
  bounds = null,
  yourTier = DEFAULT_TIER,
} = {}) {
  const total = Math.max(0, Math.floor(num(totalTroops)))
  if (total <= 0 || armyTotal(enemyArmy) <= 0) {
    return { candidates: [], best: null, baseline: null, totalTroops: total, zone }
  }

  const step = Math.min(25, Math.max(1, num(stepPercent, 5)))
  const within = (inf, cav, arc) => {
    if (!bounds) return true
    const check = (v, lo, hi) => v >= num(lo, 0) - 1e-9 && v <= num(hi, 100) + 1e-9
    return check(inf, bounds.minInfantry, bounds.maxInfantry)
      && check(cav, bounds.minCavalry, bounds.maxCavalry)
      && check(arc, bounds.minArchers, bounds.maxArchers)
  }

  const evaluate = (inf, cav, arc) => {
    const split = { infantry: inf / 100, cavalry: cav / 100, archers: arc / 100 }
    const army = armyFromSplit(total, split, yourStats, yourTier)
    const result = runTrialStage({ yourArmy: army, enemyArmy, zone, yourSkillMod })
    return {
      split: [inf, cav, arc],
      composition: split,
      result,
      survivalEdge: result.survivalEdge,
      clears: result.attackerWins,
      troopsLeft: result.remainingAttacker,
      enemyLeft: result.remainingDefender,
    }
  }

  const candidates = []
  for (let inf = 0; inf <= 100; inf += step) {
    for (let cav = 0; inf + cav <= 100; cav += step) {
      const arc = 100 - inf - cav
      if (!within(inf, cav, arc)) continue
      candidates.push(evaluate(inf, cav, arc))
    }
  }
  candidates.sort((a, b) => b.survivalEdge - a.survivalEdge)

  // The zone's played opener, scored on the same scale, so the player can see
  // how our answer compares against the split the community actually runs
  // rather than having to take ours on faith.
  const opener = (MYSTIC_ZONES[zone] || {}).opener || BASELINE_SPLIT
  const baseline = evaluate(opener[0], opener[1], opener[2])

  return { candidates, best: candidates[0] || null, baseline, totalTroops: total, zone, step }
}
