// Forest of Life, transcribed EXACTLY from the player's Battle Details screen.
// The values in COMBAT-RESEARCH.md were slightly off (enemy 403.0/570.5 instead
// of 400.0/566.7, counts 64,960/48,720 instead of 64,920/48,690). Corrected here.
import { runBattle, TROOP_TYPES } from '../src/lib/combat/kingshotCombat.js'
const T = TROOP_TYPES
const MINE = {
  infantry: { attack: 577.3, lethality: 388.1, defense: 543.1, health: 368.6 },
  cavalry:  { attack: 577.3, lethality: 388.5, defense: 543.1, health: 368.5 },
  archers:  { attack: 577.3, lethality: 399.0, defense: 543.1, health: 357.8 },
}
const THEM = { attack: 400.0, lethality: 566.7, defense: 400.0, health: 566.7 }
const THEIR_COUNTS = [64920, 48690, 48690]          // 40 / 30 / 30, total 162,300
const TOTAL = 81750 + 24525 + 57225                  // 163,500 — as played, 50/15/35
const enemy = Object.fromEntries(T.map((t, i) => [t, { count: THEIR_COUNTS[i], ...THEM, tier: 'T10' }]))
const army = (s) => Object.fromEntries(T.map((t, k) => [t, { count: Math.round(TOTAL * s[k] / 100), ...MINE[t], tier: 'T10' }]))

const off = (s) => (100 + s.attack) / 100 * (100 + s.lethality) / 100
const def = (s) => (100 + s.defense) / 100 * (100 + s.health) / 100
console.log('per-troop strength check')
console.log('  my offence  ', off(MINE.infantry).toFixed(2), ' vs their defence', def(THEM).toFixed(2), '=> ratio', (off(MINE.infantry) / def(THEM)).toFixed(4))
console.log('  their offence', off(THEM).toFixed(2), 'vs my defence   ', def(MINE.infantry).toFixed(2), '=> ratio', (off(THEM) / def(MINE.infantry)).toFixed(4))
console.log('  troops: me', TOTAL.toLocaleString(), ' them', THEIR_COUNTS.reduce((a,b)=>a+b,0).toLocaleString())
console.log('  => they are ~%s%% stronger per troop, with ~equal numbers\n',
  (((off(THEM)/def(MINE.infantry)) / (off(MINE.infantry)/def(THEM)) - 1) * 100).toFixed(1))

// Full unbounded grid — what does the model say when nothing constrains it?
let best = null; const all = []
for (let i = 0; i <= 100; i++) for (let c = 0; c + i <= 100; c++) {
  const s = [i, c, 100 - i - c]
  const b = runBattle(army(s), enemy, { maxTurns: 4000 })
  all.push({ s, e: b.survivalEdge, win: b.attackerWins, mine: b.remainingAttacker, theirs: b.remainingDefender })
  if (!best || b.survivalEdge > best.e) best = all[all.length - 1]
}
all.sort((x, y) => y.e - x.e)
console.log('FULL 0-100 GRID (5,151 splits), nothing bounded')
console.log('  our best        ', best.s.join('/'), ' edge', (best.e * 100).toFixed(1) + '%',
            ' my survivors', Math.round(best.mine).toLocaleString(), ' theirs', Math.round(best.theirs).toLocaleString())
console.log('  any split wins? ', all.some((x) => x.win) ? 'YES' : 'no')

const score = (s) => { const b = runBattle(army(s), enemy, { maxTurns: 4000 }); return b }
for (const [label, s] of [['Frakinator 57/21/21', [57,21,22]], ['our shipped 60/15/25', [60,15,25]], ['as played 50/15/35', [50,15,35]], ['classic 50/25/25', [50,25,25]]]) {
  const b = score(s)
  const rank = all.findIndex((x) => x.s.join() === s.join()) + 1
  console.log(`  ${label.padEnd(22)} edge ${(b.survivalEdge*100).toFixed(1).padStart(6)}%   they keep ${(b.remainingDefender/162300*100).toFixed(1).padStart(5)}%   rank ${rank} of 5151`)
}
