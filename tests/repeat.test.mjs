/* When each event actually runs.
 *
 * The kingdom's events are not weekly, which is what the first version of this
 * assumed. These pin the four real patterns against dates confirmed against the
 * calendar by the admin: Bear Hunt every other day from Thursday 3 September,
 * Swordland every second Sunday from the 6th, Tri-Alliance the first Saturday of
 * each month, and only Vikings actually weekly.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import './_seed-passwords.mjs'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-repeat-'))
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.BACKUP_DIR = path.join(workdir, 'backups')
process.env.PORT = '5391'
process.env.NODE_ENV = 'test'
const server = require('../server/index.cjs')

const d = (iso) => new Date(`${iso}T00:00:00Z`)
const runs = (rule, iso) => server.occursOn(rule, d(iso))

test('Bear Hunt runs every other day — one day of cooldown after each', () => {
  const rule = server.REPEAT_DEFAULTS['Bear Hunt -1']
  // Given as: today the 3rd, next the 5th, and on from there.
  assert.deepEqual(server.nextOccurrences(rule, d('2026-09-03'), 5),
    ['2026-09-03', '2026-09-05', '2026-09-07', '2026-09-09', '2026-09-11'])
  // The cooldown days are silent.
  for (const off of ['2026-09-04', '2026-09-06', '2026-09-08']) assert.equal(runs(rule, off), false, `${off} is a cooldown day`)
})

test('Bear Hunt keeps its rhythm across a month boundary', () => {
  const rule = server.REPEAT_DEFAULTS['Bear Hunt -1']
  // 29 Sep is 26 days after the anchor, so it runs; the 30th does not, and the
  // pattern carries into October without resetting.
  assert.equal(runs(rule, '2026-09-29'), true)
  assert.equal(runs(rule, '2026-09-30'), false)
  assert.equal(runs(rule, '2026-10-01'), true)
})

test('Swordland Showdown runs every second Sunday', () => {
  const rule = server.REPEAT_DEFAULTS['Swordland Showdown Legion-1']
  // Given as: Sunday the 6th, then the 20th.
  assert.deepEqual(server.nextOccurrences(rule, d('2026-09-06'), 4),
    ['2026-09-06', '2026-09-20', '2026-10-04', '2026-10-18'])
  // The Sunday in between is not one of them — the trap a weekly rule falls into.
  assert.equal(runs(rule, '2026-09-13'), false, 'the intervening Sunday is skipped')
  assert.equal(runs(rule, '2026-09-27'), false)
})

test('Tri-Alliance Clash runs on the first Saturday of each month', () => {
  const rule = server.REPEAT_DEFAULTS['Tri-Alliance Clash Legion-1']
  // Given as: Saturday 5 September, then next month's Saturday.
  assert.deepEqual(server.nextOccurrences(rule, d('2026-09-05'), 4),
    ['2026-09-05', '2026-10-03', '2026-11-07', '2026-12-05'])
  // Every other Saturday in September is silent — this is why a 28-day interval
  // would be wrong: it would land twice in October.
  for (const off of ['2026-09-12', '2026-09-19', '2026-09-26']) assert.equal(runs(rule, off), false)
  assert.equal(runs(rule, '2026-10-31'), false, 'a 28-day step would have fired here')
})

test('Vikings Vengeance runs on a Tuesday and a Thursday, every second week', () => {
  const tue = server.REPEAT_DEFAULTS['Vikings Vengeance Tuesday']
  const thu = server.REPEAT_DEFAULTS['Vikings Vengeance Thursday']

  // Given as: next Tuesday the 8th, so the Thursday of that fortnight is the 10th.
  assert.deepEqual(server.nextOccurrences(tue, d('2026-09-08'), 4),
    ['2026-09-08', '2026-09-22', '2026-10-06', '2026-10-20'])
  assert.deepEqual(server.nextOccurrences(thu, d('2026-09-10'), 4),
    ['2026-09-10', '2026-09-24', '2026-10-08', '2026-10-22'])

  // The names carry a weekday, which is what made the first version weekly:
  // the Tuesday and Thursday of the off week are silent.
  assert.equal(runs(tue, '2026-09-15'), false, 'the Tuesday in between is skipped')
  assert.equal(runs(thu, '2026-09-17'), false, 'the Thursday in between is skipped')

  // And each still only runs on its own day.
  assert.equal(runs(tue, '2026-09-10'), false)
  assert.equal(runs(thu, '2026-09-08'), false)
})

test('a month with no fifth Saturday simply has no occurrence', () => {
  const fifth = { type: 'monthly', weekday: 6, nth: 5 }
  // September 2026 has Saturdays on the 5th, 12th, 19th and 26th — no fifth.
  assert.deepEqual(server.nextOccurrences(fifth, d('2026-09-01'), 1), ['2026-10-31'])
  // It must not roll forward into the next month's first Saturday.
  assert.equal(runs(fifth, '2026-10-03'), false)
})

test('a missing or broken rule reminds too often rather than never', () => {
  // An event that reminds too often is a nuisance; one that never reminds is a
  // missed rally, and only the second is discovered too late.
  for (const bad of [null, undefined, {}, { type: 'nonsense' }, { type: 'interval', days: 0 },
    { type: 'interval', days: 3, anchor: 'not-a-date' }, { type: 'weekdays', days: [] }]) {
    assert.equal(runs(bad, '2026-09-04'), true, `${JSON.stringify(bad)} falls through to every day`)
  }
})

test('dates before the anchor still land on the pattern', () => {
  const rule = { type: 'interval', days: 2, anchor: '2026-09-03' }
  // Going backwards from the anchor must not skew on a negative remainder.
  assert.equal(runs(rule, '2026-09-01'), true)
  assert.equal(runs(rule, '2026-08-31'), false)
  assert.equal(runs(rule, '2026-08-30'), true)
})

test.after(() => { try { fs.rmSync(workdir, { recursive: true, force: true }) } catch {} })
