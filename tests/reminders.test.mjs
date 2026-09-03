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
