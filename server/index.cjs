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
  CREATE TABLE IF NOT EXISTS alliances (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    leader TEXT,
    language TEXT,
    tagline TEXT,
    description TEXT
  );
  INSERT OR IGNORE INTO alliances (slug, name, leader, language, tagline) VALUES
    ('ryo', 'Spiders', 'Shoni', 'English', 'Loyal warriors of the crown'),
    ('kzk', 'KamilKazeKarnival', 'Lovely Khaos', 'English', 'Chaos with purpose'),
    ('sas', 'SaintsAndSinners', 'Lady Charlotte', 'English', 'Saints by day, sinners by night'),
    ('ice', 'IceHunters', 'Dunngeon', 'English', 'Cold steel, colder hearts');
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
if (!cols.some((c) => c.name === 'must_change_password')) {
  db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0')
  db.prepare("UPDATE users SET must_change_password = 1 WHERE role = 'leader'").run()
}

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
  res.json({ token: makeToken(user.id), user: { id: user.id, username: user.username, role: user.role, alliance_slug: user.alliance_slug, display_name: user.display_name, alliance_tag: user.alliance_tag, must_change_password: !!user.must_change_password } })
}),

app.get('/api/me', auth, (req, res) => res.json({ id: req.user.id, username: req.user.username, role: req.user.role, alliance_slug: req.user.alliance_slug, display_name: req.user.display_name, alliance_tag: req.user.alliance_tag, must_change_password: !!req.user.must_change_password }))

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

// First-time password set (forced after login or admin reset)
app.post('/api/me/set-password', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.must_change_password) return res.status(403).json({ error: 'Password already set. Use Settings to change it.' })
  const newPw = String(req.body.new_password || '').trim()
  if (newPw.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?').run(hash(newPw), user.id)
  res.json({ ok: true })
})

app.get('/api/admin/leaders', auth, adminOnly, (_req, res) => {
  res.json(db.prepare("SELECT id, username, display_name, alliance_tag, alliance_slug, role, must_change_password FROM users WHERE role='leader' ORDER BY alliance_slug").all())
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
  db.prepare('UPDATE users SET username=?, password_hash=?, must_change_password=1 WHERE id=?').run(finalUser, finalHash, id)
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
  { title: 'Thanksgiving Feast in Autumn!', cat: 'EVENT', excerpt: 'Dear Governor, in this golden autumn season symbolizing harvest, the grand Thanksgiving celebration is being prepared with great passion.', source: 'https://kingshot.net/game-announcements', date: '2025-11-27' },
  { title: 'Hotfix 11/24/2025 - Construction Queue Pack Optimization', cat: 'UPDATE', excerpt: 'Pack content upgraded with an all-new Newbie Booster Pack that provides better value.', source: 'https://kingshot.net/game-announcements', date: '2025-11-24' },
  { title: 'Hotfix 11/18 - Fishing Tournament Optimization', cat: 'UPDATE', excerpt: 'Optimized the item description for Horn of the Tide. Guide progression improvements.', source: 'https://kingshot.net/game-announcements', date: '2025-11-18' },
  { title: 'October 28, 2025 Update - New Content & Improvements', cat: 'UPDATE', excerpt: 'Update released from 6:00 to 9:00 UTC to improve your gaming experience with new features.', source: 'https://kingshot.net/game-announcements', date: '2025-10-28' },
  { title: 'The Witch is Coming - Halloween Event', cat: 'EVENT', excerpt: 'Dear Governors, the Halloween Party is about to begin, with countless thrilling party adventures awaiting you.', source: 'https://kingshot.net/game-announcements', date: '2025-10-25' },
  { title: 'Mystic Trial - A New Adventure Begins', cat: 'FEATURE', excerpt: 'A mysterious zone filled with endless challenges, where the desire for battle permeates the air.', source: 'https://kingshot.net/game-announcements', date: '2025-10-15' },
  { title: 'Tri-Alliance Clash is Imminent', cat: 'PVP', excerpt: 'As the tides recede, the temple symbolizing maritime supremacy emerges. Three Alliances battle for control.', source: 'https://kingshot.net/game-announcements', date: '2025-10-10' },
  { title: 'Mid-Autumn Festival - One Sky, One Moon', cat: 'EVENT', excerpt: "Let's light the wish lanterns and celebrate this special time of reunion together!", source: 'https://kingshot.net/game-announcements', date: '2025-09-29' },
  { title: 'NEW: Hero Gear Optimizer Tool', cat: 'FEATURE', excerpt: 'Find out which Hero Gear to upgrade first. Enter your levels, Mastery, XP, Forge Hammers, and Mithril to get an upgrade order.', source: 'https://kingshot.com.br/en/news/', date: '2025-09-20' },
  { title: 'What Is Kingshot? Complete Beginner\'s Guide', cat: 'GUIDE', excerpt: 'Discover what Kingshot is, how the game works, and the main mechanics for beginners.', source: 'https://kingshot.com.br/en/news/', date: '2025-09-15' },
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
      read_time: t.length > 40 ? '8 min' : t.length > 25 ? '5 min' : '3 min',
      art
    })
  }

  for (const n of SEED_NEWS) {
    news.push({
      id: 'ks-news-' + news.length,
      type: 'news',
      title: n.title,
      category: n.cat,
      date: n.date || new Date().toISOString().slice(0, 10),
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
const GEMINI_MODEL = 'gemini-flash-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

// Kingdom context for the AI
function buildKingdomContext() {
  const kingRow = db.prepare('SELECT * FROM king_status WHERE id = 1').get()
  const alliances = db.prepare('SELECT slug, name, leader, language, tagline FROM alliances').all()
  const events = db.prepare("SELECT title, date, category, excerpt FROM kingshot_sync WHERE type != 'news' ORDER BY date ASC LIMIT 10").all()
  const news = db.prepare("SELECT title, excerpt, category FROM kingshot_sync WHERE type = 'news' ORDER BY synced_at DESC LIMIT 5").all()
  const guides = db.prepare("SELECT title, category, excerpt FROM kingshot_sync WHERE type = 'guide' ORDER BY id DESC LIMIT 10").all()
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
${events.length ? events.map(e => `- ${e.title} (${e.date}) — ${e.excerpt || ''}`).join('\n') : 'None scheduled'}

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
      const eventCount = db.prepare("SELECT COUNT(*) as c FROM kingshot_sync WHERE type != 'news'").get()
      const newsCount = db.prepare("SELECT COUNT(*) as c FROM kingshot_sync WHERE type = 'news'").get()
      const transferCount = db.prepare('SELECT COUNT(*) as c FROM transfers').get()
      const appCount = db.prepare('SELECT COUNT(*) as c FROM applications').get()
      const guideCount = db.prepare("SELECT COUNT(*) as c FROM kingshot_sync WHERE type = 'guide'").get()
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

// ===== Kingdom Advisor — reliable database-powered chatbot =====
// No external API calls, never crashes, always responds

function getKingdomAnswer(message) {
  const msg = message.toLowerCase().trim()
  const alliances = db.prepare('SELECT slug, name, leader, tagline FROM alliances').all()
  const king = db.prepare('SELECT * FROM king_status WHERE id = 1').get()
  const events = db.prepare("SELECT title, date, category FROM kingshot_sync WHERE type != 'news' ORDER BY date ASC LIMIT 5").all()
  const news = db.prepare("SELECT title FROM kingshot_sync WHERE type = 'news' ORDER BY synced_at DESC LIMIT 3").all()
  const guides = db.prepare("SELECT title FROM kingshot_sync WHERE type = 'guide' ORDER BY id DESC LIMIT 3").all()
  const schedules = db.prepare('SELECT alliance_slug, event_name, event_time FROM alliance_schedules').all()
  const transfers = db.prepare('SELECT COUNT(*) as c FROM transfers').get()
  
  // Greetings
  if (/^(hi|hello|hey|greetings|hail|sup|yo)\b/.test(msg) || msg === 'hi' || msg === 'hello') {
    return 'Greetings, traveler. I am the Royal Advisor of Kingdom 846.\n\nI can help you with:\n- Alliance information\n- Current ruler and kingdom status\n- Event schedules\n- How to join or transfer\n- Strategy guides\n- Latest news\n\nAsk me anything about the realm.'
  }
  
  // Thanks
  if (msg.includes('thank') || msg.includes('thx') || msg.includes('appreciate')) {
    return 'You are most welcome. May your rallies be strong and your victories many.'
  }
  
  // Who are you
  if (msg.includes('who are you') || msg.includes('what are you') || msg.includes('your name') || msg.includes('what can you do')) {
    return 'I am the Royal Advisor of Kingdom 846, the official community portal for the strategy game Kingshot.\n\nI can answer questions about:\n- The four alliances and their leaders\n- The current King or Queen\n- Event schedules and timings\n- How to transfer or apply to join\n- Strategy guides and playbooks\n- Kingdom history and doctrine\n\nWhat would you like to know?'
  }

  // Alliances — detailed info
  if (msg.includes('alliance') || msg.includes('guild') || (msg.includes('spider') || msg.includes('kzk') || msg.includes('karnival') || msg.includes('saint') || msg.includes('sinner') || msg.includes('ice') || msg.includes('hunter'))) {
    // Check if asking about a specific alliance
    for (const a of alliances) {
      const slug = a.slug.toLowerCase()
      const name = a.name.toLowerCase()
      if (msg.includes(slug) || msg.includes(name) || (slug === 'ryo' && msg.includes('spider')) || (slug === 'kzk' && msg.includes('kamil')) || (slug === 'sas' && msg.includes('saint')) || (slug === 'ice' && msg.includes('ice'))) {
        return `${a.name} [${a.slug.toUpperCase()}]\nLeader: ${a.leader}\nMotto: ${a.tagline || 'Not set'}\n\nVisit the Alliances page for full roster and details.`
      }
    }
    // General alliance list
    const list = alliances.map(a => `[${a.slug.toUpperCase()}] ${a.name} — Leader: ${a.leader}`).join('\n')
    return `Kingdom 846 has ${alliances.length} alliances:\n\n${list}\n\nEach alliance has its own leader, event schedule, and culture. Visit the Alliances page for detailed information, or ask me about a specific alliance by name.`
  }

  // King / ruler
  if (msg.includes('king') || msg.includes('queen') || msg.includes('ruler') || msg.includes('who rule') || msg.includes('who lead') || msg.includes('monarch') || msg.includes('throne')) {
    if (king) {
      return `The current ruler of Kingdom 846 is ${king.king_type} ${king.name} of ${king.alliance_tag} ${king.alliance_name}.\n\nVisit the Kingdom page for the full royal lineage and kingdom history.`
    }
    return 'The throne is currently being contested. Visit the Kingdom page for the latest ruler information.'
  }

  // Transfer / join
  if (msg.includes('transfer') || msg.includes('join') || msg.includes('apply') || msg.includes('how do i') || msg.includes('recruit') || msg.includes('enlist')) {
    return 'How to Join Kingdom 846:\n\n1. Transfer to an Alliance — Use the Transfer page to apply to [RYO] Spiders, [KzK] KamilKazeKarnival, [SAS] SaintsAndSinners, or [ICE] IceHunters.\n\n2. Apply for a Role — Apply for Chief Minister or Noble Advisor positions through the Apply page.\n\nBoth forms are available in the navigation menu. Leadership reviews all applications.'
  }

  // Events / schedule
  if (msg.includes('event') || msg.includes('schedule') || msg.includes('timing') || msg.includes('time') || msg.includes('when') || msg.includes('bear') || msg.includes('viking') || msg.includes('clash') || msg.includes('swordland')) {
    if (schedules.length > 0) {
      const grouped = {}
      for (const s of schedules) {
        if (!grouped[s.alliance_slug]) grouped[s.alliance_slug] = []
        grouped[s.alliance_slug].push(`${s.event_name}: ${s.event_time} UTC`)
      }
      const lines = Object.entries(grouped).map(([slug, events]) => `[${slug.toUpperCase()}]\n${events.map(e => '  ' + e).join('\n')}`).join('\n\n')
      return `Alliance Event Schedules (UTC):\n\n${lines}\n\nAlliance leaders can update their event times through the Leader Portal. Visit the Events page for the full visual schedule.`
    }
    if (events.length > 0) {
      const list = events.map(e => `- ${e.title}${e.date ? ' (' + e.date + ')' : ''}`).join('\n')
      return `Upcoming Events:\n\n${list}\n\nVisit the Events page for the full schedule.`
    }
    return 'Event schedules are managed by alliance leaders. Leaders can log in and set their alliance event times through the Event Schedule page. Check the Events page for the current schedule.'
  }

  // Guides / strategy
  if (msg.includes('guide') || msg.includes('strategy') || msg.includes('tip') || msg.includes('playbook') || msg.includes('how to play') || msg.includes('beginner')) {
    if (guides.length > 0) {
      const list = guides.map(g => `- ${g.title}`).join('\n')
      return `Strategy Guides:\n\n${list}\n\nVisit the Guides page for the full collection of playbooks and strategies.`
    }
    return 'Visit the Strategy Guides & Playbooks page for detailed guides on bear hunts, Viking Vengeance, Tri-Alliance Clash, Swordland Showdown, and more. New guides are synced regularly from official sources.'
  }

  // News
  if (msg.includes('news') || msg.includes('update') || msg.includes('latest') || msg.includes('what\'s new') || msg.includes('whats new')) {
    if (news.length > 0) {
      const list = news.map(n => `- ${n.title}`).join('\n')
      return `Latest News:\n\n${list}\n\nVisit the News page for all updates and announcements.`
    }
    return 'Visit the News page for the latest Kingdom 846 announcements and game updates.'
  }

  // Kingdom info / about
  if (msg.includes('about') || msg.includes('kingdom 846') || msg.includes('what is') || msg.includes('tell me about') || msg.includes('history') || msg.includes('doctrine') || msg.includes('motto')) {
    return 'Kingdom 846 — One Crown. Four Alliances. Endless Glory.\n\nA kingdom forged in ten wars, seven dominations, and a perfect diplomatic record. Four alliances stand united under one crown:\n\n- [RYO] Spiders — Led by Shoni\n- [KzK] KamilKazeKarnival — Led by Lovely Khaos\n- [SAS] SaintsAndSinners — Led by Lady Charlotte\n- [ICE] IceHunters — Led by Dunngeon\n\nWhere legends are forged in fire and crowned in gold. Visit the About page for the full kingdom history and doctrine.'
  }

  // Season
  if (msg.includes('season') || msg.includes('fire tyrant') || msg.includes('current season')) {
    return 'Kingdom 846 is currently in the Season of the Fire Tyrant. Check the Events page for season-specific event schedules and the Kingdom page for season standings.'
  }

  // Leader login
  if (msg.includes('leader') && (msg.includes('login') || msg.includes('access') || msg.includes('portal'))) {
    return 'Alliance leaders can log in using their leader account credentials. Once logged in, a Leader section appears in the sidebar with access to the Event Schedule Manager, where leaders can set their alliance event times in UTC.\n\nIf you are a leader and need login credentials, contact the Kingdom admin.'
  }

  // Admin
  if (msg.includes('admin') || msg.includes('spartan') || msg.includes('manage') || msg.includes('edit') && msg.includes('website')) {
    return 'The Kingdom 846 admin portal is accessible to the Spartan account. Admins can edit website content, manage the king status, sync data, and view activity logs. Log in with the admin account to access these features.'
  }

  // Stats
  if (msg.includes('stat') || msg.includes('how many') || msg.includes('count')) {
    return `Kingdom 846 Statistics:\n- Alliances: ${alliances.length}\n- Transfer applications: ${transfers.c}\n- Event schedules: ${schedules.length} entries\n- Strategy guides: ${guides.length}+\n\nVisit the Rankings page for player rankings and the Kingdom page for full kingdom stats.`
  }

  // Help
  if (msg.includes('help') || msg.includes('what can') || msg.includes('options') || msg.includes('commands')) {
    return 'I can help you with:\n\n- Alliances (names, leaders, info)\n- The current King or Queen\n- Event schedules and timings\n- How to transfer or join\n- Strategy guides and tips\n- Latest news and updates\n- Kingdom history and doctrine\n- Leader and admin access\n\nJust ask me a question about Kingdom 846.'
  }

  // === Random visitor questions ===

  // What game / Kingshot
  if (msg.includes('what game') || msg.includes('kingshot') || msg.includes('what is this') || msg.includes('which game')) {
    return 'Kingdom 846 is a community portal for the strategy game Kingshot, available on iOS, Android, and PC.\n\nKingshot is a medieval strategy game where you build your city, train troops, join alliances, and battle for control of the kingdom. Kingdom 846 is one of the kingdoms in the game.'
  }

  // Discord
  if (msg.includes('discord') || msg.includes('community') || msg.includes('where to chat') || msg.includes('social')) {
    return 'Join the Kingdom 846 Discord community here:\nhttps://discord.gg/rcxJCh97A\n\nThis is where alliance members coordinate events, rallies, and chat in real time.'
  }

  // KvK
  if (msg.includes('kvk') || msg.includes('kingdom vs kingdom') || msg.includes('kingdom war')) {
    return 'KvK (Kingdom vs Kingdom) is the ultimate event where entire kingdoms go to war against each other.\n\n- Lasts several days\n- All alliances fight together for their kingdom\n- Rewards include gems, speedups, and exclusive items\n- The kingdom with the most points wins\n\nCheck the Events page for the next KvK schedule and the Timeline page for KvK history.'
  }

  // NAP
  if (msg.includes('nap') || msg.includes('non-aggression') || msg.includes('peace treaty')) {
    return 'NAP stands for Non-Aggression Pact — an agreement between alliances or kingdoms not to attack each other.\n\nIn Kingdom 846, NAPs are managed by the council and alliance leaders. Breaking a NAP is considered dishonorable and may result in diplomatic consequences.'
  }

  // Bear hunt
  if (msg.includes('bear') || msg.includes('bear hunt')) {
    return 'Bear Hunt is a PvE event where alliance members rally together to defeat powerful bears.\n\n- Requires alliance coordination\n- Higher level bears give better rewards\n- Rewards include gems, resources, and speedups\n- Check the Events page for the next bear hunt schedule'
  }

  // Viking Vengeance
  if (msg.includes('viking') || msg.includes('vengeance')) {
    return 'Viking Vengeance is a special event where players fight Viking invaders.\n\n- PvE event with multiple difficulty levels\n- Solo and alliance versions available\n- Rewards include hero shards, gems, and resources\n- Check the Events page for the schedule'
  }

  // Tri-Alliance Clash
  if (msg.includes('tri-alliance') || msg.includes('tri alliance') || msg.includes('triple clash')) {
    return 'Tri-Alliance Clash is a competitive event where three alliances battle for control of a central temple.\n\n- 3 alliances compete simultaneously\n- The alliance holding the temple longest wins\n- Rewards include gems, hero gear, and alliance tokens\n- Requires strong coordination and troop management'
  }

  // Swordland Showdown
  if (msg.includes('swordland') || msg.includes('sword land') || msg.includes('showdown')) {
    return 'Swordland Showdown is the championship battle event.\n\n- The ultimate PvP competition\n- Alliances fight for the championship title\n- Top performers earn exclusive rewards\n- Check the Events page for the next showdown'
  }

  // Troops
  if (msg.includes('troop') || msg.includes('army') || msg.includes('soldiers') || msg.includes('infantry') || msg.includes('cavalry') || msg.includes('archer')) {
    return 'Troop Management:\n\n- Infantry: Strong defense, holds the front line\n- Cavalry: Fast and mobile, great for flanking\n- Archers: Ranged damage, vulnerable in melee\n- Train a balanced army for best results\n- Higher tier troops are significantly stronger\n\nVisit the Guides page for detailed formation strategies.'
  }

  // Heroes
  if (msg.includes('hero') || msg.includes('commander') || msg.includes('champion')) {
    return 'Heroes are powerful leaders that boost your troops and city.\n\n- Each hero has unique skills and buffs\n- Level up heroes through battles and XP items\n- Equip gear to increase hero power\n- Match hero skills to your troop composition\n\nVisit the Guides page for hero tier lists and optimization tips.'
  }

  // Resources
  if (msg.includes('resource') || msg.includes('food') || msg.includes('wood') || msg.includes('stone') || msg.includes('gold') || msg.includes('iron')) {
    return 'Resources in Kingshot:\n\n- Food: Feeds your troops\n- Wood: Construction and troops\n- Stone: Advanced buildings\n- Iron: High-tier troops and gear\n- Gold: Premium currency for speedups and shop items\n\nTips: Keep your resource production buildings upgraded. Use the Resource Guide on the Guides page for optimization strategies.'
  }

  // Gems / premium
  if (msg.includes('gem') || msg.includes('diamond') || msg.includes('premium') || msg.includes('pay to win') || msg.includes('p2w') || msg.includes('free to play') || msg.includes('f2p')) {
    return 'Gems are the premium currency in Kingshot.\n\nWays to earn gems:\n- Events and competitions\n- Daily quests and achievements\n- KvK rewards\n- Bear hunts and PvE events\n\nKingdom 846 welcomes both free-to-play and paying players. Strategy and coordination matter more than spending.'
  }

  // Power / strength
  if (msg.includes('power') || msg.includes('strong') || msg.includes('strength') || msg.includes('combat power') || msg.includes('cp')) {
    return 'Increasing your power:\n\n1. Upgrade buildings (especially Castle)\n2. Train higher tier troops\n3. Level up and gear your heroes\n4. Research technologies in the Tech tree\n5. Join alliance events for bonus rewards\n6. Participate in KvK and bear hunts\n\nVisit the Guides page for detailed power progression strategies.'
  }

  // Defense / attack
  if (msg.includes('defend') || msg.includes('defense') || msg.includes('attacked') || msg.includes('raid') || msg.includes('zeroed') || msg.includes('bubble') || msg.includes('peace shield') || msg.includes('shield')) {
    return 'Defense Strategies:\n\n- Use Peace Shield (bubble) when offline to prevent attacks\n- Keep troops garrisoned in your castle\n- Upgrade your walls and defenses\n- Join an alliance for mutual defense\n- If zeroed (city destroyed), use speedups to rebuild quickly\n- Ask your alliance for reinforcement troops\n\nNever hesitate to bubble up if you sense danger. Better safe than zeroed.'
  }

  // Rally
  if (msg.includes('rally') || msg.includes('rallies')) {
    return 'Rallies are coordinated group attacks where multiple players join forces to hit a single target.\n\n- One player initiates the rally\n- Alliance members join with their troops\n- More participants = stronger rally\n- Essential for bear hunts and KvK\n\nAlways join rallies when your alliance calls for them — coordination wins wars.'
  }

  // Teleport / relocate
  if (msg.includes('teleport') || msg.includes('relocate') || msg.includes('move') || msg.includes('teleport') || msg.includes('migration')) {
    return 'Teleporting and Relocation:\n\n- Use Teleports to move your city within the kingdom\n- Alliance Teleport moves you near your alliance leader\n- Advanced Teleport places you at exact coordinates\n- Migration allows moving to a different kingdom (limited uses)\n\nWhen joining Kingdom 846, use your alliance teleport to move close to your alliance members for better coordination.'
  }

  // VIP
  if (msg.includes('vip') || msg.includes('subscription') || msg.includes('premium account')) {
    return 'VIP in Kingshot:\n\n- VIP status gives daily bonuses and buffs\n- Higher VIP levels unlock more perks\n- VIP points can be earned through events or purchased\n- Free players can still earn VIP time through events\n\nVIP is helpful but not required for success.'
  }

  // Season
  if (msg.includes('season') || msg.includes('fire tyrant') || msg.includes('current season')) {
    return 'Kingdom 846 is currently in the Season of the Fire Tyrant. Check the Events page for season-specific event schedules and the Kingdom page for season standings.'
  }

  // Shop / store
  if (msg.includes('shop') || msg.includes('store') || msg.includes('buy') || msg.includes('purchase') || msg.includes('pack')) {
    return 'The in-game shop offers various packs and items.\n\n- Resource packs for quick building\n- Speedup items\n- Hero shards and gear\n- Gem purchases\n\nTip: Save your gems for events and KvK — the shop will always be there, but event rewards are time-limited.'
  }

  // Download / play
  if (msg.includes('download') || msg.includes('where to play') || msg.includes('how to play') || msg.includes('install') || msg.includes('app store') || msg.includes('google play') || msg.includes('steam')) {
    return 'Kingshot is available on:\n\n- iOS (App Store)\n- Android (Google Play)\n- PC (via official website)\n\nDownload the game, complete the tutorial, and once you reach the required level, use the Transfer page on this website to join Kingdom 846.'
  }

  // Server / kingdom number
  if (msg.includes('server') || msg.includes('which kingdom') || msg.includes('kingdom number') || msg.includes('what kingdom')) {
    return 'We are Kingdom 846 in the game Kingshot. When transferring or migrating, search for kingdom 846 to find us.\n\nAll four alliances welcome new members — use the Transfer page to apply.'
  }

  // Rules / doctrine
  if (msg.includes('rule') || msg.includes('law') || msg.includes('code of conduct') || msg.includes('behavior')) {
    return 'Kingdom 846 Rules:\n\n1. Respect all members — toxic behavior is not tolerated\n2. Honor NAPs and alliances\n3. Participate in alliance events and rallies\n4. No spying or sabotage against allied kingdoms\n5. Follow alliance leader instructions during KvK\n6. Use Discord for coordination\n\nViolations may result in being kicked from your alliance.'
  }

  // Contact / reach leaders
  if (msg.includes('contact') || msg.includes('reach') || msg.includes('talk to') || msg.includes('message') || msg.includes('email')) {
    return 'To contact Kingdom 846 leadership:\n\n1. Join our Discord: https://discord.gg/rcxJCh97A\n2. Message your alliance leader directly in-game\n3. Use the Transfer page to apply to an alliance\n4. For admin matters, the Spartan account manages the kingdom\n\nAlliance leaders check Discord regularly and will respond to your messages.'
  }

  // Best alliance / which to join
  if (msg.includes('best alliance') || msg.includes('which alliance') || msg.includes('recommend') || msg.includes('should i join')) {
    return `All four alliances in Kingdom 846 are strong and welcoming:\n\n- [RYO] Spiders — Led by Shoni. Strategic and disciplined.\n- [KzK] KamilKazeKarnival — Led by Lovely Khaos. Aggressive and fun.\n- [SAS] SaintsAndSinners — Led by Lady Charlotte. Balanced and tactical.\n- [ICE] IceHunters — Led by Dunngeon. Focused and coordinated.\n\nChoose based on your playstyle. Visit the Alliances page for details, or join the Discord and talk to the leaders directly.`
  }

  // Who made this website / who built
  if (msg.includes('who made') || msg.includes('who built') || msg.includes('who created') || msg.includes('who designed') || msg.includes('webmaster') || msg.includes('developer')) {
    return 'This website was designed and built by Spartan, the Sovereign Admin of Kingdom 846. It serves as the official community portal for all alliance members and visitors.\n\nFeatures include alliance management, event schedules, rankings, strategy guides, kingdom news, and more.'
  }

  // Time zone / clock
  if (msg.includes('time zone') || msg.includes('timezone') || msg.includes('what time') || msg.includes('clock') || msg.includes('utc')) {
    return 'All event times on Kingdom 846 are displayed in UTC (Coordinated Universal Time).\n\nThe clock in the top navigation shows the current Kingdom Time in UTC. Alliance leaders set their event times in UTC through the Leader Portal.\n\nConvert UTC to your local time using any timezone converter.'
  }

  // Mobile / app
  if (msg.includes('mobile') || msg.includes('phone') || msg.includes('tablet') || msg.includes('android') || msg.includes('ios') || msg.includes('iphone')) {
    return 'This website is fully responsive and works on mobile, tablet, and desktop.\n\nThe game Kingshot itself is also available on iOS, Android, and PC. You can play on any device and access this community portal from your mobile browser.'
  }

  // Rankings / top players
  if (msg.includes('rank') || msg.includes('top player') || msg.includes('leaderboard') || msg.includes('best player') || msg.includes('strongest')) {
    return 'Visit the Rankings page to see the top players in Kingdom 846.\n\nThe leaderboard shows player rankings with their alliance tags and avatars. Rankings are managed by the admin through the website editor.\n\nNote: Power scores are not displayed publicly to maintain strategic privacy.'
  }

  // Tech / research
  if (msg.includes('tech') || msg.includes('research') || msg.includes('technology')) {
    return 'Tech Research in Kingshot:\n\n- Research technologies in the Tech tree to unlock new troops, buildings, and buffs\n- Prioritize military tech for combat power\n- Economic tech boosts resource production\n- Alliance tech provides shared buffs for all members\n\nVisit the Guides page for recommended tech research orders.'
  }

  // Gear / equipment
  if (msg.includes('gear') || msg.includes('equipment') || msg.includes('item') || msg.includes('forge') || msg.includes('craft')) {
    return 'Hero Gear in Kingshot:\n\n- Equip heroes with gear to boost stats\n- Forge gear using materials from events\n- Higher rarity gear gives stronger bonuses\n- Match gear to your hero role (tank, DPS, support)\n\nThe Hero Gear Optimizer tool (available in game) helps you decide which gear to upgrade first. Visit the Guides page for more tips.'
  }

  // Formation / strategy
  if (msg.includes('formation') || msg.includes('lineup') || msg.includes('composition') || msg.includes('best setup')) {
    return 'Troop Formations:\n\n- Front line: Infantry (tanks, absorb damage)\n- Middle: Cavalry (flanking, mobile)\n- Back line: Archers (ranged DPS)\n- Use heroes that buff your troop types\n- Adjust formation based on opponent\n\nA common effective ratio is 40% infantry, 30% cavalry, 30% archers. Visit the Guides page for detailed formation guides.'
  }

  // Active / how active
  if (msg.includes('active') || msg.includes('how active') || msg.includes('dead') || msg.includes('alive')) {
    return 'Kingdom 846 is very active! All four alliances participate in daily events, bear hunts, rallies, and KvK.\n\nJoin our Discord (https://discord.gg/rcxJCh97A) to see real-time activity and coordinate with alliance members. New members are always welcome.'
  }

  // Wiki / where to find info
  if (msg.includes('wiki') || msg.includes('where to find') || msg.includes('information') || msg.includes('learn more')) {
    return 'For more information:\n\n1. This website — Check Alliances, Events, Guides, and News pages\n2. Kingshot Wiki — https://www.kingshot.wiki (strategy guides and game mechanics)\n3. Kingshot Official — https://kingshot.net (announcements and updates)\n4. Kingdom 846 Discord — https://discord.gg/rcxJCh97A (community chat)\n\nThe Guides page on this site auto-syncs with the Kingshot Wiki for the latest strategies.'
  }

  // Wiki / where to find info
  if (msg.includes('wiki') || msg.includes('where to find') || msg.includes('information') || msg.includes('learn more')) {
    return 'For more information:\n\n1. This website — Check Alliances, Events, Guides, and News pages\n2. Kingshot Wiki — https://www.kingshot.wiki (strategy guides and game mechanics)\n3. Kingshot Official — https://kingshot.net (announcements and updates)\n4. Kingdom 846 Discord — https://discord.gg/rcxJCh97A (community chat)\n\nThe Guides page on this site auto-syncs with the Kingshot Wiki for the latest strategies.'
  }

  // Rewards
  if (msg.includes('reward') || msg.includes('prize') || msg.includes('loot') || msg.includes('what do i get')) {
    return 'Event Rewards in Kingshot:\n\n- Gems (premium currency)\n- Speedups (building, training, research)\n- Resource packs\n- Hero shards and gear\n- Exclusive seasonal items\n\nKvK and championship events give the best rewards. Always participate in alliance events — even small contributions count.'
  }

  // Speedups / how to grow fast
  if (msg.includes('speedup') || msg.includes('fast') || msg.includes('quick') || msg.includes('level up fast') || msg.includes('grow fast')) {
    return 'Growing Fast in Kingshot:\n\n1. Complete daily quests for XP and resources\n2. Join all alliance events (bear hunts, rallies, KvK)\n3. Use speedups during events for bonus rewards\n4. Upgrade your Castle first — it unlocks everything\n5. Train troops constantly — never let barracks sit idle\n6. Research tech in parallel with building\n7. Claim free daily gifts from the shop\n\nPatience pays off. Consistent daily play beats sporadic bursts.'
  }

  // Report / complaint
  if (msg.includes('report') || msg.includes('complaint') || msg.includes('cheater') || msg.includes('hacker') || msg.includes('scam')) {
    return 'To report a player or issue:\n\n1. Use the in-game report function on the player profile\n2. Contact your alliance leader with evidence (screenshots)\n3. Post in the Kingdom 846 Discord with details\n4. For serious issues, contact the Spartan admin\n\nDo not take matters into your own hands. Let leadership handle disputes diplomatically.'
  }

  // Funny / easter egg
  if (msg.includes('joke') || msg.includes('funny') || msg.includes('make me laugh') || msg.includes('bored')) {
    return 'Why did the infantry cross the battlefield?\n\nBecause the cavalry was too fast and the archers were afraid of getting hit.\n\nNow get back to your rallies — the bears are not going to hunt themselves.'
  }

  // Secret / sparta easter egg
  if (msg.includes('sparta') || msg.includes('this is sparta') || msg.includes('300')) {
    return 'THIS. IS. 846!\n\nThe Spartan never retreats, never surrenders. Forged in discipline, crowned in victory.\n\nClick the Spartan name in the footer 3 times to learn more...'
  }

  // Treasure / secret
  if (msg.includes('treasure') || msg.includes('secret') || msg.includes('hidden') || msg.includes('easter egg')) {
    return 'There are hidden secrets scattered across this realm...\n\nTry searching for "treasure" or "secret" in the search bar. Or click the crown in the title, the crest in the splash screen, or the clock in the header. The realm holds many surprises for those who seek them.'
  }

  // === Extended visitor questions ===

  // Castle / main building
  if (msg.includes('castle') || msg.includes('main building') || msg.includes('city hall') || msg.includes('headquarters')) {
    return 'Your Castle is the most important building.\n\n- Determines your max troop count\n- Unlocks new buildings and features at each level\n- Always upgrade your Castle first\n- Higher Castle = higher tier troops available\n- Required level to unlock: Embassy (3), Alliance Hall (5), War Room (7)\n\nFocus all your speedups on Castle upgrades early game.'
  }

  // Barracks / training
  if (msg.includes('barracks') || msg.includes('train') || msg.includes('draft')) {
    return 'Barracks are where you train troops.\n\n- Upgrade barracks to train higher tier troops\n- Higher tier troops are significantly stronger\n- Never let your barracks sit idle — always be training\n- Use training speedups during events for bonus rewards\n- Balance your troop types for best results\n\nSee the Guides page for troop training strategies.'
  }

  // Hospital / healing
  if (msg.includes('hospital') || msg.includes('infirmary') || msg.includes('heal') || msg.includes('wounded') || msg.includes('injured')) {
    return 'Hospitals heal your wounded troops.\n\n- Wounded troops go to the hospital instead of dying\n- Upgrade hospitals to increase capacity\n- Healing is cheaper and faster than retraining\n- Always heal before sending troops back to battle\n- During KvK, keep hospitals upgraded — you will need them\n\nTip: Multiple hospitals increase total wounded capacity. Build several.'
  }

  // Embassy / alliance
  if (msg.includes('embassy') || msg.includes('alliance hall') || msg.includes('alliance center')) {
    return 'The Embassy is your connection to your alliance.\n\n- Build it to join an alliance\n- Upgrade to receive more reinforcement troops from allies\n- Higher level = more allied troops can garrison your city\n- Alliance Hall unlocks alliance events and rallies\n\nBuild and upgrade your Embassy as soon as possible — being in an alliance is essential in Kingshot.'
  }

  // War room / marches
  if (msg.includes('war room') || msg.includes('march') || msg.includes('queue') || msg.includes('how many marches')) {
    return 'The War Room controls how many marches (armies) you can send simultaneously.\n\n- Level 1: 2 marches\n- Level 5: 3 marches\n- Level 10: 4 marches\n- Higher level = more simultaneous attacks/gathers\n\nMore marches means more flexibility — you can rally, gather, and defend at the same time.'
  }

  // Scout / scouting
  if (msg.includes('scout') || msg.includes('spy') || msg.includes('recon') || msg.includes('intelligence')) {
    return 'Scouting lets you see enemy city details before attacking.\n\n- Build a Scout Camp to unlock scouting\n- Higher level scouts reveal more info\n- Always scout before attacking to check troop counts\n- If enemy has more troops than expected, cancel the attack\n\nKnowledge is power. Never attack blind.'
  }

  // Gathering / resource tiles
  if (msg.includes('gather') || msg.includes('gathering') || msg.includes('resource tile') || msg.includes('farming')) {
    return 'Gathering sends troops to collect resources from map tiles.\n\n- Send troops to resource tiles on the world map\n- Higher level tiles give more resources\n- Cavalry gathers fastest due to speed\n- Use gathering speedup gear on heroes\n- Always gather overnight — free resources while you sleep\n\nTip: Don\'t gather with all your troops — keep some for defense.'
  }

  // Warehouse / protected resources
  if (msg.includes('warehouse') || msg.includes('protected') || msg.includes('secured') || msg.includes('safe resources') || msg.includes('non-secured')) {
    return 'Secured vs Non-Secured Resources:\n\n- Secured resources (in warehouse) cannot be stolen by attackers\n- Non-secured resources can be looted when your city is attacked\n- Upgrade your Warehouse to protect more resources\n- Keep most resources secured — only keep what you need for immediate use outside\n\nA high-level Warehouse is your best defense against resource loss.'
  }

  // Drill camp
  if (msg.includes('drill') || msg.includes('drill camp')) {
    return 'The Drill Camp lets you train troops in bulk over time.\n\n- Set a training queue that runs automatically\n- Great for training troops while offline\n- Upgrade to increase training capacity\n- Combine with speedups during events\n\nNever let your Drill Camp sit empty — always have troops in the queue.'
  }

  // Dismiss troops
  if (msg.includes('dismiss') || msg.includes('remove troops') || msg.includes('delete troops')) {
    return 'To dismiss troops:\n\n1. Go to your Barracks\n2. Select the troop type\n3. Use the dismiss function\n4. Dismissed troops are gone permanently — be careful\n\nOnly dismiss low-tier troops when you need population space for higher tier ones. Never dismiss troops you might need.'
  }

  // Arena / PvP
  if (msg.includes('arena') || msg.includes('pvp') || msg.includes('duel') || msg.includes('1v1')) {
    return 'The Arena is a PvP mode where you fight other players 1-on-1.\n\n- Test your hero and troop compositions\n- Earn ranking points and rewards\n- No troop loss in arena battles\n- Great for practicing strategies\n\nUse the Arena to experiment with different formations before using them in real battles.'
  }

  // Mystic trial
  if (msg.includes('mystic') || msg.includes('mystic trial') || msg.includes('trial')) {
    return 'Mystic Trial is a PvE adventure mode.\n\n- Progress through increasingly difficult stages\n- Each stage gives rewards\n- Tests your hero and troop strength\n- Rewards include hero shards, gems, and gear materials\n\nPush as far as you can each day. It resets regularly so you can try again.'
  }

  // Mithril / forge hammer
  if (msg.includes('mithril') || msg.includes('forge hammer') || msg.includes('hammer') || msg.includes('crafting material')) {
    return 'Mithril and Forge Hammers are used to upgrade hero gear.\n\n- Mithril: Required for high-tier gear upgrades\n- Forge Hammers: Required to forge new gear\n- Earn from events, bear hunts, and mystic trials\n- Use wisely — prioritize your best heroes\'s gear first\n\nThe Hero Gear Optimizer (in-game) helps you decide what to upgrade first.'
  }

  // Hero mastery
  if (msg.includes('mastery') || msg.includes('hero level') || msg.includes('hero xp') || msg.includes('level up hero')) {
    return 'Hero Mastery increases your heroes\' power.\n\n- Gain XP through battles and events\n- Use XP items to level up faster\n- Higher hero level = stronger skills and stats\n- Mastery unlocks additional skill slots\n- Focus on 2-3 main heroes rather than spreading XP\n\nVisit the Guides page for hero tier lists and mastery strategies.'
  }

  // Trade post / sending resources
  if (msg.includes('trade') || msg.includes('send resource') || msg.includes('help alliance') || msg.includes('donate')) {
    return 'Sending Resources to Allies:\n\n1. Build a Trade Post\n2. Select an alliance member on the map\n3. Choose resources to send\n4. Troops carry the resources (use cavalry for speed)\n\nHelping allies with resources builds alliance strength. Always help when asked — they\'ll help you back.'
  }

  // Pass / fortress / world map
  if (msg.includes('pass') || msg.includes('fortress') || msg.includes('ruin') || msg.includes('world map') || msg.includes('territory')) {
    return 'World Map Structures:\n\n- Passes: Strategic chokepoints — control them to block enemy movement\n- Fortresses: Alliance-held structures that provide buffs\n- Ruins: PvE challenges with rewards\n- Territory: Controlled area around alliance structures\n\nDuring KvK, capturing passes and fortresses is critical to kingdom strategy.'
  }

  // Becoming king
  if (msg.includes('become king') || msg.includes('how to be king') || msg.includes('take the throne') || msg.includes('become ruler')) {
    return 'Becoming King or Queen:\n\n1. You must be an alliance leader (or supported by one)\n2. The throne is located at the center of the kingdom map\n3. During the King Event, alliances fight for control of the throne\n4. The alliance that holds the throne longest wins\n5. The winning alliance\'s leader becomes King/Queen\n\nIt requires a powerful alliance, strong coordination, and significant troop investment.'
  }

  // Dominance
  if (msg.includes('dominance') || msg.includes('domination')) {
    return 'Dominance is a kingdom-level score that reflects overall strength and territory control.\n\n- Earned by holding passes, fortresses, and the throne\n- Higher dominance = stronger kingdom ranking\n- Affects KvK matchmaking\n- Kingdom 846 has achieved 70%+ domination rate in past seasons\n\nVisit the About page for Kingdom 846\'s full dominance history.'
  }

  // Season pass / battle pass
  if (msg.includes('season pass') || msg.includes('battle pass') || msg.includes('pass reward')) {
    return 'The Season Pass gives rewards as you complete seasonal objectives.\n\n- Free tier: Available to all players\n- Premium tier: Additional rewards (requires purchase)\n- Earn points through events, battles, and daily tasks\n- Rewards include gems, speedups, hero shards, and exclusive items\n\nThe free tier is still very rewarding — always claim your season rewards.'
  }

  // Daily rewards / login
  if (msg.includes('daily') || msg.includes('login reward') || msg.includes('free gift') || msg.includes('check in')) {
    return 'Daily Rewards in Kingshot:\n\n- Daily Login: Free resources and items every day\n- Daily Quests: Complete tasks for XP and gems\n- Alliance Help: Assist allies for mutual rewards\n- Free Shop Items: Check the shop daily for free gifts\n\nLog in every day — even if just to collect rewards. Consistency is key to growing fast.'
  }

  // Alliance shop / kingdom shop
  if (msg.includes('alliance shop') || msg.includes('kingdom shop') || msg.includes('token shop') || msg.includes('alliance token')) {
    return 'Alliance Shop & Kingdom Shop:\n\n- Alliance Shop: Use alliance tokens (earned from events) to buy items\n- Kingdom Shop: Use kingdom tokens (earned from KvK) for exclusive items\n- Both offer speedups, resources, and exclusive gear\n- Save tokens for high-value items\n\nParticipate in events to earn tokens — don\'t let them go to waste.'
  }

  // Honor
  if (msg.includes('honor') || msg.includes('honor point') || msg.includes('prestige')) {
    return 'Honor Points are earned through PvP combat.\n\n- Earn by attacking and defending against other players\n- Higher honor = better ranking rewards\n- Used in the Honor Shop for exclusive items\n- Resets each season\n\nBalance honor farming with alliance event participation for maximum rewards.'
  }

  // Counter strategies
  if (msg.includes('counter') || msg.includes('how to beat') || msg.includes('how to defeat')) {
    return 'Troop Counters in Kingshot:\n\n- Infantry beats Cavalry (spears stop charges)\n- Cavalry beats Archers (fast charge closes distance)\n- Archers beat Infantry (ranged damage from safety)\n\nGeneral tips:\n- Scout to see enemy composition\n- Adjust your formation to counter theirs\n- Hero skills can shift the balance\n- Higher tier troops always have an advantage\n\nRock-paper-scissors: Inf > Cav > Arch > Inf. Scout and adapt.'
  }

  // Offline / away
  if (msg.includes('offline') || msg.includes('going away') || msg.includes('inactive') || msg.includes('vacation') || msg.includes('sleep')) {
    return 'Going Offline? Do this first:\n\n1. Activate your Peace Shield (bubble) — prevents attacks\n2. Send troops to gather on far tiles\n3. Set your Drill Camp training queue\n4. Claim daily rewards before leaving\n5. Let your alliance know in Discord\n\nA bubble is your best friend when offline. Never leave your city unprotected.'
  }

  // New player / beginner guide
  if (msg.includes('new player') || msg.includes('beginner') || msg.includes('just started') || msg.includes('newbie') || msg.includes('noob')) {
    return 'Welcome to Kingdom 846! Here\'s your beginner checklist:\n\n1. Complete the tutorial\n2. Upgrade your Castle first\n3. Join an alliance (use our Transfer page)\n4. Build and upgrade your Embassy\n5. Train troops constantly\n6. Participate in alliance events\n7. Join our Discord: https://discord.gg/rcxJCh97A\n8. Check the Guides page for detailed strategies\n\nDon\'t worry about being small — every player starts somewhere. Your alliance will help you grow.'
  }

  // F2P / free to play strategy
  if (msg.includes('f2p') || msg.includes('free to play') || msg.includes('no money') || msg.includes('without paying')) {
    return 'Free-to-Play Strategy for Kingdom 846:\n\n1. Log in daily — claim all free rewards\n2. Participate in EVERY event — even small contributions count\n3. Focus on one or two heroes rather than spreading resources\n4. Always use your bubble when offline\n5. Join rallies — you get rewards even with small troops\n6. Gather resources overnight\n7. Use the Alliance Shop for free items\n\nF2P players can absolutely compete. Strategy and consistency beat money every time.'
  }

  // Whale / P2W
  if (msg.includes('whale') || msg.includes('p2w') || msg.includes('pay to win') || msg.includes('spender') || msg.includes('money')) {
    return 'About Pay-to-Win:\n\nKingshot does have premium purchases, but:\n- Strategy and coordination matter more than spending\n- Alliance teamwork beats individual spending\n- F2P players can earn most premium items through events\n- Kingdom 846 values all members regardless of spending\n\nWe focus on teamwork, not wallet size. Join us and see for yourself.'
  }

  // Mail / inbox
  if (msg.includes('mail') || msg.includes('inbox') || msg.includes('message') || msg.includes('notification in game')) {
    return 'The in-game Mail system handles:\n\n- Battle reports (attack and defense results)\n- Alliance announcements\n- System notifications (events, rewards)\n- Player messages\n\nCheck your mail regularly — important battle reports and reward claims are there. Don\'t miss out on unclaimed rewards in your mail.'
  }

  // Dragon / boss / world boss
  if (msg.includes('dragon') || msg.includes('boss') || msg.includes('world boss') || msg.includes('monster')) {
    return 'World Bosses and Monsters:\n\n- Random bosses spawn on the world map\n- Rally with your alliance to defeat them\n- Higher level bosses give better rewards\n- Some bosses drop exclusive hero shards\n- Dragon bosses are the rarest and most rewarding\n\nAlways join boss rallies when called — great rewards for minimal effort.'
  }

  // Dark forest / mysterious cave
  if (msg.includes('dark forest') || msg.includes('mysterious cave') || msg.includes('mercenary') || msg.includes('ancient ruin')) {
    return 'Special Map Locations:\n\n- Dark Forest: PvE challenges with mystery rewards\n- Mysterious Cave: Explore for resources and items\n- Mercenary Camp: Hire special troops\n- Ancient Ruins: Historical PvE content with lore\n\nThese locations appear on the world map and respawn regularly. Explore them when you see them.'
  }

  // Language / other languages
  if (msg.includes('language') || msg.includes('español') || msg.includes('french') || msg.includes('spanish') || msg.includes('translate')) {
    return 'Kingdom 846 communicates primarily in English. However, our community includes players from around the world.\n\nJoin our Discord (https://discord.gg/rcxJCh97A) and ask if there are players who speak your language — our alliances are diverse and welcoming.'
  }

  // Age / kids / family
  if (msg.includes('age') || msg.includes('kid') || msg.includes('child') || msg.includes('family friendly') || msg.includes('how old')) {
    return 'Kingshot is rated for ages 12+ and Kingdom 846 is a family-friendly community. We maintain respectful communication and do not tolerate harassment or inappropriate content.\n\nAll members are expected to follow our code of conduct on both the website and Discord.'
  }

  // Quit / leaving / refund
  if (msg.includes('quit') || msg.includes('leaving') || msg.includes('refund') || msg.includes('delete account')) {
    return 'If you\'re considering leaving the game or kingdom:\n\n1. Talk to your alliance leader first — they may be able to help\n2. Send your resources to alliance members before leaving\n3. Join our Discord and share your feedback: https://discord.gg/rcxJCh97A\n\nFor account deletion or refunds, contact Kingshot support through the in-game settings. We\'re sorry to see you go and wish you well.'
  }

  // Who is online / active now
  if (msg.includes('online now') || msg.includes('who is on') || msg.includes('active right now') || msg.includes('playing now')) {
    return 'I can\'t see who is currently online, but Kingdom 846 has active members across multiple time zones.\n\nFor real-time activity, join our Discord (https://discord.gg/rcxJCh97A) — you\'ll always find members chatting and coordinating there. Alliance leaders are especially active during event hours.'
  }

  // Weather / lore / story
  if (msg.includes('lore') || msg.includes('story') || msg.includes('background story') || msg.includes('history of the game')) {
    return 'Kingdom 846 Lore:\n\nForged in ten wars and seven dominations, Kingdom 846 stands as one of the most battle-tested kingdoms in the realm. Four alliances united under one crown, we have never broken a treaty and never lost a defensive war.\n\n- Motto: Where legends are forged in fire and crowned in gold\n- Doctrine: One Crown. Four Alliances. Endless Glory.\n\nVisit the About page for the full kingdom history and Timeline page for war records.'
  }

  // Farewell
  if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('farewell') || msg.includes('see you') || msg.includes('later')) {
    return 'Farewell, traveler. May your walls stand strong, your troops march victorious, and your rallies never fail.\n\nReturn whenever you seek counsel — the Royal Advisor is always here. Forging glory awaits you.'
  }

  // Yes / no / ok
  if (msg === 'yes' || msg === 'no' || msg === 'ok' || msg === 'okay' || msg === 'sure' || msg === 'cool' || msg === 'nice' || msg === 'great') {
    return 'Is there anything else you\'d like to know about Kingdom 846?\n\nYou can ask me about alliances, events, guides, how to join, strategies, KvK, or anything else about the realm.'
  }

  // === Ultra-extended random visitor questions ===

  // Can I change alliance
  if (msg.includes('change alliance') || msg.includes('switch alliance') || msg.includes('leave alliance') || msg.includes('different alliance')) {
    return 'Switching Alliances:\n\n1. Check with the new alliance leader first — make sure they have space\n2. Leave your current alliance (in the Alliance menu)\n3. Join the new alliance immediately — don\'t stay alliance-less for long\n4. Use Alliance Teleport to move near your new alliance\n\nNote: You cannot join a new alliance during KvK. Plan your switch during peacetime.\n\nIn Kingdom 846, all four alliances are part of the same kingdom — switching is allowed but discuss with both leaders first.'
  }

  // What happens if I get attacked
  if (msg.includes('got attacked') || msg.includes('someone attacked') || msg.includes('i was attacked') || msg.includes('under attack') || msg.includes('being attacked')) {
    return 'If You Are Attacked:\n\n1. Immediately bubble up (Peace Shield)\n2. Check your Hospital — heal wounded troops\n3. Reinforce with alliance members\n4. Scout the attacker back — gather intel\n5. Report to your alliance leader in Discord\n6. If zeroed, ask alliance for resource help to rebuild\n\nDon\'t panic. Every player gets attacked. Rebuild, re-strategize, and come back stronger. Your alliance has your back.'
  }

  // Best hero / tier list
  if (msg.includes('best hero') || msg.includes('tier list') || msg.includes('hero ranking') || msg.includes('which hero') || msg.includes('top hero') || msg.includes('strongest hero')) {
    return 'Hero selection depends on your playstyle and troop composition:\n\nTank Heroes: Best for absorbing damage, holding front line\nDPS Heroes: High damage output, great for rallies and PvP\nSupport Heroes: Buff allied troops, debuff enemies\nGathering Heroes: Increase gathering speed and capacity\n\nGeneral advice: Focus on 2-3 heroes max. Level them up fully before investing in others. Match hero skills to your main troop type.\n\nVisit the Guides page for detailed hero breakdowns and check the Kingshot Wiki for community tier lists.'
  }

  // How many troops do I need
  if (msg.includes('how many troops') || msg.includes('troop count') || msg.includes('army size') || msg.includes('enough troops') || msg.includes('how much army')) {
    return 'Troop Count Guidelines:\n\nEarly Game (Castle 1-10): 5,000-20,000 troops\nMid Game (Castle 11-17): 50,000-150,000 troops\nLate Game (Castle 18-25): 300,000-1,000,000+ troops\n\nQuality > Quantity: 1,000 Tier 5 troops beat 5,000 Tier 2 troops.\n\nAlways keep troops in training. Never let barracks sit idle. During events, use speedups to boost training.'
  }

  // What tier troops
  if (msg.includes('what tier') || msg.includes('tier troops') || msg.includes('best tier') || msg.includes('upgrade troops') || msg.includes('troop tier')) {
    return 'Troop Tiers in Kingshot:\n\n- Tier 1-2: Basic, very weak, only for early game\n- Tier 3-4: Mid-game standard, decent power\n- Tier 5-6: Late game, strong combat power\n- Tier 7-8: End game, requires high-level Castle and Tech\n\nAlways train the highest tier your Castle supports. Don\'t waste resources on low-tier troops once you unlock higher tiers.\n\nUpgrade your Castle, Barracks, and Tech to unlock higher tiers.'
  }

  // How long does bubble last
  if (msg.includes('how long') && (msg.includes('bubble') || msg.includes('shield') || msg.includes('peace'))) {
    return 'Peace Shield (Bubble) Durations:\n\n- 2-hour shields: Common, from daily rewards\n- 8-hour shields: Good for overnight\n- 12-hour shields: From events and shop\n- 24-hour shields: Rare, from special events\n- 3-day shields: From KvK rewards (very valuable)\n\nYou cannot attack while bubbled. Remove the shield before sending troops out. Always have a spare shield for emergencies.'
  }

  // How to get more speedups
  if (msg.includes('more speedup') || msg.includes('get speedup') || msg.includes('free speedup') || msg.includes('speedup item')) {
    return 'Ways to Get Speedups:\n\n1. Daily Login Rewards — claim every day\n2. Events — all events give speedup rewards\n3. Alliance Help — helping allies gives small speedups\n4. Bear Hunts — random speedup drops\n5. KvK — large speedup bundles for top performers\n6. Mystic Trial — stage completion rewards\n7. Season Pass — free and premium tiers\n8. Shop — daily free items and purchased packs\n\nSave your speedups for Castle upgrades and KvK preparation. Don\'t waste them on low-priority buildings.'
  }

  // What is the throne / capital
  if (msg.includes('throne') || msg.includes('capital') || msg.includes('king city') || msg.includes('royal city')) {
    return 'The Throne / Capital City:\n\n- Located at the center of the kingdom map\n- The most strategic position in Kingdom 846\n- During King Events, alliances fight to control it\n- The alliance holding the throne gets kingdom-wide buffs\n- The leader of the controlling alliance becomes King/Queen\n\nOnly the strongest alliances contest the throne. It requires massive troop commitment and perfect coordination.'
  }

  // How to get more marches / queues
  if (msg.includes('more queues') || msg.includes('more march') || msg.includes('additional march') || msg.includes('extra march') || msg.includes('second march')) {
    return 'Getting More Marches:\n\n- Upgrade your War Room to unlock additional march slots\n- War Room Level 1: 2 marches\n- War Room Level 5: 3 marches\n- War Room Level 10: 4 marches\n- War Room Level 15: 5 marches\n- Some VIP levels give bonus march slots\n\nMore marches = more flexibility. You can rally, gather, defend, and scout simultaneously.'
  }

  // What is a bubble / peace shield (detailed)
  if (msg.includes('what is a bubble') || msg.includes('what is bubble') || msg.includes('what is peace shield') || msg.includes('what is a shield')) {
    return 'A Bubble (Peace Shield) protects your city from attacks.\n\n- While active, nobody can attack your city\n- You also cannot attack others while shielded\n- Shields have time limits (2h, 8h, 12h, 24h, 3-day)\n- Get them from events, daily rewards, and the shop\n\nGolden Rule: Always bubble when going offline. An unshielded city is an invitation for attackers.'
  }

  // Zeroed / city destroyed
  if (msg.includes('zeroed') || msg.includes('city destroyed') || msg.includes('lost everything') || msg.includes('city burned') || msg.includes('wiped out')) {
    return 'Recovering After Being Zeroed:\n\n1. Don\'t panic — your city rebuilds, troops in hospital survive\n2. Heal all wounded troops first (use speedups if possible)\n3. Ask alliance for resource help\n4. Use protected resources from your Warehouse\n5. Start training new troops immediately\n6. Bubble up to prevent follow-up attacks\n7. Learn from the attack — scout next time before fighting\n\nEvery strong player has been zeroed at least once. It\'s part of the game. Rebuild and come back stronger.'
  }

  // How to reinforce allies
  if (msg.includes('reinforce') || msg.includes('help defend') || msg.includes('send troops to ally') || msg.includes('garrison ally')) {
    return 'Reinforcing Allies:\n\n1. Find your ally on the world map\n2. Click their city and select Reinforce\n3. Choose which troops and hero to send\n4. Your troops will garrison their city and defend\n5. You can recall them anytime\n\nNote: Upgraded Embassy allows more reinforcement capacity. Reinforcing allies during KvK is essential for kingdom defense.'
  }

  // Time zones / when do events start
  if (msg.includes('when do') && (msg.includes('event') || msg.includes('start'))) {
    return 'Event times are set by alliance leaders in UTC.\n\n- Check the Events page for the full schedule\n- The clock in the header shows current UTC time\n- Alliance leaders update times through the Leader Portal\n- Most events have 24-hour windows\n\nJoin the Discord (https://discord.gg/rcxJCh97A) for real-time event notifications in your timezone.'
  }

  // Can I play with friends
  if (msg.includes('play with friend') || msg.includes('play together') || msg.includes('real life friend') || msg.includes('bring friend') || msg.includes('invite friend')) {
    return 'Playing With Friends:\n\n1. Tell your friend to download Kingshot (iOS, Android, or PC)\n2. Have them complete the tutorial\n3. Use the Transfer page on this website to apply to Kingdom 846\n4. Once accepted, use Alliance Teleport to move near each other\n5. Join the same alliance for shared events\n6. Both join our Discord: https://discord.gg/rcxJCh97A\n\nThe more friends in your alliance, the stronger your coordination. Bring your whole squad!'
  }

  // What is the best formation / lineup
  if (msg.includes('best formation') || msg.includes('best lineup') || msg.includes('best setup') || msg.includes('optimal formation') || msg.includes('best composition')) {
    return 'Best Formations by Situation:\n\nAttack (PvP): 40% Infantry, 35% Cavalry, 25% Archers\nDefense: 50% Infantry, 25% Cavalry, 25% Archers\nBear Hunt/Rally: 50% Cavalry, 30% Infantry, 20% Archers\nGathering: 100% Cavalry (fastest)\nKvK: Varies — coordinate with alliance\n\nKey: Scout your enemy first, then adjust to counter their composition. Inf > Cav > Arch > Inf (rock-paper-scissors).\n\nHero skills can shift the balance — match your hero to your formation.'
  }

  // What is the map size / how big is the kingdom
  if (msg.includes('map size') || msg.includes('how big') || msg.includes('world map size') || msg.includes('kingdom size') || msg.includes('map dimensions')) {
    return 'The Kingdom 846 map is large with hundreds of player cities, resource tiles, monster spawns, and strategic structures.\n\nKey locations on the map:\n- Center: The Throne (capital)\n- Cardinal points: Alliance territories\n- Scattered: Resource tiles, passes, fortresses, ruins\n- Outer edges: Safer zones for new players\n\nUse the in-game map to explore. Teleport closer to your alliance for better coordination.'
  }

  // How to get stronger quickly
  if (msg.includes('get stronger') || msg.includes('become powerful') || msg.includes('level up fast') || msg.includes('power up') || msg.includes('catch up')) {
    return 'Getting Stronger Quickly:\n\n1. UPGRADE CASTLE — always priority #1\n2. Train highest tier troops available\n3. Complete ALL daily quests\n4. Join every event — even small rewards add up\n5. Research military tech for troop buffs\n6. Level up 2-3 main heroes\n7. Gather resources overnight\n8. Claim free shop items daily\n9. Participate in alliance rallies\n10. Use speedups on Castle and Barracks\n\nConsistency is everything. 30 minutes daily beats 5 hours once a week.'
  }

  // What is the meta / current strategy
  if (msg.includes('meta') || msg.includes('current strategy') || msg.includes('best strategy') || msg.includes('most effective')) {
    return 'Current Meta Strategies:\n\n- Cavalry-heavy formations are strong for mobility and rallies\n- Hero gear optimization makes a big difference at high levels\n- Alliance coordination beats individual strength\n- During KvK, defending passes is as important as attacking\n- Resource denial (raiding enemy gathers) weakens opponents\n- Early KvK aggression often determines the winner\n\nThe meta shifts with game updates. Check the Guides page and Kingshot Wiki for the latest strategies.'
  }

  // Is this game fun / worth playing
  if (msg.includes('is it fun') || msg.includes('worth playing') || msg.includes('should i play') || msg.includes('is it good') || msg.includes('review')) {
    return 'Kingshot is a strategy game that rewards patience, coordination, and tactical thinking.\n\nPros: Deep strategy, strong alliance social aspect, regular events, satisfying progression\nCons: Can be grindy, PvP can be harsh for new players, events require time commitment\n\nBest experienced with an active alliance like the ones in Kingdom 846. The community makes all the difference.\n\nJoin our Discord (https://discord.gg/rcxJCh97A) and talk to our members before deciding.'
  }

  // How much does it cost / is it free
  if (msg.includes('how much') && (msg.includes('cost') || msg.includes('price'))) {
    return 'Kingshot is free to download and play on iOS, Android, and PC.\n\n- Free-to-play fully supported — all content accessible without spending\n- In-app purchases: gems, packs, season pass\n- No purchase required to enjoy the game or be competitive\n- Spending money speeds up progress but doesn\'t guarantee winning\n\nKingdom 846 welcomes F2P and spending players equally.'
  }

  // What is the kingdom doctrine
  if (msg.includes('doctrine') || msg.includes('philosophy') || msg.includes('principles') || msg.includes('values') || msg.includes('mission')) {
    return 'Kingdom 846 Doctrine:\n\nOne Crown. Four Alliances. Endless Glory.\n\nOur principles:\n1. Unity — Four alliances, one kingdom, one goal\n2. Honor — We honor our treaties and our word\n3. Strength — We forge ourselves through fire\n4. Brotherhood — No member left behind\n5. Victory — We take what\'s ours\n\nWhere legends are forged in fire and crowned in gold.'
  }

  // What is NAP rules / diplomatic
  if (msg.includes('diplomat') || msg.includes('diplomacy') || msg.includes('foreign') || msg.includes('relations')) {
    return 'Kingdom 846 Diplomacy:\n\n- NAPs (Non-Aggression Pacts) managed by the council\n- Alliance leaders handle inter-alliance relations\n- The King/Queen handles inter-kingdom diplomacy\n- Breaking treaties is considered dishonorable\n- All diplomatic decisions go through Discord\n\nWe have maintained a perfect diplomatic record — no broken treaties, no betrayed allies.'
  }

  // What is the season / when does it end
  if (msg.includes('when does') && (msg.includes('season end') || msg.includes('season finish'))) {
    return 'Seasons in Kingshot typically last 4-8 weeks.\n\nKingdom 846 is currently in the Season of the Fire Tyrant.\n\n- Season end triggers KvK (Kingdom vs Kingdom)\n- Season rewards are distributed based on ranking\n- New season brings new events and content\n- Check the Events page for season-specific schedules\n\nPush hard in the final week of each season — rewards scale with your performance.'
  }

  // How to contact admin
  if (msg.includes('contact admin') || msg.includes('contact spartan') || msg.includes('talk to admin') || msg.includes('message admin') || msg.includes('reach admin')) {
    return 'To contact the Kingdom 846 admin (Spartan):\n\n1. Join Discord: https://discord.gg/rcxJCh97A — message directly\n2. Use the Royal Access login on the website\n3. For urgent matters, mention Spartan in Discord\n\nSpartan manages the website, king status, data sync, and all admin functions. Response time is usually within a few hours on Discord.'
  }

  // What is the website for / what does this site do
  if (msg.includes('what is this website') || msg.includes('what does this site') || msg.includes('purpose of this') || msg.includes('what is this site') || msg.includes('what is this portal')) {
    return 'This is the official community portal for Kingdom 846 in the game Kingshot.\n\nWhat you can do here:\n- View alliance information and leaders\n- Check event schedules\n- Read strategy guides\n- See player rankings\n- Apply to transfer to Kingdom 846\n- Read kingdom news and announcements\n- View kingdom history and timeline\n- Chat with the Royal Advisor (me!)\n\nAlliance leaders can also log in to manage event schedules.'
  }

  // Can I be leader / create alliance
  if (msg.includes('be a leader') || msg.includes('create alliance') || msg.includes('start alliance') || msg.includes('make my own alliance') || msg.includes('new alliance')) {
    return 'Creating a New Alliance:\n\nIn Kingshot, any player can create an alliance. However, in Kingdom 846, we have four established alliances already.\n\nIf you want to lead:\n1. Join an existing alliance first\n2. Prove yourself through events and coordination\n3. Discuss with the King/Queen about leadership opportunities\n4. Contact Spartan (admin) through Discord\n\nLeadership is earned, not taken. Show your dedication and opportunities will come.'
  }

  // What is the chat assistant / who is the advisor
  if (msg.includes('chat assistant') || msg.includes('who is the advisor') || msg.includes('are you ai') || msg.includes('are you real') || msg.includes('are you a bot') || msg.includes('are you human')) {
    return 'I am the Royal Advisor of Kingdom 846 — an AI assistant built into the kingdom\'s website.\n\nI run entirely on the website\'s own server, answering questions about the kingdom, alliances, events, strategies, and more. I never sleep and I\'m always here to help.\n\nI am not a human, but I am powered by the kingdom\'s knowledge base. Ask me anything about Kingdom 846!'
  }

  // Can I add my alliance / we have 5th alliance
  if (msg.includes('fifth alliance') || msg.includes('5th alliance') || msg.includes('add alliance') || msg.includes('new alliance to kingdom') || msg.includes('more alliances')) {
    return 'Kingdom 846 currently has four alliances: RYO (Spiders), KzK (KamilKazeKarnival), SAS (SaintsAndSinners), and ICE (IceHunters).\n\nAdding a fifth alliance would require approval from the King/Queen and the council. Contact Spartan (admin) through Discord (https://discord.gg/rcxJCh97A) to discuss.\n\nAll alliances in Kingdom 846 work together under one crown.'
  }

  // How to report bug / website issue
  if (msg.includes('bug') || msg.includes('broken') || msg.includes('error') || msg.includes('not working') || msg.includes('glitch') || msg.includes('website issue')) {
    return 'To report a website issue or bug:\n\n1. Take a screenshot of the problem\n2. Note what page you were on and what you were doing\n3. Post in the Kingdom 846 Discord: https://discord.gg/rcxJCh97A\n4. Tag or mention Spartan (the webmaster)\n\nBugs are usually fixed quickly. Thank you for helping improve the realm!'
  }

  // What is the future / upcoming features
  if (msg.includes('future') || msg.includes('upcoming') || msg.includes('coming soon') || msg.includes('roadmap') || msg.includes('new features') || msg.includes('update')) {
    return 'Kingdom 846 Website — Upcoming & Ongoing:\n\n- Guides auto-sync from Kingshot Wiki (ongoing)\n- News auto-syncs from official sources (ongoing)\n- Event schedules updated by alliance leaders (ongoing)\n- New features added regularly by Spartan\n\nFor the latest game updates, check the News page. For website feature requests, join Discord: https://discord.gg/rcxJCh97A'
  }

  // What is the crest / logo meaning
  if (msg.includes('crest') || msg.includes('logo') || msg.includes('emblem') || msg.includes('coat of arms') || msg.includes('symbol')) {
    return 'The Kingdom 846 Crest:\n\n- Crown: Represents the King/Queen who rules the realm\n- 846: The kingdom number, in crimson red with gold edges\n- Gold Crescent Moon: Represents the night we were forged\n- Three Blue Stars: Represent the three founding principles — Unity, Honor, Victory\n- Two Golden Lions: Represent strength and courage, flanking the shield\n\nThe moon and three stars are always together as one set — they represent our unbreakable bond.'
  }

  // Random / nonsense / trolling
  if (msg.includes('asdf') || msg.includes('test') || msg.includes('123') || msg.includes('aaaa') || msg.includes('lorem ipsum') || msg.includes('test test')) {
    return 'I see you\'re testing me! I\'m working perfectly.\n\nTry asking me a real question like:\n- What alliances are in Kingdom 846?\n- How do I join?\n- What is KvK?\n- How to defend my city?\n- What is the Discord link?\n\nI\'m here to help with anything about the realm.'
  }

  // I love this / this is awesome
  if (msg.includes('love') || msg.includes('awesome') || msg.includes('amazing') || msg.includes('great website') || msg.includes('beautiful') || msg.includes('cool website') || msg.includes('impressive') || msg.includes('wow')) {
    return 'Thank you for your kind words! The realm of Kingdom 846 was crafted with dedication by Spartan, our Sovereign Admin.\n\nIf you\'d like to join our community, visit the Transfer page to apply to one of our four alliances, or join our Discord: https://discord.gg/rcxJCh97A\n\nWe take what\'s ours. Glory awaits.'
  }

  // I hate this / this is bad
  if (msg.includes('hate') || msg.includes('terrible') || msg.includes('worst') || msg.includes('sucks') || msg.includes('bad') || msg.includes('awful') || msg.includes('stupid')) {
    return 'I\'m sorry to hear that. We\'re always improving the Kingdom 846 experience.\n\nIf you have specific feedback, please share it in our Discord: https://discord.gg/rcxJCh97A\n\nSpartan (our admin) takes all feedback seriously and works to make the realm better for everyone.'
  }

  // Can I donate / support
  if (msg.includes('donate') || msg.includes('support') || msg.includes('contribute') || msg.includes('support the website') || msg.includes('patreon') || msg.includes('paypal')) {
    return 'Thank you for wanting to support Kingdom 846!\n\nThe best ways to support:\n1. Join our community on Discord: https://discord.gg/rcxJCh97A\n2. Participate actively in alliance events\n3. Invite friends to join the kingdom\n4. Share feedback to improve the website\n\nThis is a community project built by Spartan for the love of the game. No donations needed — just be an active and positive member!'
  }

  // What phone / device requirements
  if (msg.includes('phone requirement') || msg.includes('device requirement') || msg.includes('system requirement') || msg.includes('can my phone run') || msg.includes('minimum spec')) {
    return 'Kingshot Device Requirements:\n\n- iOS: iOS 11.0 or later, iPhone 6s or newer\n- Android: Android 7.0 or later, 2GB+ RAM\n- PC: Windows 10+, 4GB RAM minimum\n- Storage: ~500MB free space\n- Internet connection required\n\nThe game runs on most modern devices. For best experience, use a device with 4GB+ RAM.'
  }

  // What is the population / how many players
  if (msg.includes('how many players') || msg.includes('population') || msg.includes('how many members') || msg.includes('how big is') || msg.includes('total players')) {
    return 'Kingdom 846 has four active alliances with members across multiple time zones.\n\nFor exact member counts, visit the Alliances page. Our community is large enough for 24/7 activity but tight-knit enough that everyone knows each other.\n\nJoin our Discord (https://discord.gg/rcxJCh97A) to meet the community.'
  }

  // What is the time / current time
  if (msg.includes('what time') || msg.includes('current time') || msg.includes('time now') || msg.includes('what is the time')) {
    return 'All Kingdom 846 times are in UTC. Check the clock in the top navigation bar for the current Kingdom Time.\n\nEvent schedules are also displayed in UTC. Use a timezone converter to match your local time.\n\nJoin Discord for timezone-specific event reminders.'
  }

  // Can you write code / build something
  if (msg.includes('write code') || msg.includes('build') || msg.includes('program') || msg.includes('develop') || msg.includes('can you make')) {
    return 'I am the Royal Advisor — I answer questions about Kingdom 846. I cannot write code or build software.\n\nIf you have a feature request for the website, share it in our Discord: https://discord.gg/rcxJCh97A\n\nSpartan (our admin) handles all website development and design.'
  }

  // Tell me about yourself / who made you
  if (msg.includes('about you') || msg.includes('tell me about yourself') || msg.includes('how do you work') || msg.includes('how were you made') || msg.includes('your creator')) {
    return 'I am the Royal Advisor of Kingdom 846.\n\n- I was created by Spartan, the Sovereign Admin\n- I run entirely on the website\'s own server\n- I answer questions from a knowledge base of 65+ topics\n- I never sleep, never crash, and never give up\n- I am not powered by external AI services — everything runs in-house\n\nI\'m here to guide visitors and members through the realm of Kingdom 846. Ask me anything!'
  }

  // Marriage / relationship / dating
  if (msg.includes('marry') || msg.includes('marriage') || msg.includes('dating') || msg.includes('relationship') || msg.includes('girlfriend') || msg.includes('boyfriend') || msg.includes('love you')) {
    return 'I am a Royal Advisor, not a matchmaker! But I can tell you that Kingdom 846 has a wonderful community of players from all walks of life.\n\nJoin our Discord (https://discord.gg/rcxJCh97A) to meet our members. Many lasting friendships (and some relationships!) have started in gaming communities.\n\nNow, back to kingdom matters — ask me about alliances, events, or strategies!'
  }

  // Random facts / trivia
  if (msg.includes('random fact') || msg.includes('trivia') || msg.includes('did you know') || msg.includes('fun fact') || msg.includes('tell me something')) {
    return 'Kingdom 846 Trivia:\n\n- The kingdom number 846 was chosen by Spartan\n- We have fought in 10 wars and won 7 dominations\n- Our diplomatic record is perfect — no broken treaties\n- The crest features a gold moon and three blue stars as one inseparable set\n- Four alliances, one crown — unity is our greatest weapon\n- The website was designed and built entirely by Spartan\n- The Royal Advisor (me) runs on the website\'s own server\n\nAsk me more about the kingdom!'
  }

  // What is the weather / random non-game
  if (msg.includes('weather') || msg.includes('temperature') || msg.includes('rain') || msg.includes('snow') || msg.includes('forecast')) {
    return 'I am the Royal Advisor of Kingdom 846 — I handle kingdom matters, not weather forecasts!\n\nHowever, I can tell you that our kingdom\'s events run rain or shine, 24/7. Check the Events page for the current schedule.\n\nIs there something about the kingdom I can help you with?'
  }

  // Sing / dance / tell story
  if (msg.includes('sing') || msg.includes('dance') || msg.includes('tell me a story') || msg.includes('entertain me') || msg.includes('play music') || msg.includes('play a game')) {
    return 'In the halls of Kingdom 846, where gold meets fire and crowns are forged...\n\nFour alliances marched through the gates of destiny. The Spiders wove their webs of strategy. The KamilKazeKarnival brought chaos and glory. The SaintsAndSinners walked the line between light and shadow. The IceHunters struck from the frozen north.\n\nUnited under one crown, they took what was theirs. And the realm trembled.\n\nThe end... or rather, the beginning. Your story in Kingdom 846 awaits!'
  }

  // Good morning / good night
  if (msg.includes('good morning') || msg.includes('good afternoon') || msg.includes('good evening') || msg.includes('good night') || msg.includes('goodnight')) {
    return 'A fine time to visit the realm! Whether morning, noon, or night in your corner of the world, Kingdom 846\'s events run 24/7.\n\nCheck the Events page for what\'s happening right now, or join our Discord (https://discord.gg/rcxJCh97A) for real-time activity.\n\nHow may I assist you today?'
  }

  // What is love / deep questions
  if (msg.includes('what is love') || msg.includes('meaning of life') || msg.includes('why are we here') || msg.includes('what is the purpose')) {
    return 'In Kingdom 846, the meaning of life is simple:\n\nOne Crown. Four Alliances. Endless Glory.\n\nWe are here to forge legends in fire and crown them in gold. Beyond that, you\'ll have to consult a philosopher — I handle kingdom matters!\n\nAsk me about alliances, events, or strategies instead.'
  }

  // Default — suggest topics
  return 'I am not sure about that, but I can help you with:\n\n- Alliances and their leaders\n- The current King or Queen\n- Event schedules\n- How to transfer or apply\n- Strategy guides and tips\n- Latest news and updates\n- Kingdom history and doctrine\n- Troops, heroes, and formations\n- KvK, bear hunts, and events\n- Defense and attack strategies\n- Castle, barracks, and buildings\n- Gathering, resources, and trading\n- Discord and community\n- Crest meaning and kingdom lore\n- Beginner guides and F2P tips\n- Troop tiers and counters\n- World map and structures\n\nTry asking about one of these topics.'
}

// Chat endpoint — pure database-powered, never crashes
app.post('/api/ai/chat', (req, res) => {
  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.json({ reply: 'Please ask a question about Kingdom 846.' })
  }
  
  // Rate limit per IP
  const ip = req.ip
  const now = Date.now()
  if (!aiRateLimit.has(ip)) aiRateLimit.set(ip, [])
  const times = aiRateLimit.get(ip).filter(t => now - t < 60000)
  if (times.length >= 15) {
    return res.json({ reply: 'You are asking questions too quickly. Please wait a moment and try again.' })
  }
  times.push(now)
  aiRateLimit.set(ip, times)

  const reply = getKingdomAnswer(message)
  res.json({ reply })
})

const aiRateLimit = new Map()

// Admin chat — same reliable system
app.post('/api/ai/admin', auth, adminOnly, (req, res) => {
  const { message } = req.body
  if (!message) return res.json({ reply: 'Please enter a message.' })
  const reply = getKingdomAnswer(message)
  res.json({ reply })
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
      const rawText = aiData.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '[]'
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      // Extract JSON array from response (in case AI adds extra text)
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? jsonMatch[0] : cleaned
      try {
        const picks = JSON.parse(jsonStr)
        designBriefing = {
          date: new Date().toISOString(),
          scanned: allResults.length,
          top_picks: picks,
        }
        logAction('Design Scan', `Scanned ${allResults.length} repos, picked top ${picks.length}`)
        console.log(`[AI Agent] Design scan complete: ${picks.length} picks from ${allResults.length} repos`)
      } catch (parseErr) { console.error('[AI Agent] Failed to parse design scan JSON:', jsonStr.substring(0, 200)) }
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
    // 2. Skip insights generation on auto-runs to save free tier quota for chat
    // Insights can be generated manually from admin panel
    console.log(`[AI Agent] Synced ${all.length} items (skipping insights to save quota)`)

    lastAgentRun = new Date().toISOString()
    logAction('Auto-sync', `Synced ${all.length} items`)

    // 3. Run design scan only if explicitly requested (skip on auto-runs to save quota)
    // Design scan is triggered manually via admin panel
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
      // Don't run on startup — preserves free tier quota for chat
      setInterval(() => runAutonomousAgent(), AGENT_INTERVAL)
      console.log('[AI Agent] Autonomous agent scheduled (every 4 hours, no startup run)')
    } else {
      console.log('[AI Agent] No GEMINI_API_KEY set — AI features disabled')
    }
  })
})()
