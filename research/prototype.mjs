// PROTOTYPE — validation only, not wired into the app yet.
//
// Implements Kingshot's documented combat model:
//   kills = sqrt(attackerCount)
//         * (100+Atk%)(100+Let%) / ((100+Def%)(100+HP%))   <- defender's Def/HP
//         * SkillMod * CounterBonus * SpecialMult / DefenseBonus
//
// Row-based: every line attacks the enemy's FRONT row, order Inf > Cav > Arc.
// Counters are +10% each (Inf>Cav, Cav>Arc, Arc>Inf).
// Infantry takes 10% LESS from Cavalry (defense bonus).
// Cavalry Ambush: 20% of its damage bypasses Infantry straight onto Archers.
// Archers Volley: 10% chance to fire twice => 0.9*1 + 0.1*2 = 1.10 average.
// NOTE: no per-troop-type base stats exist in this model. Types differ ONLY
// through counters and abilities.
const TYPES = ['infantry', 'cavalry', 'archers']
const COUNTER = { 'infantry>cavalry': 1.10, 'cavalry>archers': 1.10, 'archers>infantry': 1.10 }
const counterBonus = (a, d) => COUNTER[`${a}>${d}`] || 1.0
// Infantry mitigates Cavalry by 10%.
const defenseBonus = (defType, atkType) => (defType === 'infantry' && atkType === 'cavalry') ? 1.10 : 1.0
const SPECIAL = { infantry: 1.0, cavalry: 1.0, archers: 1.10 }

function kills(atkCount, atk, def, atkType, defType, skillMod = 1, specialOverride = null) {
  if (atkCount <= 0) return 0
  const num = Math.sqrt(atkCount) * (100 + atk.attack) / 100 * (100 + atk.lethality) / 100
  const den = (100 + def.defense) / 100 * (100 + def.health) / 100
  const special = specialOverride == null ? SPECIAL[atkType] : specialOverride
  return num / den * skillMod * counterBonus(atkType, defType) * special / defenseBonus(defType, atkType)
}

const front = (a) => TYPES.find((t) => a[t].count > 0) || null
const total = (a) => TYPES.reduce((s, t) => s + a[t].count, 0)
const clone = (a) => Object.fromEntries(TYPES.map((t) => [t, { ...a[t] }]))

// One side's full volley against the other. Returns kills per defender type.
function volley(A, D, skillMod) {
  const out = { infantry: 0, cavalry: 0, archers: 0 }
  const f = front(D)
  if (!f) return out
  for (const at of TYPES) {
    const n = A[at].count
    if (!n) continue
    if (at === 'cavalry' && f === 'infantry' && D.archers.count > 0) {
      // Ambush splits the volley: 80% into the Infantry wall, 20% past it.
      out.infantry += kills(n, A.cavalry, D.infantry, 'cavalry', 'infantry', skillMod, 0.80)
      out.archers += kills(n, A.cavalry, D.archers, 'cavalry', 'archers', skillMod, 0.20)
    } else {
      out[f] += kills(n, A[at], D[f], at, f, skillMod)
    }
  }
  return out
}

export function simulate(attacker, defender, { attackerSkill = 1, defenderSkill = 1, maxTurns = 500 } = {}) {
  const a = clone(attacker), d = clone(defender)
  const startA = total(a), startD = total(d)
  let turn = 0
  for (; turn < maxTurns; turn += 1) {
    if (!total(a) || !total(d)) break
    const dLoss = volley(a, d, attackerSkill)
    const aLoss = volley(d, a, defenderSkill)
    for (const t of TYPES) {
      d[t].count = Math.max(0, d[t].count - Math.floor(dLoss[t]))
      a[t].count = Math.max(0, a[t].count - Math.floor(aLoss[t]))
    }
    // Both volleys rounding to zero means neither side can finish the other.
    if (TYPES.every((t) => Math.floor(dLoss[t]) === 0 && Math.floor(aLoss[t]) === 0)) break
  }
  const ra = total(a), rd = total(d)
  return {
    attackerWins: rd === 0 && ra > 0,
    defenderWins: ra === 0 && rd > 0,
    remainingA: ra, remainingD: rd, startA, startD, turns: turn,
    // Survival share is the scale-free way to compare: "I kept 60% of mine,
    // they kept 20% of theirs" reads the same at any army size.
    survivalEdge: (startA ? ra / startA : 0) - (startD ? rd / startD : 0),
  }
}
