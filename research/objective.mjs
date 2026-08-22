// The one load-bearing choice in the model that is [IMPL] and never [DOC]:
// damage scales with count^E, where the community implementation used E=0.5.
//
// Suspicion: sqrt makes damage sub-linear in count while a front-line troop
// absorbs kills 1:1 (linear), so stacking Infantry always looks better than it
// is. That is exactly the direction our answers are wrong in.
//
// This is model selection over an unknown exponent against THREE independent
// reference answers -- not fudging a documented constant, which is what went
// wrong when the +10% counter was pushed to 2.7x.
const T = ['infantry', 'cavalry', 'archers']
const beats = (a, d) => (a === 'infantry' && d === 'cavalry') || (a === 'cavalry' && d === 'archers') || (a === 'archers' && d === 'infantry')
const total = (x) => T.reduce((s, t) => s + x[t].count, 0)
const clone = (x) => Object.fromEntries(T.map((t) => [t, { ...x[t] }]))
const front = (x) => T.find((t) => x[t].count > 0) || null

function kills(count, atk, def, at, dt, E, special = null) {
  if (count <= 0) return 0
  const off = (100 + atk.attack) / 100 * (100 + atk.lethality) / 100
  const dfn = (100 + def.defense) / 100 * (100 + def.health) / 100
  const sp = special == null ? (at === 'archers' ? 1.10 : 1) : special
  const counter = beats(at, dt) ? 1.10 : 1
  const mit = (dt === 'infantry' && at === 'cavalry') ? 1.10 : 1
  return Math.pow(count, E) * (off / dfn) * counter * sp / mit
}

function volley(A, D, E) {
  const loss = { infantry: 0, cavalry: 0, archers: 0 }
  const f = front(D); if (!f) return loss
  for (const at of T) {
    const n = A[at].count; if (!n) continue
    if (at === 'cavalry' && f === 'infantry' && D.archers.count > 0) {
      loss.infantry += kills(n, A.cavalry, D.infantry, 'cavalry', 'infantry', E, 0.80)
      loss.archers += kills(n, A.cavalry, D.archers, 'cavalry', 'archers', E, 0.20)
    } else {
      loss[f] += kills(n, A[at], D[f], at, f, E)
    }
  }
  return loss
}

function sim(att, def, E, maxTurns = 2000) {
  const a = clone(att), d = clone(def)
  const sA = total(a), sD = total(d)
  for (let i = 0; i < maxTurns; i++) {
    if (!total(a) || !total(d)) break
    const dl = volley(a, d, E), al = volley(d, a, E)
    let moved = false
    for (const t of T) {
      const x = Math.floor(dl[t]), y = Math.floor(al[t])
      if (x || y) moved = true
      d[t].count = Math.max(0, d[t].count - x); a[t].count = Math.max(0, a[t].count - y)
    }
    if (!moved) break
  }
  const ra = total(a), rd = total(d)
  const mine = sA ? ra / sA : 0, theirs = sD ? rd / sD : 0
  return {
    // A: current -- how much better my survival share is than theirs.
    survival: mine - theirs,
    // B: go for the kill -- how much of them is gone. On a fight you cannot
    // win deterministically, this is what maximises the chance you win anyway.
    aggression: -theirs,
    // C: race ratio -- how much closer I am to wiping them than they are to me.
    race: (1 - theirs) - (1 - mine) * 0 - theirs * 0 + (1 - theirs) * 0 + ((1 - theirs) / Math.max(1e-6, 1 - mine + 1e-6)),
    // D: win first, then cheapest -- lexicographic.
    winFirst: (rd === 0 && ra > 0) ? 1000 + mine : -theirs,
    clears: rd === 0 && ra > 0,
  }
}

// Tier multiplier lands on all four stats -> squares into offence and defence.
const TIER = { T11: 1.175, T10: 1.0 }
const withTier = (stats, tier) => {
  const m = TIER[tier] || 1
  // fold the tier into the percentages so the sim needs no extra term
  const bump = (p) => ((100 + p) * m - 100)
  return Object.fromEntries(T.map((t) => [t, {
    attack: bump(stats[t].attack), lethality: bump(stats[t].lethality),
    defense: bump(stats[t].defense), health: bump(stats[t].health),
  }]))
}

const REPORTS = [
  { zone: 'Knowledge Nexus', total: 185200, frak: [57, 15, 27], tier: 'T11', enemyTier: 'T10',
    you: { infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
           cavalry: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
           archers: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } },
    themStats: { attack: 222, lethality: 222, defense: 222, health: 222 }, themCounts: [60000, 45000, 45000] },
  { zone: 'Molten Fort', total: 150000, frak: [52, 21, 27], tier: 'T10', enemyTier: 'T10',
    you: { infantry: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 },
           cavalry: { attack: 859.2, lethality: 205, defense: 865.3, health: 205 },
           archers: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 } },
    themStats: { attack: 1051, lethality: 186, defense: 1051, health: 186 }, themCounts: [60000, 45000, 45000] },
  { zone: 'Forest of Life', total: 163500, frak: [46, 21, 33], tier: 'T10', enemyTier: 'T10',
    you: { infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
           cavalry: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
           archers: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } },
    themStats: { attack: 403.0, lethality: 570.5, defense: 403.0, health: 570.5 }, themCounts: [64960, 48720, 48720] },
]

const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])

function bestFor(r, E, key) {
  const you = withTier(r.you, r.tier)
  const themBase = Object.fromEntries(T.map((t) => [t, { ...r.themStats }]))
  const themT = withTier(themBase, r.enemyTier)
  const them = Object.fromEntries(T.map((t, i) => [t, { count: r.themCounts[i], ...themT[t] }]))
  let best = null
  for (let i = 0; i <= 100; i += 1) for (let c = 0; c + i <= 100; c += 1) {
    const a = 100 - i - c
    const army = Object.fromEntries(T.map((t, k) => [t, { count: Math.round(r.total * [i, c, a][k] / 100), ...you[t] }]))
    const s = sim(army, them, E)
    if (!best || s[key] > best.score) best = { split: [i, c, a], score: s[key], clears: s.clears }
  }
  return best
}

const OBJ = [['survival','A survival edge (current)'],['aggression','B destroy the enemy'],['winFirst','D win first, then cheapest']]
console.log('objective                      KN            MF            FoL           total')
for (const [key, label] of OBJ) {
  const b = REPORTS.map((r) => bestFor(r, 0.5, key))
  const d = b.map((x, i) => dist(x.split, REPORTS[i].frak))
  const tot = d.reduce((s, v) => s + v, 0)
  console.log(` ${label.padEnd(30)}${b.map((x,i)=>(x.split.join('/')+' ('+d[i]+')').padEnd(14)).join('')}${tot}`)
}
console.log('\ntargets:', REPORTS.map((r) => r.frak.join('/')).join('   '))
