/* The Settings toggles were component state with hard-coded defaults: nothing
 * stored them and nothing sent anything when they were on, so switching one on
 * lasted exactly as long as the app stayed open. These pin the two properties
 * that were missing — the choice is remembered, and something acts on it.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import https from 'node:https'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { PW } from './_seed-passwords.mjs'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-prefs-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', path.join(workdir, 'key.pem'),
  '-out', path.join(workdir, 'cert.pem'), '-days', '2', '-nodes', '-subj', '/CN=127.0.0.1',
  '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' })

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.BACKUP_DIR = path.join(workdir, 'backups')
process.env.PORT = '5393'
process.env.NODE_ENV = 'test'

const received = []
const fake = https.createServer(
  { key: fs.readFileSync(path.join(workdir, 'key.pem')), cert: fs.readFileSync(path.join(workdir, 'cert.pem')) },
  (req, res) => { received.push(req.url); res.writeHead(201).end() })
await new Promise((r) => fake.listen(0, '127.0.0.1', r))
const pushPort = fake.address().port

const server = require('../server/index.cjs')
const Database = require('better-sqlite3')
const db = new Database(process.env.DB_PATH)
const BASE = 'http://127.0.0.1:5393'

// Requiring the server starts it listening asynchronously; without waiting for
// it the first request races the bind and fails with ECONNREFUSED.
for (let i = 0; i < 60; i++) {
  try { await fetch(`${BASE}/api/health`); break } catch { await new Promise((r) => setTimeout(r, 100)) }
}

function realKeys() {
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys()
  return { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') }
}

async function subscribe(name, slug = 'ryo') {
  const endpoint = `https://127.0.0.1:${pushPort}/dev/${name}`
  const res = await fetch(`${BASE}/api/push/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: { endpoint, keys: realKeys() }, alliance_slug: slug }),
  })
  assert.equal(res.status, 200)
  return endpoint
}

const getPrefs = async (endpoint) => (await fetch(`${BASE}/api/push/status`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }),
}).then((r) => r.json()))

test('a digest choice is stored, and is still there on the next launch', async () => {
  const endpoint = await subscribe('digest-device')

  // The reported symptom: it defaulted off and reverted every time.
  assert.equal((await getPrefs(endpoint)).prefs.digest_weekly, false)

  const set = await fetch(`${BASE}/api/push/prefs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, prefs: { digest_weekly: true } }),
  }).then((r) => r.json())
  assert.equal(set.prefs.digest_weekly, true)

  // Reading it back is what the app does on every launch.
  assert.equal((await getPrefs(endpoint)).prefs.digest_weekly, true, 'the choice survives')
})

test('the weekly digest goes only to devices that asked for it, once a week', async () => {
  db.prepare('DELETE FROM push_subscriptions').run()
  db.prepare('DELETE FROM push_sent').run()
  received.length = 0

  const wants = await subscribe('wants-digest')
  await subscribe('no-digest')
  await fetch(`${BASE}/api/push/prefs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: wants, prefs: { digest_weekly: true } }),
  })

  // digestTick only fires on its day and hour, so drive the send by claiming
  // the same week key it would and calling it on a Monday-shaped clock.
  const realDate = Date
  const monday = new realDate(realDate.UTC(2026, 8, 7, 12, 30))   // a Monday, 12:30 UTC
  globalThis.Date = class extends realDate {
    constructor(...args) { return args.length ? new realDate(...args) : new realDate(monday) }
    static now() { return monday.getTime() }
  }
  try {
    await server.digestTick()
    assert.deepEqual(received, ['/dev/wants-digest'], 'only the device that opted in')
    await server.digestTick()
    assert.equal(received.length, 1, 'the same week never sends twice')
  } finally { globalThis.Date = realDate }
})

test('the week key rolls over correctly across a year boundary', () => {
  // 2026-12-31 is a Thursday, so it belongs to week 53 of 2026, not week 1 of 2027.
  assert.equal(server.isoWeekKey(new Date(Date.UTC(2026, 11, 31))), '2026-W53')
  assert.equal(server.isoWeekKey(new Date(Date.UTC(2027, 0, 4))), '2027-W01')
  // Two days in the same week share a key, which is what stops a second digest.
  assert.equal(server.isoWeekKey(new Date(Date.UTC(2026, 8, 7))), server.isoWeekKey(new Date(Date.UTC(2026, 8, 11))))
})


test('preferences for an unknown device are refused rather than invented', async () => {
  const res = await fetch(`${BASE}/api/push/prefs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'https://not-a-real-device/x', prefs: { digest_weekly: true } }),
  })
  assert.equal(res.status, 404)
})

async function adminToken() {
  const out = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'admin', username: 'sparta', password: PW.sparta }),
  }).then((r) => r.json())
  return out.token
}

const setKing = (token, body) => fetch(`${BASE}/api/king-status`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
})

test('crowning a new ruler tells the whole kingdom', async () => {
  db.prepare('DELETE FROM push_subscriptions').run()
  await subscribe('crown-ryo', 'ryo')
  await subscribe('crown-ice', 'ice')
  received.length = 0

  const token = await adminToken()
  const res = await setKing(token, { king_type: 'High Queen', name: 'Lady Charlotte', alliance_tag: '[SAS]', alliance_name: 'SaintsAndSinners' })
  assert.equal(res.status, 200)
  // The push is sent after the response, so give it a moment to land.
  await new Promise((r) => setTimeout(r, 400))

  assert.equal(received.length, 2, 'every alliance is told, not just one')
  assert.ok(received.includes('/dev/crown-ryo') && received.includes('/dev/crown-ice'))
})

test('saving the same ruler again announces nothing', async () => {
  received.length = 0
  const token = await adminToken()
  // Opening the console and saving without changing anything is a normal thing
  // to do; it must not read as a coronation.
  await setKing(token, { king_type: 'High Queen', name: 'Lady Charlotte', alliance_tag: '[SAS]', alliance_name: 'SaintsAndSinners' })
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(received.length, 0)
})

test('any part of the title changing counts as a new ruler', async () => {
  const token = await adminToken()
  for (const change of [
    { king_type: 'Queen', name: 'Lady Charlotte', alliance_tag: '[SAS]', alliance_name: 'SaintsAndSinners' },
    { king_type: 'Queen', name: 'Shoni', alliance_tag: '[SAS]', alliance_name: 'SaintsAndSinners' },
    { king_type: 'Queen', name: 'Shoni', alliance_tag: '[RYO]', alliance_name: 'Spiders' },
  ]) {
    received.length = 0
    await setKing(token, change)
    await new Promise((r) => setTimeout(r, 400))
    assert.equal(received.length, 2, `changing to ${JSON.stringify(change)} announces`)
  }
})

test('a device that switched the crown alert off is not told', async () => {
  db.prepare("UPDATE push_subscriptions SET alert_crown=0 WHERE endpoint LIKE '%crown-ice'").run()
  received.length = 0
  const token = await adminToken()
  await setKing(token, { king_type: 'High King', name: 'Oliver', alliance_tag: '[KzK]', alliance_name: 'KamikazeKarnival' })
  await new Promise((r) => setTimeout(r, 400))
  assert.deepEqual(received, ['/dev/crown-ryo'])
})

test('only Sparta can crown anyone', async () => {
  received.length = 0
  const res = await fetch(`${BASE}/api/king-status`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ king_type: 'King', name: 'Impostor' }),
  })
  assert.equal(res.status, 401)
  await new Promise((r) => setTimeout(r, 300))
  assert.equal(received.length, 0, 'a refused change announces nothing')
})

test.after(() => {
  fake.close()
  try { fs.rmSync(workdir, { recursive: true, force: true }) } catch {}
})
