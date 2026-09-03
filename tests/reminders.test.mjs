/* The reminder scheduler decides whether a few hundred phones buzz, so the
 * rules it applies are worth pinning: the right alliance, the right day, and
 * exactly once per reminder however often the tick runs.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import https from 'node:https'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-push-'))

// A self-signed cert for the stand-in push service: web-push always speaks TLS
// to an endpoint, so a plain HTTP server can never receive one.
execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-keyout', path.join(workdir, 'key.pem'),
  '-out', path.join(workdir, 'cert.pem'), '-days', '2', '-nodes',
  '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1',
], { stdio: 'ignore' })

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.PORT = '5399'
process.env.NODE_ENV = 'test'

const received = []
const fake = https.createServer(
  { key: fs.readFileSync(path.join(workdir, 'key.pem')), cert: fs.readFileSync(path.join(workdir, 'cert.pem')) },
  (req, res) => { received.push(req.url); res.writeHead(201).end() },
)
await new Promise((r) => fake.listen(0, '127.0.0.1', r))
const port = fake.address().port

const server = require('../server/index.cjs')
const Database = require('better-sqlite3')
const db = new Database(process.env.DB_PATH)

function subscribe(slug, name) {
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.generateKeys()
  db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint,p256dh,auth,alliance_slug) VALUES (?,?,?,?)').run(
    `https://127.0.0.1:${port}/push/${name}`,
    ecdh.getPublicKey().toString('base64url'),
    crypto.randomBytes(16).toString('base64url'),
    slug,
  )
}

function scheduleAt(slug, event, when, days) {
  const hhmm = `${String(when.getUTCHours()).padStart(2, '0')}:${String(when.getUTCMinutes()).padStart(2, '0')}`
  db.prepare(`INSERT INTO alliance_schedules (alliance_slug,event_name,event_time,event_days) VALUES (?,?,?,?)
    ON CONFLICT(alliance_slug,event_name) DO UPDATE SET event_time=excluded.event_time, event_days=excluded.event_days`)
    .run(slug, event, hhmm, days)
}

// Clear anything the seeded defaults would fire on its own during a test.
function quietEverything() {
  db.prepare("UPDATE alliance_schedules SET event_time=''").run()
  for (const slug of db.prepare('SELECT slug FROM alliances').all().map((a) => a.slug)) {
    for (const ev of ['Bear Hunt -1', 'Bear Hunt-2', 'Vikings Vengeance Tuesday', 'Vikings Vengeance Thursday',
      'Tri-Alliance Clash Legion-1', 'Tri-Alliance Clash Legion-2', 'Swordland Showdown Legion-1', 'Swordland Showdown Legion-2']) {
      db.prepare(`INSERT INTO alliance_schedules (alliance_slug,event_name,event_time,event_days) VALUES (?,?,'','')
        ON CONFLICT(alliance_slug,event_name) DO UPDATE SET event_time=''`).run(slug, ev)
    }
  }
}

test('days default to the day named in the event, and to daily otherwise', () => {
  assert.equal(server.defaultDaysFor('Vikings Vengeance Tuesday'), '2')
  assert.equal(server.defaultDaysFor('Vikings Vengeance Thursday'), '4')
  assert.equal(server.defaultDaysFor('Bear Hunt -1'), '0,1,2,3,4,5,6')
})

test('an unset or unparseable day list means every day, never no days', () => {
  assert.deepEqual(server.parseDays(''), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(server.parseDays(null), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(server.parseDays('2,4'), [2, 4])
  assert.deepEqual(server.parseDays('9,-1,x'), [])
})

test('a reminder reaches only the matching alliance, and only once', async () => {
  quietEverything()
  db.prepare('DELETE FROM push_sent').run()
  db.prepare('DELETE FROM push_subscriptions').run()
  received.length = 0

  const target = new Date(Date.now() + 10 * 60000)
  scheduleAt('ryo', 'Bear Hunt -1', target, String(target.getUTCDay()))
  subscribe('ryo', 'ryo-device')
  subscribe('ice', 'ice-device')

  await server.runReminderTick()
  assert.deepEqual(received, ['/push/ryo-device'], 'only the RYO device is pushed')

  // Running again inside the same minute must not send a second buzz.
  await server.runReminderTick()
  assert.equal(received.length, 1, 'the same reminder is never sent twice')
})

test('an event scheduled for another weekday stays silent', async () => {
  quietEverything()
  db.prepare('DELETE FROM push_sent').run()
  received.length = 0

  const target = new Date(Date.now() + 10 * 60000)
  scheduleAt('ryo', 'Bear Hunt -1', target, String((target.getUTCDay() + 3) % 7))

  await server.runReminderTick()
  assert.equal(received.length, 0)
})

test('both the 10 and 5 minute reminders fire, as separate sends', async () => {
  quietEverything()
  db.prepare('DELETE FROM push_sent').run()
  received.length = 0

  const now = Date.now()
  const ten = new Date(now + 10 * 60000)
  const five = new Date(now + 5 * 60000)
  scheduleAt('ryo', 'Bear Hunt -1', ten, String(ten.getUTCDay()))
  scheduleAt('ryo', 'Bear Hunt-2', five, String(five.getUTCDay()))

  await server.runReminderTick()
  assert.equal(received.length, 2, 'one at T-10 for the first event, one at T-5 for the second')
})

test.after(() => {
  fake.close()
  try { fs.rmSync(workdir, { recursive: true, force: true }) } catch {}
})

test('the arena reset is seeded at the confirmed 00:00 UTC', () => {
  const arena = server.arenaReset()
  assert.equal(arena.time, '00:00')
  assert.equal(arena.enabled, true)
  // Confirmed by the kingdom's admin rather than assumed, so the console shows
  // it as settled rather than warning about a guess.
  assert.equal(arena.confirmed, true)
})

test('the arena reminder is kingdom-wide, on both leads, and never repeats', async () => {
  quietEverything()
  db.prepare('DELETE FROM push_sent').run()
  db.prepare('DELETE FROM push_subscriptions').run()
  received.length = 0

  // Two devices in different alliances: the arena belongs to neither.
  subscribe('ryo', 'arena-ryo')
  subscribe('ice', 'arena-ice')

  // Set the reset so that "now + 10 minutes" lands on it.
  const target = new Date(Date.now() + 10 * 60000)
  const hhmm = `${String(target.getUTCHours()).padStart(2, '0')}:${String(target.getUTCMinutes()).padStart(2, '0')}`
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('arena_reset', JSON.stringify({ time: hhmm, enabled: true, confirmed: true }))

  await server.runReminderTick()
  assert.equal(received.length, 2, 'both alliances are reminded, not one')
  assert.ok(received.includes('/push/arena-ryo') && received.includes('/push/arena-ice'))

  await server.runReminderTick()
  assert.equal(received.length, 2, 'the same reminder never fires twice')
})

test('a device that switched arena reminders off is skipped', async () => {
  db.prepare('DELETE FROM push_sent').run()
  received.length = 0
  db.prepare("UPDATE push_subscriptions SET alert_arena=0 WHERE endpoint LIKE '%arena-ice'").run()

  const target = new Date(Date.now() + 5 * 60000)
  const hhmm = `${String(target.getUTCHours()).padStart(2, '0')}:${String(target.getUTCMinutes()).padStart(2, '0')}`
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('arena_reset', JSON.stringify({ time: hhmm, enabled: true, confirmed: true }))

  await server.runReminderTick()
  assert.deepEqual(received, ['/push/arena-ryo'])
})

test('turning the arena off for the kingdom silences it entirely', async () => {
  db.prepare('DELETE FROM push_sent').run()
  db.prepare('UPDATE push_subscriptions SET alert_arena=1').run()
  received.length = 0

  const target = new Date(Date.now() + 10 * 60000)
  const hhmm = `${String(target.getUTCHours()).padStart(2, '0')}:${String(target.getUTCMinutes()).padStart(2, '0')}`
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('arena_reset', JSON.stringify({ time: hhmm, enabled: false, confirmed: true }))

  await server.runReminderTick()
  assert.equal(received.length, 0)
})

test('a 00:00 arena reset reminds at 23:50 and 23:55 the night before', async () => {
  quietEverything()
  db.prepare('DELETE FROM push_sent').run()
  db.prepare('DELETE FROM push_subscriptions').run()
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
    .run('arena_reset', JSON.stringify({ time: '00:00', enabled: true, confirmed: true }))
  subscribe('ryo', 'midnight-device')
  received.length = 0

  // Midnight is the boundary that breaks this kind of code: the reminder fires
  // on one date and the event it announces happens on the next, so the dedupe
  // key and the clock disagree unless the key is taken from the target rather
  // than from now. Both leads are driven at their real wall-clock minute.
  const realDate = Date
  const runAt = async (hh, mm) => {
    const frozen = new realDate(realDate.UTC(2026, 8, 20, hh, mm, 0))
    globalThis.Date = class extends realDate {
      constructor(...args) { return args.length ? new realDate(...args) : new realDate(frozen) }
      static now() { return frozen.getTime() }
    }
    try { await server.runReminderTick() } finally { globalThis.Date = realDate }
  }

  await runAt(23, 50)
  assert.deepEqual(received, ['/push/midnight-device'], 'the ten-minute warning lands at 23:50')

  await runAt(23, 55)
  assert.equal(received.length, 2, 'the five-minute warning lands at 23:55 as a separate send')

  // Each is claimed under the date of the reset it announces, not the date it
  // was sent on, so re-running either minute cannot produce a third.
  const keys = db.prepare("SELECT key FROM push_sent WHERE key LIKE '%arena%' ORDER BY key").all().map((r) => r.key)
  assert.deepEqual(keys, ['2026-09-21|arena|10', '2026-09-21|arena|5'], 'both keyed to the 21st, the day the arena resets')

  await runAt(23, 50)
  await runAt(23, 55)
  assert.equal(received.length, 2, 'neither minute sends twice')
})

test('no arena reminder fires at any other minute of the day', async () => {
  db.prepare('DELETE FROM push_sent').run()
  received.length = 0
  const realDate = Date
  for (const [hh, mm] of [[23, 49], [23, 51], [23, 54], [23, 56], [0, 0], [12, 0]]) {
    const frozen = new realDate(realDate.UTC(2026, 8, 20, hh, mm, 0))
    globalThis.Date = class extends realDate {
      constructor(...args) { return args.length ? new realDate(...args) : new realDate(frozen) }
      static now() { return frozen.getTime() }
    }
    try { await server.runReminderTick() } finally { globalThis.Date = realDate }
  }
  assert.equal(received.length, 0, 'only 23:50 and 23:55 count')
})

test('a reminder carries artwork, buttons, and words that stand alone', () => {
  const ten = server.eventNotification({ event: 'Bear Hunt -1', slug: 'ryo', time: '04:00', lead: 10 })
  const five = server.eventNotification({ event: 'Bear Hunt -1', slug: 'ryo', time: '04:00', lead: 5 })

  // iOS shows no image and no buttons, so the body alone still has to carry the
  // alliance, the time, and the urgency.
  for (const n of [ten, five]) {
    assert.match(n.body, /\[RYO\]/)
    assert.match(n.body, /04:00 UTC/)
    assert.ok(n.image, 'the event brings its own art')
    assert.equal(n.actions.length, 2)
  }
  assert.equal(ten.image, '/assets/notif/art-bear-trap.png', 'a bear hunt looks like a bear hunt')

  // The last call is the insistent one: it stays on screen and buzzes harder.
  assert.equal(ten.urgent, false)
  assert.equal(five.urgent, true)
  assert.match(five.body, /Last call/)
  assert.notEqual(ten.title, five.title)
})

test('each event gets its own picture, and an unknown one still gets a picture', () => {
  const art = (event) => server.eventNotification({ event, slug: 'ryo', time: '04:00', lead: 10 }).image
  assert.equal(art('Bear Hunt-2'), '/assets/notif/art-bear-trap.png')
  assert.equal(art('Vikings Vengeance Tuesday'), '/assets/notif/art-castle-battle.png')
  assert.equal(art('Tri-Alliance Clash Legion-1'), '/assets/notif/art-kvk-prep.png')
  assert.equal(art('Swordland Showdown Legion-2'), '/assets/notif/art-castle-battle.png')
  // An event a leader renames must not arrive with a blank space where the
  // picture should be.
  assert.ok(art('Some Future Event'), 'there is always a fallback')
})

test('the arena reminder sharpens for the last call too', () => {
  const ten = server.arenaNotification({ time: '00:00', lead: 10 })
  const five = server.arenaNotification({ time: '00:00', lead: 5 })
  assert.match(ten.body, /Unspent challenges are lost/)
  assert.match(five.body, /Last chance/)
  assert.equal(five.urgent, true)
  assert.ok(ten.image && ten.actions.length === 2)
})

test('notification art is sized for a notification, not for a page', async () => {
  const { statSync } = await import('node:fs')
  // The page originals are around 2.6 MB. A phone fetches this twice per event,
  // often on mobile data, so anything approaching that weight is a bug.
  for (const name of ['art-bear-trap', 'art-castle-battle', 'art-kvk-prep']) {
    const bytes = statSync(`public/assets/notif/${name}.png`).size
    assert.ok(bytes < 400 * 1024, `${name} is ${Math.round(bytes / 1024)} KB, too heavy for a notification`)
  }
})
