// Replays the battles measured off the reference simulator through our own
// engine and prints, per battle, how far apart the two land.
//
// The data in frakinator-parity.json was collected over the reference app's
// own websocket: each row is one fight, its inputs, and the reference's mean
// surviving troops by type for the side that won. Rows whose win rate sits
// between 10% and 90% are coin flips in the reference's own Monte Carlo -- it
// annihilates both sides -- so they carry no survivor signal and are reported
// separately rather than scored.
//
// Run: node research/frakinator-parity.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { TROOP_TYPES, runBattle } from '../src/lib/combat/kingshotCombat.js'

const here = dirname(fileURLToPath(import.meta.url))
const rows = JSON.parse(readFileSync(join(here, 'frakinator-parity.json'), 'utf8'))

const KEYS = { infantry: 'inf', cavalry: 'cav', archers: 'arc' }

function army(cfg) {
  return Object.fromEntries(TROOP_TYPES.map((type) => {
    const k = KEYS[type]
    return [type, {
      count: cfg[`${k}_n`] || 0,
      attack: cfg[`${k}_att`] || 0,
      lethality: cfg[`${k}_let`] || 0,
      defense: cfg[`${k}_def`] || 0,
      health: cfg[`${k}_hea`] || 0,
      tier: 'T10',
    }]
  }))
}

// The reference reports mean residents conditional on that side winning, so a
// row is only comparable when one side wins nearly every time.
export function decisiveSide(result) {
  if (result.win_rate_p1 >= 90) return 'p1'
  if (result.win_rate_p1 <= 10) return 'p2'
  return null
}

export function referenceSurvivors(result, side) {
  const p = side === 'p1' ? 'p1_wins' : 'p2_wins'
  return { infantry: result[`${p}_infantry`], cavalry: result[`${p}_cavalry`], archers: result[`${p}_archery`] }
}

export function ourSurvivors(row) {
  const r = runBattle(army(row.case.p1), army(row.case.p2), { maxTurns: 5000 })
  return {
    p1: Object.fromEntries(TROOP_TYPES.map((t) => [t, r.attacker[t].count])),
    p2: Object.fromEntries(TROOP_TYPES.map((t) => [t, r.defender[t].count])),
    outcome: r.outcome,
  }
}

export function parityReport() {
  const scored = []
  const skipped = []
  for (const row of rows) {
    const side = decisiveSide(row.result)
    if (side === null) { skipped.push(row); continue }
    const want = referenceSurvivors(row.result, side)
    if (TROOP_TYPES.some((t) => want[t] === undefined)) { skipped.push(row); continue }
    const got = ourSurvivors(row)[side]
    const size = TROOP_TYPES.reduce((s, t) => s + (row.case[side][`${KEYS[t]}_n`] || 0), 0)
    const errors = TROOP_TYPES.map((t) => Math.abs(got[t] - want[t]) / size)
    scored.push({
      name: row.case.name, side, want, got, size,
      worst: Math.max(...errors),
      total: Math.abs(TROOP_TYPES.reduce((s, t) => s + got[t] - want[t], 0)) / size,
      sideWon: (side === 'p1') === (ourSurvivors(row).outcome === 'attacker'),
    })
  }
  return { scored, skipped }
}

if (process.argv[1] && process.argv[1].endsWith('frakinator-parity.mjs')) {
  const { scored, skipped } = parityReport()
  const pct = (v) => `${(v * 100).toFixed(2)}%`
  console.log('battle                 side   reference survivors      ours                    worst err')
  for (const s of scored) {
    const fmt = (o) => TROOP_TYPES.map((t) => String(Math.round(o[t])).padStart(6)).join(' ')
    console.log(`${s.name.padEnd(22)} ${s.side}   ${fmt(s.want)}   ${fmt(s.got)}   ${pct(s.worst)}`)
  }
  const worst = Math.max(...scored.map((s) => s.worst))
  const mean = scored.reduce((a, s) => a + s.worst, 0) / scored.length
  console.log(`\n${scored.length} decisive battles: mean worst-row error ${pct(mean)}, max ${pct(worst)}`)
  console.log(`${skipped.length} coin-flip battles skipped (reference win rate between 10% and 90%)`)
  for (const row of skipped) console.log(`  ${row.case.name} (${row.result.win_rate_p1}%)`)
}
