// Kingshot's combat core — the game physics both Mystic Trials and PvP run on.
//
// Every constant here traces to research/COMBAT-RESEARCH.md. Grades used in
// comments: [DOC] published mechanics guides, corroborated twice over.
// [IMPL] a community implementation's reading of the game. [OPEN] unresolved.
//
// This file deliberately contains NO per-troop-type base stats. The previous
// engine had a T10_BASE table (attack 472/1416/1888, hp 1416/472/354,
// lethality and defense a flat 10 for all three) that every result depended
// on; those numbers were constructed rather than measured — attack ran exactly
// 1x/3x/4x and hp exactly 4x/(4/3)x/1x — and nothing in the real formula
// corresponds to them. Troop types are differentiated only by the counter
// triangle and their abilities, below.

export const TROOP_TYPES = ['infantry', 'cavalry', 'archers']

export const TROOP_LABELS = {
  infantry: { label: 'Infantry', short: 'INF' },
  cavalry: { label: 'Cavalry', short: 'CAV' },
  archers: { label: 'Archers', short: 'ARC' },
}

// [DOC] Infantry > Cavalry > Archers > Infantry, +10% when countering.
// Corroborated independently as Archers' Ranged Strike (+10% into Infantry)
// and Cavalry's Charge (+10% into Archers). This was briefly run at 2.7x here,
// fitted so the optimizer would stop returning 0% Cavalry — that contradicted
// the documented figure and made the one checkable real outcome worse. The
// real reason Cavalry was vanishing is AMBUSH_SHARE below.
export const COUNTER_BONUS = 1.10

// [IMPL] Infantry takes 10% less damage from Cavalry ("Master Brawler").
// Divides incoming damage.
export const INFANTRY_VS_CAVALRY_MITIGATION = 1.10

// [IMPL] Cavalry "Ambusher": ~20% chance to bypass the enemy Infantry front
// line and strike Archers directly. Modelled as a damage split rather than a
// coin flip so the result stays deterministic. This single mechanic is why
// Cavalry is worth taking: without it Cavalry never reaches the type it
// counters, and any honest optimizer concludes it is worthless.
export const AMBUSH_SHARE = 0.20

// [IMPL] Archers "Volley": ~10% chance to fire twice, so the expected
// multiplier is 0.9 x 1 + 0.1 x 2.
export const ARCHER_VOLLEY_MULTIPLIER = 1.10

// Troop tier. [DOC] A full T11 army carries "roughly 15 to 20 percent more
// stats than T10 across the board"; 1.175 is the midpoint. Expressed relative
// to T10 because that is what Mystic Trials hands you and what most PvP is
// fought at.
//
// This matters far more than its size suggests. The multiplier lands on each
// of the four stats, so it hits offence as Attack x Lethality and defence as
// Defense x Health -- t^2 each way, and the two compound. T11 against T10 is
// therefore a ~1.9x swing in the damage ratio, not 17.5%.
//
// It is also what resolves the report we could not explain: in Knowledge
// Nexus the opponent held a 2.02x per-troop edge on stats, which said the
// player should be routed, and the player won. They were T11 against T10.
// 2.02 / 1.91 = 1.06, near parity -- matching both the outcome and the ~40%
// an established tool gave that fight.
//
// [OPEN] Only the T10/T11 gap is sourced. The lower entries assume the same
// step compounding downward and are approximations; comparisons between two
// low tiers are the least trustworthy thing in this file.
export const TIER_STAT_MULTIPLIER = {
  'T11': 1.175,
  'T10': 1.0,
  'T7-T9': 0.851,
  'T1-T6': 0.724,
}
export const DEFAULT_TIER = 'T10'

export function tierMultiplier(tier) {
  const m = TIER_STAT_MULTIPLIER[tier]
  return Number.isFinite(m) && m > 0 ? m : 1
}

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)

export function counters(attackerType, defenderType) {
  return (
    (attackerType === 'infantry' && defenderType === 'cavalry') ||
    (attackerType === 'cavalry' && defenderType === 'archers') ||
    (attackerType === 'archers' && defenderType === 'infantry')
  )
}

/**
 * [IMPL] The damage equation:
 *
 *   kills = sqrt(attackerCount)
 *         x (100 + Attack%)(100 + Lethality%)      <- the ATTACKER's
 *         / ((100 + Defense%)(100 + Health%))      <- the DEFENDER's
 *         x SkillMod x CounterBonus x SpecialMultiplier / DefenseBonus
 *
 * Two properties of this shape matter more than any coefficient in it:
 *
 *  - Attack and Lethality multiply, and so do Defense and Health. [DOC]
 *    A stat gap therefore counts twice, which is why a modest percentage
 *    lead swings results so hard.
 *  - The square root is taken per TROOP TYPE, not per army. sqrt is concave,
 *    so sqrt(a) + sqrt(b) > sqrt(a + b): spreading troops across types beats
 *    concentrating them. That concavity is what makes balanced compositions
 *    win, and removing it (an earlier "fix" made this linear) is what drove
 *    every recommendation into a corner.
 */
export function killsDealt({ attackerCount, attackerStats, defenderStats, attackerType, defenderType, skillMod = 1, specialMultiplier = null }) {
  const count = Math.max(0, num(attackerCount))
  if (count <= 0) return 0

  // Tier scales the underlying troop, so it lands on both stats in each pair:
  // squared into offence, squared into defence.
  const attackerTier = tierMultiplier(attackerStats?.tier)
  const defenderTier = tierMultiplier(defenderStats?.tier)

  const offence = (100 + num(attackerStats?.attack)) / 100 * (100 + num(attackerStats?.lethality)) / 100 * attackerTier * attackerTier
  const defence = (100 + num(defenderStats?.defense)) / 100 * (100 + num(defenderStats?.health)) / 100 * defenderTier * defenderTier
  if (defence <= 0) return 0

  const special = specialMultiplier == null
    ? (attackerType === 'archers' ? ARCHER_VOLLEY_MULTIPLIER : 1)
    : specialMultiplier
  const counterBonus = counters(attackerType, defenderType) ? COUNTER_BONUS : 1
  const mitigation = (defenderType === 'infantry' && attackerType === 'cavalry')
    ? INFANTRY_VS_CAVALRY_MITIGATION : 1

  return Math.sqrt(count) * (offence / defence) * num(skillMod, 1) * counterBonus * special / mitigation
}

// [IMPL] Row-based combat: every line attacks the enemy's front row, in the
// order Infantry -> Cavalry -> Archers. Cavalry's Ambush is the only thing
// that reaches past it.
export function frontLine(army) {
  return TROOP_TYPES.find((type) => num(army?.[type]?.count) > 0) || null
}

export function armyTotal(army) {
  return TROOP_TYPES.reduce((sum, type) => sum + Math.max(0, num(army?.[type]?.count)), 0)
}

export function cloneArmy(army) {
  return Object.fromEntries(TROOP_TYPES.map((type) => [type, {
    count: Math.max(0, Math.floor(num(army?.[type]?.count))),
    attack: num(army?.[type]?.attack),
    lethality: num(army?.[type]?.lethality),
    defense: num(army?.[type]?.defense),
    health: num(army?.[type]?.health),
    tier: army?.[type]?.tier || DEFAULT_TIER,
  }]))
}

/** One side's full volley. Returns kills inflicted, keyed by defender type. */
export function resolveVolley(attacker, defender, skillMod = 1) {
  const losses = { infantry: 0, cavalry: 0, archers: 0 }
  const front = frontLine(defender)
  if (!front) return losses

  for (const attackerType of TROOP_TYPES) {
    const count = attacker[attackerType].count
    if (count <= 0) continue

    const ambushAvailable = attackerType === 'cavalry' && front === 'infantry' && defender.archers.count > 0
    if (ambushAvailable) {
      // The volley splits: most of it into the wall, the Ambush share past it.
      losses.infantry += killsDealt({
        attackerCount: count, attackerStats: attacker.cavalry, defenderStats: defender.infantry,
        attackerType: 'cavalry', defenderType: 'infantry', skillMod, specialMultiplier: 1 - AMBUSH_SHARE,
      })
      losses.archers += killsDealt({
        attackerCount: count, attackerStats: attacker.cavalry, defenderStats: defender.archers,
        attackerType: 'cavalry', defenderType: 'archers', skillMod, specialMultiplier: AMBUSH_SHARE,
      })
      continue
    }

    losses[front] += killsDealt({
      attackerCount: count, attackerStats: attacker[attackerType], defenderStats: defender[front],
      attackerType, defenderType: front, skillMod,
    })
  }
  return losses
}

/**
 * Runs a battle to a conclusion. Both sides fire each turn from the same
 * snapshot, so neither gets a first-strike advantage from ordering.
 *
 * `maxTurns` is a safety stop, not a game rule. When it is reached, or when
 * neither side can kill a whole troop any more, the fight is a stalemate --
 * reported as such rather than handed to whoever has more bodies left, since
 * "more survivors" is not a win condition. [OPEN] whether a Mystic stage is
 * actually won by wiping the enemy is unconfirmed; see COMBAT-RESEARCH.md.
 */
export function runBattle(attackerArmy, defenderArmy, { attackerSkillMod = 1, defenderSkillMod = 1, maxTurns = 500 } = {}) {
  const attacker = cloneArmy(attackerArmy)
  const defender = cloneArmy(defenderArmy)
  const startingAttacker = armyTotal(attacker)
  const startingDefender = armyTotal(defender)

  let turns = 0
  let stalled = false
  for (; turns < maxTurns; turns += 1) {
    if (!armyTotal(attacker) || !armyTotal(defender)) break
    const defenderLosses = resolveVolley(attacker, defender, attackerSkillMod)
    const attackerLosses = resolveVolley(defender, attacker, defenderSkillMod)

    let killedSomething = false
    for (const type of TROOP_TYPES) {
      const d = Math.floor(defenderLosses[type])
      const a = Math.floor(attackerLosses[type])
      if (d > 0 || a > 0) killedSomething = true
      defender[type].count = Math.max(0, defender[type].count - d)
      attacker[type].count = Math.max(0, attacker[type].count - a)
    }
    if (!killedSomething) { stalled = true; break }
  }

  const remainingAttacker = armyTotal(attacker)
  const remainingDefender = armyTotal(defender)
  const attackerWins = remainingDefender === 0 && remainingAttacker > 0
  const defenderWins = remainingAttacker === 0 && remainingDefender > 0

  return {
    outcome: attackerWins ? 'attacker' : defenderWins ? 'defender' : 'stalemate',
    attackerWins,
    defenderWins,
    stalemate: !attackerWins && !defenderWins,
    stalled,
    turns,
    attacker,
    defender,
    startingAttacker,
    startingDefender,
    remainingAttacker,
    remainingDefender,
    attackerLosses: startingAttacker - remainingAttacker,
    defenderLosses: startingDefender - remainingDefender,
    // Scale-free comparison: "I kept 60% of mine, they kept 20% of theirs"
    // reads the same whatever the army sizes are, unlike a raw troop margin.
    survivalEdge: (startingAttacker ? remainingAttacker / startingAttacker : 0)
      - (startingDefender ? remainingDefender / startingDefender : 0),
  }
}
