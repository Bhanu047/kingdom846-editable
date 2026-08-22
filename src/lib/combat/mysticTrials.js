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

import { TROOP_TYPES, runBattle, armyTotal, DEFAULT_TIER, NEAR_OPTIMAL_TOLERANCE, simulateOutcomes } from './kingshotCombat.js'

// [DOC] Each zone draws on a different pool of your bonuses, which is why the
// same account reports ~180% in Knowledge Nexus and ~897% in Molten Fort.
// Both are correct. The report's Bonus Details already shows the EFFECTIVE
// figures for that zone, so what the player transcribes is the right input
// and needs no further filtering here -- `sources` is for explaining the
// result, not for computing it.
// Each room tests ONE account system in isolation, and that is the single most
// important thing about the event: the same player reports ~180% bonuses in
// Knowledge Nexus and ~897% in Molten Fort, and both are correct, because the
// rooms count entirely different stat pools.
//
// `heroesApply` is not a modelling convenience -- it is the game rule. [DOC]
// "Forest of Life, Crystal Cave, Knowledge Nexus, and Molten Fort do not let
// you select heroes." Only Coliseum and Radiant Spire do. In the other four
// there is no hero skill modifier to apply and no enemy hero to compensate for,
// so the bonuses printed on the report are the whole story.
export const MYSTIC_ZONES = {
  // [DOC] "in Coliseum, only Hero, Hero Gear, and Hero Exclusive Gear stats
  // take effect". This previously listed "Widgets", which was wrong.
  'Coliseum': { sources: ['Heroes', 'Hero Gear', 'Hero Exclusive Gear'], opener: [50, 10, 40], heroesApply: true, ownTroops: false, days: '' },
  'Forest of Life': { sources: ['Pets', 'Pet Skills'], opener: [50, 15, 35], heroesApply: false, ownTroops: false, days: 'Wed & Thu' },
  'Crystal Cave': { sources: ['Governor Charms'], opener: [60, 20, 20], heroesApply: false, ownTroops: false, days: 'Wed & Thu' },
  'Knowledge Nexus': { sources: ['Academy Tech', 'War Academy Tech'], opener: [50, 20, 30], heroesApply: false, ownTroops: false, days: 'Fri & Sat' },
  'Molten Fort': { sources: ['Governor Gear'], opener: [60, 15, 25], heroesApply: false, ownTroops: false, days: 'Fri & Sat' },
  // [DOC] Everything counts here -- heroes, hero gear and exclusive gear, pets
  // and pet skills, charms, governor gear, both academies, skins, Oasis Island
  // and VIP -- and it is the one room fought with your OWN soldiers, so troop
  // tier and army size matter too.
  'Radiant Spire': { sources: ['Heroes', 'Hero Gear', 'Hero Exclusive Gear', 'Pets', 'Pet Skills', 'Governor Charms', 'Governor Gear', 'Academy Tech', 'War Academy Tech', 'Skins', 'Oasis Island', 'VIP'], opener: [50, 15, 35], heroesApply: true, ownTroops: true, days: '', everything: true },
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
  // Clearing the stage comes first, survival edge only breaks ties among
  // splits that do. A Trial advances on a clear, so a stalemate that keeps 80%
  // of your force is worth less than a clear that keeps 5%, and ranking on
  // edge alone would have put them the other way round.
  candidates.sort((a, b) => (Number(b.clears) - Number(a.clears)) || (b.survivalEdge - a.survivalEdge))

  // The zone's played opener, scored on the same scale, so the player can see
  // how our answer compares against the split the community actually runs
  // rather than having to take ours on faith.
  const opener = (MYSTIC_ZONES[zone] || {}).opener || BASELINE_SPLIT
  const baseline = evaluate(opener[0], opener[1], opener[2])

  const best = candidates[0] || null
  const anyClears = candidates.some((c) => c.clears)

  // How much does the winning split actually beat the rest by? Usually very
  // little: the objective is flat, and dozens of splits sit inside a point of
  // each other. Reporting one of them to the percent, with no margin attached,
  // is false precision -- it is why our answer and another calculator's can
  // differ by ten points on Infantry while being worth ~2 points of survival
  // to the player. So hand the caller the whole near-optimal band and let the
  // UI show a range instead of a fake exact answer.
  const near = best
    ? candidates.filter((c) => c.survivalEdge >= best.survivalEdge - NEAR_OPTIMAL_TOLERANCE
        && Number(c.clears) === Number(best.clears))
    : []
  const spanOf = (i) => (near.length
    ? [Math.min(...near.map((c) => c.split[i])), Math.max(...near.map((c) => c.split[i]))]
    : [0, 0])
  const band = {
    count: near.length,
    tolerance: NEAR_OPTIMAL_TOLERANCE,
    infantry: spanOf(0),
    cavalry: spanOf(1),
    archers: spanOf(2),
  }

  // The spread on the recommended split, with the abilities rolled per round
  // rather than averaged. This is the honest error bar on the score -- NOT a
  // win probability. See the note below on why we do not publish one.
  const distribution = best
    ? simulateOutcomes(armyFromSplit(total, best.composition, yourStats, yourTier), enemyArmy, { trials: 300 })
    : null

  // Deliberately NOT returned: a clears / does-not-clear verdict.
  //
  // What has been validated is the RANKING -- which split beats which. Checked
  // against three real reports it agrees closely with an established tool (on
  // Forest of Life our 60/15/25 and its 57/21/21 score within 0.1 points of each
  // other, ranks 95 and 96 of 5,151).
  //
  // The absolute win/lose call has NOT survived that check, and fails in a
  // specific direction: it scored a Knowledge Nexus fight the player actually
  // won as a heavy loss, and it scores Forest of Life at 7-11 sigma from even
  // where an established Monte Carlo tool gives ~50%. A model that is confidently
  // wrong is worse than one that stays quiet, so this returns a comparative score
  // and the callers say plainly that it does not predict the outcome.
  return { candidates, best, baseline, band, anyClears, distribution, totalTroops: total, zone, step }
}
