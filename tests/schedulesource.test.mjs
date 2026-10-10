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
import './_seed-passwords.mjs'

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

/** Saving the Master Console: the blob, plus the write-through the route does. */
function saveMasterConsole(schedules) {
  const before = db.prepare("SELECT data FROM site_content WHERE id='current'").get()
  let previous = null
  try { previous = before ? JSON.parse(before.data) : null } catch { previous = null }
  const next = {
    alliances: Object.entries(schedules).map(([slug, schedule]) => ({ slug, schedule })),
  }
  db.prepare("INSERT INTO site_content (id,data) VALUES ('current',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data")
    .run(JSON.stringify(next))
  return server.syncScheduleFromContent(next, previous)
}

/** What the Leader Portal writes: one row per event. */
function setLeaderTime(slug, event, time) {
  db.prepare(`INSERT INTO alliance_schedules (alliance_slug,event_name,event_time,event_days,set_by) VALUES (?,?,?,'','leader')
    ON CONFLICT(alliance_slug,event_name) DO UPDATE SET event_time=excluded.event_time, set_by='leader'`).run(slug, event, time)
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

test('a saved time beats the content fallback', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  // The stored row is whoever saved last, leader or Sparta. The content blob is
  // the fallback for every time set before either of them wrote one.
  setLeaderTime('ryo', 'Bear Hunt-2', '22:15')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '22:15')
  // And only that one event moves.
  assert.equal(timeOf('ryo', 'Bear Hunt -1'), '12:30')
})

test('which editor set a time is reported truthfully', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  setLeaderTime('ryo', 'Bear Hunt-2', '22:15')
  let by = Object.fromEntries(server.allianceSchedule('ryo').map((e) => [e.event, e.source]))
  assert.equal(by['Bear Hunt-2'], 'leader')
  assert.equal(by['Bear Hunt -1'], 'console')   // the content blob is this page's own store

  // A time Sparta saves must NOT come back labelled as the leader's. The
  // Master Console tells them who set what, and getting this backwards would
  // have it reporting their own edit as somebody else's.
  saveMasterConsole({ ryo: RYO_REAL.map((r) => r.event === 'Bear Hunt-2' ? { ...r, time: '20:45' } : r) })
  by = Object.fromEntries(server.allianceSchedule('ryo').map((e) => [e.event, e.source]))
  assert.equal(by['Bear Hunt-2'], 'console')

  // And the leader taking it back says so again.
  setLeaderTime('ryo', 'Bear Hunt-2', '23:00')
  assert.equal(server.allianceSchedule('ryo').find((e) => e.event === 'Bear Hunt-2').source, 'leader')

  clearAll()
  assert.equal(server.allianceSchedule('ryo').find((e) => e.event === 'Bear Hunt-2').source, 'default')
})

test('a row written before the stamp existed reads as the leader who wrote it', () => {
  clearAll()
  // Exactly what an upgraded database looks like: a row with no set_by.
  db.prepare("INSERT INTO alliance_schedules (alliance_slug,event_name,event_time,event_days) VALUES ('ryo','Bear Hunt-2','22:15','')").run()
  assert.equal(server.allianceSchedule('ryo').find((e) => e.event === 'Bear Hunt-2').source, 'leader')
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

/* Both people who can set a time have to be able to set it for real. Ranking
 * one editor above the other means the other's edit silently does nothing,
 * which is the same class of bug as the one above, just quieter.
 */
test('Sparta changing a time in the Master Console reaches the phones', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_REAL })
  // A leader had set an older time first.
  setLeaderTime('ryo', 'Bear Hunt-2', '22:15')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '22:15')

  // Sparta now moves it in the Master Console. Their edit wins, because it is
  // the most recent one.
  const written = saveMasterConsole({ ryo: RYO_REAL.map((r) => r.event === 'Bear Hunt-2' ? { ...r, time: '20:45' } : r) })
  assert.equal(written, 1, 'only the time that changed is written')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '20:45')
})

test('a leader can still move it back afterwards', () => {
  clearAll()
  saveMasterConsole({ ryo: RYO_REAL })
  setLeaderTime('ryo', 'Bear Hunt-2', '23:00')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '23:00')
})

test("saving an unrelated change does not roll back a leader's time", () => {
  clearAll()
  saveMasterConsole({ ryo: RYO_REAL })
  setLeaderTime('ryo', 'Bear Hunt-2', '23:00')

  // Sparta edits a tagline and saves. The Master Console writes the whole blob
  // every time, so the schedule is present and unchanged in that save; it must
  // not quietly undo the leader's 23:00.
  const written = saveMasterConsole({ ryo: RYO_REAL })
  assert.equal(written, 0, 'nothing changed, so nothing is written')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '23:00')
})

test('a half-typed time never reaches anyone', () => {
  clearAll()
  saveMasterConsole({ ryo: RYO_REAL })
  const written = saveMasterConsole({ ryo: RYO_REAL.map((r) => r.event === 'Bear Hunt-2' ? { ...r, time: '2' } : r) })
  assert.equal(written, 0)
  // Falls back through to the content blob, which still holds the last good one.
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '21:30')
})

test('an event name the kingdom does not have is ignored', () => {
  clearAll()
  const written = saveMasterConsole({ ryo: [{ event: 'Dragon Picnic', time: '09:00' }] })
  assert.equal(written, 0)
  assert.equal(db.prepare("SELECT COUNT(*) n FROM alliance_schedules WHERE event_name='Dragon Picnic'").get().n, 0)
})

test('content with no alliances at all is a no-op, not a crash', () => {
  clearAll()
  assert.equal(server.syncScheduleFromContent(null, null), 0)
  assert.equal(server.syncScheduleFromContent({}, {}), 0)
  assert.equal(server.syncScheduleFromContent({ alliances: 'nope' }, null), 0)
  assert.equal(server.syncScheduleFromContent({ alliances: [{ schedule: [{ event: 'Bear Hunt-2', time: '09:00' }] }] }, null), 0)
})

/* The live outage this file exists to prevent happening twice.
 *
 * The Master Console's own field says "e.g. 14:00 UTC", so every real time in
 * the kingdom is stored with the unit typed in. A strict HH:MM validator
 * rejected all of them, and once the resolved schedule reached the Alliances
 * page too, [RYO] went from 12:30 / 21:30 to the seeded 04:00 / 12:00 on the
 * page AND in the notifications.
 */
const RYO_AS_TYPED = RYO_REAL.map((r) => ({ ...r, time: `${r.time} UTC` }))

test('times typed the way the field asks for them are read, not discarded', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_AS_TYPED })
  assert.equal(timeOf('ryo', 'Bear Hunt -1'), '12:30')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '21:30')
  assert.equal(timeOf('ryo', 'Tri-Alliance Clash Legion-2'), '19:00')
  // Not one of them falls through to a seeded default.
  for (const item of server.allianceSchedule('ryo')) {
    assert.notEqual(item.source, 'default', `${item.event} fell back to a default`)
  }
})

test('a time with the unit still writes through to the phones', () => {
  clearAll()
  setKingdomContent({ ryo: RYO_AS_TYPED })
  const written = saveMasterConsole({ ryo: RYO_AS_TYPED.map((r) => r.event === 'Bear Hunt-2' ? { ...r, time: '20:45 UTC' } : r) })
  assert.equal(written, 1)
  // Stored normalised, so the notification reads "20:45 UTC" and not
  // "20:45 UTC UTC".
  assert.equal(db.prepare("SELECT event_time t FROM alliance_schedules WHERE alliance_slug='ryo' AND event_name='Bear Hunt-2'").get().t, '20:45')
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '20:45')
  assert.match(server.eventNotification({ event: 'Bear Hunt-2', slug: 'ryo', time: timeOf('ryo', 'Bear Hunt-2'), lead: 5 }).body, /20:45 UTC\./)
})

test('an unchanged schedule is still recognised when the unit is typed', () => {
  clearAll()
  saveMasterConsole({ ryo: RYO_AS_TYPED })
  setLeaderTime('ryo', 'Bear Hunt-2', '23:00')
  // Saving the same blob again must not roll the leader back.
  assert.equal(saveMasterConsole({ ryo: RYO_AS_TYPED }), 0)
  assert.equal(timeOf('ryo', 'Bear Hunt-2'), '23:00')
})

test('normalizeTime reads what people type and refuses what it cannot', () => {
  const ok = {
    '12:30': '12:30', '12:30 UTC': '12:30', '12:30 utc': '12:30', '12:30UTC': '12:30',
    '  21:30 UTC  ': '21:30', '9:05': '09:05', '9:05 UTC': '09:05', '00:00': '00:00',
    '23:59': '23:59', '9.05': '09:05',
  }
  for (const [input, expected] of Object.entries(ok)) {
    assert.equal(server.normalizeTime(input), expected, `${JSON.stringify(input)} should read as ${expected}`)
  }
  for (const bad of ['', '  ', null, undefined, '2', '12', 'noon', '24:00', '12:60', '25:00', '12:3', 'UTC', '1200', '12:30:00', 'half past']) {
    assert.equal(server.normalizeTime(bad), '', `${JSON.stringify(bad)} should be refused`)
  }
})
