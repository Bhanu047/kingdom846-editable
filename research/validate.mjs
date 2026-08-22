import { simulate } from './prototype.mjs'

const T = ['infantry', 'cavalry', 'archers']
const line = (c, s) => ({ count: c, ...s })

// Two real battle reports, hand-transcribed from the player's screenshots.
const REPORTS = [
  {
    room: 'Knowledge Nexus', total: 185200,
    truth: 'player WON this fight',
    frak: [57, 15, 27], opener: [50, 20, 30], actualSplit: [50, 15, 35],
    you: { infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
           cavalry: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
           archers: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } },
    them: Object.fromEntries(T.map((t, i) => [t, line([60000, 45000, 45000][i], { attack: 222, lethality: 222, defense: 222, health: 222 })])),
  },
  {
    room: 'Molten Fort', total: 150000,
    truth: 'Frakinator gave ~20% win chance',
    frak: [52, 21, 27], opener: [60, 15, 25], actualSplit: [57, 15, 28],
    you: { infantry: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 },
           cavalry: { attack: 859.2, lethality: 205, defense: 865.3, health: 205 },
           archers: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 } },
    them: Object.fromEntries(T.map((t, i) => [t, line([60000, 45000, 45000][i], { attack: 1051, lethality: 186, defense: 1051, health: 186 })])),
  },
]

const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])

for (const r of REPORTS) {
  const build = (i, c, a) => Object.fromEntries(T.map((t, k) => [t, line(Math.round(r.total * [i, c, a][k] / 100), r.you[t])]))
  const rows = []
  for (let i = 0; i <= 100; i += 1) for (let c = 0; c + i <= 100; c += 1) {
    const a = 100 - i - c
    const s = simulate(build(i, c, a), r.them)
    rows.push({ split: [i, c, a], edge: s.survivalEdge, win: s.attackerWins, s })
  }
  rows.sort((x, y) => y.edge - x.edge)
  const best = rows[0]
  console.log(`\n=== ${r.room} ===   (${r.truth})`)
  console.log(`  our optimum      ${best.split.join('/').padEnd(10)}  off Frakinator by ${dist(best.split, r.frak)}`)
  console.log(`  Frakinator       ${r.frak.join('/')}`)
  console.log(`  played opener    ${r.opener.join('/')}   off by ${dist(best.split, r.opener)}`)
  console.log(`  cavalry in ours  ${best.split[1]}%   ${best.split[1] > 0 ? '(non-zero)' : '<-- STILL BROKEN'}`)
  const top = rows.slice(0, 5).map((x) => x.split.join('/')).join('  ')
  console.log(`  top 5            ${top}`)
  const wins = rows.filter((x) => x.win).length
  console.log(`  splits that win  ${wins} of ${rows.length} (${(wins / rows.length * 100).toFixed(0)}%)`)
  const act = simulate(build(...r.actualSplit), r.them)
  console.log(`  their real split ${r.actualSplit.join('/')} -> ${act.attackerWins ? 'WIN' : act.defenderWins ? 'loss' : 'stalemate'}, survival edge ${(act.survivalEdge * 100).toFixed(1)}%`)
}
