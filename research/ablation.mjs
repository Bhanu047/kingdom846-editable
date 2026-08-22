// MODEL SELECTION over STRUCTURE, not over free constants.
//
// A second, independent optimizer (github.com/Mridanc2/mystic-trial) turned up.
// It disagrees with our engine on four structural points. Each is a yes/no
// design decision, not a dial to fit:
//
//   T  targeting     ours: strict front row absorbs everything
//                    theirs: each line hits its PREFERRED type if alive
//                            (inf->inf, cav->arc, arc->inf), else first alive
//   C  triangle      ours: 1.10 counter, no penalty for being countered
//                    theirs: 1.20 favourable / 0.85 unfavourable (a 1.41x spread)
//   V  victory       ours: fight to annihilation (2000 rounds)
//                    theirs: 50 rounds, then whoever has MORE TROOPS LEFT wins
//   R  ranking       ours: deterministic survival edge
//                    theirs: win RATE over N noisy sims (+-15% + 12% x2.5 burst)
//
// Ablate them one at a time against all three of the player's real reports.
const T = ['inf', 'cav', 'arc']
const eff = (s) => 100 + (s || 0)
const totalCount = (x) => x.inf.count + x.cav.count + x.arc.count
const clone = (x) => ({ inf: { ...x.inf }, cav: { ...x.cav }, arc: { ...x.arc } })
const PREF = { inf: 'inf', cav: 'arc', arc: 'inf' }
const beats = (a, d) => (a === 'inf' && d === 'cav') || (a === 'cav' && d === 'arc') || (a === 'arc' && d === 'inf')
const losesTo = (a, d) => beats(d, a)

let _s = 1
const setSeed = (n) => { _s = (n >>> 0) || 1 }
function rnd() {
  let t = (_s += 0x6D2B79F5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function triangle(a, d, C) {
  if (C === 'ours') return beats(a, d) ? 1.10 : 1.0
  return beats(a, d) ? 1.20 : losesTo(a, d) ? 0.85 : 1.0
}
function firstAlive(side) { return T.find((t) => side[t].count > 0) || null }
function target(side, from, mode) {
  if (mode === 'front') return firstAlive(side)
  const want = PREF[from]
  if (side[want].count > 0) return want
  return firstAlive(side)
}

function kills(n, at, df, bonus, noise) {
  if (n <= 0) return 0
  let r = 1
  if (noise) { r = 0.85 + rnd() * 0.30; if (rnd() < 0.12) r *= 2.5 }
  return Math.sqrt(n) * (eff(at.attack) * eff(at.lethality)) / (eff(df.defense) * eff(df.health)) * bonus * r * 10
}

function battle(P0, E0, o) {
  const p = clone(P0), e = clone(E0)
  const maxR = o.V === 'annihilate' ? 2000 : 50
  for (let r = 0; r < maxR; r++) {
    if (totalCount(e) <= 0.5) return { win: true, p, e }
    if (totalCount(p) <= 0.5) return { win: false, p, e }
    const dE = { inf: 0, cav: 0, arc: 0 }, dP = { inf: 0, cav: 0, arc: 0 }
    for (const t of T) {
      if (p[t].count > 0) { const g = target(e, t, o.Tg); if (g) dE[g] += kills(p[t].count, p[t], e[g], triangle(t, g, o.C), o.R === 'winrate') }
      if (e[t].count > 0) { const g = target(p, t, o.Tg); if (g) dP[g] += kills(e[t].count, e[t], p[g], triangle(t, g, o.C), o.R === 'winrate') }
    }
    let moved = false
    for (const t of T) {
      if (dE[t] >= 1 || dP[t] >= 1) moved = true
      e[t].count = Math.max(0, e[t].count - dE[t]); p[t].count = Math.max(0, p[t].count - dP[t])
    }
    if (!moved) break
  }
  return { win: totalCount(p) > totalCount(e), p, e }
}

function score(P0, E0, o, trials) {
  if (o.R !== 'winrate') {
    const { p, e } = battle(P0, E0, o)
    return (totalCount(p) / totalCount(P0)) - (totalCount(e) / totalCount(E0))
  }
  let w = 0
  for (let i = 0; i < trials; i++) if (battle(P0, E0, o).win) w++
  return w / trials
}

const TIER = { T11: 1.175, T10: 1.0 }
const withTier = (s, tier) => {
  const m = TIER[tier] || 1, b = (p) => ((100 + p) * m - 100)
  return Object.fromEntries(T.map((t) => [t, { attack: b(s[t].attack), lethality: b(s[t].lethality), defense: b(s[t].defense), health: b(s[t].health) }]))
}
const REPORTS = [
  { zone: 'Knowledge Nexus', total: 185200, frak: [57, 15, 27], tier: 'T11', enemyTier: 'T10',
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
  setSeed(0x9e3779b9)
  let best = null, anyWin = false
  for (let i = 0; i <= 100; i += step) for (let c = 0; c + i <= 100; c += step) {
    const a = 100 - i - c
    const P0 = Object.fromEntries(T.map((t, k) => [t, { count: r.total * [i, c, a][k] / 100, ...you[t] }]))
    const s = score(P0, E0, o, o.trials || 60)
    if (o.R === 'winrate' && s > 0) anyWin = true
    if (!best || s > best.s) best = { split: [i, c, a], s }
  }
  return { ...best, anyWin }
}

const VARIANTS = [
  ['ours (shipped)',            { Tg: 'front', C: 'ours',  V: 'annihilate', R: 'edge' }],
  ['+T preferred targeting',    { Tg: 'pref',  C: 'ours',  V: 'annihilate', R: 'edge' }],
  ['+C 1.20/0.85 triangle',     { Tg: 'front', C: 'theirs',V: 'annihilate', R: 'edge' }],
  ['+V 50 rounds, most left',   { Tg: 'front', C: 'ours',  V: 'rounds',     R: 'edge' }],
  ['T+C',                       { Tg: 'pref',  C: 'theirs',V: 'annihilate', R: 'edge' }],
  ['T+C+V',                     { Tg: 'pref',  C: 'theirs',V: 'rounds',     R: 'edge' }],
]
console.log('variant                        KN            MF            FoL           total')
for (const [label, o] of VARIANTS) {
  const b = REPORTS.map((r) => bestFor(r, o))
  const d = b.map((x, i) => dist(x.split, REPORTS[i].frak))
  console.log(` ${label.padEnd(29)}${b.map((x, i) => (x.split.join('/') + ' (' + d[i] + ')').padEnd(14)).join('')}${d.reduce((s, v) => s + v, 0)}`)
}
console.log('\ntargets (Frakinator):', REPORTS.map((r) => r.frak.join('/')).join('   '))
console.log('community openers:    50/20/30       60/15/25       50/15/35')
