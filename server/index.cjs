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
  -- One row per installed app that asked for reminders. The endpoint is the
  -- push service's own URL for that device and is unique by construction, so it
  -- doubles as the primary key: reinstalling or re-subscribing updates the row
  -- rather than accumulating duplicates that would each fire their own buzz.
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    alliance_slug TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now')),
    failures INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_push_alliance ON push_subscriptions(alliance_slug);
  -- What has already been sent. The scheduler runs far more often than once per
  -- reminder so that a slow tick cannot miss a window; this is what stops that
  -- from meaning six buzzes for one Bear Hunt.
  CREATE TABLE IF NOT EXISTS push_sent (
    key TEXT PRIMARY KEY,
    sent_at TEXT DEFAULT (datetime('now'))
  );
  -- Server-held settings that must outlive a restart. Currently the VAPID key
  -- pair: regenerating it would silently invalidate every existing
  -- subscription, so it is generated once and kept.
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
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
// --- Analytics ---
//
// Self-hosted, no third-party tracker, and deliberately NOT able to follow a
// person across days. `visitor` is an HMAC of (IP + user agent + today's date)
// keyed on SESSION_SECRET, so it counts unique visitors WITHIN a day and
// becomes a different value tomorrow. Raw IPs are never written to disk.
//
// user_id is filled in only when the request carries a valid auth token, which
// is what makes the member-activity view possible without profiling everyone.
db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    day TEXT NOT NULL,
    visitor TEXT NOT NULL,
    user_id INTEGER,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    detail TEXT,
    referrer TEXT,
    device TEXT,
    browser TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_ae_day ON analytics_events(day);
  CREATE INDEX IF NOT EXISTS idx_ae_kind_name ON analytics_events(kind, name);
  CREATE INDEX IF NOT EXISTS idx_ae_user ON analytics_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_ae_ts ON analytics_events(ts);

  -- Rollups survive the retention prune, so long-range trends stay available
  -- without keeping event-level rows around forever.
  CREATE TABLE IF NOT EXISTS analytics_daily (
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    hits INTEGER NOT NULL,
    visitors INTEGER NOT NULL,
    PRIMARY KEY (day, kind, name)
  );
`)

// --- Welcome-screen vote ---
// A friendly poll, not a secure ballot, and the schema says so honestly.
//
// `token` is a random id the voting page keeps in the voter's own localStorage.
// It is the dedup key, so one browser is one vote and a voter can change their
// mind without stuffing the box. Someone determined can clear their storage and
// vote twice -- that is a deliberate trade, because a real one-person-one-vote
// scheme would mean accounts, and this has to work for friends opening a link.
//
// `fingerprint` is HMAC(ip|user-agent) with NO day component, so unlike the
// analytics `visitor` pseudonym it stays stable over time. That is the whole
// point here: it is what lets the poll owner see that eleven votes came from
// one device. It is still a one-way hash -- no raw IP is ever written to disk.
db.exec(`
  CREATE TABLE IF NOT EXISTS welcome_votes (
    token TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    voter_name TEXT,
    fingerprint TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wv_theme ON welcome_votes(theme);
  CREATE INDEX IF NOT EXISTS idx_wv_fp ON welcome_votes(fingerprint);
`)

// The ballot. Ids match ?theme= on /royal-welcome-2/, which is what the voting
// page actually loads, so a vote can never name a screen nobody can watch.
const VOTE_THEMES = [
  'sapphire', 'coronation', 'moonlit', 'embers', 'cathedral',
  'storm', 'dragongate', 'warcamp', 'celestial',
]

// Stable pseudonym -- deliberately NOT day-rotating, see above.
function voterFingerprint(req) {
  const raw = `${clientIp(req)}|${req.headers['user-agent'] || ''}|welcome-vote`
  return crypto.createHmac('sha256', SECRET).update(raw).digest('base64url').slice(0, 22)
}

// Columns added after the table shipped; the live database already exists.
// The schedule stored a time but never a day, so nothing knew whether an event
// runs today. That was fine while the schedule was only ever read by a human
// looking at a table; it is not fine for something that decides whether to buzz
// a phone. Existing rows default to every day and leaders narrow them.
// Notification preferences belong to the device, not the account: the same
// person may want a digest on their phone and nothing on the desktop they leave
// logged in. The push subscription IS the device, so the preferences live on it.
const psCols = db.prepare('PRAGMA table_info(push_subscriptions)').all()
if (psCols.length) {
  const add = (col, decl) => { if (!psCols.some((c) => c.name === col)) db.exec(`ALTER TABLE push_subscriptions ADD COLUMN ${col} ${decl}`) }
  add('digest_weekly', 'INTEGER DEFAULT 0')
  add('alert_arena', 'INTEGER DEFAULT 1')
  add('alert_crown', 'INTEGER DEFAULT 1')
}

const schedCols = db.prepare('PRAGMA table_info(alliance_schedules)').all()
if (!schedCols.some((c) => c.name === 'event_days')) {
  db.exec("ALTER TABLE alliance_schedules ADD COLUMN event_days TEXT DEFAULT '0,1,2,3,4,5,6'")
}

const aeCols = db.prepare('PRAGMA table_info(analytics_events)').all()
if (!aeCols.some((c) => c.name === 'country')) db.exec('ALTER TABLE analytics_events ADD COLUMN country TEXT')
if (!aeCols.some((c) => c.name === 'campaign')) db.exec('ALTER TABLE analytics_events ADD COLUMN campaign TEXT')

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

// --- Analytics helpers ---
const clientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10)

// Daily-rotating pseudonym. Including the day in the HMAC input is the whole
// privacy design: the same person is a different `visitor` tomorrow, so the
// table can answer "how many people today" but not "what has this person done
// over the last month".
function visitorId(req, day = utcDay()) {
  const raw = `${clientIp(req)}|${req.headers['user-agent'] || ''}|${day}`
  return crypto.createHmac('sha256', SECRET).update(raw).digest('base64url').slice(0, 22)
}

// Crawlers, uptime pingers and link-preview bots are the majority of raw hits on
// a small site. Counting them makes every number a lie, so they are dropped at
// the door rather than stored and filtered later.
const BOT_RE = /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discordbot|preview|monitor|uptime|pingdom|curl|wget|python-requests|axios|headless|lighthouse|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|yandex|baidu|duckduck|applebot|phantomjs|selenium|puppeteer/i
const isBot = (ua = '') => !ua || BOT_RE.test(String(ua))

// Country, when the host in front of us provides it. Render and Cloudflare both
// set one of these; if none is present the column simply stays null rather than
// this guessing from an IP we have deliberately chosen not to keep.
function countryOf(req) {
  const h = req.headers
  const c = h['cf-ipcountry'] || h['x-vercel-ip-country'] || h['x-country-code']
    || h['x-geo-country'] || h['fastly-client-country'] || null
  if (!c) return null
  const v = String(c).trim().toUpperCase()
  return /^[A-Z]{2}$/.test(v) && v !== 'XX' ? v : null
}

function parseAgent(ua = '') {
  const s = String(ua)
  const device = /iPad|Tablet/i.test(s) ? 'tablet'
    : /Mobi|Android|iPhone|iPod/i.test(s) ? 'mobile' : 'desktop'
  const browser = /Edg\//.test(s) ? 'Edge'
    : /OPR\/|Opera/.test(s) ? 'Opera'
    : /Chrome\//.test(s) ? 'Chrome'
    : /Firefox\//.test(s) ? 'Firefox'
    : /Safari\//.test(s) ? 'Safari' : 'Other'
  return { device, browser }
}

// Referrers are only useful as a host. Keeping full URLs would store query
// strings we have no reason to hold.
function refHost(referrer) {
  if (!referrer) return null
  try {
    const h = new URL(String(referrer)).hostname.replace(/^www\./, '')
    return h || null
  } catch { return null }
}

// Server-side events. More trustworthy than the browser beacon -- an ad
// blocker cannot drop these, and the server already knows who the actor is.
function logEvent(req, kind, name, { detail = null, userId = null } = {}) {
  try {
    const day = utcDay()
    const { device, browser } = parseAgent(req.headers['user-agent'])
    if (isBot(req.headers['user-agent'])) return
    insertEvent.run(Date.now(), day, visitorId(req, day), userId, kind, name,
      detail == null ? null : String(detail).slice(0, 200), null, device, browser,
      countryOf(req), null)
  } catch { /* analytics must never break a real request */ }
}

const KINDS = new Set(['page', 'tool', 'action'])
const clip = (v, n) => (v == null ? null : String(v).slice(0, n))

const insertEvent = db.prepare(`INSERT INTO analytics_events
  (ts, day, visitor, user_id, kind, name, detail, referrer, device, browser, country, campaign)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)

// Per-visitor write cap, so a single client cannot flood the table.
const trackCounts = new Map()
const TRACK_WINDOW = 60 * 1000
const TRACK_MAX = 120
function trackAllowed(key) {
  const now = Date.now()
  const e = trackCounts.get(key)
  if (!e || now > e.resetAt) { trackCounts.set(key, { count: 1, resetAt: now + TRACK_WINDOW }); return true }
  e.count++
  return e.count <= TRACK_MAX
}
// The map is per-minute state, not a store; drop expired keys so it cannot grow.
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of trackCounts) if (now > v.resetAt) trackCounts.delete(k)
}, 5 * 60 * 1000).unref?.()

// Roll yesterday-and-older detail into analytics_daily, then drop events past
// the retention window. Counts stay; the rows that could identify a session go.
const RETENTION_DAYS = 90
function rollupAndPrune() {
  const cutoff = utcDay(Date.now() - RETENTION_DAYS * 86400000)
  const today = utcDay()
  db.exec('BEGIN')
  try {
    db.prepare(`INSERT OR REPLACE INTO analytics_daily (day, kind, name, hits, visitors)
      SELECT day, kind, name, COUNT(*), COUNT(DISTINCT visitor)
      FROM analytics_events WHERE day < ? GROUP BY day, kind, name`).run(today)
    db.prepare('DELETE FROM analytics_events WHERE day < ?').run(cutoff)
    db.exec('COMMIT')
  } catch (e) { db.exec('ROLLBACK') }
}
rollupAndPrune()
setInterval(rollupAndPrune, 6 * 60 * 60 * 1000).unref?.()

// --- Routes ---
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// Public collector. Never returns data, never sets a cookie, and accepts a
// beacon body (sendBeacon posts text/plain, so the JSON parser may not have
// run). Fails silently: analytics must never break a page.
app.post('/api/track', express.text({ type: 'text/plain', limit: '8kb' }), (req, res) => {
  try {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
    if (!body || typeof body !== 'object') return res.status(204).end()

    if (isBot(req.headers['user-agent'])) return res.status(204).end()

    const kind = String(body.kind || '')
    const name = clip(body.name, 120)
    if (!KINDS.has(kind) || !name) return res.status(204).end()

    const day = utcDay()
    const visitor = visitorId(req, day)
    if (!trackAllowed(visitor)) return res.status(204).end()

    // Attribute to a member only when the token actually verifies.
    const h = req.headers.authorization || ''
    const uid = verifyToken(h.startsWith('Bearer ') ? h.slice(7) : null)
    const userId = uid && db.prepare('SELECT id FROM users WHERE id = ?').get(uid) ? uid : null

    const { device, browser } = parseAgent(req.headers['user-agent'])
    insertEvent.run(Date.now(), day, visitor, userId, kind, name,
      clip(body.detail, 200), refHost(body.referrer), device, browser,
      countryOf(req), clip(body.campaign, 60))
  } catch { /* never surface analytics failures to the page */ }
  res.status(204).end()
})

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
  logEvent(req, 'action', 'login', { detail: user.role, userId: user.id })
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
  logEvent(req, 'action', 'transfer-request', { detail: alliance || null })
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
  const before = db.prepare('SELECT king_type, name, alliance_tag, alliance_name FROM king_status WHERE id=1').get() || {}
  const next = {
    king_type: king_type || 'King',
    name: name || 'King Spartan',
    alliance_tag: alliance_tag || '[RYO]',
    alliance_name: alliance_name || 'Spiders',
  }
  db.prepare("UPDATE king_status SET king_type=?, name=?, alliance_tag=?, alliance_name=?, updated_at=datetime('now') WHERE id=1").run(
    next.king_type, next.name, next.alliance_tag, next.alliance_name)
  res.json({ ok: true })

  // Only when something actually changed. Saving the form untouched -- which
  // happens whenever this page is opened and closed again -- must not announce
  // a coronation that did not occur.
  const changed = ['king_type', 'name', 'alliance_tag', 'alliance_name'].some((k) => (before[k] || '') !== next[k])
  if (!changed) return

  // Sent after the response for the same reason as every other alert here: the
  // save must not fail because a push service is having a bad afternoon.
  sendKingdomWide('alert_crown', {
    title: `${next.king_type} ${next.name} takes the throne`,
    body: `${next.alliance_tag} ${next.alliance_name} holds the crown of Kingdom 846. Long may they reign.`,
    image: '/assets/hero-throne-room.webp',
    tag: `crown-${Date.now()}`,
    urgent: false,
    url: '/#/dashboard',
    actions: [{ action: 'kingdom', title: 'See the kingdom' }, { action: 'dismiss', title: 'Dismiss' }],
    actionUrls: { kingdom: '/#/dashboard' },
  })
    .then((r) => console.log(`[push] crown -> ${next.king_type} ${next.name} · ${r.sent} sent, ${r.dropped} stale`))
    .catch((e) => console.error('[push] crown announcement failed', e.message))
})

// Applications — public submit, admin view/manage
app.post('/api/applications', (req, res) => {
  const { type, player_id, nickname, request_kind, day, payload } = req.body || {}
  if (!type || !player_id || !nickname) return res.status(400).json({ error: 'Type, Player ID, and Nickname are required' })
  const info = db.prepare('INSERT INTO applications (type, player_id, nickname, request_kind, day, payload) VALUES (?,?,?,?,?,?)')
    .run(type, player_id, nickname, request_kind || null, day || null, JSON.stringify(payload || {}))
  logEvent(req, 'action', 'application', { detail: type })
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

// Admin read side. Everything here is an aggregate except the member-activity
// list, which is limited to people who chose to log in.
app.get('/api/admin/analytics', auth, adminOnly, (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30))
  const since = utcDay(Date.now() - (days - 1) * 86400000)
  const q = (sql, ...a) => db.prepare(sql).all(...a)

  const window = (n) => {
    const from = utcDay(Date.now() - (n - 1) * 86400000)
    const r = db.prepare(`SELECT COUNT(DISTINCT visitor) v, COUNT(*) h
      FROM analytics_events WHERE day >= ?`).get(from)
    const p = db.prepare(`SELECT COUNT(*) h FROM analytics_events WHERE day >= ? AND kind = 'page'`).get(from)
    return { visitors: r?.v || 0, events: r?.h || 0, pageviews: p?.h || 0 }
  }

  // A VISIT is a run of events from one visitor with no 30-minute gap. Derived
  // at query time with window functions rather than stored, so there is no
  // session row to keep and nothing extra to expire.
  const VISIT_GAP = 30 * 60 * 1000
  const visitCte = `
    WITH marked AS (
      SELECT visitor, ts, kind, name,
        CASE WHEN ts - LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) > ${VISIT_GAP}
              OR LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) IS NULL
             THEN 1 ELSE 0 END AS is_start
      FROM analytics_events WHERE day >= ?
    ),
    visits AS (
      SELECT visitor, ts, kind, name,
        SUM(is_start) OVER (PARTITION BY visitor ORDER BY ts ROWS UNBOUNDED PRECEDING) AS vno
      FROM marked
    )`

  const perVisit = db.prepare(`${visitCte}
    SELECT visitor, vno,
      SUM(CASE WHEN kind = 'page' THEN 1 ELSE 0 END) pages,
      MAX(ts) - MIN(ts) AS dur
    FROM visits GROUP BY visitor, vno`).all(since)
  const withPages = perVisit.filter((v) => v.pages > 0)
  const bounced = withPages.filter((v) => v.pages === 1).length
  const engagement = {
    visits: withPages.length,
    // Share of visits that were a single page and then gone.
    bounceRate: withPages.length ? Math.round((bounced / withPages.length) * 100) : 0,
    pagesPerVisit: withPages.length
      ? Math.round((withPages.reduce((a, v) => a + v.pages, 0) / withPages.length) * 10) / 10 : 0,
    // Median, not mean: one tab left open for six hours would wreck a mean.
    medianSeconds: (() => {
      const d = withPages.filter((v) => v.pages > 1).map((v) => v.dur).sort((a, b) => a - b)
      return d.length ? Math.round(d[Math.floor(d.length / 2)] / 1000) : 0
    })(),
  }

  // The page each visit started on -- where people actually enter the site.
  const entries = db.prepare(`${visitCte}
    , firsts AS (
      SELECT visitor, vno, name,
        ROW_NUMBER() OVER (PARTITION BY visitor, vno ORDER BY ts) rn
      FROM visits WHERE kind = 'page'
    )
    SELECT name, COUNT(*) hits, COUNT(DISTINCT visitor) visitors
    FROM firsts WHERE rn = 1 GROUP BY name ORDER BY hits DESC LIMIT 15`).all(since)

  res.json({
    generatedAt: Date.now(),
    days,
    retentionDays: RETENTION_DAYS,
    today: window(1),
    week: window(7),
    // The currently selected window, which is what `previous` is comparable to.
    // `month` was a fixed 30 days and produced a meaningless percentage when
    // the range switch was set to anything else.
    selected: window(days),
    engagement,
    entries,
    // Same-length window immediately before this one, so the dashboard can show
    // direction rather than a bare number.
    previous: (() => {
      const from = utcDay(Date.now() - (2 * days - 1) * 86400000)
      const to = utcDay(Date.now() - days * 86400000)
      const r = db.prepare(`SELECT COUNT(DISTINCT visitor) v,
          SUM(CASE WHEN kind = 'page' THEN 1 ELSE 0 END) p
        FROM analytics_events WHERE day >= ? AND day <= ?`).get(from, to)
      return { visitors: r?.v || 0, pageviews: r?.p || 0 }
    })(),
    // When the kingdom is actually online, as a weekday x hour grid in UTC.
    // Returned raw so the browser can shift it into the viewer's own timezone;
    // for a game community this is the most directly useful thing here.
    activity: q(`SELECT
        CAST(strftime('%w', ts / 1000, 'unixepoch') AS INTEGER) dow,
        CAST(strftime('%H', ts / 1000, 'unixepoch') AS INTEGER) hour,
        COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? GROUP BY dow, hour`, since),
    // What the people who are here right now are looking at.
    livePages: db.prepare(`SELECT name, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE ts > ? AND kind = 'page'
      GROUP BY name ORDER BY visitors DESC LIMIT 8`).all(Date.now() - 5 * 60 * 1000),
    // Site health: links out, and routes that resolved to nothing.
    outbound: q(`SELECT detail name, COUNT(*) hits
      FROM analytics_events WHERE day >= ? AND kind = 'action' AND name = 'outbound' AND detail IS NOT NULL
      GROUP BY detail ORDER BY hits DESC LIMIT 12`, since),
    notFound: q(`SELECT detail name, COUNT(*) hits
      FROM analytics_events WHERE day >= ? AND kind = 'action' AND name = 'notfound' AND detail IS NOT NULL
      GROUP BY detail ORDER BY hits DESC LIMIT 12`, since),
    // Distinct visitors seen in the last five minutes.
    live: db.prepare('SELECT COUNT(DISTINCT visitor) n FROM analytics_events WHERE ts > ?')
      .get(Date.now() - 5 * 60 * 1000)?.n || 0,
    countries: q(`SELECT country name, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND country IS NOT NULL
      GROUP BY country ORDER BY visitors DESC LIMIT 15`, since),
    campaigns: q(`SELECT campaign name, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND campaign IS NOT NULL
      GROUP BY campaign ORDER BY visitors DESC LIMIT 15`, since),
    // One row per day so the dashboard can draw a trend without post-processing.
    series: q(`SELECT day,
        COUNT(DISTINCT visitor) visitors,
        SUM(CASE WHEN kind = 'page' THEN 1 ELSE 0 END) pageviews
      FROM analytics_events WHERE day >= ? GROUP BY day ORDER BY day`, since),
    pages: q(`SELECT name, COUNT(*) hits, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND kind = 'page'
      GROUP BY name ORDER BY hits DESC LIMIT 25`, since),
    tools: q(`SELECT name, COUNT(*) hits, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND kind = 'tool'
      GROUP BY name ORDER BY hits DESC LIMIT 25`, since),
    // outbound and notfound get their own panels below, so they are excluded
    // here rather than swamping the list of things people actually did.
    actions: q(`SELECT name, COUNT(*) hits, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND kind = 'action'
        AND name NOT IN ('outbound', 'notfound')
      GROUP BY name ORDER BY hits DESC LIMIT 25`, since),
    referrers: q(`SELECT referrer name, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND referrer IS NOT NULL
      GROUP BY referrer ORDER BY visitors DESC LIMIT 15`, since),
    devices: q(`SELECT device name, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND device IS NOT NULL
      GROUP BY device ORDER BY visitors DESC`, since),
    browsers: q(`SELECT browser name, COUNT(DISTINCT visitor) visitors
      FROM analytics_events WHERE day >= ? AND browser IS NOT NULL
      GROUP BY browser ORDER BY visitors DESC`, since),
    // Members: who is actually using the site, and how recently.
    members: q(`SELECT u.id, u.display_name, u.username, u.alliance_tag, u.role,
        COUNT(*) events, MAX(e.ts) last_seen,
        SUM(CASE WHEN e.kind = 'page' THEN 1 ELSE 0 END) pageviews
      FROM analytics_events e JOIN users u ON u.id = e.user_id
      WHERE e.day >= ? GROUP BY u.id ORDER BY last_seen DESC`, since),
    recent: q(`SELECT e.ts, e.kind, e.name, e.detail, u.display_name, u.username, u.alliance_tag
      FROM analytics_events e JOIN users u ON u.id = e.user_id
      WHERE e.day >= ? ORDER BY e.ts DESC LIMIT 60`, since),
  })
})

// CSV of the daily aggregate, for anyone who would rather work in a spreadsheet.
// Aggregates only -- there is no per-visitor export because there is no
// per-visitor record to export.
// The full export.
//
// This used to emit five columns of daily totals and nothing else, while the
// dashboard beside it computed pages, tools, actions, entry pages, engagement,
// referrers, devices, browsers, countries, campaigns, outbound links and 404s.
// Downloading the data gave you a fraction of what looking at the screen did,
// which is backwards -- the export is what you keep.
//
// It also read only analytics_events, which rollupAndPrune() empties past
// RETENTION_DAYS. analytics_daily exists precisely so long-range history
// survives that prune, and the export never touched it, so `?days=365` could
// never return more than 90 days no matter what was asked for. Fixed by
// reading events for the detailed window and the rollups for everything older.
app.get('/api/admin/analytics/export', auth, adminOnly, (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 90))
  const since = utcDay(Date.now() - (days - 1) * 86400000)
  const detailFrom = utcDay(Date.now() - RETENTION_DAYS * 86400000)
  const q = (sql, ...a) => db.prepare(sql).all(...a)

  // RFC4180: quote anything containing a comma, quote or newline, and double
  // any embedded quotes. Page names and referrers are user-facing strings and
  // a stray comma would silently shift every column after it.
  const cell = (v) => {
    if (v === null || v === undefined) return ''
    const t = String(v)
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const out = []
  const comment = (k, v) => out.push(`# ${k},${cell(v)}`)
  const section = (title, header, rows, map) => {
    out.push('', `# ${title}`, header)
    if (!rows.length) out.push('# (none in this window)')
    for (const r of rows) out.push(map(r).map(cell).join(','))
  }

  comment('report', 'Kingdom 846 analytics export')
  comment('generated', new Date().toISOString())
  comment('window_days', days)
  comment('window_from', since)
  comment('window_to', utcDay())
  comment('detail_retention_days', RETENTION_DAYS)
  comment('note', `Days on or after ${detailFrom} come from event detail. Older days come from daily rollups, which store hits per page but not a per-day distinct-visitor count, so the visitors column is blank for those rows rather than guessed.`)

  // ---- daily series ------------------------------------------------------
  const recent = q(`SELECT day,
      COUNT(DISTINCT visitor) visitors,
      SUM(CASE WHEN kind = 'page'   THEN 1 ELSE 0 END) pageviews,
      SUM(CASE WHEN kind = 'tool'   THEN 1 ELSE 0 END) tool_opens,
      SUM(CASE WHEN kind = 'action' THEN 1 ELSE 0 END) actions
    FROM analytics_events WHERE day >= ? GROUP BY day`, since)
  const older = q(`SELECT day,
      SUM(CASE WHEN kind = 'page'   THEN hits ELSE 0 END) pageviews,
      SUM(CASE WHEN kind = 'tool'   THEN hits ELSE 0 END) tool_opens,
      SUM(CASE WHEN kind = 'action' THEN hits ELSE 0 END) actions
    FROM analytics_daily WHERE day >= ? AND day < ? GROUP BY day`, since, detailFrom)
  const daily = [...older.map((r) => ({ ...r, visitors: null, source: 'rollup' })),
                 ...recent.map((r) => ({ ...r, source: 'detail' }))]
    .sort((a, b) => a.day.localeCompare(b.day))
  section('Daily totals', 'day,visitors,pageviews,tool_opens,actions,source',
    daily, (r) => [r.day, r.visitors, r.pageviews, r.tool_opens, r.actions, r.source])

  // ---- breakdowns, all over the detailed window --------------------------
  const byKind = (kind, extra = '') => q(`SELECT name, COUNT(*) hits, COUNT(DISTINCT visitor) visitors
    FROM analytics_events WHERE day >= ? AND kind = ? ${extra}
    GROUP BY name ORDER BY hits DESC`, since, kind)
  const nv = (r) => [r.name, r.hits, r.visitors]

  section('Pages', 'page,hits,visitors', byKind('page'), nv)
  section('Tools opened', 'tool,hits,visitors', byKind('tool'), nv)
  section('Actions', 'action,hits,visitors',
    byKind('action', "AND name NOT IN ('outbound','notfound')"), nv)
  section('Outbound links', 'url,hits',
    q(`SELECT detail name, COUNT(*) hits FROM analytics_events
       WHERE day >= ? AND kind = 'action' AND name = 'outbound' AND detail IS NOT NULL
       GROUP BY detail ORDER BY hits DESC`, since), (r) => [r.name, r.hits])
  section('Not found', 'path,hits',
    q(`SELECT detail name, COUNT(*) hits FROM analytics_events
       WHERE day >= ? AND kind = 'action' AND name = 'notfound' AND detail IS NOT NULL
       GROUP BY detail ORDER BY hits DESC`, since), (r) => [r.name, r.hits])

  const dim = (col) => q(`SELECT ${col} name, COUNT(DISTINCT visitor) visitors
    FROM analytics_events WHERE day >= ? AND ${col} IS NOT NULL
    GROUP BY ${col} ORDER BY visitors DESC`, since)
  section('Referrers', 'referrer,visitors', dim('referrer'), (r) => [r.name, r.visitors])
  section('Countries', 'country,visitors', dim('country'), (r) => [r.name, r.visitors])
  section('Campaigns', 'campaign,visitors', dim('campaign'), (r) => [r.name, r.visitors])
  section('Devices', 'device,visitors', dim('device'), (r) => [r.name, r.visitors])
  section('Browsers', 'browser,visitors', dim('browser'), (r) => [r.name, r.visitors])

  // ---- when the kingdom is online ----------------------------------------
  section('Activity by weekday and hour (UTC)', 'weekday,hour_utc,visitors',
    q(`SELECT CAST(strftime('%w', ts / 1000, 'unixepoch') AS INTEGER) dow,
         CAST(strftime('%H', ts / 1000, 'unixepoch') AS INTEGER) hour,
         COUNT(DISTINCT visitor) visitors
       FROM analytics_events WHERE day >= ? GROUP BY dow, hour ORDER BY dow, hour`, since),
    (r) => [['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.dow], r.hour, r.visitors])

  // ---- engagement, same visit definition the dashboard uses ---------------
  const VISIT_GAP = 30 * 60 * 1000
  const perVisit = q(`
    WITH marked AS (
      SELECT visitor, ts, kind,
        CASE WHEN ts - LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) > ${VISIT_GAP}
              OR LAG(ts) OVER (PARTITION BY visitor ORDER BY ts) IS NULL
             THEN 1 ELSE 0 END AS is_start
      FROM analytics_events WHERE day >= ?
    ),
    visits AS (
      SELECT visitor, ts, kind,
        SUM(is_start) OVER (PARTITION BY visitor ORDER BY ts ROWS UNBOUNDED PRECEDING) AS vno
      FROM marked
    )
    SELECT visitor, vno, SUM(CASE WHEN kind = 'page' THEN 1 ELSE 0 END) pages,
      MAX(ts) - MIN(ts) dur FROM visits GROUP BY visitor, vno`, since)
  const withPages = perVisit.filter((v) => v.pages > 0)
  const durations = withPages.filter((v) => v.pages > 1).map((v) => v.dur).sort((a, b) => a - b)
  section('Engagement', 'metric,value', [
    ['visits', withPages.length],
    ['bounce_rate_pct', withPages.length ? Math.round((withPages.filter((v) => v.pages === 1).length / withPages.length) * 100) : 0],
    ['pages_per_visit', withPages.length ? Math.round((withPages.reduce((a, v) => a + v.pages, 0) / withPages.length) * 10) / 10 : 0],
    ['median_visit_seconds', durations.length ? Math.round(durations[Math.floor(durations.length / 2)] / 1000) : 0],
  ], (r) => r)

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="kingdom846-analytics-${utcDay()}.csv"`)
  res.send(out.join('\n'))
})

// --- Welcome-screen vote ---
// Open endpoints on purpose: the whole point is a link that friends outside the
// site can open and vote on without an account.

function voteResults() {
  const rows = db.prepare('SELECT theme, COUNT(*) AS votes FROM welcome_votes GROUP BY theme').all()
  const byTheme = Object.fromEntries(rows.map((r) => [r.theme, r.votes]))
  const total = rows.reduce((n, r) => n + r.votes, 0)
  return {
    total,
    // every candidate is listed, including the ones on zero, so the bar chart
    // does not silently drop a screen nobody has picked yet
    tallies: VOTE_THEMES.map((t) => ({
      theme: t,
      votes: byTheme[t] || 0,
      pct: total ? Math.round(((byTheme[t] || 0) / total) * 1000) / 10 : 0,
    })).sort((a, b) => b.votes - a.votes || a.theme.localeCompare(b.theme)),
    voters: db.prepare(
      `SELECT voter_name AS name, theme, updated_at
         FROM welcome_votes
        WHERE voter_name IS NOT NULL AND voter_name <> ''
        ORDER BY updated_at DESC LIMIT 200`
    ).all(),
    // How many distinct devices sit behind those votes. If this is far below
    // `total`, someone is voting from one phone over and over.
    devices: db.prepare('SELECT COUNT(DISTINCT fingerprint) AS n FROM welcome_votes').get().n,
  }
}

app.post('/api/vote', (req, res) => {
  const { token, theme, name } = req.body || {}
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    return res.status(400).json({ error: 'bad token' })
  }
  if (!VOTE_THEMES.includes(theme)) return res.status(400).json({ error: 'unknown screen' })
  const clean = typeof name === 'string' ? name.trim().slice(0, 32) : ''
  const now = Date.now()
  // One row per browser token. Voting again updates the existing row rather
  // than adding one, so changing your mind never inflates the count.
  db.prepare(`
    INSERT INTO welcome_votes (token, theme, voter_name, fingerprint, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET
      theme = excluded.theme,
      voter_name = excluded.voter_name,
      updated_at = excluded.updated_at
  `).run(token, theme, clean || null, voterFingerprint(req), now, now)
  res.json({ ok: true, yourVote: theme, ...voteResults() })
})

app.get('/api/vote/results', (_req, res) => res.json(voteResults()))

// Owner's audit view: which fingerprints carry more than one vote. Kept behind
// admin auth because it is the one view that could de-anonymise a voter.
app.get('/api/vote/audit', auth, adminOnly, (_req, res) => {
  res.json({
    ...voteResults(),
    duplicates: db.prepare(`
      SELECT fingerprint, COUNT(*) AS votes, GROUP_CONCAT(theme) AS themes
        FROM welcome_votes
       GROUP BY fingerprint HAVING COUNT(*) > 1
       ORDER BY votes DESC
    `).all(),
  })
})


/* ===== Backups ==============================================================
 * Everything the kingdom has -- rosters, applications, transfer requests,
 * credentials, notification sign-ups -- is one SQLite file on one disk. Until
 * now there was no second copy of it anywhere.
 *
 * Three things make this a real backup rather than a file lying next to the
 * original:
 *
 *   1. It is taken through SQLite's online backup API, not by copying the file.
 *      The database runs in WAL mode, so a plain copy taken while the server is
 *      serving can miss the write-ahead log and produce a file that opens fine
 *      and is quietly missing the last writes -- or does not open at all.
 *   2. Every backup is verified immediately after it is written, by opening it
 *      and running an integrity check. An unverified backup is a guess.
 *   3. Sparta can download it. A copy on the same disk survives the common
 *      disasters -- a bad migration, a mistaken roster upload, corruption -- but
 *      not the disk itself. The download is what makes an off-site copy
 *      possible, and off-site is the only copy that survives everything.
 * ------------------------------------------------------------------------- */

// `fs` is declared further down this file for serving the frontend; a second
// `const fs` at module scope would be a redeclaration error, so this binding is
// named for what it is used by.
const backupFs = require('node:fs')

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups')
const BACKUP_KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14)
// The disk is 1 GB on the live service and the database shares it, so backups
// are not allowed to grow until there is no room left for the thing they exist
// to protect.
const BACKUP_MAX_BYTES = Number(process.env.BACKUP_MAX_BYTES) || 300 * 1024 * 1024
const BACKUP_NAME_RE = /^k846-\d{4}-\d{2}-\d{2}(-\d{6})?\.db$/

function backupStamp(date, withTime) {
  const iso = date.toISOString()
  return withTime
    ? `${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, '')}`
    : iso.slice(0, 10)
}

function listBackups() {
  try { backupFs.mkdirSync(BACKUP_DIR, { recursive: true }) } catch {}
  return backupFs.readdirSync(BACKUP_DIR)
    .filter((name) => BACKUP_NAME_RE.test(name))
    .map((name) => {
      const stat = backupFs.statSync(path.join(BACKUP_DIR, name))
      return { name, bytes: stat.size, taken_at: stat.mtime.toISOString() }
    })
    // Newest first. The names sort lexically by date, but mtime is the truth
    // for a file that was restored or copied in by hand.
    .sort((a, b) => b.name.localeCompare(a.name))
}

/**
 * Open the finished file and ask SQLite whether it is sound, then confirm the
 * tables that matter actually came across. A backup that is merely present
 * tells you nothing; this is what lets the console say "verified".
 */
function verifyBackup(file) {
  let probe
  try {
    probe = new Database(file, { readonly: true, fileMustExist: true })
    const integrity = probe.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') return { ok: false, reason: `integrity_check: ${integrity}` }
    // A structurally valid but empty file would pass the check above.
    const users = probe.prepare('SELECT COUNT(*) n FROM users').get().n
    if (!users) return { ok: false, reason: 'no user rows in the copy' }
    const roster = probe.prepare('SELECT COUNT(*) n FROM roster_members').get().n
    return { ok: true, users, roster_members: roster }
  } catch (err) {
    return { ok: false, reason: err.message }
  } finally {
    try { probe?.close() } catch {}
  }
}

/** Drop the oldest backups once there are too many, or they take too much room. */
function pruneBackups() {
  const removed = []
  let files = listBackups()

  while (files.length > BACKUP_KEEP) {
    const oldest = files.pop()
    try { backupFs.unlinkSync(path.join(BACKUP_DIR, oldest.name)); removed.push(oldest.name) } catch {}
  }
  // Never prune below two: one recent copy, and one to fall back to if the
  // recent one turns out to have captured the very problem being recovered from.
  while (files.reduce((sum, f) => sum + f.bytes, 0) > BACKUP_MAX_BYTES && files.length > 2) {
    const oldest = files.pop()
    try { backupFs.unlinkSync(path.join(BACKUP_DIR, oldest.name)); removed.push(oldest.name) } catch {}
  }
  return removed
}

/**
 * Take one backup. `manual` puts the time in the filename so an on-demand copy
 * never overwrites the day's automatic one.
 */
async function runBackup({ manual = false } = {}) {
  try { backupFs.mkdirSync(BACKUP_DIR, { recursive: true }) } catch {}
  const name = `k846-${backupStamp(new Date(), manual)}.db`
  const target = path.join(BACKUP_DIR, name)
  const temp = `${target}.part`
  const started = Date.now()

  try {
    // Written under a temporary name and moved into place only once it is
    // verified, so a backup interrupted half-way never appears in the list as
    // though it were usable.
    await db.backup(temp)
    const check = verifyBackup(temp)
    if (!check.ok) {
      try { backupFs.unlinkSync(temp) } catch {}
      console.error(`[backup] discarded ${name}: ${check.reason}`)
      return { ok: false, error: check.reason }
    }
    backupFs.renameSync(temp, target)
    const bytes = backupFs.statSync(target).size
    const pruned = pruneBackups()
    const ms = Date.now() - started
    console.log(`[backup] ${name} — ${(bytes / 1024).toFixed(0)} KB, ${check.users} users, ${check.roster_members} roster rows, ${ms}ms${pruned.length ? `, pruned ${pruned.length}` : ''}`)
    return { ok: true, name, bytes, ms, verified: check, pruned }
  } catch (err) {
    try { backupFs.unlinkSync(temp) } catch {}
    console.error('[backup] failed:', err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Checked often, acts rarely: if there is no backup carrying today's date, take
 * one. Restart-safe by construction -- a fixed daily timer would simply skip a
 * day whenever a deploy landed near its hour, which is exactly the day you most
 * want a copy from.
 */
async function backupTick() {
  const today = backupStamp(new Date(), false)
  if (listBackups().some((b) => b.name.startsWith(`k846-${today}`))) return
  await runBackup()
}

app.get('/api/admin/backups', auth, adminOnly, (_req, res) => {
  const files = listBackups()
  res.json({
    directory: BACKUP_DIR,
    keep: BACKUP_KEEP,
    total_bytes: files.reduce((sum, f) => sum + f.bytes, 0),
    database_bytes: (() => { try { return backupFs.statSync(DB_PATH).size } catch { return null } })(),
    backups: files,
  })
})

app.post('/api/admin/backups', auth, adminOnly, async (_req, res) => {
  const result = await runBackup({ manual: true })
  if (!result.ok) return res.status(500).json({ error: result.error || 'Backup failed' })
  res.json(result)
})

app.get('/api/admin/backups/:name', auth, adminOnly, (req, res) => {
  const name = String(req.params.name || '')
  // The filename is checked against the pattern AND the resolved path is
  // confirmed to sit inside the backup directory. This endpoint hands over the
  // entire database, password hashes included, so a traversal here would be the
  // whole kingdom rather than one file.
  if (!BACKUP_NAME_RE.test(name)) return res.status(400).json({ error: 'Invalid backup name' })
  const target = path.resolve(BACKUP_DIR, name)
  if (path.dirname(target) !== path.resolve(BACKUP_DIR)) return res.status(400).json({ error: 'Invalid backup name' })
  if (!backupFs.existsSync(target)) return res.status(404).json({ error: 'No such backup' })
  res.download(target, name)
})

// Exported for the tests. Placed after the constants above rather than beside
// the other exports further up: those run before these are initialised, and
// reading a const early is a load-time error that takes the whole server down.
module.exports = { ...(module.exports || {}), runBackup, backupTick, listBackups, verifyBackup, pruneBackups, BACKUP_DIR }

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
  const rows = db.prepare('SELECT event_name, event_time, event_days, updated_at FROM alliance_schedules WHERE alliance_slug = ?').all(slug)
  const defaults = SCHEDULE_DEFAULTS[slug] || {}
  const schedule = ALLIANCE_EVENTS.map(event => {
    const match = rows.find(r => r.event_name === event)
    return {
      event,
      time: match?.event_time || defaults[event] || '',
      days: parseDays(match?.event_days ?? defaultDaysFor(event)),
      updated: match?.updated_at || null,
    }
  })
  res.json({ alliance_slug: slug, schedule })
})

// Leader: update their alliance's event schedule
app.put('/api/leader/schedule', auth, leaderOnly, (req, res) => {
  const slug = req.user.alliance_slug
  const { schedule } = req.body
  if (!Array.isArray(schedule)) return res.status(400).json({ error: 'Schedule array required' })
  const stmt = db.prepare("INSERT INTO alliance_schedules (alliance_slug, event_name, event_time, event_days, updated_at) VALUES (?,?,?,?,datetime('now')) ON CONFLICT(alliance_slug, event_name) DO UPDATE SET event_time=excluded.event_time, event_days=excluded.event_days, updated_at=datetime('now')")
  for (const item of schedule) {
    if (item.event && ALLIANCE_EVENTS.includes(item.event)) {
      // Days decide whether a phone buzzes, so they are normalised here rather
      // than trusted: anything unparseable falls back to the event's default
      // instead of silently becoming "no days" and going quiet.
      const days = parseDays(Array.isArray(item.days) ? item.days.join(',') : item.days)
      stmt.run(slug, item.event, item.time || '', (days.length ? days : parseDays(defaultDaysFor(item.event))).join(','))
    }
  }
  res.json({ ok: true, alliance_slug: slug, updated: schedule.length })
})


/* ===== Event reminders =====================================================
 * Players install the app, pick their alliance, and get a buzz 10 minutes and
 * 5 minutes before that alliance's events.
 *
 * These have to arrive when the app is closed, which rules out anything the
 * page could do for itself: a tab that is not running cannot set a timer, and
 * the Notification Triggers API that would let a service worker schedule one
 * has never shipped. So the server holds the schedule and pushes.
 * ------------------------------------------------------------------------- */
const webpush = require('web-push')

// Generated once and kept. Regenerating the pair would silently invalidate
// every subscription already handed out -- every installed app would keep
// listening on a key the server no longer signs with, and nothing would appear
// to be wrong until nobody got a reminder.
function vapidKeys() {
  const fromEnv = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  if (fromEnv) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  const get = db.prepare('SELECT value FROM app_settings WHERE key=?')
  const pub = get.get('vapid_public')?.value
  const priv = get.get('vapid_private')?.value
  if (pub && priv) return { publicKey: pub, privateKey: priv }
  const pair = webpush.generateVAPIDKeys()
  const put = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)')
  put.run('vapid_public', pair.publicKey)
  put.run('vapid_private', pair.privateKey)
  console.log('[push] generated a new VAPID key pair')
  return pair
}

const VAPID = vapidKeys()
// The contact address is required by the push services and is what they use to
// reach an operator about a misbehaving sender.
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@kingdom846.com', VAPID.publicKey, VAPID.privateKey)

const REMINDER_LEADS = [10, 5]           // minutes before an event
const ALL_DAYS = '0,1,2,3,4,5,6'

function parseDays(value) {
  return String(value == null || value === '' ? ALL_DAYS : value)
    .split(',').map((d) => Number(d.trim())).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
}

/** Effective schedule for one alliance: stored rows over seeded defaults. */
function allianceSchedule(slug) {
  const rows = db.prepare('SELECT event_name, event_time, event_days FROM alliance_schedules WHERE alliance_slug=?').all(slug)
  const defaults = SCHEDULE_DEFAULTS[slug] || {}
  return ALLIANCE_EVENTS.map((event) => {
    const row = rows.find((r) => r.event_name === event)
    return {
      event,
      time: row?.event_time || defaults[event] || '',
      // Vikings Vengeance names its own day, so an alliance that never touched
      // the schedule still gets that one right rather than a buzz every day.
      days: parseDays(row?.event_days ?? defaultDaysFor(event)),
    }
  })
}

function defaultDaysFor(event) {
  if (/tuesday/i.test(event)) return '2'
  if (/thursday/i.test(event)) return '4'
  return ALL_DAYS
}

app.get('/api/push/key', (_req, res) => res.json({ publicKey: VAPID.publicKey }))

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, alliance_slug: slug } = req.body || {}
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: 'A complete push subscription is required' })
  if (typeof endpoint !== 'string' || endpoint.length > 800) return res.status(400).json({ error: 'Invalid endpoint' })
  const valid = db.prepare('SELECT slug FROM alliances WHERE slug=?').get(String(slug || '').toLowerCase())
  if (!valid) return res.status(400).json({ error: 'Pick a valid alliance' })
  db.prepare(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, alliance_slug)
    VALUES (?,?,?,?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh=excluded.p256dh, auth=excluded.auth, alliance_slug=excluded.alliance_slug,
      last_seen=datetime('now'), failures=0`).run(endpoint, p256dh, auth, valid.slug)
  res.json({ ok: true, alliance_slug: valid.slug })
})

app.post('/api/push/unsubscribe', (req, res) => {
  const endpoint = req.body?.endpoint
  if (!endpoint) return res.status(400).json({ error: 'Endpoint required' })
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(String(endpoint))
  res.json({ ok: true })
})

/** What this device is currently signed up for, if anything. */
app.post('/api/push/status', (req, res) => {
  const endpoint = req.body?.endpoint
  if (!endpoint) return res.json({ subscribed: false })
  const row = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint=?').get(String(endpoint))
  res.json({ subscribed: !!row, alliance_slug: row?.alliance_slug || null, prefs: prefsOf(row) })
})


/* ---- Notification preferences ---------------------------------------------
 * The Settings toggles used to be React state with hard-coded defaults: never
 * written anywhere, never read by anything, and never connected to a sender.
 * Turning one on lasted until the app was closed, and would not have done
 * anything if it had lasted, because nothing was listening.
 *
 * They are stored on the push subscription now -- the device that would receive
 * them -- and each one has something on the server that actually sends it.
 * ------------------------------------------------------------------------- */

const PREF_KEYS = ['digest_weekly', 'alert_arena', 'alert_crown']

function prefsOf(row) {
  if (!row) return null
  return {
    digest_weekly: !!row.digest_weekly,
    alert_arena: !!row.alert_arena,
    alert_crown: !!row.alert_crown,
  }
}

/**
 * Send this device a sample reminder, on demand.
 *
 * It exists because a notification is the one part of this app nobody can see
 * before it matters: you find out whether it works, and what it looks like, at
 * 23:50 on the night you were relying on it. This turns that into a button.
 * The sample is the real five-minute Bear Hunt payload, so what arrives is what
 * will arrive.
 */
app.post('/api/push/test', async (req, res) => {
  const endpoint = req.body?.endpoint
  if (!endpoint || typeof endpoint !== 'string') return res.status(400).json({ error: 'Endpoint required' })
  const sub = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint=?').get(endpoint)
  if (!sub) return res.status(404).json({ error: 'This device is not signed up for notifications' })

  const sample = eventNotification({
    event: 'Bear Hunt -1',
    slug: sub.alliance_slug,
    time: allianceSchedule(sub.alliance_slug).find((e) => /bear/i.test(e.event))?.time || '04:00',
    lead: 5,
  })
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ ...sample, title: `${sample.title} (test)`, tag: `test-${Date.now()}` }),
      { TTL: 60 },
    )
    res.json({ ok: true })
  } catch (err) {
    // 404/410 means the browser threw this subscription away; say so plainly
    // rather than leaving someone waiting for a buzz that can never come.
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(endpoint)
      return res.status(410).json({ error: 'This device is no longer registered. Turn reminders off and on again.' })
    }
    console.error('[push] test send failed:', err?.message)
    res.status(502).json({ error: 'The push service would not take it. Try again in a moment.' })
  }
})

app.post('/api/push/prefs', (req, res) => {
  const endpoint = req.body?.endpoint
  if (!endpoint || typeof endpoint !== 'string') return res.status(400).json({ error: 'Endpoint required' })
  const row = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint=?').get(endpoint)
  if (!row) return res.status(404).json({ error: 'This device is not signed up for notifications' })

  const prefs = req.body?.prefs || {}
  for (const key of PREF_KEYS) {
    if (typeof prefs[key] !== 'boolean') continue
    db.prepare(`UPDATE push_subscriptions SET ${key}=? WHERE endpoint=?`).run(prefs[key] ? 1 : 0, endpoint)
  }
  const updated = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint=?').get(endpoint)
  res.json({ ok: true, prefs: prefsOf(updated) })
})



/**
 * The weekly digest. Sent once a week rather than once a day, so the dedupe key
 * is the ISO week: a restart, a redeploy, or the half-hourly tick running
 * forty-eight times cannot turn one digest into two.
 */
function isoWeekKey(date) {
  // Thursday of the current week decides the ISO year, which is what keeps the
  // turn of the year from producing two week-ones or none.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const DIGEST_DAY = 1     // Monday
const DIGEST_HOUR = 12   // 12:00 UTC

async function digestTick() {
  const now = new Date()
  if (now.getUTCDay() !== DIGEST_DAY || now.getUTCHours() < DIGEST_HOUR) return

  const key = `digest|${isoWeekKey(now)}`
  // Claimed before sending, so only one tick can ever get past here.
  try { db.prepare('INSERT INTO push_sent (key) VALUES (?)').run(key) } catch { return }

  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE digest_weekly=1').all()
  if (!subs.length) return

  const news = db.prepare("SELECT title FROM kingshot_sync WHERE type='news' ORDER BY synced_at DESC LIMIT 3").all()
  const body = news.length
    ? news.map((n) => `• ${n.title}`).join('\n')
    : 'No new kingdom news this week. The realm is quiet.'

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: 'Kingdom 846 — this week',
          body,
          image: '/assets/hero-news.webp',
          tag: key,
          url: '/#/news',
          actions: [{ action: 'news', title: 'Read the news' }, { action: 'dismiss', title: 'Dismiss' }],
          actionUrls: { news: '/#/news' },
        }),
        { TTL: 86400 },
      )
      sent++
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(sub.endpoint)
      }
    }
  }
  console.log(`[push] weekly digest ${key} -> ${sent} device(s)`)
}

async function sendToAlliance(slug, payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE alliance_slug=?').all(slug)
  const body = JSON.stringify(payload)
  let sent = 0, dropped = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 300 },  // a reminder that arrives after the event is worse than none
      )
      sent++
    } catch (err) {
      // 404/410 mean the browser threw the subscription away -- the app was
      // uninstalled, or the user cleared site data. Those are permanent, so the
      // row goes rather than being retried before every future event forever.
      const code = err?.statusCode
      if (code === 404 || code === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(sub.endpoint)
        dropped++
      } else {
        db.prepare('UPDATE push_subscriptions SET failures=failures+1 WHERE endpoint=?').run(sub.endpoint)
      }
    }
  }
  return { sent, dropped }
}

function two(n) { return String(n).padStart(2, '0') }

/**
 * Runs often, sends once. The tick is deliberately faster than the reminders it
 * has to hit, so a slow or briefly stalled server still lands inside the minute
 * it was aiming at; push_sent is what keeps that from meaning repeats.
 */
/* ---- Arena reset -----------------------------------------------------------
 * The arena resets once a day for the whole kingdom, so unlike the alliance
 * events it is one time rather than four, and the reminder goes to everyone
 * rather than to one alliance's subscribers.
 *
 * The time is stored rather than hard-coded because it is not this code's to
 * know: it is a property of the game server, Sparta can see it and I cannot, and
 * a reminder that fires at the wrong minute is worse than no reminder at all.
 * ------------------------------------------------------------------------- */

/* ---- What a notification says ----------------------------------------------
 * On a busy evening the notification is the whole app: most members will never
 * open a page, they will glance at a banner and decide whether to put the
 * kettle down. So it carries the event's own artwork, says the time and the
 * alliance without being opened, and gets more insistent as the clock runs out.
 * ------------------------------------------------------------------------- */

// Artwork per event, matched on the name the leaders actually use.
const EVENT_ART = [
  [/bear/i, '/assets/notif/art-bear-trap.png'],
  [/viking/i, '/assets/notif/art-castle-battle.png'],
  [/clash/i, '/assets/notif/art-kvk-prep.png'],
  [/swordland|showdown/i, '/assets/notif/art-castle-battle.png'],
]

function artFor(event) {
  const hit = EVENT_ART.find(([re]) => re.test(event))
  return hit ? hit[1] : '/assets/hero-events.webp'
}

/**
 * One alliance event reminder.
 *
 * The body has to stand alone: iOS shows no image and no buttons, so the time,
 * the alliance and the urgency all live in the words.
 */
function eventNotification({ event, slug, time, lead }) {
  const urgent = lead <= 5
  return {
    title: urgent ? `${event} starts in ${lead} minutes` : `${event} in ${lead} minutes`,
    body: urgent
      ? `[${slug.toUpperCase()}] · ${time} UTC. Last call — get your march ready.`
      : `[${slug.toUpperCase()}] · ${time} UTC. Time to gather.`,
    image: artFor(event),
    tag: `${slug}-${event}`,
    urgent,
    url: '/#/events',
    actions: [
      { action: 'schedule', title: 'See the schedule' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    actionUrls: { schedule: '/#/events' },
  }
}

function arenaNotification({ time, lead }) {
  const urgent = lead <= 5
  return {
    title: urgent ? `Arena resets in ${lead} minutes` : `Arena reset in ${lead} minutes`,
    body: urgent
      ? `Resets at ${time} UTC. Last chance — spend your challenges now.`
      : `Resets at ${time} UTC. Unspent challenges are lost.`,
    image: '/assets/hero-rankings.webp',
    tag: 'arena',
    urgent,
    url: '/#/rankings',
    actions: [
      { action: 'rankings', title: 'Open rankings' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    actionUrls: { rankings: '/#/rankings' },
  }
}

const ARENA_DEFAULT_TIME = '00:00'

// 00:00 UTC, confirmed by the kingdom's admin rather than assumed here, so it is
// seeded as settled: the reminders land at 23:50 and 23:55 the night before,
// and nobody has to clear a warning about a guess that was never a guess.
// Only written when nothing is stored, so a later change from the console wins.
db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('arena_reset', ?)")
  .run(JSON.stringify({ time: ARENA_DEFAULT_TIME, enabled: true, confirmed: true }))

function arenaReset() {
  const row = db.prepare("SELECT value FROM app_settings WHERE key='arena_reset'").get()
  if (!row) return { time: ARENA_DEFAULT_TIME, enabled: true, confirmed: false }
  try {
    const saved = JSON.parse(row.value)
    return {
      time: /^\d{2}:\d{2}$/.test(saved.time || '') ? saved.time : ARENA_DEFAULT_TIME,
      enabled: saved.enabled !== false,
      // Until Sparta has actually set it, the default is a guess and is flagged
      // as one so the console can say so rather than implying it was checked.
      confirmed: !!saved.confirmed,
    }
  } catch { return { time: ARENA_DEFAULT_TIME, enabled: true, confirmed: false } }
}

app.get('/api/arena-reset', (_req, res) => res.json(arenaReset()))

app.put('/api/arena-reset', auth, adminOnly, (req, res) => {
  const { time, enabled } = req.body || {}
  if (time != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) {
    return res.status(400).json({ error: 'Time must be HH:MM in 24-hour UTC' })
  }
  const current = arenaReset()
  const next = {
    time: time != null ? String(time) : current.time,
    enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
    confirmed: true,
  }
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?,?)').run('arena_reset', JSON.stringify(next))
  res.json(next)
})

/** Push to every subscribed device that still wants arena reminders. */
async function sendKingdomWide(prefColumn, payload) {
  const subs = db.prepare(`SELECT * FROM push_subscriptions WHERE ${prefColumn}=1`).all()
  const body = JSON.stringify(payload)
  let sent = 0, dropped = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, { TTL: 300 })
      sent++
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').run(sub.endpoint)
        dropped++
      }
    }
  }
  return { sent, dropped }
}

async function runReminderTick() {
  const now = new Date()
  const alliances = db.prepare('SELECT slug FROM alliances').all().map((a) => a.slug)

  for (const lead of REMINDER_LEADS) {
    const target = new Date(now.getTime() + lead * 60000)
    const hhmm = `${two(target.getUTCHours())}:${two(target.getUTCMinutes())}`
    const day = target.getUTCDay()
    const dateKey = target.toISOString().slice(0, 10)

    for (const slug of alliances) {
      for (const item of allianceSchedule(slug)) {
        if (!item.time || item.time !== hhmm || !item.days.includes(day)) continue
        const key = `${dateKey}|${slug}|${item.event}|${lead}`
        // INSERT first: if another tick already claimed this reminder the
        // primary key rejects it, so exactly one tick can ever get past here.
        try {
          db.prepare('INSERT INTO push_sent (key) VALUES (?)').run(key)
        } catch { continue }
        const result = await sendToAlliance(slug, {
          ...eventNotification({ event: item.event, slug, time: item.time, lead }),
          // The date is in the tag so tonight's Bear Hunt does not replace the
          // one still sitting in the shade from this morning.
          tag: `${slug}-${item.event}-${dateKey}`,
        })
        console.log(`[push] ${slug} ${item.event} T-${lead}m -> ${result.sent} sent, ${result.dropped} stale`)
      }
    }
  }

  // The arena, on the same two leads. Kingdom-wide, so it sits outside the
  // per-alliance loop above but shares its dedupe.
  const arena = arenaReset()
  if (arena.enabled && arena.time) {
    for (const lead of REMINDER_LEADS) {
      const target = new Date(now.getTime() + lead * 60000)
      const hhmm = `${two(target.getUTCHours())}:${two(target.getUTCMinutes())}`
      if (hhmm !== arena.time) continue
      const dateKey = target.toISOString().slice(0, 10)
      const key = `${dateKey}|arena|${lead}`
      try { db.prepare('INSERT INTO push_sent (key) VALUES (?)').run(key) } catch { continue }
      const result = await sendKingdomWide('alert_arena', {
        ...arenaNotification({ time: arena.time, lead }),
        tag: `arena-${dateKey}`,
      })
      console.log(`[push] arena reset T-${lead}m -> ${result.sent} sent, ${result.dropped} stale`)
    }
  }

  // The dedupe log only has to outlive the reminders it guards.
  db.prepare("DELETE FROM push_sent WHERE sent_at < datetime('now', '-2 days')").run()
}

// Exported for the tests, which drive the tick directly rather than waiting on
// a real clock.
module.exports = { ...(module.exports || {}), runReminderTick, allianceSchedule, parseDays, defaultDaysFor, digestTick, isoWeekKey, arenaReset, eventNotification, arenaNotification, sendKingdomWide }

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
/** "kingshotmastery.com" from a full url, for crediting a guide's source. */
function sourceHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'the web' }
}

const GUIDE_ART = {
  Beginner: './assets/guide-beginner.png',
  Heroes: './assets/guide-heroes.png',
  Combat: './assets/guide-combat.png',
  Economy: './assets/guide-economy.png',
  Events: './assets/guide-events.png',
  Strategy: './assets/guide-strategy.png',
}

// Keyword guessing, kept only for LIVE-scraped guides where no category is
// known. The seed list carries its own -- guessing from the title put every
// Bear Trap guide under Heroes, because "Heroes" appears in the title and the
// hero check runs before the bear check.
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
  { t: 'Bear Trap Guide 2026: Best Formations, Heroes & Rally Tips', u: 'https://kingshotmastery.com/guides/bear-hunt', c: 'Events' },
  { t: 'Bear Hunt Expert Guide', u: 'https://kingshotguides.com/guide/bear-hunt-expert-guide/', c: 'Events' },
  { t: 'Bear Trap Guide: Layout and Troop Formation', u: 'https://grindnstrat.com/kingshot-bear-trap-guide/', c: 'Events' },
  { t: 'Bear Trap: Maximise Rally Damage and Rewards', u: 'https://www.kingshotguide.org/guide/bear-trap-kingshot', c: 'Events' },
  { t: 'Bear Trap Strategy Guide', u: 'https://www.kingshotguide.com/guides/kingshot-bear-trap-strategy-guide', c: 'Events' },
  { t: 'Bear Hunt & Rally Tips (2026)', u: 'https://www.ldshop.gg/blog/kingshot/bear-hunt.html', c: 'Events' },
  { t: 'Event Calendar 2026: Weekly & 4-Week Cycle', u: 'https://kingshotmastery.com/guides/event-calendar', c: 'Events' },
  { t: 'KvK Timeline and Event Schedule (2026)', u: 'https://boostbot.org/blog/kingshot-event-calendar/', c: 'Events' },
  { t: 'Hero Tier List August 2026: Best by Generation', u: 'https://kingshotmastery.com/guides/kingshot-hero-tier-list', c: 'Heroes' },
  { t: 'Hero Tier List: Best Heroes by Generation and Role', u: 'https://www.kingshotguide.com/guides/kingshot-hero-tier-list', c: 'Heroes' },
  { t: 'Hero Tier List 2026: Best Heroes by Role', u: 'https://kingshothandbook.com/heroes/tier-list', c: 'Heroes' },
  { t: 'Hero Tier List: Ranking of the Best Heroes (2026)', u: 'https://mobi.gg/en/tips/kingshot-hero-tier-list/', c: 'Heroes' },
  { t: 'Hero Tier List (2026): Rally, Garrison & Bear Hunt', u: 'https://buffhub.com/blog/kingshot/kingshot-tier-list.html', c: 'Heroes' },
  { t: 'Hero Tier List 2026 (Gen 1-Gen 7): Best Heroes Ranked', u: 'https://www.mone.gg/blog/kingshot/kingshot-hero-tier-list.html', c: 'Heroes' },
  { t: 'Hero Lineup Guide: Solo, Rally & Garrison', u: 'https://kingshotguides.com/guide/kingshot-hero-lineup-guide-solo-rally-garrison/', c: 'Heroes' },
  { t: 'Best Garrison Heroes: Wall Defense Guide 2026', u: 'https://kingshothandbook.com/guides/garrison-defense-heroes-guide', c: 'Heroes' },
  { t: 'Hero Gear Guide: Everything You Need to Know', u: 'https://www.topuplive.com/news/kingshot-hero-gear-guide.html', c: 'Heroes' },
  { t: 'Gear Guide 2026: Priority, Sets & Red Gear', u: 'https://kingshotmastery.com/guides/kingshot-gear-guide', c: 'Heroes' },
  { t: 'Troop Formations 2026: Rally, Defense & PvP', u: 'https://kingshotmastery.com/guides/kingshot-troop-formations-guide', c: 'Combat' },
  { t: 'Battle Mechanics: Stats, Triangle & Formations', u: 'https://kingshotmastery.com/guides/battle-mechanics-guide', c: 'Combat' },
  { t: 'Troop Formation Guide', u: 'https://kingshot.net/wiki/troops/troop-formation-guide', c: 'Combat' },
  { t: 'Troop Formations and Combat Mechanics', u: 'https://www.kingshotguide.com/guides/troop-formations-combat-mechanics', c: 'Combat' },
  { t: 'Troop Setup Guide: Best Formations for Every Event', u: 'https://kingshotguides.com/guide/kingshot-troop-setup-guide-best-formations-for-every-event/', c: 'Combat' },
  { t: 'Troop Formation Guide: Rallies, Garrisons and Bear Hunt', u: 'https://buffhub.com/blog/kingshot/kingshot-troop-formation-guide.html', c: 'Combat' },
  { t: 'The Best Troops Formation Guide', u: 'https://www.ldshop.gg/blog/kingshot/troops-formation-guide.html', c: 'Combat' },
  { t: 'Early Troops: What to Train First (and Skip)', u: 'https://kingshothandbook.com/guides/kingshot-early-troop-guide', c: 'Combat' },
  { t: 'Arena Guide: Heroes & Formations', u: 'https://kingshotmastery.com/guides/kingshot-arena-guide', c: 'Combat' },
  { t: 'Arena PvP: Strategy, Team Building & Rewards', u: 'https://kingshothandbook.com/guides/arena-pvp-guide', c: 'Combat' },
  { t: 'Castle Battle Guide: Formations & Points', u: 'https://kingshotmastery.com/guides/kingshot-castle-battle-guide', c: 'Combat' },
  { t: 'King\'s Castle Battle Guide: Tips to Win Every Time', u: 'https://kingshotguides.com/guide/kings-castle-battle-guide-tips-to-win-every-time/', c: 'Combat' },
  { t: 'Kingdom of Power (KvK): Battle, Rewards & Recovery', u: 'https://kingshotmastery.com/guides/kingshot-kingdom-of-power-guide', c: 'Combat' },
  { t: 'KvK Guide: How to Win Kingdom vs Kingdom', u: 'https://kingshotpro.com/guides/kvk.html', c: 'Combat' },
  { t: 'KvK Event: Phases, Rewards and Strategy', u: 'https://www.kingshotguide.org/guide/kingshot-kvk-event', c: 'Combat' },
  { t: 'KvK Prep, Scoring & Battle Strategy', u: 'https://wizardstower.com/guides/kingshot/kvk', c: 'Combat' },
  { t: 'Kingdom vs Kingdom', u: 'https://kingshotwin.com/events/kingdom-vs-kingdom/', c: 'Combat' },
  { t: 'Kingdom of Power: Phases, Rewards, Tips & Strategy', u: 'https://www.ldshop.gg/blog/kingshot/kingshot-kvk-guide.html', c: 'Combat' },
  { t: 'Swordland Showdown: Complete Strategy Guide (2026)', u: 'https://kingshotmastery.com/guides/swordland-showdown', c: 'Combat' },
  { t: 'Swordland Showdown: Ultimate Strategy Guide', u: 'https://www.kingshotguide.org/guide/kingshot-swordland-showdown', c: 'Combat' },
  { t: 'Swordland Showdown Guide', u: 'https://www.kingshotguide.com/guides/kingshot-swordland-showdown-guide', c: 'Combat' },
  { t: 'Complete Guide to Winning Swordland Showdown', u: 'https://kingshotguides.com/guide/complete-guide-to-winning-swordland-showdown/', c: 'Combat' },
  { t: 'Tri-Alliance Clash: Stages & Temple Strategy', u: 'https://kingshotmastery.com/guides/tri-alliance-clash', c: 'Combat' },
  { t: 'Tri-Alliance Clash Guide', u: 'https://www.kingshotguide.com/guides/kingshot-tri-alliance-clash-guide', c: 'Combat' },
  { t: 'Truegold and Mithril: Complete Resource Mastery', u: 'https://kingshothandbook.com/guides/truegold-mithril-guide', c: 'Economy' },
  { t: 'How to Farm Resources in Kingshot', u: 'https://boostbot.org/blog/kingshot-resource-farming/', c: 'Economy' },
  { t: 'Resource Farming Mastery', u: 'https://www.ldshop.gg/blog/kingshot/resources-farming-guide.html', c: 'Economy' },
  { t: 'Truegold Guide: Upgrades, Farming & Strategy', u: 'https://heaven-guardian.com/kingshot-truegold-guide-upgrades-farming-strategy', c: 'Economy' },
  { t: 'T11 Truegold Troops: Unlock, Research Costs & Strategy', u: 'https://buffhub.com/blog/kingshot/kingshot-t11-truegold-troops.html', c: 'Economy' },
  { t: 'Pets Guide 2026: Priority, Refinement & F2P', u: 'https://kingshotmastery.com/guides/kingshot-pet-guide', c: 'Strategy' },
  { t: 'Mastery Guide: How to Unlock, Upgrade and Dominate', u: 'https://www.kingshotguide.org/guide/2026-kingshot-mastery-guide', c: 'Strategy' },
  { t: 'Beginner Guide: Essential Tips for Your First 100 Days', u: 'https://kingshotoptimizer.com/guides/kingshot-beginner-tips/', c: 'Beginner' },
  { t: 'Beginners Guide and Tips', u: 'https://gamingonphone.com/guides/kingshot-beginners-guide-and-tips/', c: 'Beginner' },
  { t: 'Advanced Tips and Tricks to Progress Efficiently', u: 'https://www.bluestacks.com/blog/game-guides/kingshot/kgst-tips-tricks-en.html', c: 'Beginner' },
  { t: 'Top 10 Pro Tips Every New Player Should Know', u: 'https://www.ldshop.gg/blog/kingshot/top-10-pro-tips-for-beginner.html', c: 'Beginner' },
  { t: 'Guide to Get Started: Beginner\'s Guide', u: 'https://www.lootbar.com/blog/en/kingshot-guide-to-get-started-beginner-guide.html', c: 'Beginner' },
  { t: 'Buildings: Complete Building List & Guide', u: 'https://www.kingshotguide.com/buildings', c: 'Beginner' },
  { t: 'Upgrade Guide: Smart Upgrade Order', u: 'https://www.ldshop.gg/blog/kingshot/upgrade-guide.html', c: 'Beginner' },
]

const SEED_NEWS = [
  { title: 'August 2026 Update: Duel of the Elites and Blizzard Brawl', cat: 'UPDATE', excerpt: 'Two headline features for Kingdom of Power, plus Alliance Notices, an R5/R4 chat channel, faster rally timers and clearer battlefield mail.', source: 'https://kingshotmastery.com/blog/kingshot-august-2026-update-patch-notes', date: '2026-08-24' },
  { title: 'July 2026 Update: Prestige Merit Shop and Name Cards', cat: 'UPDATE', excerpt: 'The Prestige Merit Shop and a Name Card cosmetic system, followed by 27 optimisations across events, rewards, chat, heroes and navigation.', source: 'https://kingshotmastery.com/blog/kingshot-july-2026-update-patch-notes', date: '2026-07-08' },
  { title: 'July 2026 Patch Notes: Prestige Merit Shop & More', cat: 'UPDATE', excerpt: 'An independent write-up of the July patch, covering the Merit Shop, Hero Roulette changes and Bear Hunt auto-registration.', source: 'https://www.u7buy.com/blog/kingshot-update-patch-notes/', date: '2026-07' },
  { title: 'April 2026 Update: The Master System', cat: 'UPDATE', excerpt: 'A narrative-driven adventure sending Quinn into the Badlands, alongside changes to chat, rallies, pets, formations and teleporting.', source: 'https://kingshotmastery.com/blog/kingshot-update-master-system-april-2026', date: '2026-04' },
  { title: '1st Anniversary Kingdom Festival: Events, Rewards & Dates', cat: 'EVENT', excerpt: 'Eight events running together from 17 to 23 March, with some activities extending to the 24th. Town Center 6 or higher required.', source: 'https://kingshotmastery.com/blog/kingshot-1st-anniversary-festival-2026', date: '2026-03-17' },
  { title: '1st Anniversary Event Guide: How to Claim Every Reward', cat: 'EVENT', excerpt: 'A reward-by-reward walkthrough of the Kingdom Festival, including Royal Chef Gordon and the Starry Expanse town skin.', source: 'https://www.lootbar.com/blog/en/kingshot-1st-anniversary-event-guide.html', date: '2026-03' },
  { title: 'Kingshot March Calendar', cat: 'EVENT', excerpt: 'The official Century Games calendar page for the March event cycle.', source: 'https://www.centurygames.com/kingshot-march-calendar/', date: '2026-03' },
  { title: 'Patch Notes Breakdown: Key Changes, 4 March 2026', cat: 'UPDATE', excerpt: 'A video walkthrough of the March update and what actually changed for day-to-day play.', source: 'https://www.youtube.com/watch?v=LRTtZAg1kJc', date: '2026-03-04' },
]

async function fetchKingshotData() {
  const news = []
  const guides = []

  // Use seed data as the base (always clean, always available)
  // Every guide carries its OWN url. They used to share one -- every single
  // entry pointed at https://www.kingshot.wiki/guides -- so whichever guide a
  // reader picked, the link took them to the same index page.
  for (const g of SEED_GUIDES) {
    const cat = g.c || categorizeGuide(g.t).cat
    guides.push({
      id: 'ks-guide-' + guides.length,
      type: 'guide',
      title: g.t,
      category: cat,
      excerpt: `Guide from ${sourceHost(g.u)}.`,
      body: '',
      source: g.u,
      read_time: g.t.length > 40 ? '8 min' : g.t.length > 25 ? '5 min' : '3 min',
      art: GUIDE_ART[cat] || GUIDE_ART.Strategy
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

  // How much of the result actually came off the network.
  //
  // Without this the sync is unfalsifiable: the seed list is pushed in first
  // and the live fetch only ever ADDS, so "Synced 66 items" reads identically
  // whether both sources returned fresh announcements or nothing at all. The
  // failure mode is not an error -- it is a scrape that succeeds and matches
  // nothing useful, which no try/catch can see.
  const live = { news: [], guides: [], newsError: null, guidesError: null }
  const seedNewsCount = news.length
  const seedGuidesCount = guides.length

  // Try to fetch LIVE data to add new items not in seed
  try {
    const res = await fetch('https://kingshot.net/game-announcements', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    // fetch does NOT throw on 4xx/5xx. Without this check a 403 from bot
    // filtering, a rate limit, or a maintenance page is read as a document,
    // the regex matches nothing in it, and the run reports success with zero
    // live items -- indistinguishable from a site that simply had no news.
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    // The heading must BE a link, and that link is what we keep.
    //
    // The old pattern made the anchor optional and then discarded it, writing
    // the index page as every item's source. So a reader who picked the third
    // announcement landed on the same list they started from -- and so did
    // everyone else, whatever they clicked. An entry we cannot address
    // individually is not worth listing, so a heading without an href is now
    // skipped rather than pointed at the index.
    const titlePattern = /<h[23][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]{8,120})<\/a>\s*<\/h[23]>/gi
    const existingTitles = new Set(news.map(n => n.title.toLowerCase()))
    let match
    while ((match = titlePattern.exec(html)) !== null && news.length < 25) {
      const href = match[1]
      const title = cleanText(match[2])
      if (title.length < 9 || existingTitles.has(title.toLowerCase()) || href.startsWith('#')) continue
      let url
      try { url = new URL(href, 'https://kingshot.net/game-announcements').href } catch { continue }
      existingTitles.add(title.toLowerCase())
      news.push({
        id: 'ks-news-live-' + news.length,
        type: 'news',
        title,
        category: 'ANNOUNCEMENT',
        // No date rather than today's. Stamping the sync date on a scraped
        // headline told every reader the item was published today.
        date: null,
        excerpt: `Announcement from ${sourceHost(url)}.`,
        body: '',
        source: url
      })
    }
    live.news = news.slice(seedNewsCount).map((n) => n.title)
  } catch (e) {
    live.newsError = e.message
    console.error('Sync: live fetch kingshot.net failed:', e.message)
  }

  // Try to fetch live guides from kingshot.wiki
  try {
    const res = await fetch('https://www.kingshot.wiki/guides', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    // Extract guide titles from h3/h4 headings
    const headingPattern = /<h[34][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]{8,120})<\/a>\s*<\/h[34]>/gi
    const existingGuideTitles = new Set(guides.map(g => g.title.toLowerCase()))
    let match
    while ((match = headingPattern.exec(html)) !== null && guides.length < 70) {
      const url = match[1]
      const title = cleanText(match[2])
      if (title.length > 8 && !existingGuideTitles.has(title.toLowerCase()) && title !== 'Guides' && !url.includes('#')) {
        let full
        try { full = new URL(url, 'https://www.kingshot.wiki/guides').href } catch { continue }
        existingGuideTitles.add(title.toLowerCase())
        const { cat, art } = categorizeGuide(title)
        guides.push({
          id: 'ks-guide-live-' + guides.length,
          type: 'guide',
          title,
          category: cat,
          excerpt: `Guide from ${sourceHost(full)}.`,
          body: '',
          source: full,
          read_time: '5 min',
          art
        })
      }
    }
    live.guides = guides.slice(seedGuidesCount).map((g) => g.title)
  } catch (e) {
    live.guidesError = e.message
    console.error('Sync: live fetch kingshot.wiki failed:', e.message)
  }

  // Printed in full so a run can be audited from the server log. The count
  // alone has been a constant 66 for days, which is the symptom that started
  // this: a real announcements feed does not hold perfectly still.
  console.log(`Sync: kingshot.net -> ${live.newsError ? 'ERROR ' + live.newsError : live.news.length + ' live news'}`)
  for (const t of live.news) console.log(`Sync:   news  | ${t}`)
  console.log(`Sync: kingshot.wiki -> ${live.guidesError ? 'ERROR ' + live.guidesError : live.guides.length + ' live guides'}`)
  for (const t of live.guides) console.log(`Sync:   guide | ${t}`)

  return { news, guides, live, seedCount: seedNewsCount + seedGuidesCount }
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
        const { news, guides, live, seedCount } = await fetchKingshotData()
        const all = [...news, ...guides]
        const report = recordSync({ news, guides, live, seedCount })
        db.prepare('DELETE FROM kingshot_sync').run()
        const stmt = db.prepare('INSERT OR REPLACE INTO kingshot_sync (id, type, title, category, date, excerpt, body, source, art, read_time, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))')
        for (const item of all) {
          stmt.run(item.id, item.type, item.title, item.category || null, item.date || null, item.excerpt || null, item.body || null, item.source || null, item.art || null, item.read_time || null)
        }
        return `Sync complete! ${all.length} items (${news.length} news, ${guides.length} guides) — ${report.live} came from the live sources, ${report.seed} are built in.${report.errors.length ? ' Errors: ' + report.errors.join('; ') : ''}`
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

// ===== Royal Advisor — Kingdom 846's own AI =====
//
// Retrieval, intent detection and a tool layer, all running on this server.
// There is no external model or API behind it: the engine ranks the kingdom's
// own knowledge corpus, answers live questions from SQLite, and reports a
// confidence so it can say "I am not sure" instead of guessing.
//
// It replaces roughly 1,900 lines of ordered if/else keyword rules. Those had
// an ordering bug by construction — a broad rule near the top swallowed every
// narrower rule written below it — which ranking removes entirely. The answers
// themselves were kept: they live in server/ai/knowledge.json.
const { createEngine } = require('./ai/engine.cjs')

let advisor = null
function getAdvisor() {
  if (!advisor) {
    advisor = createEngine({ db, scheduleDefaults: SCHEDULE_DEFAULTS, executeTool })
    console.log(`[Advisor] ready — ${advisor.topicCount} topics indexed, no external AI`)
  }
  return advisor
}

const aiRateLimit = new Map()

// Visitors are limited per IP, and the limiter's own bookkeeping is pruned so a
// long-running server does not accumulate an entry per address seen.
function rateLimited(ip, max = 15, windowMs = 60000) {
  const now = Date.now()
  const times = (aiRateLimit.get(ip) || []).filter(t => now - t < windowMs)
  if (times.length >= max) { aiRateLimit.set(ip, times); return true }
  times.push(now)
  aiRateLimit.set(ip, times)
  if (aiRateLimit.size > 5000) {
    for (const [key, ts] of aiRateLimit) {
      if (!ts.length || now - ts[ts.length - 1] > windowMs) aiRateLimit.delete(key)
    }
  }
  return false
}

// Public chat. Read-only: the advisor answers questions and looks up live
// kingdom state, but every state-changing tool is refused for a visitor.
app.post('/api/ai/chat', async (req, res) => {
  const { message, sessionId } = req.body || {}
  if (!message || typeof message !== 'string') {
    return res.json({ reply: 'Please ask a question about Kingdom 846.' })
  }
  if (rateLimited(req.ip)) {
    return res.json({ reply: 'You are asking questions too quickly. Please wait a moment and try again.' })
  }
  try {
    // The session id only scopes conversation memory, so a visitor-supplied
    // value is harmless — but it is bounded and namespaced by IP so one
    // visitor cannot read or evict another's context by guessing an id.
    const scope = typeof sessionId === 'string' && /^[\w-]{1,64}$/.test(sessionId)
      ? `${req.ip}:${sessionId}` : `${req.ip}:default`
    const out = await getAdvisor().ask(message, { sessionId: scope, isAdmin: false })
    res.json({ reply: out.reply, topic: out.topic, confidence: out.confidence })
  } catch (err) {
    console.error('[Advisor] chat error:', err.message)
    res.json({ reply: 'I stumbled answering that. Please try asking a different way, or browse the Alliances, Events and Guides pages.' })
  }
})

// Admin chat. Same engine, with the state-changing tools unlocked — an admin
// can say "sync the news" or "crown X king" and the advisor performs it after
// confirming.
app.post('/api/ai/admin', auth, adminOnly, async (req, res) => {
  const { message, sessionId } = req.body || {}
  if (!message || typeof message !== 'string') return res.json({ reply: 'Please enter a message.' })
  try {
    const scope = `admin:${req.user?.id ?? req.ip}:${typeof sessionId === 'string' && /^[\w-]{1,64}$/.test(sessionId) ? sessionId : 'default'}`
    const out = await getAdvisor().ask(message, { sessionId: scope, isAdmin: true })
    res.json({ reply: out.reply, topic: out.topic, confidence: out.confidence, toolRan: out.toolRan })
  } catch (err) {
    console.error('[Advisor] admin chat error:', err.message)
    res.json({ reply: `Something went wrong running that: ${err.message}` })
  }
})

// --- Autonomous AI Agent ---
// Runs every 4 hours automatically: syncs data, checks status, generates insights
let lastAgentRun = null
let agentInsights = []
let agentLog = [] // Activity log
let designBriefing = null // Latest design intelligence briefing
let lastSyncReport = null // Where the last sync's items actually came from

/**
 * Records where a sync's items actually came from.
 *
 * Called by every path that writes kingshot_sync, so the admin panel reports
 * the last sync that really happened rather than the last one that happened
 * to go through the agent.
 */
function recordSync({ news, guides, live, seedCount }) {
  const liveTitles = [...(live?.news || []), ...(live?.guides || [])]
  lastSyncReport = {
    at: new Date().toISOString(),
    total: news.length + guides.length,
    live: liveTitles.length,
    seed: seedCount ?? 0,
    liveTitles,
    errors: [live?.newsError && `kingshot.net: ${live.newsError}`,
             live?.guidesError && `kingshot.wiki: ${live.guidesError}`].filter(Boolean),
  }
  return lastSyncReport
}
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
    const { news, guides, live, seedCount } = await fetchKingshotData()
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

    // Say where the items came from. "Synced 66 items" was true on every run
    // for days and told nobody that 59 of those are hardcoded in this file and
    // the other 7 never changed. A summary that cannot distinguish a working
    // sync from a dead one is not a summary. The activity row is truncated in
    // the UI, so this has to say it in a few words.
    const liveCount = recordSync({ news, guides, live, seedCount }).live
    logAction('Auto-sync', liveCount === 0
      ? `${all.length} items · 0 live — sources gave nothing`
      : `${all.length} items · ${liveCount} live · ${seedCount} built-in`)

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
    last_sync: lastSyncReport,
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
    const { news, guides, live, seedCount } = await fetchKingshotData()
    const all = [...news, ...guides]
    recordSync({ news, guides, live, seedCount })
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
    // index.html references versioned (?v=<hash>) script URLs for cache-busting —
    // if the browser caches index.html itself, it keeps requesting old versions
    // forever, so index.html must never be cached while the hashed/versioned
    // assets it points to are safe to cache normally.
    app.use(express.static(distPublic, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
        // The service worker is the one file that can never be served stale:
        // a cached worker keeps serving the build it was shipped with, and no
        // later deploy can dislodge it.
        if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
        // Not every mime table knows .webmanifest, and a manifest served as
        // text/plain is ignored, which silently makes the site uninstallable.
        if (filePath.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json')
      }
    }))
    // SPA fallback: any non-API GET returns index.html
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.sendFile(path.join(distPublic, 'index.html'))
    })
  } else {
    const { createServer: createViteServer } = require('vite')
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
    app.use(vite.middlewares)
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kingdom 846 backend listening on ${PORT} (${isProduction ? 'production' : 'dev'})`)
    // Backups. One immediately, because a server that has just started is a
    // server that has just changed -- a deploy is exactly when you want a copy
    // of what came before it -- and then a check every half hour that does
    // nothing on the days a copy already exists.
    runBackup().catch((e) => console.error('[backup] startup backup failed', e))
    setInterval(() => { backupTick().catch((e) => console.error('[backup] tick failed', e)) }, 30 * 60 * 1000)
    console.log(`[backup] daily backups to ${BACKUP_DIR}, keeping ${BACKUP_KEEP}`)

    // Event reminders. Every 30 seconds so a stalled tick still lands inside
    // the minute it was aiming at; push_sent makes the repeats harmless.
    setInterval(() => { runReminderTick().catch((e) => console.error('[push] tick failed', e)) }, 30000)
    // The weekly digest checks on the same half-hourly cadence as the backups;
    // it sends on Mondays and does nothing the rest of the week.
    setInterval(() => { digestTick().catch((e) => console.error('[push] digest failed', e)) }, 30 * 60 * 1000)
    digestTick().catch(() => {})
    console.log('[push] event reminders scheduled (10 and 5 minutes before each alliance event)')

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
