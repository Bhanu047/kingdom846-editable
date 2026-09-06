/* The War Room roster is one roster, shared by everyone who can open the room.
 *
 * The bug these pin is the reason the room was built the way it was: the roster
 * lived in localStorage, so it existed only on the device that typed it. Shoni
 * corrected a march time and neither Panini nor Sparta saw the correction --
 * three screens, three different plans, one rally going out unsynced.
 *
 * The rule is now simple: whatever any of the crew saves last is what all of
 * them read next, and a save built on a roster someone else has already
 * replaced is refused rather than quietly burying theirs.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'k846-warroom-'))
process.env.DB_PATH = path.join(workdir, 'test.db')
process.env.BACKUP_DIR = path.join(workdir, 'backups')
process.env.PORT = '5399'
process.env.NODE_ENV = 'test'

require('../server/index.cjs')
const BASE = 'http://127.0.0.1:5399'

for (let i = 0; i < 60; i++) {
  try { await fetch(`${BASE}/api/health`); break } catch { await new Promise((r) => setTimeout(r, 100)) }
}

async function login(username, password, mode = 'leader') {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, mode }),
  })
  const body = await res.json()
  return { status: res.status, body }
}

const authed = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
const read = async (token) => (await fetch(`${BASE}/api/war-room/roster`, { headers: authed(token) })).json()
const write = async (token, whales, version) => {
  const res = await fetch(`${BASE}/api/war-room/roster`, {
    method: 'PUT', headers: authed(token), body: JSON.stringify({ whales, version }),
  })
  return { status: res.status, body: await res.json() }
}

// The seeded accounts still hold their temporary passwords in a fresh database.
const tokenFor = async (username, password, mode = 'leader') => {
  const { status, body } = await login(username, password, mode)
  assert.equal(status, 200, `${username} could not sign in: ${JSON.stringify(body)}`)
  return body.token
}

test('panini and anonymous exist and can sign in through the leader door', async () => {
  for (const [username, password, display] of [
    ['panini', 'PaniniWar_846!', 'Panini'],
    ['anonymous', 'AnonWar_846!', 'Anonymous'],
  ]) {
    const { status, body } = await login(username, password)
    assert.equal(status, 200)
    assert.equal(body.user.role, 'warroom')
    assert.equal(body.user.display_name, display)
    // Seeded with a temporary password, so the first login asks for their own.
    assert.equal(body.user.must_change_password, true)
  }
})

test('the war room accounts are not admins and not alliance leaders', async () => {
  // Royal Access stays Sparta's alone.
  const royal = await login('panini', 'PaniniWar_846!', 'admin')
  assert.equal(royal.status, 403)

  const token = await tokenFor('panini', 'PaniniWar_846!')
  // A leader's roster upload is not theirs to touch.
  const roster = await fetch(`${BASE}/api/leader/roster`, { headers: authed(token) })
  assert.equal(roster.status, 403)
  // Nor is anything behind the admin gate.
  const leaders = await fetch(`${BASE}/api/admin/leaders`, { headers: authed(token) })
  assert.equal(leaders.status, 403)
})

test('what Shoni saves is what Panini, Anonymous and Sparta read', async () => {
  const shoni = await tokenFor('shoni', 'ShoniRyo_846!')
  const panini = await tokenFor('panini', 'PaniniWar_846!')
  const anon = await tokenFor('anonymous', 'AnonWar_846!')
  const sparta = await tokenFor('sparta', 'SpartaAdmin_846!', 'admin')

  const start = await read(shoni)
  const saved = await write(shoni, [
    { id: 'a', name: 'Bru', march: '1:12', status: 'RYO' },
    { id: 'b', name: 'Kaz', march: '0:48', status: 'Castle Garrison' },
  ], start.version)
  assert.equal(saved.status, 200)

  for (const [who, token] of [['panini', panini], ['anonymous', anon], ['sparta', sparta]]) {
    const seen = await read(token)
    assert.deepEqual(seen.whales.map((w) => `${w.name}@${w.march}`), ['Bru@1:12', 'Kaz@0:48'], `${who} saw a different roster`)
    assert.equal(seen.updated_by, 'Shoni')
  }
})

test("and what Anonymous saves comes back to everyone else, Sparta included", async () => {
  const anon = await tokenFor('anonymous', 'AnonWar_846!')
  const shoni = await tokenFor('shoni', 'ShoniRyo_846!')
  const sparta = await tokenFor('sparta', 'SpartaAdmin_846!', 'admin')

  const current = await read(anon)
  const saved = await write(anon, [{ id: 'c', name: 'Nyx', march: '2:05', status: 'HUN' }], current.version)
  assert.equal(saved.status, 200)
  assert.equal(saved.body.updated_by, 'Anonymous')

  for (const token of [shoni, sparta]) {
    const seen = await read(token)
    assert.deepEqual(seen.whales.map((w) => w.name), ['Nyx'])
    assert.equal(seen.updated_by, 'Anonymous')
  }

  // Sparta writes too, and the crew reads that.
  const afterAnon = await read(sparta)
  const bySparta = await write(sparta, [{ id: 'c', name: 'Nyx', march: '2:30', status: 'HUN' }], afterAnon.version)
  assert.equal(bySparta.status, 200)
  assert.equal((await read(anon)).whales[0].march, '2:30')
})

test('a save built on a roster someone else already replaced is refused, not applied', async () => {
  const shoni = await tokenFor('shoni', 'ShoniRyo_846!')
  const panini = await tokenFor('panini', 'PaniniWar_846!')

  // Both open the room on the same version.
  const base = await read(shoni)
  const shoniSave = await write(shoni, [{ id: 'x', name: 'Shoni edit', march: '1:00', status: 'RYO' }], base.version)
  assert.equal(shoniSave.status, 200)

  const stale = await write(panini, [{ id: 'y', name: 'Panini edit', march: '0:40', status: 'ICE' }], base.version)
  assert.equal(stale.status, 409)
  // The refusal hands back what is really stored, so the room can show it.
  assert.deepEqual(stale.body.whales.map((w) => w.name), ['Shoni edit'])
  assert.equal((await read(shoni)).whales[0].name, 'Shoni edit')

  // Told what they would replace, Panini can still choose to: a save with no
  // version is a deliberate overwrite.
  const forced = await write(panini, [{ id: 'y', name: 'Panini edit', march: '0:40', status: 'ICE' }], undefined)
  assert.equal(forced.status, 200)
  assert.deepEqual((await read(shoni)).whales.map((w) => w.name), ['Panini edit'])
})

test('the room is closed to everyone else', async () => {
  const outsider = await tokenFor('lovelykhaos', 'LovelyKzK_846!')
  const res = await fetch(`${BASE}/api/war-room/roster`, { headers: authed(outsider) })
  assert.equal(res.status, 403)
  const put = await write(outsider, [{ id: 'z', name: 'nope', march: '1:00' }], undefined)
  assert.equal(put.status, 403)
  // And to anyone with no token at all.
  assert.equal((await fetch(`${BASE}/api/war-room/roster`)).status, 401)
})
