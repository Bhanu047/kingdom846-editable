// Why do objectives A (survival edge) and B (destroy the enemy) return the SAME
// split on Molten Fort and Forest of Life? If the enemy's remaining share is
// flat across every candidate, B has nothing to rank on and degenerates to A.
// That would mean the defect is in the SIMULATION, not the ranking criterion.
const T = ['infantry', 'cavalry', 'archers']
const beats = (a, d) => (a === 'infantry' && d === 'cavalry') || (a === 'cavalry' && d === 'archers') || (a === 'archers' && d === 'infantry')
const total = (x) => T.reduce((s, t) => s + x[t].count, 0)
const clone = (x) => Object.fromEntries(T.map((t) => [t, { ...x[t] }]))
const front = (x) => T.find((t) => x[t].count > 0) || null

function kills(count, atk, def, at, dt, special = null) {
  if (count <= 0) return 0
  const off = (100 + atk.attack) / 100 * (100 + atk.lethality) / 100
  const dfn = (100 + def.defense) / 100 * (100 + def.health) / 100
  const sp = special == null ? (at === 'archers' ? 1.10 : 1) : special
  const counter = beats(at, dt) ? 1.10 : 1
  const mit = (dt === 'infantry' && at === 'cavalry') ? 1.10 : 1
  return Math.sqrt(count) * (off / dfn) * counter * sp / mit
}
function volley(A, D) {
  const loss = { infantry: 0, cavalry: 0, archers: 0 }
  const f = front(D); if (!f) return loss
  for (const at of T) {
    const n = A[at].count; if (!n) continue
    if (at === 'cavalry' && f === 'infantry' && D.archers.count > 0) {
      loss.infantry += kills(n, A.cavalry, D.infantry, 'cavalry', 'infantry', 0.80)
      loss.archers += kills(n, A.cavalry, D.archers, 'cavalry', 'archers', 0.20)
    } else loss[f] += kills(n, A[at], D[f], at, f)
  }
  return loss
}
function sim(att, def, maxTurns = 2000) {
  const a = clone(att), d = clone(def)
  const sA = total(a), sD = total(d)
  let turns = 0, why = 'maxTurns'
  for (let i = 0; i < maxTurns; i++) {
    turns = i + 1
    if (!total(a) || !total(d)) { why = 'wipe'; break }
    const dl = volley(a, d), al = volley(d, a)
    let moved = false
    for (const t of T) {
      const x = Math.floor(dl[t]), y = Math.floor(al[t])
      if (x || y) moved = true
      d[t].count = Math.max(0, d[t].count - x); a[t].count = Math.max(0, a[t].count - y)
    }
    if (!moved) { why = 'stalled'; break }
  }
  return { turns, why, a, d, mine: total(a) / sA, theirs: total(d) / sD }
}
const TIER = { T11: 1.175, T10: 1.0 }
const withTier = (stats, tier) => {
  const m = TIER[tier] || 1, bump = (p) => ((100 + p) * m - 100)
  return Object.fromEntries(T.map((t) => [t, {
    attack: bump(stats[t].attack), lethality: bump(stats[t].lethality),
    defense: bump(stats[t].defense), health: bump(stats[t].health) }]))
}
const R = { zone: 'Forest of Life', total: 163500, frak: [46, 21, 33], tier: 'T10', enemyTier: 'T10',
  you: { infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
         cavalry: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
         archers: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } },
  themStats: { attack: 403.0, lethality: 570.5, defense: 403.0, health: 570.5 }, themCounts: [64960, 48720, 48720] }

const you = withTier(R.you, R.tier)
const themT = withTier(Object.fromEntries(T.map((t) => [t, { ...R.themStats }])), R.enemyTier)
const them = Object.fromEntries(T.map((t, i) => [t, { count: R.themCounts[i], ...themT[t] }]))

const CAND = [[46,21,33],[67,14,19],[100,0,0],[0,0,100],[33,33,34],[80,10,10],[57,15,28],[20,20,60]]
console.log('FOREST OF LIFE   me 163,500 vs them 162,400 (65.0k/48.7k/48.7k)')
console.log('split         turns  end        my remain (i/c/a)          their remain (i/c/a)        mine%  theirs%  edge')
for (const s of CAND) {
  const army = Object.fromEntries(T.map((t, k) => [t, { count: Math.round(R.total * s[k] / 100), ...you[t] }]))
  const r = sim(army, them)
  const f = (x) => T.map((t) => String(Math.round(x[t].count)).padStart(6)).join('/')
  console.log(`${s.join('/').padEnd(12)} ${String(r.turns).padStart(5)}  ${r.why.padEnd(8)}  ${f(r.a)}   ${f(r.d)}   ${(r.mine*100).toFixed(1).padStart(5)}  ${(r.theirs*100).toFixed(1).padStart(6)}  ${((r.mine-r.theirs)*100).toFixed(2).padStart(6)}`)
}
