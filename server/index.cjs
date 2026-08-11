const express = require('express')
const Database = require('better-sqlite3')
const crypto = require('crypto')
const path = require('path')
const XLSX = require('xlsx')

const app = express()
app.use(express.json({ limit: '1mb' }))

// --- Database (path configurable for cloud persistent volumes) ---
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data.db')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    alliance_slug TEXT
  );
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    game_id TEXT NOT NULL,
    discord TEXT NOT NULL,
    alliance TEXT,
    note TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS site_content (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    updated_by TEXT
  );
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    player_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    request_kind TEXT,
    day TEXT,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS king_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    king_type TEXT NOT NULL,
    name TEXT NOT NULL,
    alliance_tag TEXT,
    alliance_name TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS roster_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alliance_slug TEXT NOT NULL,
    governor_id TEXT,
    name TEXT NOT NULL,
    position INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_unique ON roster_members(alliance_slug, governor_id) WHERE governor_id IS NOT NULL;
  CREATE TABLE IF NOT EXISTS alliance_schedules (
    alliance_slug TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_time TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (alliance_slug, event_name)
  );
  CREATE TABLE IF NOT EXISTS kingshot_sync (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    date TEXT,
    excerpt TEXT,
    body TEXT,
    source TEXT,
    art TEXT,
    read_time TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
  );
`)
// Seed default king
if (!db.prepare('SELECT id FROM king_status WHERE id = ?').get(1)) {
  db.prepare('INSERT INTO king_status (id, king_type, name, alliance_tag, alliance_name) VALUES (1,?,?,?,?)').run('King', 'Oliver', '[SAS]', 'SaintsAndSinners')
}

// --- Auth helpers (no external deps) ---
const SECRET = 'k846-' + (process.env.SESSION_SECRET || 'realm-secret-9f3a7c2e')
const hash = (pw) => crypto.scryptSync(pw, SECRET, 64).toString('hex')
const verify = (pw, h) => {
  try { return crypto.scryptSync(pw, SECRET, 64).toString('hex') === h } catch { return false }
}
const makeToken = (userId) => {
  const payload = Buffer.from(String(userId)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(String(userId)).digest('base64url')
  return `${payload}.${sig}`
}
const verifyToken = (token) => {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const userId = Buffer.from(payload, 'base64url').toString()
  const expected = crypto.createHmac('sha256', SECRET).update(userId).digest('base64url')
  return sig === expected ? Number(userId) : null
}

// Migrate: add display_name + alliance_tag columns if missing (table already exists)
const cols = db.prepare("PRAGMA table_info(users)").all()
if (!cols.some((c) => c.name === 'display_name')) db.exec('ALTER TABLE users ADD COLUMN display_name TEXT')
if (!cols.some((c) => c.name === 'alliance_tag')) db.exec('ALTER TABLE users ADD COLUMN alliance_tag TEXT')

// Migrate: add preferred_date + preferred_slot to transfers (30-min appointment booking)
const tcols = db.prepare("PRAGMA table_info(transfers)").all()
if (!tcols.some((c) => c.name === 'preferred_date')) db.exec('ALTER TABLE transfers ADD COLUMN preferred_date TEXT')
if (!tcols.some((c) => c.name === 'preferred_slot')) db.exec('ALTER TABLE transfers ADD COLUMN preferred_slot TEXT')
if (!tcols.some((c) => c.name === 'assigned_slot')) db.exec('ALTER TABLE transfers ADD COLUMN assigned_slot TEXT')

// --- Seed 5 accounts (server-side only; never in the frontend bundle) ---
const SEED = [
  { username: 'sparta', password: 'SpartaAdmin_846!', role: 'admin', display_name: 'Sparta (Sovereign)', alliance_tag: '[RYO]', alliance: 'ryo' },
  { username: 'shoni', password: 'ShoniRyo_846!', role: 'leader', display_name: 'Shoni', alliance_tag: '[RYO]', alliance: 'ryo' },
  { username: 'lovelykhaos', password: 'LovelyKzK_846!', role: 'leader', display_name: 'Lovely Khaos', alliance_tag: '[KzK]', alliance: 'kzk' },
  { username: 'ladycharlotte', password: 'CharlotteSas_846!', role: 'leader', display_name: 'Lady Charlotte', alliance_tag: '[SAS]', alliance: 'sas' },
  { username: 'dunngeon', password: 'DunngeonIce_846!', role: 'leader', display_name: 'Dunngeon', alliance_tag: '[ICE]', alliance: 'ice' },
]
const exists = db.prepare('SELECT id, display_name FROM users WHERE username = ?')
const ins = db.prepare('INSERT INTO users (username, password_hash, role, alliance_slug, display_name, alliance_tag) VALUES (?,?,?,?,?,?)')
for (const u of SEED) {
  const row = exists.get(u.username)
  if (!row) ins.run(u.username, hash(u.password), u.role, u.alliance, u.display_name, u.alliance_tag)
  else if (!row.display_name) db.prepare('UPDATE users SET display_name=?, alliance_tag=? WHERE id=?').run(u.display_name, u.alliance_tag, row.id)
}

// Remove deprecated accounts
db.prepare("DELETE FROM users WHERE username = 'tuttertua'").run()

function auth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  const userId = verifyToken(token)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}
const adminOnly = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' })
const leadershipOnly = (req, res, next) => (req.user.role === 'admin' || req.user.role === 'leader') ? next() : res.status(403).json({ error: 'Leadership only' })

// --- Rate limiting (in-memory, per-IP) ---
const loginAttempts = new Map()
const RL_WINDOW = 5 * 60 * 1000  // 5 minutes
const RL_MAX = 10  // max 10 attempts per window
function checkRateLimit(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RL_WINDOW })
    return { allowed: true }
  }
  entry.count++
  if (entry.count > RL_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { allowed: true }
}
function clearRateLimit(ip) {
  loginAttempts.delete(ip)
}

// --- Routes ---
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.post('/api/login', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: `Too many login attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} minute(s).` })
  }
  const { username, password, mode } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim().toLowerCase())
  if (!user || !verify(password || '', user.password_hash)) return res.status(401).json({ error: 'Invalid username or password' })
  if (mode === 'admin' && user.role !== 'admin') return res.status(403).json({ error: 'This login is for the Sparta master account only.' })
  if (mode === 'leader' && user.role !== 'leader') return res.status(403).json({ error: 'Leader login only. Sparta uses Royal Access.' })
  clearRateLimit(ip)
  res.json({ token: makeToken(user.id), user: { id: user.id, username: user.username, role: user.role, alliance_slug: user.alliance_slug, display_name: user.display_name, alliance_tag: user.alliance_tag } })
}),

app.get('/api/me', auth, (req, res) => res.json({ id: req.user.id, username: req.user.username, role: req.user.role, alliance_slug: req.user.alliance_slug, display_name: req.user.display_name, alliance_tag: req.user.alliance_tag }))

// Transfers — public submit (with 30-min slot booking), leadership view
// Generate 30-min slots across 24h (UTC): 00:00, 00:30, ... 23:30
const SLOTS_30 = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2), m = (i % 2) * 30
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
})
const takenSlotsForDate = (date) => db.prepare(
  "SELECT preferred_slot FROM transfers WHERE preferred_date = ? AND preferred_slot IS NOT NULL AND status != 'done'"
).all(date).map((r) => r.preferred_slot)

app.post('/api/transfers', (req, res) => {
  const { name, game_id, discord, alliance, note, preferred_date, preferred_slot } = req.body || {}
  if (!name || !game_id || !discord) return res.status(400).json({ error: 'Name, Player ID, and Discord are required' })
  const assign = db.transaction(() => {
    // 'any' = non-emergency: auto-assign the first free 30-min slot (search up to 14 days)
    if (preferred_slot === 'any') {
      const base = preferred_date ? new Date(preferred_date + 'T00:00:00Z') : new Date()
      for (let d = 0; d < 14; d++) {
        const date = new Date(base.getTime() + d * 86400000)
        const iso = date.toISOString().slice(0, 10)
        const taken = new Set(takenSlotsForDate(iso))
        const free = SLOTS_30.find((s) => !taken.has(s))
        if (free) return { date: iso, slot: free }
      }
      return null
    }
    // specific slot: conflict if another non-done transfer already holds it
    if (preferred_date && preferred_slot) {
      const taken = new Set(takenSlotsForDate(preferred_date))
      if (taken.has(preferred_slot)) return { conflict: true, slot: preferred_slot, date: preferred_date }
      return { date: preferred_date, slot: preferred_slot }
    }
    return { date: null, slot: null }
  })
  const result = assign()
  if (!result) return res.status(409).json({ error: 'No free slots in the next 14 days. Please contact leadership on Discord.', taken: true })
  if (result.conflict) return res.status(409).json({ error: `That time (${result.slot} UTC on ${result.date}) is already reserved. Please pick another slot or choose "Any available time".`, taken: true, slot: result.slot, date: result.date })
  const info = db.prepare('INSERT INTO transfers (name, game_id, discord, alliance, note, preferred_date, preferred_slot, assigned_slot) VALUES (?,?,?,?,?,?,?,?)').run(name, game_id, discord, alliance || null, note || null, result.date, result.slot, result.slot)
  res.json({ ok: true, id: info.lastInsertRowid, assigned_date: result.date, assigned_slot: result.slot })
})
// Public: which 30-min slots are already taken on a given date (so the form can show availability)
app.get('/api/transfers/slots', (req, res) => {
  const date = String(req.query.date || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json({ taken: [], slots: SLOTS_30 })
  res.json({ date, taken: takenSlotsForDate(date), slots: SLOTS_30 })
})
// Leadership (admin or leader) can view transfer requests to monitor recruitment
app.get('/api/transfers', auth, leadershipOnly, (_req, res) => res.json(db.prepare('SELECT * FROM transfers ORDER BY created_at DESC').all()))
app.patch('/api/transfers/:id', auth, adminOnly, (req, res) => {
  db.prepare('UPDATE transfers SET status = ? WHERE id = ?').run(req.body.status || 'new', req.params.id)
  res.json({ ok: true })
})
// CSV export for leadership (downloadable from Leader Portal / Transfer page)
app.get('/api/transfers/export', auth, leadershipOnly, (_req, res) => {
  const rows = db.prepare('SELECT id, name, game_id, discord, alliance, note, preferred_date, preferred_slot, assigned_slot, status, created_at FROM transfers ORDER BY created_at DESC').all()
  const csv = (head, body) => head + '\n' + body.map((r) => head.split(',').map((k) => {
    const v = r[k] == null ? '' : String(r[k]).replace(/"/g, '""')
    return /[",\n]/.test(v) ? '"' + v + '"' : v
  }).join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="kingdom846-transfers.csv"')
  res.send(csv('id,name,game_id,discord,alliance,note,preferred_date,preferred_slot,assigned_slot,status,created_at', rows))
})

// Site content — public read, admin write
app.get('/api/content', (_req, res) => {
  const row = db.prepare('SELECT * FROM site_content WHERE id = ?').get('current')
  res.json(row ? { data: JSON.parse(row.data), updated_at: row.updated_at } : { data: null })
})
app.put('/api/content', auth, adminOnly, (req, res) => {
  const data = JSON.stringify(req.body)
  db.prepare("INSERT INTO site_content (id, data, updated_by) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=datetime('now'), updated_by=excluded.updated_by").run('current', data, String(req.user.id))
  res.json({ ok: true })
})

// King status — public read, admin update
app.get('/api/king-status', (_req, res) => {
  const row = db.prepare('SELECT king_type, name, alliance_tag, alliance_name, updated_at FROM king_status WHERE id = 1').get()
  res.json(row || { king_type: 'High King', name: 'King Spartan', alliance_tag: '[RYO]', alliance_name: 'Spiders' })
})
app.put('/api/king-status', auth, adminOnly, (req, res) => {
  const { king_type, name, alliance_tag, alliance_name } = req.body || {}
  db.prepare("UPDATE king_status SET king_type=?, name=?, alliance_tag=?, alliance_name=?, updated_at=datetime('now') WHERE id=1").run(
    king_type || 'King', name || 'King Spartan', alliance_tag || '[RYO]', alliance_name || 'Spiders')
  res.json({ ok: true })
})

// Applications — public submit, admin view/manage
app.post('/api/applications', (req, res) => {
  const { type, player_id, nickname, request_kind, day, payload } = req.body || {}
  if (!type || !player_id || !nickname) return res.status(400).json({ error: 'Type, Player ID, and Nickname are required' })
  const info = db.prepare('INSERT INTO applications (type, player_id, nickname, request_kind, day, payload) VALUES (?,?,?,?,?,?)')
    .run(type, player_id, nickname, request_kind || null, day || null, JSON.stringify(payload || {}))
  res.json({ ok: true, id: info.lastInsertRowid })
})
app.get('/api/applications', auth, leadershipOnly, (_req, res) =>
  res.json(db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all()))
app.get('/api/applications/export', auth, leadershipOnly, (_req, res) => {
  const rows = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all()
  const flat = rows.map((r) => {
    let p = {}
    try { p = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {}) } catch {}
    const out = {
      ID: r.id,
      Type: r.type === 'chief_minister' ? 'Chief Minister' : r.type === 'noble_advisor' ? 'Noble Advisor' : r.type,
      'Player ID': r.player_id,
      Nickname: r.nickname,
      'Request Kind': r.request_kind || '',
      Day: r.day || '',
      Status: r.status,
      'Submitted (UTC)': r.created_at,
    }
    // flatten known payload fields, prefixed
    const known = ['ttg','tg','dust','tcFrom','tcTo','speedups','troopSpeedups','r1_from','r1_until','r2_from','r2_until']
    known.forEach((k) => { if (p[k] !== undefined && p[k] !== '') out[k] = p[k] })
    // any extra payload keys not already covered
    Object.keys(p || {}).forEach((k) => { if (!(k in out) && p[k] !== undefined && p[k] !== '') out['payload_'+k] = p[k] })
    return out
  })
  const ws = XLSX.utils.json_to_sheet(flat.length ? flat : [{}])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Applications')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="kingdom846-applications.xlsx"')
  res.send(buf)
})
app.patch('/api/applications/:id', auth, adminOnly, (req, res) => {
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(req.body.status || 'new', req.params.id)
  res.json({ ok: true })
})

// Account & leader management — auth required
app.patch('/api/me/credentials', auth, (req, res) => {
  const { current_password, username, new_password } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!verify(current_password || '', user.password_hash)) return res.status(401).json({ error: 'Current password is incorrect' })
  const newUsername = String(username || '').trim().toLowerCase()
  if (!newUsername) return res.status(400).json({ error: 'Username is required' })
  if (newUsername !== user.username) {
    const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, user.id)
    if (clash) return res.status(409).json({ error: 'That username is already taken' })
  }
  const pw = String(new_password || '').trim()
  if (pw && pw.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })
  db.prepare('UPDATE users SET username=?, password_hash=? WHERE id=?').run(newUsername, pw ? hash(pw) : user.password_hash, user.id)
  res.json({ ok: true })
})

app.get('/api/admin/leaders', auth, adminOnly, (_req, res) => {
  res.json(db.prepare("SELECT id, username, display_name, alliance_tag, alliance_slug, role FROM users WHERE role='leader' ORDER BY alliance_slug").all())
})

app.patch('/api/admin/leaders/:id/credentials', auth, adminOnly, (req, res) => {
  const id = Number(req.params.id)
  const leader = db.prepare("SELECT * FROM users WHERE id=? AND role='leader'").get(id)
  if (!leader) return res.status(404).json({ error: 'Leader not found' })
  const username = String(req.body.username || '').trim().toLowerCase()
  const new_password = String(req.body.new_password || '').trim()
  if (username && username !== leader.username) {
    const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
    if (clash) return res.status(409).json({ error: 'That username is already taken' })
  }
  if (new_password && new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const finalUser = username || leader.username
  const finalHash = new_password ? hash(new_password) : leader.password_hash
  db.prepare('UPDATE users SET username=?, password_hash=? WHERE id=?').run(finalUser, finalHash, id)
  res.json({ ok: true })
})

// --- Leader roster upload (leader-only) ---
const leaderOnly = (req, res, next) => req.user.role === 'leader' ? next() : res.status(403).json({ error: 'Leader access only' })

// Alliance event schedule — leaders can view and update their own alliance's event times
const ALLIANCE_EVENTS = [
  'Bear Hunt -1', 'Bear Hunt-2',
  'Vikings Vengeance Tuesday', 'Vikings Vengeance Thursday',
  'Tri-Alliance Clash Legion-1', 'Tri-Alliance Clash Legion-2',
  'Swordland Showdown Legion-1', 'Swordland Showdown Legion-2'
]

// Public: get all alliance schedules (for Events/Alliances pages)
app.get('/api/alliance-schedules', (_req, res) => {
  const rows = db.prepare('SELECT * FROM alliance_schedules').all()
  res.json(rows)
})

// Default schedule per alliance (from kingdom.js static data)
const SCHEDULE_DEFAULTS = {
  ryo: { 'Bear Hunt -1': '04:00', 'Bear Hunt-2': '12:00', 'Vikings Vengeance Tuesday': '16:00', 'Vikings Vengeance Thursday': '16:00', 'Tri-Alliance Clash Legion-1': '20:00', 'Tri-Alliance Clash Legion-2': '20:00', 'Swordland Showdown Legion-1': '21:00', 'Swordland Showdown Legion-2': '21:00' },
  kzk: { 'Bear Hunt -1': '04:00', 'Bear Hunt-2': '12:00', 'Vikings Vengeance Tuesday': '16:00', 'Vikings Vengeance Thursday': '16:00', 'Tri-Alliance Clash Legion-1': '20:00', 'Tri-Alliance Clash Legion-2': '20:00', 'Swordland Showdown Legion-1': '21:00', 'Swordland Showdown Legion-2': '21:00' },
  sas: { 'Bear Hunt -1': '04:00', 'Bear Hunt-2': '12:00', 'Vikings Vengeance Tuesday': '16:00', 'Vikings Vengeance Thursday': '16:00', 'Tri-Alliance Clash Legion-1': '20:00', 'Tri-Alliance Clash Legion-2': '20:00', 'Swordland Showdown Legion-1': '21:00', 'Swordland Showdown Legion-2': '21:00' },
  ice: { 'Bear Hunt -1': '14:00', 'Bear Hunt-2': '22:00', 'Vikings Vengeance Tuesday': '02:00', 'Vikings Vengeance Thursday': '02:00', 'Tri-Alliance Clash Legion-1': '06:00', 'Tri-Alliance Clash Legion-2': '06:00', 'Swordland Showdown Legion-1': '07:00', 'Swordland Showdown Legion-2': '07:00' },
}

// Leader: get their alliance's event schedule
app.get('/api/leader/schedule', auth, leaderOnly, (req, res) => {
  const slug = req.user.alliance_slug
  const rows = db.prepare('SELECT event_name, event_time, updated_at FROM alliance_schedules WHERE alliance_slug = ?').all(slug)
  const defaults = SCHEDULE_DEFAULTS[slug] || {}
  const schedule = ALLIANCE_EVENTS.map(event => {
    const match = rows.find(r => r.event_name === event)
    return { event, time: match?.event_time || defaults[event] || '', updated: match?.updated_at || null }
  })
  res.json({ alliance_slug: slug, schedule })
})

// Leader: update their alliance's event schedule
app.put('/api/leader/schedule', auth, leaderOnly, (req, res) => {
  const slug = req.user.alliance_slug
  const { schedule } = req.body
  if (!Array.isArray(schedule)) return res.status(400).json({ error: 'Schedule array required' })
  const stmt = db.prepare("INSERT INTO alliance_schedules (alliance_slug, event_name, event_time, updated_at) VALUES (?,?,?,datetime('now')) ON CONFLICT(alliance_slug, event_name) DO UPDATE SET event_time=excluded.event_time, updated_at=datetime('now')")
  for (const item of schedule) {
    if (item.event && ALLIANCE_EVENTS.includes(item.event)) {
      stmt.run(slug, item.event, item.time || '')
    }
  }
  res.json({ ok: true, alliance_slug: slug, updated: schedule.length })
})

app.get('/api/leader/roster', auth, leaderOnly, (req, res) => {
  const slug = req.user.alliance_slug
  res.json({ alliance_slug: slug, members: db.prepare('SELECT governor_id, name, position FROM roster_members WHERE alliance_slug=? ORDER BY position IS NULL, position, id').all(slug) })
})

app.post('/api/leader/roster', auth, leaderOnly, (req, res) => {
  const slug = req.user.alliance_slug
  if (!slug) return res.status(400).json({ error: 'No alliance assigned to this account' })
  const raw = Array.isArray(req.body && req.body.members) ? req.body.members : []
  if (raw.length > 2000) return res.status(400).json({ error: 'Too many rows (max 2000)' })
  const mapped = raw.map((m) => ({
    governor_id: String(m.governorId ?? m.governor_id ?? '').trim().slice(0, 64),
    name: String(m.name ?? '').trim().slice(0, 64),
    position: m.position != null && !isNaN(Number(m.position)) ? Number(m.position) : null,
  })).filter((m) => m.name)
  // Deduplicate by governor_id (keep first occurrence); empty IDs are allowed to repeat
  const seen = new Set()
  const clean = mapped.filter((m) => {
    if (!m.governor_id) return true
    if (seen.has(m.governor_id)) return false
    seen.add(m.governor_id)
    return true
  })
  const tx = db.transaction((rows) => {
    db.prepare('DELETE FROM roster_members WHERE alliance_slug=?').run(slug)
    const stmt = db.prepare('INSERT INTO roster_members (alliance_slug, governor_id, name, position) VALUES (?,?,?,?)')
    let pos = 1
    for (const r of rows) {
      stmt.run(slug, r.governor_id || null, r.name, r.position != null ? r.position : pos)
      pos++
    }
  })
  tx(clean)
  res.json({ ok: true, count: clean.length })
})

// Public roster (all alliances) — feeds Rankings / Hall of Legends
app.get('/api/roster', (_req, res) => {
  const rows = db.prepare('SELECT alliance_slug, name, position FROM roster_members ORDER BY alliance_slug, position IS NULL, position, id').all()
  const byAlliance = {}
  for (const r of rows) {
    (byAlliance[r.alliance_slug] ||= []).push({ name: r.name, position: r.position })
  }
  res.json({ rosters: byAlliance })
})

// --- Kingshot auto-sync ---
const SYNC_KEY = process.env.SYNC_KEY || 'k846-sync-a7f3e9c2b1'

// Fetch and parse Kingshot sources
function cleanText(s) {
  if (!s) return ''
  return s
    .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim()
}

// Assign category + image based on title keywords
function categorizeGuide(title) {
  const t = title.toLowerCase()
  if (t.includes('beginner') || t.includes('f2p') || t.includes('new player') || t.includes('first')) return { cat: 'Beginner', art: './assets/guide-beginner.png' }
  if (t.includes('hero') || t.includes('tier list') || t.includes('infantry') || t.includes('archer') || t.includes('cavalry')) return { cat: 'Heroes', art: './assets/guide-heroes.png' }
  if (t.includes('rally') || t.includes('arena') || t.includes('swordland') || t.includes('castle battle') || t.includes('clash') || t.includes('viking')) return { cat: 'Combat', art: './assets/guide-combat.png' }
  if (t.includes('gem') || t.includes('gold') || t.includes('resource') || t.includes('farm') || t.includes('pack') || t.includes('spend')) return { cat: 'Economy', art: './assets/guide-economy.png' }
  if (t.includes('event') || t.includes('calendar') || t.includes('eternity') || t.includes('bear')) return { cat: 'Events', art: './assets/guide-events.png' }
  return { cat: 'Strategy', art: './assets/guide-strategy.png' }
}

// Clean seed data (pre-fetched from sources, verified clean)
const SEED_GUIDES = [
  'Kingshot Research Strategy: What to Focus on in the Academy',
  'Active Giftcodes and How to Redeem',
  'More Rewards in Bear Trap: Why Coordination Makes the Difference',
  'Early Game Arena Guide for Kingshot',
  'Best Hero Expedition Skills to Focus on Early',
  'Bear Hunt Expert Guide',
  'Kingshot Hero Lineup Guide: Solo, Rally & Garrison',
  'Kingshot Masters Skill Priority Guide (F2P vs P2W)',
  'T10 TG8 vs T11: Which One Should You Go For?',
  'Bear Trap Damage Mechanics and Example Simulation',
  'Kingshot Infantry Hero Guide: Zoe vs Alcar vs Others',
  'Tempered Truegold Optimal Strategy',
  'The Only Kingshot Hero Tier List You Actually Need',
  'Best Packs to Buy for Low and Mid Spenders',
  'Advanced Rally Guide',
  'Complete F2P and Low Spender Guide for Kingshot',
  'Joiner Hero Mechanics No One Told You About',
  'Lethality, Attack, Defense & Health - What They Actually Do',
  'Pets in Kingshot: Priority & Refinement Guide',
  'How to Win Tri-Alliance Clash - Strategies & Tips',
  'Tri-Alliance Clash Map',
  "King's Castle Battle Guide: Tips to Win Every Time",
  'The Smart Way to Upgrade Hero Gear in Kingshot',
  'Complete Guide to Winning Swordland Showdown',
  'Kingshot Troop Setup Guide: Best Formations for Every Event',
  'Troop Training vs. Promotion: Which One is Better and When?',
  'Events Calendar',
  'Viking Vengeance Expert Guide',
  'When to Replace Your Archer Hero in Kingshot',
  'When to Replace Your Cavalry Hero in Kingshot',
  'When to Replace Your Infantry Hero in Kingshot',
  'What Items to Save for Future Events',
  'How to Win the Alliance Championship in Kingshot',
  'Where to Spend Your Gems in Kingshot (Without Regrets',
  "Eternity's Reach Event Guide (F2P Friendly)",
  'Governor Charms Upgrade Priority Guide',
  'How to Build a Good March and Rally Lineup as F2P',
  'Item Prioritization Guide: What to Focus on for Maximum Impact',
  'Governor Gear Upgrade Priority Guide',
  'Kingshot Farm Account Guide - Never Run Out of Resources Again',
  'Batch Healing Guide: Save Time & Speedups',
  'Simple Ways to Get More Gold in Kingshot Without Spending',
  'Save Days on Building Upgrades with Double Time',
  'Drill Camp Explained',
  'How to Dismiss/Remove Troops in Kingshot',
  'Secured Resources vs. Non-Secured Resources in Kingshot',
  'Beginner\'s Guide to Kingshot',
  'Troop Formation Guide',
  'Rally Mechanics Guide',
]

const SEED_NEWS = [
  { title: 'Thanksgiving Feast in Autumn!', cat: 'EVENT', excerpt: 'Dear Governor, in this golden autumn season symbolizing harvest, the grand Thanksgiving celebration is being prepared with great passion.', source: 'https://kingshot.net/game-announcements' },
  { title: 'Hotfix 11/24/2025 - Construction Queue Pack Optimization', cat: 'UPDATE', excerpt: 'Pack content upgraded with an all-new Newbie Booster Pack that provides better value.', source: 'https://kingshot.net/game-announcements' },
  { title: 'Hotfix 11/18 - Fishing Tournament Optimization', cat: 'UPDATE', excerpt: 'Optimized the item description for Horn of the Tide. Guide progression improvements.', source: 'https://kingshot.net/game-announcements' },
  { title: 'October 28, 2025 Update - New Content & Improvements', cat: 'UPDATE', excerpt: 'Update released from 6:00 to 9:00 UTC to improve your gaming experience with new features.', source: 'https://kingshot.net/game-announcements' },
  { title: 'The Witch is Coming - Halloween Event', cat: 'EVENT', excerpt: 'Dear Governors, the Halloween Party is about to begin, with countless thrilling party adventures awaiting you.', source: 'https://kingshot.net/game-announcements' },
  { title: 'Mystic Trial - A New Adventure Begins', cat: 'FEATURE', excerpt: 'A mysterious zone filled with endless challenges, where the desire for battle permeates the air.', source: 'https://kingshot.net/game-announcements' },
  { title: 'Tri-Alliance Clash is Imminent', cat: 'PVP', excerpt: 'As the tides recede, the temple symbolizing maritime supremacy emerges. Three Alliances battle for control.', source: 'https://kingshot.net/game-announcements' },
  { title: 'Mid-Autumn Festival - One Sky, One Moon', cat: 'EVENT', excerpt: "Let's light the wish lanterns and celebrate this special time of reunion together!", source: 'https://kingshot.net/game-announcements' },
  { title: 'NEW: Hero Gear Optimizer Tool', cat: 'FEATURE', excerpt: 'Find out which Hero Gear to upgrade first. Enter your levels, Mastery, XP, Forge Hammers, and Mithril to get an upgrade order.', source: 'https://kingshot.com.br/en/news/' },
  { title: 'What Is Kingshot? Complete Beginner\'s Guide', cat: 'GUIDE', excerpt: 'Discover what Kingshot is, how the game works, and the main mechanics for beginners.', source: 'https://kingshot.com.br/en/news/' },
]

async function fetchKingshotData() {
  const news = []
  const guides = []

  // Use seed data as the base (always clean, always available)
  for (const t of SEED_GUIDES) {
    const { cat, art } = categorizeGuide(t)
    guides.push({
      id: 'ks-guide-' + guides.length,
      type: 'guide',
      title: t,
      category: cat,
      excerpt: t + ' — strategy guide from Kingshot Wiki.',
      body: '',
      source: 'https://www.kingshot.wiki/guides',
      read_time: '5 min',
      art
    })
  }

  for (const n of SEED_NEWS) {
    news.push({
      id: 'ks-news-' + news.length,
      type: 'news',
      title: n.title,
      category: n.cat,
      date: new Date().toISOString().slice(0, 10),
      excerpt: n.excerpt,
      body: n.excerpt,
      source: n.source
    })
  }

  // Try to fetch LIVE data to add new items not in seed
  try {
    const res = await fetch('https://kingshot.net/game-announcements', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    // Extract titles from h2/h3 headings
    const titlePattern = /<h[23][^>]*>(?:<a[^>]*>)?([^<]{8,120})(?:<\/a>)?<\/h[23]>/gi
    const existingTitles = new Set(news.map(n => n.title.toLowerCase()))
    let match
    while ((match = titlePattern.exec(html)) !== null && news.length < 25) {
      const title = cleanText(match[1])
      if (title.length > 8 && !existingTitles.has(title.toLowerCase())) {
        existingTitles.add(title.toLowerCase())
        news.push({
          id: 'ks-news-live-' + news.length,
          type: 'news',
          title,
          category: 'ANNOUNCEMENT',
          date: new Date().toISOString().slice(0, 10),
          excerpt: title + ' — latest from Kingshot.net.',
          body: '',
          source: 'https://kingshot.net/game-announcements'
        })
      }
    }
  } catch (e) { console.error('Sync: live fetch kingshot.net failed:', e.message) }

  // Try to fetch live guides from kingshot.wiki
  try {
    const res = await fetch('https://www.kingshot.wiki/guides', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    // Extract guide titles from h3/h4 headings
    const headingPattern = /<h[34][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]{8,120})<\/a>\s*<\/h[34]>/gi
    const existingGuideTitles = new Set(guides.map(g => g.title.toLowerCase()))
    let match
    while ((match = headingPattern.exec(html)) !== null && guides.length < 70) {
      const url = match[1]
      const title = cleanText(match[2])
      if (title.length > 8 && !existingGuideTitles.has(title.toLowerCase()) && title !== 'Guides' && !url.includes('#')) {
        existingGuideTitles.add(title.toLowerCase())
        const { cat, art } = categorizeGuide(title)
        guides.push({
          id: 'ks-guide-live-' + guides.length,
          type: 'guide',
          title,
          category: cat,
          excerpt: title + ' — strategy guide from Kingshot Wiki.',
          body: '',
          source: url.startsWith('http') ? url : 'https://www.kingshot.wiki' + url,
          read_time: '5 min',
          art
        })
      }
    }
  } catch (e) { console.error('Sync: live fetch kingshot.wiki failed:', e.message) }

  return { news, guides }
}

// Sync endpoint (called by cron with secret key)
// --- AI Chat Assistant (Google Gemini) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

// Kingdom context for the AI
function buildKingdomContext() {
  const kingRow = db.prepare('SELECT * FROM king_status WHERE id = 1').get()
  const alliances = db.prepare('SELECT slug, name, leader, language, tagline FROM alliances').all()
  const events = db.prepare('SELECT title, date, time, category, description FROM kingshot_sync WHERE type != "news" ORDER BY date ASC LIMIT 10').all()
  const news = db.prepare('SELECT title, excerpt, category FROM kingshot_sync WHERE type = "news" ORDER BY synced_at DESC LIMIT 5').all()
  const guides = db.prepare('SELECT title, category, excerpt FROM kingshot_sync WHERE type = "guide" ORDER BY id DESC LIMIT 10').all()
  const transfers = db.prepare('SELECT name, alliance, status FROM transfers ORDER BY created_at DESC LIMIT 5').all()
  const applications = db.prepare('SELECT type, nickname, status FROM applications ORDER BY created_at DESC LIMIT 5').all()
  
  return `You are the Royal Advisor AI for Kingdom 846, a gaming community for the strategy game Kingshot.
You can DO things, not just talk. You have tools to sync data, update king status, manage alliances, add events, and view reports.
Keep answers concise (2-4 sentences). Be friendly and use medieval/royal tone.

KINGDOM DATA:
- Kingdom: 846
- Season: KvK Season 4
- King: ${kingRow ? kingRow.name : 'Not set'} (${kingRow ? kingRow.king_type : ''}) (${kingRow ? kingRow.alliance_tag : ''})

ALLIANCES:
${alliances.map(a => `- [${a.slug}] ${a.name} — Leader: ${a.leader}, Language: ${a.language}, Tagline: ${a.tagline || 'none'}`).join('\n')}

UPCOMING EVENTS:
${events.length ? events.map(e => `- ${e.title} (${e.date} ${e.time || ''}) — ${e.description}`).join('\n') : 'None scheduled'}

RECENT NEWS:
${news.length ? news.map(n => `- ${n.title}`).join('\n') : 'None'}

GUIDES:
${guides.length ? guides.map(g => `- ${g.title} (${g.category})`).join('\n') : 'None'}

RECENT TRANSFERS:
${transfers.length ? transfers.map(t => `- ${t.name} -> ${t.alliance || 'unassigned'} (${t.status})`).join('\n') : 'None'}

RECENT APPLICATIONS:
${applications.length ? applications.map(a => `- ${a.nickname} applied for ${a.type} (${a.status})`).join('\n') : 'None'}
`
}

// AI Tools — functions the AI can call to actually DO things
const AI_TOOLS = [
  {
    name: 'sync_kingshot',
    description: 'Sync latest news and guides from Kingshot sources. Fetches fresh content and updates the database.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'update_king_status',
    description: 'Update the king/queen status. Changes who rules the kingdom.',
    parameters: {
      type: 'object',
      properties: {
        king_type: { type: 'string', enum: ['High King', 'King', 'High Queen', 'Queen'] },
        name: { type: 'string', description: 'Name of the ruler' },
        alliance_tag: { type: 'string', description: 'Alliance tag e.g. [RYO]' },
        alliance_name: { type: 'string', description: 'Alliance name e.g. Spiders' }
      },
      required: ['king_type', 'name']
    }
  },
  {
    name: 'get_kingdom_stats',
    description: 'Get full kingdom statistics including alliance count, event count, transfer count, application count.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_transfers',
    description: 'Get list of all transfer applications with status.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_applications',
    description: 'Get list of all role applications (Chief Minister, Noble Advisor) with status.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'update_alliance',
    description: 'Update an alliance details (leader, language, tagline).',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Alliance slug e.g. spiders' },
        leader: { type: 'string' },
        language: { type: 'string' },
        tagline: { type: 'string' }
      },
      required: ['slug']
    }
  },
  {
    name: 'get_alliances',
    description: 'Get full list of all alliances with details.',
    parameters: { type: 'object', properties: {} }
  }
]

// Execute a tool call
async function executeTool(toolName, args) {
  logAction('Tool: ' + toolName, JSON.stringify(args))
  switch (toolName) {
    case 'sync_kingshot': {
      try {
        const { news, guides } = await fetchKingshotData()
        const all = [...news, ...guides]
        db.prepare('DELETE FROM kingshot_sync').run()
        const stmt = db.prepare('INSERT OR REPLACE INTO kingshot_sync (id, type, title, category, date, excerpt, body, source, art, read_time, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))')
        for (const item of all) {
          stmt.run(item.id, item.type, item.title, item.category || null, item.date || null, item.excerpt || null, item.body || null, item.source || null, item.art || null, item.read_time || null)
        }
        return `Sync complete! ${all.length} items (${news.length} news, ${guides.length} guides) updated successfully.`
      } catch (e) {
        return `Sync failed: ${e.message}`
      }
    }
    case 'update_king_status': {
      db.prepare("UPDATE king_status SET king_type=?, name=?, alliance_tag=?, alliance_name=?, updated_at=datetime('now') WHERE id=1").run(
        args.king_type || 'King', args.name || 'Unknown', args.alliance_tag || '', args.alliance_name || ''
      )
      return `King status updated: ${args.king_type} ${args.name} (${args.alliance_tag || 'no alliance'}) has been crowned!`
    }
    case 'get_kingdom_stats': {
      const allianceCount = db.prepare('SELECT COUNT(*) as c FROM alliances').get()
      const eventCount = db.prepare('SELECT COUNT(*) as c FROM kingshot_sync WHERE type != "news"').get()
      const newsCount = db.prepare('SELECT COUNT(*) as c FROM kingshot_sync WHERE type = "news"').get()
      const transferCount = db.prepare('SELECT COUNT(*) as c FROM transfers').get()
      const appCount = db.prepare('SELECT COUNT(*) as c FROM applications').get()
      const guideCount = db.prepare('SELECT COUNT(*) as c FROM kingshot_sync WHERE type = "guide"').get()
      const king = db.prepare('SELECT * FROM king_status WHERE id = 1').get()
      return `Kingdom Stats:
- Ruler: ${king ? king.king_type + ' ' + king.name : 'Not set'}
- Alliances: ${allianceCount.c}
- Events: ${eventCount.c}
- News articles: ${newsCount.c}
- Guides: ${guideCount.c}
- Transfer applications: ${transferCount.c}
- Role applications: ${appCount.c}`
    }
    case 'get_transfers': {
      const transfers = db.prepare('SELECT name, game_id, discord, alliance, status, created_at FROM transfers ORDER BY created_at DESC').all()
      if (!transfers.length) return 'No transfer applications.'
      return transfers.map(t => `- ${t.name} (ID: ${t.game_id}) -> ${t.alliance || 'unassigned'} — ${t.status} (${t.created_at})`).join('\n')
    }
    case 'get_applications': {
      const apps = db.prepare('SELECT type, nickname, request_kind, day, status, created_at FROM applications ORDER BY created_at DESC').all()
      if (!apps.length) return 'No role applications.'
      return apps.map(a => `- ${a.nickname} applied for ${a.type} (${a.request_kind || 'general'}) — ${a.status} (${a.created_at})`).join('\n')
    }
    case 'update_alliance': {
      const existing = db.prepare('SELECT * FROM alliances WHERE slug = ?').get(args.slug)
      if (!existing) return `Alliance '${args.slug}' not found.`
      const updates = {}
      if (args.leader) updates.leader = args.leader
      if (args.language) updates.language = args.language
      if (args.tagline) updates.tagline = args.tagline
      const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ')
      if (!setClause) return 'No updates provided.'
      db.prepare(`UPDATE alliances SET ${setClause} WHERE slug = ?`).run(...Object.values(updates), args.slug)
      return `Alliance ${args.slug} updated: ${Object.entries(updates).map(([k,v]) => `${k}=${v}`).join(', ')}`
    }
    case 'get_alliances': {
      const alliances = db.prepare('SELECT slug, name, leader, language, tagline FROM alliances').all()
      return alliances.map(a => `- [${a.slug}] ${a.name} — Leader: ${a.leader}, Language: ${a.language}, Tagline: ${a.tagline || 'none'}`).join('\n')
    }
    default:
      return `Unknown tool: ${toolName}`
  }
}

// Call Gemini with function calling support
async function callGemini(prompt, history, isAdmin) {
  const systemContext = buildKingdomContext()
  const fullPrompt = isAdmin
    ? `${systemContext}\n\nYou are the Kingdom 846 Admin AI. You can use tools to DO things automatically. When the admin asks you to do something, USE the appropriate tool. Don't just tell them to do it manually — DO IT YOURSELF.\n\nAdmin request: ${prompt}`
    : `${systemContext}\n\nUser question: ${prompt}`

  const contents = [
    { role: 'user', parts: [{ text: fullPrompt }] },
    ...(history || []).slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }))
  ]

  const body = {
    contents,
    tools: [{ functionDeclarations: AI_TOOLS }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 800, topP: 0.9 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Gemini API error:', err)
    throw new Error('AI service unavailable')
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No response from AI')

  // Handle function calls
  const parts = candidate.content?.parts || []
  const functionCalls = parts.filter(p => p.functionCall)
  const textParts = parts.filter(p => p.text)

  if (functionCalls.length > 0) {
    const results = []
    for (const fc of functionCalls) {
      const { name, args } = fc.functionCall
      console.log(`AI executing tool: ${name}`, args)
      const result = await executeTool(name, args || {})
      results.push(`[Tool: ${name}] ${result}`)
    }
    
    // Call Gemini again with the tool results so it can summarize
    const followUpContents = [
      ...contents,
      { role: 'model', parts: functionCalls.map(fc => ({ functionCall: fc.functionCall })) },
      { role: 'user', parts: [{ text: 'Tool results:\n' + results.join('\n') + '\n\nNow summarize what happened for the user in 2-3 sentences.' }] }
    ]
    const followUp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: followUpContents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 400 }
      })
    })
    const followData = await followUp.json()
    const summary = followData.candidates?.[0]?.content?.parts?.[0]?.text || results.join('\n')
    return summary
  }

  return textParts.map(p => p.text).join('') || 'I have no response for that.'
}

// Public chat endpoint (visitors can ask, AI can use read-only tools)
app.post('/api/ai/chat', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI not configured. Admin needs to set GEMINI_API_KEY.' })
  }
  const { message, history = [] } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message required' })
  }
  const ip = req.ip
  const now = Date.now()
  if (!aiRateLimit.has(ip)) aiRateLimit.set(ip, [])
  const times = aiRateLimit.get(ip).filter(t => now - t < 60000)
  if (times.length >= 30) return res.status(429).json({ error: 'Too many requests. Slow down!' })
  times.push(now)
  aiRateLimit.set(ip, times)

  try {
    const reply = await callGemini(message, history, false)
    res.json({ reply })
  } catch (err) {
    console.error('AI chat error:', err.message)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

const aiRateLimit = new Map()

// Admin AI — full tool access, can DO things
app.post('/api/ai/admin', auth, adminOnly, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI not configured. Set GEMINI_API_KEY environment variable.' })
  }
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'Message required' })

  try {
    const reply = await callGemini(message, [], true)
    res.json({ reply })
  } catch (err) {
    console.error('Admin AI error:', err.message)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// --- Autonomous AI Agent ---
// Runs every 4 hours automatically: syncs data, checks status, generates insights
let lastAgentRun = null
let agentInsights = []
let agentLog = [] // Activity log
let designBriefing = null // Latest design intelligence briefing
const MAX_LOG = 20

function logAction(action, detail) {
  const entry = { action, detail, time: new Date().toISOString() }
  agentLog.unshift(entry)
  if (agentLog.length > MAX_LOG) agentLog.pop()
  console.log(`[AI Agent] ${action}: ${detail}`)
}

// --- Design Intelligence Scanner ---
// Scans GitHub for trending animation libraries, SVG icon sets, and UI motion design tools
// Uses Gemini to pick top 3 relevant to Kingdom 846's gaming/fantasy aesthetic
async function runDesignScan() {
  if (!GEMINI_API_KEY) return
  console.log('[AI Agent] Scanning design resources...')
  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // GitHub Search API — free, no auth needed (60 req/hr)
    const searches = [
      { category: 'Animation Libraries', q: `animation+library+language:javascript+pushed:>${oneMonthAgo}&sort=stars&order=desc&per_page=8` },
      { category: 'SVG Icon Sets', q: `svg+icons+language:javascript+pushed:>${oneMonthAgo}&sort=stars&order=desc&per_page=8` },
      { category: 'UI Motion Design', q: `motion+ui+design+language:javascript+pushed:>${oneMonthAgo}&sort=stars&order=desc&per_page=8` },
      { category: 'Gaming/Fantasy UI', q: `game+ui+fantasy+language:javascript+stars:>50&sort=stars&order=desc&per_page=8` },
      { category: 'CSS Effects', q: `css+animation+effects+language:css+stars:>100&sort=stars&order=desc&per_page=5` },
    ]

    const allResults = []
    for (const search of searches) {
      try {
        const res = await fetch(`https://api.github.com/search/repositories?q=${search.q}`, {
          headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Kingdom846-AI-Agent' }
        })
        if (res.ok) {
          const data = await res.json()
          for (const repo of (data.items || []).slice(0, 5)) {
            allResults.push({
              category: search.category,
              name: repo.full_name,
              url: repo.html_url,
              stars: repo.stargazers_count,
              description: repo.description || '',
              updated: repo.pushed_at,
              language: repo.language,
            })
          }
        }
      } catch (e) { console.error(`[AI Agent] GitHub search error for ${search.category}:`, e.message) }
    }

    // Use Gemini to analyze and pick top 3 for Kingdom 846
    const repoList = allResults.map((r, i) => `${i+1}. [${r.category}] ${r.name} (${r.stars} stars, updated ${r.updated.split('T')[0]})\n   ${r.description}\n   URL: ${r.url}`).join('\n\n')

    const analysisPrompt = `You are the design intelligence agent for Kingdom 846, a gaming community portal for the strategy game Kingshot.
The site uses a dark medieval/fantasy theme with gold accents (#0E1220 bg, #D4AF37 gold, #F3E8CC parchment).
Stack: React 18 + Vite 5 + Tailwind 3.

Here are trending GitHub repos found today:
${repoList}

Pick the TOP 3 most relevant for Kingdom 846's visual identity. Respond as JSON array:
[
  {
    "name": "repo name",
    "category": "category",
    "url": "github url",
    "stars": 12345,
    "why": "1-2 sentences why it fits Kingdom 846's medieval/fantasy gaming aesthetic",
    "integration": "how to integrate (e.g., 'npm install X' or 'use for hero animations')",
    "priority": "high|medium|low"
  }
]

Only include repos with 100+ stars or updated in the last 30 days. Respond ONLY with the JSON array.`

    const aiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1000 }
      })
    })

    if (aiRes.ok) {
      const aiData = await aiRes.json()
      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
      try {
        const picks = JSON.parse(rawText.replace(/```json|```/g, '').trim())
        designBriefing = {
          date: new Date().toISOString(),
          scanned: allResults.length,
          top_picks: picks,
        }
        logAction('Design Scan', `Scanned ${allResults.length} repos, picked top ${picks.length}`)
        console.log(`[AI Agent] Design scan complete: ${picks.length} picks from ${allResults.length} repos`)
      } catch { console.error('[AI Agent] Failed to parse design scan JSON') }
    }
  } catch (err) {
    console.error('[AI Agent] Design scan error:', err.message)
  }
}

async function runAutonomousAgent() {
  if (!GEMINI_API_KEY) return
  console.log('[AI Agent] Running autonomous check...')
  try {
    // 1. Auto-sync Kingshot data
    const { news, guides } = await fetchKingshotData()
    const all = [...news, ...guides]
    db.prepare('DELETE FROM kingshot_sync').run()
    const stmt = db.prepare('INSERT OR REPLACE INTO kingshot_sync (id, type, title, category, date, excerpt, body, source, art, read_time, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))')
    for (const item of all) {
      stmt.run(item.id, item.type, item.title, item.category || null, item.date || null, item.excerpt || null, item.body || null, item.source || null, item.art || null, item.read_time || null)
    }
    console.log(`[AI Agent] Synced ${all.length} items`)

    // 2. Generate AI insights
    const context = buildKingdomContext()
    const insightResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${context}\n\nAs the Kingdom 846 autonomous AI agent, generate 3 brief insights about the kingdom status. Format as a JSON array of strings. Each insight should be 1 sentence about: 1) Data freshness/content status 2) Upcoming events or recommendations 3) Alliance or transfer status. Respond ONLY with the JSON array.` }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 300 }
      })
    })
    if (insightResponse.ok) {
      const insightData = await insightResponse.json()
      const insightText = insightData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
      try {
        agentInsights = JSON.parse(insightText.replace(/```json|```/g, '').trim())
      } catch { agentInsights = [] }
    }

    lastAgentRun = new Date().toISOString()
    logAction('Auto-sync', `Synced ${all.length} items, generated ${agentInsights.length} insights`)

    // 3. Run design intelligence scan (daily — only on first run of each day)
    const today = new Date().toDateString()
    const lastScanDay = designBriefing ? new Date(designBriefing.date).toDateString() : null
    if (today !== lastScanDay) {
      await runDesignScan()
    }

    console.log(`[AI Agent] Complete at ${lastAgentRun}`)
  } catch (err) {
    console.error('[AI Agent] Error:', err.message)
  }
}

// Run agent on startup, then every 4 hours
const AGENT_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

// Get AI agent status and insights
app.get('/api/ai/status', (_req, res) => {
  res.json({
    configured: !!GEMINI_API_KEY,
    last_run: lastAgentRun,
    insights: agentInsights,
    activity_log: agentLog.slice(0, 10),
    design_briefing: designBriefing,
    next_run: lastAgentRun ? new Date(new Date(lastAgentRun).getTime() + AGENT_INTERVAL).toISOString() : null
  })
})

// Trigger agent manually (admin only)
app.post('/api/ai/run-agent', auth, adminOnly, async (_req, res) => {
  try {
    await runAutonomousAgent()
    res.json({ ok: true, last_run: lastAgentRun, insights: agentInsights })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Trigger design scan manually (admin only)
app.post('/api/ai/run-design-scan', auth, adminOnly, async (_req, res) => {
  try {
    await runDesignScan()
    res.json({ ok: true, briefing: designBriefing })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Sync endpoint (manual trigger)
app.post('/api/sync-kingshot', async (req, res) => {
  const key = req.query.key || req.headers['x-sync-key']
  if (key !== SYNC_KEY) return res.status(403).json({ error: 'Invalid sync key' })
  try {
    const { news, guides } = await fetchKingshotData()
    const all = [...news, ...guides]
    // Clear old synced data and insert fresh
    db.prepare('DELETE FROM kingshot_sync').run()
    const stmt = db.prepare('INSERT OR REPLACE INTO kingshot_sync (id, type, title, category, date, excerpt, body, source, art, read_time, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))')
    for (const item of all) {
      stmt.run(item.id, item.type, item.title, item.category || null, item.date || null, item.excerpt || null, item.body || null, item.source || null, item.art || null, item.read_time || null)
    }
    res.json({ ok: true, synced: all.length, news: news.length, guides: guides.length, at: new Date().toISOString() })
  } catch (e) {
    res.status(500).json({ error: 'Sync failed: ' + e.message })
  }
})

// Public endpoint — returns synced Kingshot news and guides
app.get('/api/kingshot', (_req, res) => {
  const rows = db.prepare('SELECT * FROM kingshot_sync ORDER BY synced_at DESC').all()
  const news = rows.filter(r => r.type === 'news').map(r => ({
    id: r.id, title: r.title, category: r.category || 'FEATURE',
    date: r.date || '', excerpt: r.excerpt || '', body: r.body || r.excerpt || '',
    source: r.source || ''
  }))
  const guides = rows.filter(r => r.type === 'guide').map(r => ({
    id: r.id, title: r.title, category: r.category || 'Strategy',
    excerpt: r.excerpt || '', body: r.body || '', source: r.source || '',
    read: r.read_time || '5 min', art: r.art || './assets/guide-strategy.png'
  }))
  res.json({ news, guides, synced_at: rows[0]?.synced_at || null })
})

const PORT = process.env.PORT || 5000

// Serve the frontend. In production, serve the built dist; in dev, use Vite
// middleware so a single server provides the API + hot-reloading frontend.
const fs = require('fs')
const distPublic = path.join(process.cwd(), 'dist')
const isProduction = process.env.NODE_ENV === 'production'
;(async () => {
  if (isProduction && fs.existsSync(distPublic)) {
    app.use(express.static(distPublic))
    // SPA fallback: any non-API GET returns index.html
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(distPublic, 'index.html')))
  } else {
    const { createServer: createViteServer } = require('vite')
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
    app.use(vite.middlewares)
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kingdom 846 backend listening on ${PORT} (${isProduction ? 'production' : 'dev'})`)
    // Start autonomous AI agent — runs on startup then every 4 hours
    if (GEMINI_API_KEY) {
      setTimeout(() => runAutonomousAgent(), 10000) // 10s delay after startup
      setInterval(() => runAutonomousAgent(), AGENT_INTERVAL)
      console.log('[AI Agent] Autonomous agent scheduled (every 4 hours)')
    } else {
      console.log('[AI Agent] No GEMINI_API_KEY set — AI features disabled')
    }
  })
})()
