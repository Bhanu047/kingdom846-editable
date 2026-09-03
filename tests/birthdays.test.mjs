/* Birthdays.
 *
 * The nice thing in the app, which is exactly why it has to behave: a
 * celebration that buzzes three times, arrives twice, or lands on the wrong day
 * is worse than none. These pin the day it fires, that it fires once, and that
 * several people on one date share a single message.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-bday-'))
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.BACKUP_DIR = path.join(workdir, 'backups')
process.env.PORT = '5395'
process.env.NODE_ENV = 'test'

const server = require('../server/index.cjs')
const Database = require('better-sqlite3')
const db = new Database(process.env.DB_PATH)

const add = (name, slug, day, month) =>
  db.prepare('INSERT INTO birthdays (name, alliance_slug, day, month) VALUES (?,?,?,?)').run(name, slug, day, month)
const clear = () => { db.prepare('DELETE FROM birthdays').run(); db.prepare('DELETE FROM push_sent').run() }
const on = (iso) => new Date(`${iso}T12:00:00Z`)

test('a date that does not exist is refused', () => {
  assert.deepEqual(server.parseBirthday(3, 9), { day: 3, month: 9 })
  assert.deepEqual(server.parseBirthday('29', '2'), { day: 29, month: 2 })   // leap day is a real date
  for (const bad of [[31, 2], [31, 4], [0, 5], [32, 1], [1, 13], [1, 0], ['x', 1], [1, 'x'], [null, null], [1.5, 2]]) {
    assert.equal(server.parseBirthday(bad[0], bad[1]), null, `${bad.join('/')} should be refused`)
  }
})

test('only the people whose day it is', () => {
  clear()
  add('Shoni', 'ryo', 3, 9)
  add('Dunngeon', 'ice', 4, 9)
  assert.deepEqual(server.birthdaysOn(on('2026-09-03')).map((r) => r.name), ['Shoni'])
  assert.deepEqual(server.birthdaysOn(on('2026-09-04')).map((r) => r.name), ['Dunngeon'])
  assert.deepEqual(server.birthdaysOn(on('2026-09-05')).map((r) => r.name), [])
})

test('a leap-day birthday is celebrated on the 28th in a common year', () => {
  clear()
  add('Leapling', 'kzk', 29, 2)
  // 2026 is not a leap year: the 29th never arrives, so the 28th carries it.
  assert.deepEqual(server.birthdaysOn(on('2026-02-28')).map((r) => r.name), ['Leapling'])
  // 2028 is: it belongs on its own day and must not also fire on the 28th.
  assert.deepEqual(server.birthdaysOn(on('2028-02-29')).map((r) => r.name), ['Leapling'])
  assert.deepEqual(server.birthdaysOn(on('2028-02-28')).map((r) => r.name), [])
})

test('one person reads as one person', () => {
  const n = server.birthdayNotification([{ name: 'Shoni', alliance_slug: 'ryo' }])
  assert.equal(n.title, "Today is Shoni's birthday 🎂")
  assert.equal(n.body, 'Shoni [RYO] — raise a horn for them.')
})

test('several on one day share a single message', () => {
  const two = server.birthdayNotification([
    { name: 'Shoni', alliance_slug: 'ryo' },
    { name: 'Lady Charlotte', alliance_slug: 'sas' },
  ])
  assert.equal(two.title, 'Two birthdays in Kingdom 846 today 🎂')
  assert.equal(two.body, 'Shoni [RYO] and Lady Charlotte [SAS]. Raise a horn for them.')

  const three = server.birthdayNotification([
    { name: 'A', alliance_slug: 'ryo' }, { name: 'B', alliance_slug: 'sas' }, { name: 'C', alliance_slug: null },
  ])
  assert.equal(three.title, 'Three birthdays in Kingdom 846 today 🎂')
  assert.equal(three.body, 'A [RYO], B [SAS] and C. Raise a horn for them.')
})

test('somebody with no alliance is still named', () => {
  const n = server.birthdayNotification([{ name: 'Wanderer', alliance_slug: null }])
  assert.equal(n.body, 'Wanderer — raise a horn for them.')
})

test('it announces at the chosen minute and not before', async () => {
  clear()
  add('Shoni', 'ryo', 3, 9)
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('birthday_announce', JSON.stringify({ time: '12:00', enabled: true }))

  assert.equal((await server.birthdayTick(new Date('2026-09-03T11:59:00Z'))).sent, 0, 'a minute early')
  assert.equal((await server.birthdayTick(new Date('2026-09-03T12:01:00Z'))).sent, 0, 'a minute late')
  // On the minute it claims the day, even with nobody subscribed to receive it.
  await server.birthdayTick(new Date('2026-09-03T12:00:00Z'))
  assert.equal(db.prepare("SELECT COUNT(*) n FROM push_sent WHERE key='2026-09-03|birthday'").get().n, 1)
})

test('the tick runs every 30 seconds and must not announce twice', async () => {
  clear()
  add('Shoni', 'ryo', 3, 9)
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('birthday_announce', JSON.stringify({ time: '12:00', enabled: true }))
  await server.birthdayTick(new Date('2026-09-03T12:00:00Z'))
  await server.birthdayTick(new Date('2026-09-03T12:00:00Z'))
  assert.equal(db.prepare("SELECT COUNT(*) n FROM push_sent WHERE key LIKE '%birthday'").get().n, 1)
})

test('turned off means silent, even on the day', async () => {
  clear()
  add('Shoni', 'ryo', 3, 9)
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('birthday_announce', JSON.stringify({ time: '12:00', enabled: false }))
  await server.birthdayTick(new Date('2026-09-03T12:00:00Z'))
  assert.equal(db.prepare('SELECT COUNT(*) n FROM push_sent').get().n, 0)
  assert.equal(server.birthdaySettings().enabled, false)
})

test('a day with nobody on it does nothing at all', async () => {
  clear()
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('birthday_announce', JSON.stringify({ time: '12:00', enabled: true }))
  await server.birthdayTick(new Date('2026-09-05T12:00:00Z'))
  assert.equal(db.prepare('SELECT COUNT(*) n FROM push_sent').get().n, 0)
})

test('the announcement time is read the way it is typed', () => {
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('birthday_announce', JSON.stringify({ time: '9:00 UTC', enabled: true }))
  assert.equal(server.birthdaySettings().time, '09:00')
  // Nonsense falls back to the default rather than to a time nobody chose.
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('birthday_announce', JSON.stringify({ time: 'noon', enabled: true }))
  assert.equal(server.birthdaySettings().time, '12:00')
})

test('devices can turn birthdays off for themselves', () => {
  const cols = db.prepare('PRAGMA table_info(push_subscriptions)').all().map((c) => c.name)
  assert.ok(cols.includes('alert_birthday'), 'the preference is stored on the device')
})
