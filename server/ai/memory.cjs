/**
 * Short-term conversation memory.
 *
 * Lets a visitor ask "who leads it?" straight after "tell me about Spiders"
 * instead of repeating the alliance every turn. Scoped per session, capped and
 * expiring, because this runs on a 512 MB box and an unbounded Map keyed by a
 * visitor-supplied id is a memory leak with a rate limiter in front of it.
 */

const MAX_SESSIONS = 500
const TTL_MS = 30 * 60 * 1000   // half an hour of silence ends a conversation
const MAX_TURNS = 6

class Memory {
  constructor({ maxSessions = MAX_SESSIONS, ttlMs = TTL_MS } = {}) {
    this.sessions = new Map()
    this.maxSessions = maxSessions
    this.ttlMs = ttlMs
  }

  /** Drop expired sessions, then the oldest if still over budget. */
  prune() {
    const now = Date.now()
    for (const [id, s] of this.sessions) {
      if (now - s.at > this.ttlMs) this.sessions.delete(id)
    }
    while (this.sessions.size > this.maxSessions) {
      // Map preserves insertion order and `touch` re-inserts, so the first
      // key is always the least recently used.
      this.sessions.delete(this.sessions.keys().next().value)
    }
  }

  get(id) {
    const s = this.sessions.get(id)
    if (!s) return { turns: [] }
    if (Date.now() - s.at > this.ttlMs) { this.sessions.delete(id); return { turns: [] } }
    return s
  }

  /** Record a turn and carry forward the entities it mentioned. */
  remember(id, { question, topic, alliance }) {
    const prev = this.get(id)
    const next = {
      at: Date.now(),
      // An entity persists until a later turn names a different one, which is
      // what makes "and their bear hunt?" resolve.
      alliance: alliance || prev.alliance || null,
      topic: topic || prev.topic || null,
      turns: [...(prev.turns || []), { question, topic }].slice(-MAX_TURNS),
    }
    this.sessions.delete(id)   // re-insert to mark most recently used
    this.sessions.set(id, next)
    this.prune()
    return next
  }

  clear(id) { this.sessions.delete(id) }
  get size() { return this.sessions.size }
}

module.exports = { Memory, TTL_MS, MAX_TURNS }
