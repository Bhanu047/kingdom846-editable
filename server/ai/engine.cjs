/**
 * The Royal Advisor engine.
 *
 * Kingdom 846's own AI: retrieval, intent detection and a tool layer, running
 * entirely on this server with no external model or API behind it. A question
 * is resolved in this order, and the first stage that can answer wins:
 *
 *   1. a pending confirmation the visitor is answering
 *   2. an action ("sync the news", "crown X king") — role checked
 *   3. small talk ("hi", "thanks")
 *   4. live database state (who rules, tonight's bear hunt)
 *   5. retrieval over the knowledge corpus
 *   6. a clarifying reply when nothing scores well enough
 *
 * Stage 6 is the point of the whole design. The engine knows what it does not
 * know, because retrieval reports a confidence, so an unfamiliar question gets
 * an honest "I'm not sure" and the nearest topics instead of a confident wrong
 * answer. That is the trade this engine makes against a hosted model: narrower
 * range, but it cannot invent a leader or a schedule that does not exist.
 */

const { Bm25Index, confidence } = require('./bm25.cjs')
const { createLive, findAlliance, flatten } = require('./live.cjs')
const { Memory } = require('./memory.cjs')
const { detectTool, isAffirmative, isNegative } = require('./tools.cjs')
const { normalize, tokenize } = require('./tokenize.cjs')
const { expandPhrases } = require('./synonyms.cjs')

const KNOWLEDGE = require('./knowledge.json')
const SMALLTALK = require('./smalltalk.json')
const JOKES = require('./jokes.json')

// Below this, the engine asks rather than answers. Measured against the eval
// set: genuine matches score 0.6 and up, out-of-domain questions land near
// 0.35, so the gap is wide enough to separate them cleanly.
const MIN_CONFIDENCE = 0.5

const GREETING = `Greetings, traveler. I am the Royal Advisor of Kingdom 846.

I can help you with:
- Alliance information and leaders
- The current ruler and kingdom status
- Event schedules and timings
- How to join or transfer
- Strategy guides and playbooks
- Latest news

Ask me anything about the realm.`

function createEngine({ db, scheduleDefaults = {}, executeTool = null, llm = null } = {}) {
  const index = new Bm25Index(KNOWLEDGE)
  const memory = new Memory()
  const resolveLive = db ? createLive({ db, scheduleDefaults }) : () => null

  // Small-talk triggers, pre-stemmed once at startup.
  //
  // Stopwords are kept here on purpose: "yes", "no" and "ok" are stopwords for
  // retrieval yet are the entire message in small talk. Matching on stems is
  // what lets "thanks" reach the topic keyed on "thank".
  const SMALLTALK_KEYS = SMALLTALK.map(doc => ({
    doc,
    keys: doc.keywords
      .map(kw => tokenize(kw, { keepStops: true }))
      .filter(k => k.length),
  }))

  /** True when `needle` appears as a contiguous run inside `hay`. */
  function containsRun(hay, needle) {
    if (needle.length > hay.length) return false
    for (let i = 0; i <= hay.length - needle.length; i++) {
      if (needle.every((t, j) => hay[i + j] === t)) return true
    }
    return false
  }

  /**
   * Small talk is matched on the whole short message, never on body text —
   * these topics answer by listing what else to ask, so indexing them for
   * retrieval would make them match every question.
   */
  function matchSmalltalk(flat) {
    if (!flat) return null
    const toks = tokenize(flat, { keepStops: true })
    if (!toks.length || toks.length > 6) return null
    let best = null
    for (const { doc, keys } of SMALLTALK_KEYS) {
      for (const key of keys) {
        // The whole message being the trigger is the strongest signal.
        if (key.length === toks.length && key.every((t, i) => t === toks[i])) return doc
        if (containsRun(toks, key) && (!best || key.length > best.len)) {
          best = { doc, len: key.length }
        }
      }
    }
    return best ? best.doc : null
  }

  /** A joke the visitor has not been told yet this session. */
  function pickJoke(session) {
    const told = session.jokesTold || []
    const pool = JOKES.map((_, i) => i).filter(i => !told.includes(i))
    const choices = pool.length ? pool : JOKES.map((_, i) => i)
    const idx = choices[Math.floor(Math.random() * choices.length)]
    session.jokesTold = (pool.length ? told : []).concat(idx)
    return JOKES[idx]
  }

  function clarify(hits) {
    const near = hits.slice(0, 3).map(h => h.doc.title).filter(Boolean)
    if (!near.length) {
      return `I do not have an answer for that one. I know about alliances, the current ruler, event schedules, joining the kingdom, strategy guides and kingdom history — ask me about any of those.`
    }
    return `I am not certain I understood that. Did you mean one of these?\n\n${near.map(t => `- ${t}`).join('\n')}\n\nOr ask me about alliances, the ruler, event timings, joining, or strategy guides.`
  }

  /**
   * Answer one message.
   * `sessionId` scopes memory; `isAdmin` unlocks the state-changing tools.
   */
  async function ask(message, { sessionId = 'anon', isAdmin = false } = {}) {
    const text = String(message || '').trim()
    if (!text) return { reply: 'Please ask a question about Kingdom 846.', topic: 'empty', confidence: 0 }
    if (text.length > 500) {
      return { reply: 'That message is a little long for me. Could you ask it in a sentence or two?', topic: 'too-long', confidence: 0 }
    }

    const flat = flatten(text)
    const session = memory.get(sessionId)

    // 1. Answering a pending confirmation.
    if (session.pending) {
      const pending = session.pending
      if (isAffirmative(text)) {
        session.pending = null
        return runTool(pending, sessionId, text)
      }
      if (isNegative(text)) {
        session.pending = null
        memory.remember(sessionId, { question: text, topic: 'tool:cancelled' })
        return { reply: `Cancelled — nothing was changed.`, topic: 'tool:cancelled', confidence: 1 }
      }
      // Anything else abandons the confirmation and is treated as a new question.
      session.pending = null
    }

    // 2. Actions.
    const tool = detectTool(text, { isAdmin })
    if (tool && tool.denied) {
      memory.remember(sessionId, { question: text, topic: 'tool:denied' })
      return {
        topic: 'tool:denied', confidence: 1,
        reply: `That action is reserved for the kingdom's administrators, so I cannot do it from a visitor chat.\n\nI can still tell you about the alliances, the current ruler, event timings, how to join, and the strategy guides — just ask.`,
      }
    }
    if (tool) {
      if (tool.needsConfirm) {
        const next = memory.remember(sessionId, { question: text, topic: 'tool:confirm' })
        next.pending = { name: tool.name, args: tool.args, summary: tool.summary }
        return {
          topic: 'tool:confirm', confidence: 1,
          reply: `Just to confirm — you want me to ${tool.summary}?\n\nReply "yes" and it is done, or "no" to cancel.`,
        }
      }
      return runTool(tool, sessionId, text)
    }

    // 3. Small talk and jokes.
    if (/\b(joke|funny|make me laugh|cheer me up|something funny)\b/.test(flat)) {
      const next = memory.remember(sessionId, { question: text, topic: 'joke' })
      return { reply: pickJoke(next), topic: 'joke', confidence: 1 }
    }
    const small = matchSmalltalk(flat)
    if (small) {
      memory.remember(sessionId, { question: text, topic: `smalltalk:${small.id}` })
      return { reply: small.id === 'hi' ? GREETING : small.answer, topic: `smalltalk:${small.id}`, confidence: 1 }
    }

    // 4. Live kingdom state.
    const live = resolveLive(text, session)
    if (live) {
      memory.remember(sessionId, { question: text, topic: live.topic, alliance: live.alliance })
      return { reply: live.answer, topic: live.topic, confidence: 1 }
    }

    // 5. Retrieval.
    const { hits } = index.search(text, 3)
    const score = confidence(hits)
    const alliance = findAlliance(flat) || undefined
    if (hits.length && score >= MIN_CONFIDENCE) {
      memory.remember(sessionId, { question: text, topic: hits[0].doc.id, alliance })
      return { reply: hits[0].doc.answer, topic: hits[0].doc.id, confidence: score }
    }

    // 6. Retrieval could not answer it. Before giving up, hand the question to
    //    the model along with the kingdom's live facts and whatever passages did
    //    surface, and let it compose an answer from those alone. Reaching here at
    //    all is the uncommon case, which is what keeps this cheap: every question
    //    stages 1-5 could handle has already been answered for free.
    //
    //    The model returns null when the context cannot answer -- see llm.cjs --
    //    so an unanswerable question still falls through to the honest reply
    //    below rather than being improvised.
    if (llm) {
      try {
        const composed = await llm.answer({
          question: text,
          passages: hits.map((h) => ({ title: h.doc.title, answer: h.doc.answer })),
        })
        if (composed) {
          memory.remember(sessionId, { question: text, topic: 'model', alliance })
          return { reply: composed, topic: 'model', confidence: score, viaModel: true }
        }
      } catch (err) {
        // A model that is slow, rate-limited, or down must never take the
        // advisor with it; the pre-existing answer is still right here.
        console.error('[Advisor] model fallback failed:', err.message)
      }
    }

    // 7. Say so, and offer the nearest topics.
    memory.remember(sessionId, { question: text, topic: 'unknown', alliance })
    return { reply: clarify(hits), topic: 'unknown', confidence: score }
  }

  /** Hand a detected action to the server's executeTool and format the result. */
  async function runTool(tool, sessionId, question) {
    memory.remember(sessionId, { question, topic: `tool:${tool.name}` })
    if (!executeTool) {
      return { topic: `tool:${tool.name}`, confidence: 1,
        reply: `I recognised that as a request to ${tool.summary}, but no action handler is wired up.` }
    }
    try {
      const result = await executeTool(tool.name, tool.args || {})
      return { reply: String(result), topic: `tool:${tool.name}`, confidence: 1, toolRan: tool.name }
    } catch (err) {
      return { topic: `tool:${tool.name}`, confidence: 1,
        reply: `I tried to ${tool.summary}, but it failed: ${err.message}` }
    }
  }

  return { ask, index, memory, MIN_CONFIDENCE, GREETING, topicCount: KNOWLEDGE.length }
}

module.exports = { createEngine, MIN_CONFIDENCE, GREETING }
