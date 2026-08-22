// Is the recommendation stable inside the uncertainty our own constants carry?
//
// Three of them are ranges or approximations in their sources, not exact values:
//   tier    "roughly 15 to 20 percent more stats than T10"  -> we use 1.175
//   ambush  "~20% of Cavalry bypass the frontline"          -> we use 0.20
//   volley  "~10% chance to fire twice"                     -> we use 1.10
//
// If the answer swings across those ranges, the near-optimal band we now show
// is too narrow and is still overstating what the model knows. If it holds, the
// band is honest and the remaining disagreement with other tools is a genuine
// modelling difference, not slack in the constants.
//
// This is NOT a search for a better fit -- no result here changes a constant.
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'src/lib/combat/kingshotCombat.js'
const original = readFileSync(SRC, 'utf8')

const T = ['infantry', 'cavalry', 'archers']
const REPORTS = [
  { zone: 'Knowledge Nexus', total: 185200, frak: [57, 15, 27], tier: 'T11', enemyTier: 'T10',
    you: { infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
           cavalry: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
           archers: { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 } },
    them: { attack: 222, lethality: 222, defense: 222, health: 222 }, counts: [60000, 45000, 45000] },
  { zone: 'Molten Fort', total: 150000, frak: [52, 21, 27], tier: 'T10', enemyTier: 'T10',
    you: { infantry: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 },
           cavalry: { attack: 859.2, lethality: 205, defense: 865.3, health: 205 },
           archers: { attack: 897.4, lethality: 205, defense: 903.5, health: 205 } },
    them: { attack: 1051, lethality: 186, defense: 1051, health: 186 }, counts: [60000, 45000, 45000] },
  { zone: 'Forest of Life', total: 163500, frak: [46, 21, 33], tier: 'T10', enemyTier: 'T10',
    you: { infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
           cavalry: { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
           archers: { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 } },
    them: { attack: 403.0, lethality: 570.5, defense: 403.0, health: 570.5 }, counts: [64960, 48720, 48720] },
]

async function runWith({ tier, ambush, volley }, tag) {
  const patched = original
    .replace(/'T11': [\d.]+,/, `'T11': ${tier},`)
    .replace(/export const AMBUSH_SHARE = [\d.]+/, `export const AMBUSH_SHARE = ${ambush}`)
    .replace(/export const ARCHER_VOLLEY_MULTIPLIER = [\d.]+/, `export const ARCHER_VOLLEY_MULTIPLIER = ${volley}`)
  const tmp = `src/lib/combat/.sens-${tag}.js`
  writeFileSync(tmp, patched)
  const { runBattle } = await import(`../${tmp}?t=${tag}`)
  const out = REPORTS.map((r) => {
    const enemy = Object.fromEntries(T.map((t, i) => [t, { count: r.counts[i], ...r.them, tier: r.enemyTier }]))
    let best = null
    for (let i = 0; i <= 100; i++) for (let c = 0; c + i <= 100; c++) {
      const split = [i, c, 100 - i - c]
      const mine = Object.fromEntries(T.map((t, k) => [t, { count: Math.round(r.total * split[k] / 100), ...r.you[t], tier: r.tier }]))
      const b = runBattle(mine, enemy, { maxTurns: 4000 })
      if (!best || b.survivalEdge > best.edge) best = { split, edge: b.survivalEdge, clears: b.attackerWins }
    }
    return best
  })
  writeFileSync(tmp, '')
  return out
}

const CASES = [
  ['shipped          ', { tier: 1.175, ambush: 0.20, volley: 1.10 }],
  ['tier low  (1.15) ', { tier: 1.15,  ambush: 0.20, volley: 1.10 }],
  ['tier high (1.20) ', { tier: 1.20,  ambush: 0.20, volley: 1.10 }],
  ['ambush 0.15      ', { tier: 1.175, ambush: 0.15, volley: 1.10 }],
  ['ambush 0.25      ', { tier: 1.175, ambush: 0.25, volley: 1.10 }],
  ['volley 1.05      ', { tier: 1.175, ambush: 0.20, volley: 1.05 }],
  ['volley 1.15      ', { tier: 1.175, ambush: 0.20, volley: 1.15 }],
  ['all low          ', { tier: 1.15,  ambush: 0.15, volley: 1.05 }],
  ['all high         ', { tier: 1.20,  ambush: 0.25, volley: 1.15 }],
]

console.log('constant setting     KN            MF            FoL           KN clears?')
const seen = { KN: [], MF: [], FoL: [] }
for (const [label, cfg] of CASES) {
  const r = await runWith(cfg, label.trim().replace(/[^a-z0-9]/gi, ''))
  seen.KN.push(r[0].split); seen.MF.push(r[1].split); seen.FoL.push(r[2].split)
  console.log(` ${label}   ${r.map((x) => x.split.join('/').padEnd(14)).join('')}${r[0].clears ? 'yes' : 'NO'}`)
}
console.log('\nspread of the optimum across the sourced uncertainty:')
for (const [zone, rows] of Object.entries(seen)) {
  const span = [0, 1, 2].map((k) => `${Math.min(...rows.map((s) => s[k]))}-${Math.max(...rows.map((s) => s[k]))}`)
  console.log(` ${zone.padEnd(5)} ${span.join(' / ')}`)
}
console.log('\ntargets (Frakinator): 57/15/27   52/21/27   46/21/33')
