// MEASURE, don't assume.
//
// Sourced (kingshotguide.org / kingshotoptimizer.com): "Each round, troops deal
// and receive damage based on their current stats, remaining troop count, WHICH
// HERO ABILITIES TRIGGER THAT ROUND, and other factors", and battle simulators
// offer "fast mode for a stable read, or MONTE CARLO when you want to see the
// effect of skill-roll variance."
//
// So the randomness is a PER-ROUND trigger, not a per-troop average. Our engine
// spends Ambusher (20%) and Volley (10%) as fixed fractions of every volley --
// the expected value. That is the "fast mode" read. This rolls them per round
// instead and measures the spread, to find out whether that alone can turn an
// 11.5%-per-troop deficit into anything like the ~50% an established tool gives.
const T = ['infantry', 'cavalry', 'archers']
const MINE = {
  infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
  cavalry:  { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
  archers:  { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 },
}
const THEM = { attack: 400.0, lethality: 566.7, defense: 400.0, health: 566.7 }
const THEIR = [64920, 48690, 48690]
const TOTAL = 163500
const beats = (a, d) => (a==='infantry'&&d==='cavalry')||(a==='cavalry'&&d==='archers')||(a==='archers'&&d==='infantry')
const eff = (s) => 100 + s
const tot = (x) => T.reduce((s, t) => s + x[t].count, 0)
const front = (x) => T.find((t) => x[t].count > 0) || null
const clone = (x) => Object.fromEntries(T.map((t) => [t, { ...x[t] }]))

function kills(n, at, df, atype, dtype, special) {
  if (n <= 0) return 0
  const o = eff(at.attack)/100 * eff(at.lethality)/100
  const d = eff(df.defense)/100 * eff(df.health)/100
  return Math.sqrt(n) * (o/d) * (beats(atype,dtype) ? 1.10 : 1) * special
}
// mode 'ev'   : abilities spent as expected value every round (our shipped engine)
// mode 'roll' : abilities are per-round army-wide triggers (what the game does)
function volley(A, D, mode, rng) {
  const out = { infantry: 0, cavalry: 0, archers: 0 }
  const f = front(D); if (!f) return out
  for (const t of T) {
    const n = A[t].count; if (n <= 0) continue
    if (t === 'cavalry' && f !== 'archers' && D.archers.count > 0) {
      const p = mode === 'ev' ? 0.20 : (rng() < 0.20 ? 1 : 0)   // Ambusher
      if (p > 0) out.archers += kills(n, A.cavalry, D.archers, 'cavalry', 'archers', p)
      if (p < 1) out[f] += kills(n, A.cavalry, D[f], 'cavalry', f, 1 - p)
    } else {
      const sp = t === 'archers' ? (mode === 'ev' ? 1.10 : (rng() < 0.10 ? 2 : 1)) : 1  // Volley
      out[f] += kills(n, A[t], D[f], t, f, sp)
    }
  }
  return out
}
function battle(P0, E0, mode, rng) {
  const p = clone(P0), e = clone(E0)
  for (let r = 0; r < 4000; r++) {
    if (!tot(p) || !tot(e)) break
    const dE = volley(p, e, mode, rng), dP = volley(e, p, mode, rng)
    let moved = false
    for (const t of T) {
      const a = Math.floor(dE[t]), b = Math.floor(dP[t])
      if (a || b) moved = true
      e[t].count = Math.max(0, e[t].count - a); p[t].count = Math.max(0, p[t].count - b)
    }
    if (!moved) break
  }
  return { win: tot(e) === 0 && tot(p) > 0, edge: tot(p)/tot(P0) - tot(e)/tot(E0) }
}
const enemy = Object.fromEntries(T.map((t,i)=>[t,{count:THEIR[i],...THEM}]))
const army = (s) => Object.fromEntries(T.map((t,k)=>[t,{count:Math.round(TOTAL*s[k]/100),...MINE[t]}]))
let seed = 12345
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

console.log('Forest of Life — 163,500 vs 162,300, they are 11.5% stronger per troop\n')
console.log('split          fast-mode edge   Monte Carlo (600 runs): wins   edge min..max')
for (const s of [[60,15,25],[57,21,22],[50,15,35],[64,16,20]]) {
  const ev = battle(army(s), enemy, 'ev', rng)
  let wins = 0, lo = 9, hi = -9
  for (let i = 0; i < 600; i++) {
    const r = battle(army(s), enemy, 'roll', rng)
    if (r.win) wins++
    lo = Math.min(lo, r.edge); hi = Math.max(hi, r.edge)
  }
  console.log(` ${s.join('/').padEnd(13)} ${(ev.edge*100).toFixed(1).padStart(9)}%      ${String((wins/600*100).toFixed(1)+'%').padStart(9)}      ${(lo*100).toFixed(1)}% .. ${(hi*100).toFixed(1)}%`)
}
