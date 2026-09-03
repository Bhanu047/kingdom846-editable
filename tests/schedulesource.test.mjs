/* Which event time a reminder actually announces.
 *
 * The bug this pins was reported from a lock screen: [RYO]'s page showed Bear
 * Hunt-2 at 21:30, and the phone said "Bear Hunt-2 in 10 minutes · 12:00 UTC".
 * 12:00 was the seeded default nobody had ever chosen, and on [RYO] it is not a
 * Bear Hunt at all — it is the Tri-Alliance and Swordland Legion-1 slot.
 *
 * The cause was two stores for one fact. A leader sets their times in the
 * Leader Portal, which writes alliance_schedules rows. Sparta sets them in the
 * Master Console, which writes the site content blob — and the Alliances page
 * renders that blob. Reminders only ever read the first, so everything entered
 * in the Master Console was invisible to them and they fell back to defaults.
 *
 * The rule these hold to is simple and is the only one that matters to a
 * player: a reminder never names a time the app is not showing.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-sched-'))
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.BACKUP_DIR = path.join(workdir, 'backups')
process.env.PORT = '5397'
process.env.NODE_ENV = 'test'

const server = require('../server/index.cjs')
const Database = require('better-sqlite3')
const db = new Database(process.env.DB_PATH)

/** What the Master Console writes: the whole site content blob. */
function setKingdomContent(schedules) {
  const alliances = Object.entries(schedules).map(([slug, schedule]) => ({
    slug, tag: `[${slug.toUpperCase()}]`, schedule,
  }))
  db.prepare("INSERT INTO site_content (id, data) VALUES ('current', ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data")
    .run(JSON.stringify({ alliances }))
}

/** What the Leader Portal writes: one row per event. */
function setLeaderTime(slug, event, time) {
  db.prepare(`INSERT INTO alliance_schedules (alliance_slug,event_name,event_time,event_days) VALUES (?,?,?,'')
    ON CONFLICT(alliance_slug,event_name) DO UPDATE SET event_time=excluded.event_time`).run(slug, event, time)
}

function clearAll() {
  db.prepare('DELETE FROM site_content').run()
  db.prepare('DELETE FROM alliance_schedules').run()
}

const timeOf = (slug, event) => server.allianceSchedule(slug).find((e) => e.event === event)?.time

// The exact schedule from the report.
const RYO_REAL = [
  { event: 'Bear Hunt -1', time: '12:30' },
  { event: 'Bear Hunt-2', time: '21:30' },
  { event: 'Vikings Vengeance Tuesday', time: '13:00' },
  { event: 'Vikings Vengeance Thursday', time: '13:00' },
  { event: 'Tri-Alliance Clash Legion-1', time: '12:00' },
  { event: 'Tri-Alliance Clash Legion-2', time: '19:00' },
  { event: 'Swordland Showdown Legion-1', time: '12:00' },
  { event: 'Swordland Showdown Legion-2', time: '19:00' },
]

test('the reported bug: a Master Console time reaches the reminder', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  // Before the fix this was '12:00' — the seeded default, which on [RYO] is the
  // Tri-Alliance slot and not a Bear Hunt.
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '21:30')
  assert.equal(timeOf('ryo', 'Bear Hunt -1'), '12:30')
  assert.equal(timeOf('ryo', 'Vikings Vengeance Tuesday'), '13:00')
})

test('the whole schedule matches the page, event for event', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  const shown = Object.fromEntries(RYO_REAL.map((s) => [s.event, s.time]))
  for (const item of server.allianceSchedule('ryo')) {
    assert.equal(item.time, shown[item.event], `${item.event} would have been announced at the wrong time`)
  }
})

test("nothing at 12:00 is called a Bear Hunt any more", () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  const at1200 = server.allianceSchedule('ryo').filter((e) => e.time === '12:00').map((e) => e.event)
  assert.deepEqual(at1200, ['Tri-Alliance Clash Legion-1', 'Swordland Showdown Legion-1'])
})

test("a leader's own time still wins over the kingdom's", () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  setLeaderTime('ryo', 'Bear Hunt-2', '22:15')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '22:15')
  // And only that one event moves.
  assert.equal(timeOf('ryo', 'Bear Hunt -1'), '12:30')
})

test('where the time came from is reported, so nobody has to guess', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  setLeaderTime('ryo', 'Bear Hunt-2', '22:15')
  const by = Object.fromEntries(server.allianceSchedule('ryo').map((e) => [e.event, e.source]))
  assert.equal(by['Bear Hunt-2'], 'leader')
  assert.equal(by['Bear Hunt -1'], 'kingdom')
  clearAll()
  assert.equal(server.allianceSchedule('ryo').find((e) => e.event === 'Bear Hunt-2').source, 'default')
})

test('a blank or malformed time falls through instead of becoming a reminder', () => {
  clearAll()
  setKingdomContent({ ryo: [
    { event: 'Bear Hunt-2', time: '' },
    { event: 'Bear Hunt -1', time: '25:99' },
    { event: 'Vikings Vengeance Tuesday', time: 'noon' },
  ] })
  // Falls back to the seeded default rather than to nonsense.
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '12:00')
  assert.equal(timeOf('ryo', 'Bear Hunt -1'), '04:00')
  // A leader row with a broken time is refused the same way.
  setLeaderTime('ryo', 'Bear Hunt-2', 'half past')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '12:00')
})

test('content that is missing, empty or malformed never throws', () => {
  clearAll()
  assert.deepEqual(server.contentSchedule('ryo'), {})
  db.prepare("INSERT INTO site_content (id, data) VALUES ('current', ?)").run('not json at all')
  assert.deepEqual(server.contentSchedule('ryo'), {})
  db.prepare("UPDATE site_content SET data=? WHERE id='current'").run(JSON.stringify({ alliances: 'nope' }))
  assert.deepEqual(server.contentSchedule('ryo'), {})
  db.prepare("UPDATE site_content SET data=? WHERE id='current'").run(JSON.stringify({ alliances: [{ slug: 'ryo' }] }))
  assert.deepEqual(server.contentSchedule('ryo'), {})
  // And the schedule still resolves, on defaults.
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '12:00')
})

test('an alliance the content does not mention keeps its own defaults', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  // [ICE] runs on its own clock and is not in that blob.
  assert.equal(timeOf('ice', 'Bear Hunt-2'), '22:00')
  assert.equal(timeOf('ice', 'Vikings Vengeance Tuesday'), '02:00')
})

test('the reminder text names the time the schedule resolved to', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  const time = timeOf('ryo', 'Bear Hunt-2')
  const notif = server.eventNotification({ event: 'Bear Hunt-2', slug: 'ryo', time, lead: 10 })
  assert.match(notif.title, /Bear Hunt-2 in 10 minutes/)
  assert.match(notif.body, /21:30 UTC/)
  assert.doesNotMatch(notif.body, /12:00/)
})
