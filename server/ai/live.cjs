/**
 * Answers that must come from the database rather than the corpus.
 *
 * Who rules the kingdom, when [ICE] runs its bear hunts and how many transfer
 * applications are pending all change without anyone editing a topic file, so
 * these questions are answered from SQLite at request time. Everything else is
 * static knowledge and goes through retrieval.
 *
 * Intent here is deliberately stricter than the old rule chain. That chain
 * treated any message containing "time" as a schedule question, which meant
 * "how much time does a shield last" returned an alliance timetable. A live
 * handler now fires only when the query carries both the entity and the intent.
 */

const { normalize } = require('./tokenize.cjs')
const { expandPhrases } = require('./synonyms.cjs')

// Alliance nicknames -> slug. Players rarely type the official name.
const ALLIANCE_ALIASES = {
  ryo: 'ryo', spider: 'ryo', spiders: 'ryo',
  kzk: 'kzk', kamil: 'kzk', kamikaze: 'kzk', karnival: 'kzk', kamilkazekarnival: 'kzk',
  sas: 'sas', saint: 'sas', saints: 'sas', sinner: 'sas', sinners: 'sas', saintsandsinners: 'sas',
  ice: 'ice', icehunter: 'ice', icehunters: 'ice', hunters: 'ice',
}

// Event keyword -> matcher against the stored event_name.
const EVENT_FILTERS = [
  ['bear', s => s.includes('bear'), 'Bear Hunt'],
  ['clash', s => s.includes('clash'), 'Tri-Alliance Clash'],
  ['viking', s => s.includes('viking'), 'Viking Vengeance'],
  ['swordland', s => s.includes('sword') || s.includes('showdown'), 'Swordland Showdown'],
  ['showdown', s => s.includes('sword') || s.includes('showdown'), 'Swordland Showdown'],
]

const DISCORD = 'https://discord.gg/rcxJCh97A'

function flatten(query) {
  return normalize(expandPhrases(String(query || '').toLowerCase()))
}

/** The alliance a query names, or null. */
function findAlliance(flat) {
  const words = flat.split(' ')
  for (const w of words) if (ALLIANCE_ALIASES[w]) return ALLIANCE_ALIASES[w]
  return null
}

/** The specific event a query names, or null. */
function findEvent(flat) {
  for (const [key, match, label] of EVENT_FILTERS) {
    if (new RegExp(`\\b${key}`).test(flat)) return { match, label }
  }
  return null
}

/**
 * Intent flags. `schedule` requires an explicit timing word or a "when"
 * question, so asking about bear hunt *strategy* still reaches the guides.
 */
function readIntent(flat) {
  return {
    schedule: /\b(schedule|timing|timings|when|utc|what time|start)\b/.test(flat),
    ruler: /\b(king|queen|ruler|monarch|throne|crown|sovereign|who rules?|who leads? the kingdom)\b/.test(flat),
    roster: /\b(alliance|alliances|guild|guilds|roster|leaders?)\b/.test(flat),
    news: /\b(news|announcement|announcements|latest|whats new|what is new)\b/.test(flat),
    guides: /\b(guide|guides|playbook|playbooks)\b/.test(flat),
    stats: /\b(stats|statistics|how many|count|numbers)\b/.test(flat),
  }
}

/**
 * Builds the live handlers over an injected database.
 * `db` and `scheduleDefaults` are passed in rather than required so this module
 * stays testable without booting the server.
 */
function createLive({ db, scheduleDefaults = {} }) {
  const q = {
    alliances: () => db.prepare('SELECT slug, name, leader, language, tagline FROM alliances').all(),
    king: () => db.prepare('SELECT * FROM king_status WHERE id = 1').get(),
    schedulesFor: (slug) => db.prepare(
      'SELECT event_name, event_time, updated_at FROM alliance_schedules WHERE alliance_slug = ?').all(slug),
    allSchedules: () => db.prepare(
      'SELECT alliance_slug, event_name, event_time FROM alliance_schedules').all(),
    events: () => db.prepare(
      "SELECT title, date FROM kingshot_sync WHERE type != 'news' ORDER BY date ASC LIMIT 8").all(),
    news: () => db.prepare(
      "SELECT title FROM kingshot_sync WHERE type = 'news' ORDER BY synced_at DESC LIMIT 5").all(),
    guides: () => db.prepare(
      "SELECT title FROM kingshot_sync WHERE type = 'guide' ORDER BY id DESC LIMIT 8").all(),
    transferCount: () => db.prepare('SELECT COUNT(*) AS c FROM transfers').get().c,
  }

  /** An alliance's schedule, preferring leader-set times over the defaults. */
  function scheduleFor(slug) {
    const rows = q.schedulesFor(slug)
    if (rows.length) return { rows, custom: true }
    const defaults = scheduleDefaults[slug] || {}
    return {
      rows: Object.entries(defaults).map(([event_name, event_time]) => ({ event_name, event_time, updated_at: null })),
      custom: false,
    }
  }

  function allianceLabel(slug, alliances) {
    const a = alliances.find(x => x.slug === slug)
    return a ? `${a.name} [${slug.toUpperCase()}]` : `[${slug.toUpperCase()}]`
  }

  function renderSchedule(slug, rows, custom, heading) {
    const list = rows.map(s => `${s.event_name}: ${s.event_time} UTC`).join('\n')
    const note = custom
      ? (rows[0]?.updated_at ? `\nLast updated: ${rows[0].updated_at}` : '')
      : '\n(Default schedule — the leader has not set custom times yet)'
    return `${heading} (UTC):\n\n${list}${note}`
  }

  /**
   * Returns { answer, topic } when the question is about live state,
   * or null to let retrieval handle it.
   */
  return function resolveLive(query, memory = {}) {
    const flat = flatten(query)
    if (!flat) return null
    const intent = readIntent(flat)
    // A follow-up like "and their bear hunt?" carries no alliance of its own.
    const alliance = findAlliance(flat) || (isFollowUp(flat) ? memory.alliance : null)
    const alliances = q.alliances()

    // 1. One alliance's schedule, optionally narrowed to one event.
    if (alliance && intent.schedule) {
      const { rows, custom } = scheduleFor(alliance)
      const label = allianceLabel(alliance, alliances)
      if (!rows.length) {
        return { topic: 'live:schedule', alliance, answer:
          `${label} — no event timings are recorded yet.\n\nThe alliance leader can set them in the Leader Portal. Check the Events page or Discord (${DISCORD}) for the latest.` }
      }
      const ev = findEvent(flat)
      if (ev) {
        const filtered = rows.filter(s => ev.match(s.event_name.toLowerCase()))
        if (filtered.length) {
          return { topic: 'live:schedule', alliance, answer:
            renderSchedule(alliance, filtered, custom, `${label} — ${ev.label} Timings`) +
            '\n\nVisit the Events page for the full schedule.' }
        }
      }
      return { topic: 'live:schedule', alliance, answer:
        renderSchedule(alliance, rows, custom, `${label} — Event Schedule`) +
        '\n\nVisit the Events page for the full visual schedule.' }
    }

    // 2. Every alliance's schedule.
    if (intent.schedule && (intent.roster || findEvent(flat) || /\bevents?\b/.test(flat))) {
      const rows = q.allSchedules()
      if (rows.length) {
        const grouped = {}
        for (const s of rows) (grouped[s.alliance_slug] ||= []).push(`  ${s.event_name}: ${s.event_time} UTC`)
        const body = Object.entries(grouped)
          .map(([slug, lines]) => `[${slug.toUpperCase()}]\n${lines.join('\n')}`).join('\n\n')
        return { topic: 'live:schedules', answer:
          `Alliance Event Schedules (UTC):\n\n${body}\n\nLeaders keep these current through the Leader Portal. The Events page has the full visual schedule.` }
      }
      const events = q.events()
      if (events.length) {
        return { topic: 'live:events', answer:
          `Upcoming Events:\n\n${events.map(e => `- ${e.title}${e.date ? ` (${e.date})` : ''}`).join('\n')}\n\nVisit the Events page for the full schedule.` }
      }
      return null
    }

    // 3. Who currently rules.
    if (intent.ruler) {
      const king = q.king()
      if (king && king.name) {
        const where = [king.alliance_tag, king.alliance_name].filter(Boolean).join(' ')
        return { topic: 'live:king', answer:
          `The current ruler of Kingdom 846 is ${king.king_type} ${king.name}${where ? ` of ${where}` : ''}.\n\nVisit the Kingdom page for the full royal lineage and history.` }
      }
      return { topic: 'live:king', answer:
        'The throne is currently being contested. Visit the Kingdom page for the latest ruler information.' }
    }

    // 4. One alliance's details.
    if (alliance) {
      const a = alliances.find(x => x.slug === alliance)
      if (a) {
        return { topic: 'live:alliance', alliance, answer:
          `${a.name} [${a.slug.toUpperCase()}]\nLeader: ${a.leader}\nLanguage: ${a.language || 'Not set'}\nMotto: ${a.tagline || 'Not set'}\n\nVisit the Alliances page for the full roster.` }
      }
    }

    // 5. The alliance roster.
    if (intent.roster && /\b(list|all|which|what|how many|alliances)\b/.test(flat)) {
      if (alliances.length) {
        const list = alliances.map(a => `[${a.slug.toUpperCase()}] ${a.name} — Leader: ${a.leader}`).join('\n')
        return { topic: 'live:alliances', answer:
          `Kingdom 846 has ${alliances.length} alliances:\n\n${list}\n\nEach has its own leader, schedule and culture. Ask me about any one by name.` }
      }
    }

    // 6. Kingdom statistics.
    if (intent.stats) {
      const king = q.king()
      return { topic: 'live:stats', answer:
        `Kingdom 846 Statistics:\n- Ruler: ${king && king.name ? `${king.king_type} ${king.name}` : 'Not set'}\n- Alliances: ${alliances.length}\n- Transfer applications: ${q.transferCount()}\n- Event schedule entries: ${q.allSchedules().length}\n- Strategy guides: ${q.guides().length}\n\nVisit the Rankings page for player rankings.` }
    }

    // 7. Latest news.
    if (intent.news) {
      const news = q.news()
      if (news.length) {
        return { topic: 'live:news', answer:
          `Latest News:\n\n${news.map(n => `- ${n.title}`).join('\n')}\n\nVisit the News page for all updates.` }
      }
    }

    // 8. Available guides.
    if (intent.guides) {
      const guides = q.guides()
      if (guides.length) {
        return { topic: 'live:guides', answer:
          `Strategy Guides:\n\n${guides.map(g => `- ${g.title}`).join('\n')}\n\nVisit the Guides page for the full collection.` }
      }
    }

    return null
  }
}

/** True when a message leans on the previous turn ("and theirs?", "what about it"). */
function isFollowUp(flat) {
  return /\b(it|its|their|theirs|them|they|that|those|same|also|and)\b/.test(flat)
}

module.exports = { createLive, findAlliance, findEvent, readIntent, isFollowUp, ALLIANCE_ALIASES, flatten }
