// Two findings force a re-test:
//
// 1. The counter is RECIPROCAL. Kingshot Mastery's battle-mechanics guide:
//    "When your troop type counters the enemy's, your troops deal increased
//    damage AND TAKE REDUCED DAMAGE FROM THAT TYPE."  We only ever modelled
//    the +10% attack side. The reciprocal reading (x1.10 into your counter
//    target, /1.10 from the type that counters you) also SUBSUMES the
//    "Infantry takes 10% less from Cavalry" constant we had bolted on
//    separately -- that case is just the general rule. Strong sign it is right.
//
// 2. TARGETING is the biggest single lever in the ablation, and it is the one
//    thing our engine asserts with no source at all: everything funnels into
//    the enemy front row. An independent optimizer instead has each line hit a
//    preferred type. Our own [OPEN] question 5 is "what share of Cavalry
//    actually reaches past the front line" -- so sweep it rather than assert it.
const T = ['inf', 'cav', 'arc']
const eff = (s) => 100 + (s || 0)
const tot = (x) => x.inf.count + x.cav.count + x.arc.count
const clone = (x) => ({ inf: { ...x.inf }, cav: { ...x.cav }, arc: { ...x.arc } })
const beats = (a, d) => (a === 'inf' && d === 'cav') || (a === 'cav' && d === 'arc') || (a === 'arc' && d === 'inf')
const CB = 1.10
const tri = (a, d) => beats(a, d) ? CB : beats(d, a) ? 1 / CB : 1
const alive = (s) => T.find((t) => s[t].count > 0) || null

function raw(n, at, df, bonus) {
  if (n <= 0) return 0
  return Math.sqrt(n) * (eff(at.attack) * eff(at.lethality)) / (eff(df.defense) * eff(df.health)) * bonus * 10
}
// volley: attacker A hits defender D, returns per-type losses on D
function volley(A, D, o) {
  const out = { inf: 0, cav: 0, arc: 0 }
  const front = alive(D); if (!front) return out
  const send = (from, to, share) => {
    if (!to || share <= 0 || D[to].count <= 0) return
    out[to] += raw(A[from].count, A[from], D[to], tri(from, to)) * share
  }
  for (const t of T) {
    if (A[t].count <= 0) continue
    if (t === 'cav') {
      // Ambusher: share p slips past the line to the Archers, rest hits front
      const p = D.arc.count > 0 && front !== 'arc' ? o.cavReach : 0
      send('cav', 'arc', p); send('cav', front, 1 - p)
    } else if (t === 'arc' && o.arcReach === 'inf' && D.inf.count > 0) {
      send('arc', 'inf', 1)
    } else {
      send(t, front, 1)
    }
  }
  return out
}
function battle(P0, E0, o) {
  const p = clone(P0), e = clone(E0)
  for (let r = 0; r < 400; r++) {
    if (tot(e) <= 0.5 || tot(p) <= 0.5) break
    const dE = volley(p, e, o), dP = volley(e, p, o)
    let moved = false
    for (const t of T) {
      if (dE[t] >= 0.5 || dP[t] >= 0.5) moved = true
      e[t].count = Math.max(0, e[t].count - dE[t]); p[t].count = Math.max(0, p[t].count - dP[t])
    }
    if (!moved) break
  }
  return { mine: tot(p) / tot(P0), theirs: tot(e) / tot(E0), clears: tot(e) <= 0.5 && tot(p) > 0.5 }
}
const TIER = { T11: 1.175, T10: 1.0 }
const withTier = (s, tier) => {
  const m = TIER[tier] || 1, b = (x) => ((100 + x) * m - 100)
  return Object.fromEntries(T.map((t) => [t, { attack: b(s[t].attack), lethality: b(s[t].lethality), defense: b(s[t].defense), health: b(s[t].health) }]))
}
const REPORTS = [
  { zone: 'Knowledge Nexus', total: 185200, frak: [57, 15, 27], tier: 'T11', enemyTier: 'T10', won: true,
    you: { inf: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
           cav: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
           arc: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } },
    them: { attack: 222, lethality: 222, defense: 222, health: 222 }, counts: [60000, 45000, 45000] },
  { zone: 'Molten Fort', total: 150000, frak: [52, 21, 27], tier: 'T10', enemyTier: 'T10',
    you: { inf: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 },
           cav: { attack: 859.2, lethality: 205, defense: 865.3, health: 205 },
           arc: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 } },
    them: { attack: 1051, lethality: 186, defense: 1051, health: 186 }, counts: [60000, 45000, 45000] },
  { zone: 'Forest of Life', total: 163500, frak: [46, 21, 33], tier: 'T10', enemyTier: 'T10',
    you: { inf: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
           cav: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
           arc: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } },
    them: { attack: 403.0, lethality: 570.5, defense: 403.0, health: 570.5 }, counts: [64960, 48720, 48720] },
]
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
function bestFor(r, o, step = 1) {
  const you = withTier(r.you, r.tier)
  const them = withTier(Object.fromEntries(T.map((t) => [t, { ...r.them }])), r.enemyTier)
  const E0 = Object.fromEntries(T.map((t, i) => [t, { count: r.counts[i], ...them[t] }]))
  let best = null
  for (let i = 0; i <= 100; i += step) for (let c = 0; c + i <= 100; c += step) {
    const a = 100 - i - c
    const P0 = Object.fromEntries(T.map((t, k) => [t, { count: r.total * [i, c, a][k] / 100, ...you[t] }]))
    const b = battle(P0, E0, o)
    const s = b.mine - b.theirs
    if (!best || s > best.s) best = { split: [i, c, a], s, clears: b.clears }
  }
  return best
}
console.log('reciprocal counter x1.10 / /1.10 throughout')
console.log('cavReach  arcReach  KN            MF            FoL           total  KN clears?')
for (const arcReach of ['front', 'inf']) {
  for (const cavReach of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
    const o = { cavReach, arcReach }
    const b = REPORTS.map((r) => bestFor(r, o))
    const d = b.map((x, i) => dist(x.split, REPORTS[i].frak))
    console.log(`   ${cavReach.toFixed(1)}     ${arcReach.padEnd(9)} ${b.map((x, i) => (x.split.join('/') + ' (' + d[i] + ')').padEnd(14)).join('')}${String(d.reduce((s, v) => s + v, 0)).padEnd(6)} ${b[0].clears ? 'yes' : 'NO'}`)
  }
}
console.log('\ntargets (Frakinator): 57/15/27   52/21/27   46/21/33')

// ---------------------------------------------------------------------------
// HOW MUCH DOES THE DISAGREEMENT ACTUALLY COST?
// The optimum moves a long way for a small change in assumptions, which is the
// signature of a FLAT objective. If our split and Frakinator's score within a
// hair of each other, the "wrong answer" is mostly false precision on both
// sides, and the honest fix is to stop reporting a single point.
console.log('\n\nscore of each candidate split (survival edge, cavReach 0.6)')
console.log('zone              our best        Frakinator      opener          spread')
const o = { cavReach: 0.6, arcReach: 'front' }
const OPENER = { 'Knowledge Nexus': [50, 20, 30], 'Molten Fort': [60, 15, 25], 'Forest of Life': [50, 15, 35] }
for (const r of REPORTS) {
  const you = withTier(r.you, r.tier)
  const them = withTier(Object.fromEntries(T.map((t) => [t, { ...r.them }])), r.enemyTier)
  const E0 = Object.fromEntries(T.map((t, i) => [t, { count: r.counts[i], ...them[t] }]))
  const at = (s) => {
    const P0 = Object.fromEntries(T.map((t, k) => [t, { count: r.total * s[k] / 100, ...you[t] }]))
    const b = battle(P0, E0, o); return b.mine - b.theirs
  }
  const mine = bestFor(r, o)
  const vals = [[mine.split, mine.s], [r.frak, at(r.frak)], [OPENER[r.zone], at(OPENER[r.zone])]]
  const spread = Math.abs(vals[0][1] - vals[1][1]) * 100
  console.log(` ${r.zone.padEnd(17)}${vals.map(([s, v]) => (s.join('/') + ' ' + (v * 100).toFixed(1) + '%').padEnd(16)).join('')}${spread.toFixed(2)} pts`)
}

// How many DISTINCT splits sit within 1 percentage point of the best?
console.log('\nsplits within 1.0 pt of the optimum (out of 5151 on a 1% grid)')
for (const r of REPORTS) {
  const you = withTier(r.you, r.tier)
  const them = withTier(Object.fromEntries(T.map((t) => [t, { ...r.them }])), r.enemyTier)
  const E0 = Object.fromEntries(T.map((t, i) => [t, { count: r.counts[i], ...them[t] }]))
  const all = []
  for (let i = 0; i <= 100; i++) for (let c = 0; c + i <= 100; c++) {
    const a = 100 - i - c
    const P0 = Object.fromEntries(T.map((t, k) => [t, { count: r.total * [i, c, a][k] / 100, ...you[t] }]))
    const b = battle(P0, E0, o); all.push({ s: [i, c, a], v: (b.mine - b.theirs) * 100 })
  }
  all.sort((x, y) => y.v - x.v)
  const near = all.filter((x) => x.v >= all[0].v - 1.0)
  const lo = ['inf', 'cav', 'arc'].map((_, k) => Math.min(...near.map((x) => x.s[k])))
  const hi = ['inf', 'cav', 'arc'].map((_, k) => Math.max(...near.map((x) => x.s[k])))
  const band = lo.map((v, k) => `${v}-${hi[k]}`).join(' / ')
  const frakIn = near.some((x) => x.s.join() === r.frak.join())
  console.log(` ${r.zone.padEnd(17)}${String(near.length).padStart(5)} splits   range ${band.padEnd(24)} Frakinator's pick inside? ${frakIn ? 'YES' : 'no'}`)
}
