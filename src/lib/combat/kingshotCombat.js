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

// The counter triangle IS the troops' named abilities -- there is no separate
// defensive term, and we used to apply one. [DOC]
//
//   Infantry "Master Brawler"  +10% damage against Cavalry
//   Cavalry  "Charge"          +10% damage against Archers
//   Archers  "Ranged Strike"   +10% damage against Infantry
//
// All three are attack-side, and all three are COUNTER_BONUS above. This file
// previously also divided incoming Cavalry damage by 1.10 and credited that to
// Master Brawler as well, so Infantry collected its counter advantage twice --
// once going out, once coming in. Nothing documents a mitigation term, and the
// double-count inflated exactly the troop our recommendations already leaned on
// too hard. Removed.

// [DOC] Cavalry "Ambusher": 20% of Cavalry bypass the enemy Infantry front line
// each round and strike Archers directly. This single mechanic is why Cavalry is
// worth taking: without it Cavalry never reaches the type it counters, and any
// honest optimizer concludes it is worthless.
//
// It is a PER-ROUND trigger, not a per-troop average: published descriptions of
// the engine say each round resolves on "current stats, remaining troop count,
// WHICH HERO ABILITIES TRIGGER THAT ROUND, and other factors". Spending it as a
// flat 20% of every volley is the expected value of that roll -- the "fast mode"
// read that battle simulators offer alongside a Monte Carlo one. Both are
// supported here: `rollAbilities` switches between them.
export const AMBUSH_SHARE = 0.20

// ---------------------------------------------------------------------------
// CONSTANTS FREEZE. Two fitted constants live below -- STAT_PAIR_WEIGHT and
// FRONT_ROW_SPILL. No more get fitted to the current data set, and these two do
// not move again without materially more evidence.
//
// The reason is measured, not cautionary. Two REPLICATED fights now exist --
// the same beast, same stats, same split, fought twice -- and they landed 43.7
// and 35.9 points apart, flipping the outcome both times. That puts the
// per-battle sd near 28, so a model that predicted every battle's true mean
// perfectly would still show MAE ~22.6. Ours shows 18.0 over sixteen battles.
//
// Scoring BELOW the floor a perfect model faces is not skill. It is the
// signature of fitting noise with two free parameters on sixteen points.
// See research/noise-floor.mjs and COMBAT-RESEARCH.md sec.13.
// ---------------------------------------------------------------------------

// How much of a volley reaches PAST the front row.
//
// [DOC] says Infantry "absorbs MOST incoming damage" and Archers are "IDEALLY
// never touched". Most is not all, and ideally is not always -- the remainder
// is left unspecified by every source found. This engine used to model it as
// zero: the front row soaked 100% until it died. That is a choice, not a rule,
// and it was the wrong one. It meant a troop behind the wall dealt full damage
// for free, so the optimiser correctly concluded the best use of any troop was
// to BE the wall, and it returned ~20% Archers when the community opener says
// 35% and an established optimizer says 21-33% across four runs. We were the
// outlier against both.
//
// **This is the one fitted number in this file.** It was first fitted to the
// MEAN answer of two reference optimizers over six reports, which put it at
// 0.35. Real battles have since overruled that. Re-fitted to the player's own
// outcomes, it is 0.20 -- and the demotion of Frakinator from target to proxy
// is the whole reason.
//
// THE LEVEL FIT CANNOT SEE THIS PARAMETER AT ALL. Across thirteen real battles
// with recorded losses (nine Forest of Life, four Crystal Cave), sweeping spill
// end to end barely moves the error (research/spill-mae.mjs):
//
//   spill   MAE all   MAE FoL   MAE CC    sign right
//   0.00      19.3      17.6      23.1       9/13
//   0.20      19.3      17.5      23.2       9/13
//   0.35      19.3      17.4      23.8       9/13
//
// Flat. So this constant is NOT identifiable from how big the wins were, and
// any claim to have fitted it that way -- including the table above -- is
// reading structure out of noise.
//
// WHAT DOES DISCRIMINATE IT is the paired data: two fights in two different
// rooms where the SAME beast was fought at two different splits, so the
// opponent is controlled and the noise largely cancels.
//
//   room            beast                 50/15/35     46/21/33
//   Forest of Life  Starving 391/553.3     WON +24.0   LOST -20.8
//   Crystal Cave    Appraiser  77/690      WON +33.3   LOST -38.4
//
// Reality ranked 50/15/35 above 46/21/33 both times, by 44.8 and 71.7 points.
// Our score for the first minus the second, per spill (research/fit-spill2.mjs)
// -- positive means we ranked them the way reality did:
//
//   spill    FoL     CC    ranks correctly
//   0.00     0.4    1.5         2/2
//   0.10     0.2    1.6         2/2
//   0.20     0.1    0.8         2/2
//   0.25    -0.1    0.4         1/2
//   0.30    -0.5   -0.2         0/2
//   0.35    -1.7   -1.4         0/2   <-- the old value, wrong on both
//
// 0.20 is the top of the range that gets both right while staying clear of the
// sign flip. It is chosen on the only evidence that discriminates it.
//
// TWO HONEST CAVEATS, because this is a weakly-identified constant:
//
// 1. n = 2 pairs. A sign test on two agreements gives p = 0.25. That is not
//    proof; it is the best evidence available, and it beats the previous
//    basis, which was a third-party tool's average answer.
// 2. Our own separation on those pairs is 0.1 to 1.5 points, against real gaps
//    of 44.8 and 71.7 and a measured noise floor of ~17. The model does not
//    genuinely SEE the difference between these two splits -- it is picking a
//    side of a coin. What changed is which side, and the side now matches the
//    player's record (50/15/35 is 7W-4L, 46/21/33 is 1W-2L).
//
// The flatness is real and is reported to the user rather than hidden: at 0.20,
// 28 of 1326 splits score within one point of the winner, spanning 48-58 /
// 14-24 / 22-34 (research/spill-flat.mjs). That band is what the UI shows.
export const FRONT_ROW_SPILL = 0.20

// How the Attack/Defense pair is weighted against the Lethality/Health pair.
//
// The engine multiplied them equally: offence = (1+A)(1+L). A published guide
// says exactly that -- "Attack and Lethality multiply together to set your kill
// output, they matter equally" -- and it is wrong, or at least not what the
// battles show.
//
// TEN REAL BATTLES ACROSS TWO ROOMS SAID SO, and the two rooms are what made it
// visible. Neither could have shown it alone:
//
//   Crystal Cave    me   A/D  85   L/H 640    both sides the SAME shape
//                   them A/D  78   L/H 701    -> model error +1.9 pts, near exact
//
//   Forest of Life  me   A/D 577   L/H 388    MIRRORED shapes
//                   them A/D 391   L/H 553    -> model error -32.8 pts
//
// When both sides share a stat shape, any error in how A, L, D and H combine
// CANCELS. Mirror the shapes and it is exposed -- in the direction that says the
// player's high Attack/Defense is worth more than equal weighting credits.
//
// So the pair exponents are split, holding the total at 2 so overall scale is
// unchanged:  offence = (1+A)^a (1+L)^(2-a),  defence = (1+D)^a (1+H)^(2-a).
//
//   a       Forest of Life error   Crystal Cave error   per-battle MAE
//   1.00           -32.8                  +1.9               29.9
//   1.09 <--        -0.4                  +5.2               13.2
//   1.15           +10.8                  +7.7               18.5
//
// One parameter, two independent room-level constraints, fitted to REAL OUTCOMES
// rather than to another calculator. That is the distinction from the 2.7x
// counter: this contradicts a guide's prose, and the guide's prose is not
// evidence. Ten battles are. Expect it to move as more rooms arrive -- Crystal
// Cave contributes only two of the ten.
export const STAT_PAIR_WEIGHT = 1.09

// [DOC] Archers "Volley": 10% chance to fire twice, so the expected multiplier
// is 0.9 x 1 + 0.1 x 2. Same per-round trigger as Ambusher above.
export const ARCHER_VOLLEY_MULTIPLIER = 1.10
export const ARCHER_VOLLEY_CHANCE = 0.10

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
// [FALSIFIED — 2026-08-22] TWO REAL KNOWLEDGE NEXUS BATTLES SAY THIS IS WRONG,
// and it is the largest measured error anywhere in this file.
//
// Both were fought at T11 with 185,200 troops against a T10 Mad Scholar's
// 150,000 -- a 23% headcount advantage on top of the tier -- and both were
// total defeats, the player's entire army lost:
//
//   R  46/21/33   their survivors 38,519   edge -25.7
//   S  50/15/35   their survivors 17,600   edge -11.7
//
// The model at 1.175 scores both at about +41. Mean error +59.7 points, which
// is 2.1x the measured per-battle sd of ~28 -- this is not noise.
//
//   T11 mult   R      S      mean error
//    1.175    41.1   40.8      +59.7   <- shipped
//    1.150    33.3   33.3      +52.0   <- floor of the documented range
//    1.100    -7.5   -8.1      +10.9
//    1.000   -51.1  -51.4      -32.6
//
// The documented range does not reach: even its floor leaves +52 points. And
// 1.10 is the only value that leaves ALL THREE Knowledge Nexus observations
// plausible at once -- these two defeats and the clear that this constant was
// introduced to explain (research/kn-consistency.mjs).
//
// NOT CHANGED, deliberately. Two magnitudes against ONE opponent cannot
// separate "the tier multiplier is too big" from "this beast or this room
// behaves differently", the errors are correlated, and bending a [DOC] constant
// to fit outcomes is the exact mistake recorded in sec.9 as the 2.7x counter.
// What settles it is two or three more T11 battles against a DIFFERENT
// Knowledge Nexus beast. Until then the value stands and the tool says plainly
// that it is not trusted -- see the T11 warning in MysticSuite.
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

// Two compositions whose survival edge differs by less than this are not
// meaningfully different: the gap is smaller than the uncertainty in this
// file's own [IMPL] constants. Both optimizers use it to report a near-optimal
// BAND instead of a single split, because the objective is flat -- dozens of
// splits routinely score within a point of the winner, and quoting one of them
// to the percent claims a precision the model does not have.
export const NEAR_OPTIMAL_TOLERANCE = 0.01

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

  // Tier scales every stat, so it still enters squared on each side however the
  // pair exponents are split -- t^a * t^(2-a) = t^2.
  const w = STAT_PAIR_WEIGHT
  const offence = Math.pow((100 + num(attackerStats?.attack)) / 100, w)
    * Math.pow((100 + num(attackerStats?.lethality)) / 100, 2 - w) * attackerTier * attackerTier
  const defence = Math.pow((100 + num(defenderStats?.defense)) / 100, w)
    * Math.pow((100 + num(defenderStats?.health)) / 100, 2 - w) * defenderTier * defenderTier
  if (defence <= 0) return 0

  const special = specialMultiplier == null
    ? (attackerType === 'archers' ? ARCHER_VOLLEY_MULTIPLIER : 1)
    : specialMultiplier
  const counterBonus = counters(attackerType, defenderType) ? COUNTER_BONUS : 1

  return Math.sqrt(count) * (offence / defence) * num(skillMod, 1) * counterBonus * special
}

/**
 * Runs the same fight many times with the abilities ROLLED each round instead of
 * averaged, and reports the spread. This is the "Monte Carlo" read that battle
 * simulators offer next to their deterministic "fast" one, and it exists because
 * a single deterministic number hides how close a fight actually is.
 *
 * The seed is derived from the armies, so the same fight always returns the same
 * figures -- a recommendation that changes every time you press the button is
 * worse than useless.
 *
 * MEASURED INADEQUATE -- do not present this spread to a player. Five real
 * Forest of Life battles at the same split came out at -28.5%, -3.3%, +12.6%,
 * +15.2% and +35.3%: a 63.8-point range with a standard deviation of 21.3
 * points. Two of them (D and E in research/groundtruth.mjs) were the SAME fight
 * -- same beast, same stats, same counts, same split -- and landed 43.7 points
 * apart, one a victory and one a defeat.
 *
 * This function returns about +/-0.2 points on that fight. It under-states real
 * variance by roughly 100x, because rolling Ambusher and Volley per round is
 * evidently not where the randomness lives. It is kept for future work, but
 * nothing in the UI quotes it any more: a +/-1.0 next to a number whose real
 * spread is +/-21 is worse than no error bar at all.
 */
export function simulateOutcomes(attackerArmy, defenderArmy, { trials = 400, attackerSkillMod = 1, defenderSkillMod = 1, maxTurns = 4000 } = {}) {
  const fingerprint = TROOP_TYPES.reduce((acc, t) => acc
    + num(attackerArmy?.[t]?.count) * 7 + num(defenderArmy?.[t]?.count) * 13
    + num(attackerArmy?.[t]?.attack) * 3 + num(defenderArmy?.[t]?.attack) * 5, 1)
  let seed = (Math.abs(Math.floor(fingerprint)) % 2147483647) || 1
  const rng = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296 }

  const edges = []
  let wins = 0
  for (let i = 0; i < Math.max(1, trials); i += 1) {
    const r = runBattle(attackerArmy, defenderArmy, { attackerSkillMod, defenderSkillMod, maxTurns, rng })
    edges.push(r.survivalEdge)
    if (r.attackerWins) wins += 1
  }
  edges.sort((a, b) => a - b)
  const n = edges.length
  const mean = edges.reduce((a, b) => a + b, 0) / n
  const variance = edges.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)
  return {
    trials: n,
    winRate: wins / n,
    meanEdge: mean,
    stdDev,
    best: edges[n - 1],
    worst: edges[0],
    // How many standard deviations of simulated spread separate this fight from
    // an even one. Below ~2 the model cannot honestly call a winner.
    sigmasFromEven: stdDev > 0 ? Math.abs(mean) / stdDev : Infinity,
  }
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
export function resolveVolley(attacker, defender, skillMod = 1, rng = null) {
  const losses = { infantry: 0, cavalry: 0, archers: 0 }
  const standing = TROOP_TYPES.filter((type) => num(defender?.[type]?.count) > 0)
  if (!standing.length) return losses

  const front = standing[0]
  const back = standing.slice(1)
  // With nothing behind it the front row absorbs the whole volley -- otherwise
  // the spill would simply vanish and a single-type army would take less total
  // damage than a mixed one, which is not a mechanic, it is a leak.
  const spill = back.length ? FRONT_ROW_SPILL : 0

  const hit = (attackerType, defenderType, portion) => {
    if (portion <= 0) return
    const volley = attackerType === 'archers'
      ? (rng ? (rng() < ARCHER_VOLLEY_CHANCE ? 2 : 1) : ARCHER_VOLLEY_MULTIPLIER)
      : 1
    losses[defenderType] += killsDealt({
      attackerCount: attacker[attackerType].count,
      attackerStats: attacker[attackerType], defenderStats: defender[defenderType],
      attackerType, defenderType, skillMod, specialMultiplier: portion * volley,
    })
  }

  for (const attackerType of TROOP_TYPES) {
    if (attacker[attackerType].count <= 0) continue

    // Ambusher comes off the top: that share always reaches the Archers,
    // whatever the rest of the volley does.
    let remaining = 1
    if (attackerType === 'cavalry' && front !== 'archers' && defender.archers.count > 0) {
      const ambush = rng ? (rng() < AMBUSH_SHARE ? 1 : 0) : AMBUSH_SHARE
      hit('cavalry', 'archers', ambush)
      remaining = 1 - ambush
    }

    hit(attackerType, front, remaining * (1 - spill))
    for (const row of back) hit(attackerType, row, remaining * spill / back.length)
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
export function runBattle(attackerArmy, defenderArmy, { attackerSkillMod = 1, defenderSkillMod = 1, maxTurns = 500, rng = null } = {}) {
  const attacker = cloneArmy(attackerArmy)
  const defender = cloneArmy(defenderArmy)
  const startingAttacker = armyTotal(attacker)
  const startingDefender = armyTotal(defender)

  const rounds = []
  let turns = 0
  let stalled = false
  for (; turns < maxTurns; turns += 1) {
    if (!armyTotal(attacker) || !armyTotal(defender)) break
    const defenderLosses = resolveVolley(attacker, defender, attackerSkillMod, rng)
    const attackerLosses = resolveVolley(defender, attacker, defenderSkillMod, rng)

    let killedSomething = false
    for (const type of TROOP_TYPES) {
      const d = Math.floor(defenderLosses[type])
      const a = Math.floor(attackerLosses[type])
      if (d > 0 || a > 0) killedSomething = true
      defender[type].count = Math.max(0, defender[type].count - d)
      attacker[type].count = Math.max(0, attacker[type].count - a)
    }
    rounds.push({
      round: turns + 1,
      attackerLosses: { ...attackerLosses },
      defenderLosses: { ...defenderLosses },
      attackerRemaining: armyTotal(attacker),
      defenderRemaining: armyTotal(defender),
    })
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
    // Round-by-round history, so a caller can chart the attrition rather than
    // only see the endpoint.
    rounds,
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
