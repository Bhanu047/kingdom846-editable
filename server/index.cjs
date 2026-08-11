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

async function fetchKingshotData() {
  const news = []
  const guides = []

  // 1. Game Announcements from kingshot.net
  try {
    const res = await fetch('https://kingshot.net/game-announcements', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    // Parse announcement cards
    const items = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || []
    const cardPattern = /<h[23][^>]*>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/h[23]>[\s\S]*?(?:<time[^>]*>([^<]*)<\/time>|datetime="([^"]+)")[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi
    let match
    while ((match = cardPattern.exec(html)) !== null && news.length < 15) {
      const title = cleanText(match[1].replace(/\[.*?\]/g, '').trim())
      const date = cleanText(match[2] || match[3] || '')
      const excerpt = cleanText(match[4]?.replace(/<[^>]+>/g, '').slice(0, 200)) || ''
      if (title.length > 3) {
        news.push({
          id: 'ks-news-' + news.length,
          type: 'news',
          title,
          category: 'ANNOUNCEMENT',
          date: date || new Date().toISOString().slice(0, 10),
          excerpt,
          body: excerpt,
          source: 'https://kingshot.net/game-announcements'
        })
      }
    }
  } catch (e) { console.error('Sync: kingshot.net announcements failed:', e.message) }

  // 2. Guides from kingshot.wiki
  try {
    const res = await fetch('https://www.kingshot.wiki/guides', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    // Parse guide links - look for heading elements containing links
    const headingPattern = /<h[234][^>]*>\s*<a[^>]*href="([^"]*guide[^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h[234]>/gi
    const seen = new Set()
    let match
    while ((match = headingPattern.exec(html)) !== null && guides.length < 30) {
      const url = match[1]
      const title = cleanText(match[2].replace(/<[^>]+>/g, ''))
      if (title.length > 5 && !seen.has(url) && !url.includes('#') && !url.includes('category') && title !== 'Guides') {
        seen.add(url)
        guides.push({
          id: 'ks-guide-' + guides.length,
          type: 'guide',
          title,
          category: 'Strategy',
          excerpt: title + ' — full strategy guide from Kingshot Wiki.',
          body: '',
          source: url.startsWith('http') ? url : 'https://www.kingshot.wiki' + url,
          read_time: '5 min'
        })
      }
    }
    // Fallback: also try table rows or list items with guide links
    if (guides.length < 5) {
      const rowPattern = /<a[^>]*href="([^"]*\/guide[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
      while ((match = rowPattern.exec(html)) !== null && guides.length < 30) {
        const url = match[1]
        const title = cleanText(match[2].replace(/<[^>]+>/g, '').replace(/^Guide\d*\s*\w*\s*summary/, '').split(/(?=[A-Z])/).slice(0, 15).join(''))
        if (title.length > 5 && !seen.has(url) && !url.includes('#') && !url.includes('category') && title !== 'Guides') {
          seen.add(url)
          guides.push({
            id: 'ks-guide-' + guides.length, type: 'guide', title,
            category: 'Strategy', excerpt: title + ' — strategy guide from Kingshot Wiki.',
            body: '', source: url.startsWith('http') ? url : 'https://www.kingshot.wiki' + url, read_time: '5 min'
          })
        }
      }
    }
  } catch (e) { console.error('Sync: kingshot.wiki guides failed:', e.message) }

  // 3. Additional guides from kingshot.net/wiki
  try {
    const res = await fetch('https://kingshot.net/wiki', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    const linkPattern = /<a[^>]*href="([^"]*(?:guide|beginner|troop|rally|bear)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    const seen = new Set(guides.map(g => g.source))
    let match
    while ((match = linkPattern.exec(html)) !== null && guides.length < 50) {
      const url = match[1]
      const title = cleanText(match[2].replace(/<[^>]+>/g, ''))
      if (title.length > 5 && !seen.has(url) && !url.includes('#') && title !== 'Guides') {
        seen.add(url)
        guides.push({
          id: 'ks-guide-' + guides.length,
          type: 'guide',
          title,
          category: 'Strategy',
          excerpt: title + ' — Kingshot.net wiki guide.',
          body: '',
          source: url.startsWith('http') ? url : 'https://kingshot.net' + url,
          read_time: '5 min'
        })
      }
    }
  } catch (e) { console.error('Sync: kingshot.net wiki failed:', e.message) }

  // 4. News from kingshot.com.br (English)
  try {
    const res = await fetch('https://kingshot.com.br/en/news/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await res.text()
    const articlePattern = /<h[23][^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/h[23]>[\s\S]*?<(?:time|span)[^>]*>([^<]*)<\//gi
    let match
    while ((match = articlePattern.exec(html)) !== null && news.length < 20) {
      const url = match[1]
      const title = cleanText(match[2])
      const date = cleanText(match[3]) || ''
      if (title.length > 5 && !title.includes('Kingshot Brasil')) {
        news.push({
          id: 'ks-news-br-' + news.length,
          type: 'news',
          title,
          category: 'FEATURE',
          date: date || new Date().toISOString().slice(0, 10),
          excerpt: title + ' — Read more on Kingshot Brasil.',
          body: '',
          source: url.startsWith('http') ? url : 'https://kingshot.com.br' + url
        })
      }
    }
  } catch (e) { console.error('Sync: kingshot.com.br failed:', e.message) }

  return { news, guides }
}

// Sync endpoint (called by cron with secret key)
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
    read: r.read_time || '5 min', art: r.art || './assets/strategy-war-academy.png'
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
  app.listen(PORT, '0.0.0.0', () => console.log(`Kingdom 846 backend listening on ${PORT} (${isProduction ? 'production' : 'dev'})`))
})()
