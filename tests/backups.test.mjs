/* Backups are the one feature whose failure is invisible until the day it
 * matters. These pin the properties that make a copy worth having: it is taken
 * safely from a live database, it is checked before it is kept, a damaged one
 * is thrown away rather than filed, old ones are pruned, and the file the admin
 * downloads is the database and nothing else.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-backup-'))
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.BACKUP_DIR = path.join(workdir, 'backups')
process.env.BACKUP_KEEP = '3'
process.env.PORT = '5395'
process.env.NODE_ENV = 'test'

const server = require('../server/index.cjs')
const Database = require('better-sqlite3')
const BACKUPS = process.env.BACKUP_DIR

const dbFiles = () => fs.readdirSync(BACKUPS).filter((f) => f.endsWith('.db'))

test('a backup taken while the database is being written is intact', async () => {
  const db = new Database(process.env.DB_PATH)
  db.prepare("INSERT OR REPLACE INTO roster_members (alliance_slug,governor_id,name,position) VALUES ('ryo','CANARY','BackupCanary',1)").run()

  // WAL is exactly the case a plain file copy gets wrong, so keep writing
  // across the backup rather than pausing for it.
  let i = 0
  const churn = setInterval(() => {
    db.prepare("INSERT OR REPLACE INTO roster_members (alliance_slug,governor_id,name,position) VALUES ('kzk',?,?,?)")
      .run(`G${i}`, `Churn${i}`, i % 50)
    i++
  }, 1)
  const result = await server.runBackup({ manual: true })
  clearInterval(churn)
  db.close()

  assert.ok(result.ok, `backup failed: ${result.error}`)
  assert.ok(result.verified.ok)

  const copy = new Database(path.join(BACKUPS, result.name), { readonly: true })
  assert.equal(copy.pragma('integrity_check', { simple: true }), 'ok')
  assert.ok(copy.prepare("SELECT 1 FROM roster_members WHERE governor_id='CANARY'").get(), 'the copy holds the row written before it')
  assert.ok(copy.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table'").get().n > 10, 'the copy holds the schema')
  copy.close()
})

test('a damaged copy is rejected rather than kept', () => {
  const probe = path.join(BACKUPS, 'probe-damaged.db')
  fs.copyFileSync(path.join(BACKUPS, dbFiles()[0]), probe)
  assert.ok(server.verifyBackup(probe).ok, 'the undamaged copy verifies first')

  const buf = fs.readFileSync(probe)
  buf.fill(0, 4096, 20000)
  fs.writeFileSync(probe, buf)
  assert.equal(server.verifyBackup(probe).ok, false)
  fs.unlinkSync(probe)
})

test('an empty or absent file never counts as a backup', () => {
  const empty = path.join(BACKUPS, 'probe-empty.db')
  fs.writeFileSync(empty, '')
  assert.equal(server.verifyBackup(empty).ok, false)
  fs.unlinkSync(empty)
  assert.equal(server.verifyBackup(path.join(BACKUPS, 'does-not-exist.db')).ok, false)
})

test('old backups are pruned and no half-written files are left behind', async () => {
  for (let n = 0; n < 4; n++) {
    await server.runBackup({ manual: true })
    // The manual filename is second-resolution, so space them out or they
    // overwrite one another rather than accumulating.
    await new Promise((r) => setTimeout(r, 1100))
  }
  assert.equal(dbFiles().length, 3, 'BACKUP_KEEP=3 is honoured')
  assert.ok(fs.readdirSync(BACKUPS).every((f) => !f.endsWith('.part')), 'no temporary files survive')
})

test('the daily check does nothing on a day that already has a copy', async () => {
  const before = dbFiles().length
  await server.backupTick()
  assert.equal(dbFiles().length, before)
})

test('the download endpoint refuses anything that is not a backup name', async () => {
  const base = 'http://127.0.0.1:5395'
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'admin', username: 'sparta', password: 'SpartaAdmin_846!' }),
  }).then((r) => r.json())
  assert.ok(login.token, 'admin login works')
  const headers = { Authorization: `Bearer ${login.token}` }

  // This endpoint hands over the entire database, password hashes included.
  const unauth = await fetch(`${base}/api/admin/backups`)
  assert.equal(unauth.status, 401, 'the list requires a login')

  for (const attempt of ['../test.db', '..%2Ftest.db', 'evil.db', '....//test.db', 'k846-2026-01-01.db/../../test.db']) {
    const res = await fetch(`${base}/api/admin/backups/${encodeURIComponent(attempt)}`, { headers })
    assert.ok(res.status === 400 || res.status === 404, `"${attempt}" was refused (got ${res.status})`)
  }

  const name = dbFiles()[0]
  const res = await fetch(`${base}/api/admin/backups/${name}`, { headers })
  assert.equal(res.status, 200)
  const body = Buffer.from(await res.arrayBuffer())
  assert.equal(body.subarray(0, 15).toString(), 'SQLite format 3', 'a real database comes back')
})

test.after(() => {
  try { fs.rmSync(workdir, { recursive: true, force: true }) } catch {}
})

test('the Play Store asset links file is published, not swallowed by the SPA', async () => {
  const base = 'http://127.0.0.1:5395'
  const res = await fetch(`${base}/.well-known/assetlinks.json`)
  assert.equal(res.status, 200)
  // If the SPA fallback answered, this would be text/html and the Android
  // wrapper would fail verification silently — showing a browser URL bar across
  // the top of every screen with nothing to say why.
  assert.match(res.headers.get('content-type'), /application\/json/)
  const body = await res.json()
  assert.ok(Array.isArray(body), 'an array, as the Digital Asset Links spec requires')
  // No fingerprint is configured in the test environment, so it claims no app
  // rather than claiming the wrong one.
  assert.equal(body.length, 0)
})
