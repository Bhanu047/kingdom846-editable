// Regression tests for the Royal Advisor engine.
//
// The advisor used to be ~1,900 lines of ordered `if (msg.includes(...))`
// rules. Most blocks here pin a defect that arrangement caused; the comment
// says what the old behaviour was, so a failure reads as "the bug came back"
// rather than "a score moved".

import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'

import tokenizeMod from '../server/ai/tokenize.cjs'
import fuzzyMod from '../server/ai/fuzzy.cjs'
import bm25Mod from '../server/ai/bm25.cjs'
import memoryMod from '../server/ai/memory.cjs'
import toolsMod from '../server/ai/tools.cjs'
import engineMod from '../server/ai/engine.cjs'
import knowledge from '../server/ai/knowledge.json' with { type: 'json' }

const { tokenize, stem, questionWord } = tokenizeMod
const { editDistance, makeCorrector } = fuzzyMod
const { Bm25Index, confidence } = bm25Mod
const { Memory } = memoryMod
const { detectTool } = toolsMod
const { createEngine } = engineMod

const index = new Bm25Index(knowledge)

// --- text analysis -------------------------------------------------------

test('stemming collapses inflections onto one token', () => {
  assert.equal(stem('alliances'), stem('alliance'))
  assert.equal(stem('defending'), stem('defends'))
  assert.equal(stem('rallies'), stem('rally'))
})

test('digits survive tokenizing', () => {
  // Kingdom numbers and troop tiers are content here, not noise: stripping
  // them would make "kingdom 846" and "kingdom 123" the same question.
  assert.deepEqual(tokenize('kingdom 846 t10 troops'), ['kingdom', '846', 't10', 'troop'])
})

test('question and filler words are dropped but recoverable', () => {
  // "work" is rarer in this corpus than "rally", so leaving filler in ranked
  // "how do rallies work" against a topic that merely contained "work".
  assert.deepEqual(tokenize('how do rallies work'), ['ralli'])
  assert.equal(questionWord('who is the king'), 'who')
})

// --- typo tolerance ------------------------------------------------------

test('a transposition costs one edit, not two', () => {
  // Plain Levenshtein scores a swap as two substitutions, which put the most
  // common phone typo out of correction range.
  assert.equal(editDistance('castel', 'castle'), 1)
  assert.equal(editDistance('kingdmo', 'kingdom'), 1)
})

test('typos are corrected and real out-of-domain words are left alone', () => {
  const correct = makeCorrector(['alliance', 'transfer', 'castle', 'kingdom', 'exploit'])
  assert.equal(correct('trasnfer'), 'transfer')
  assert.equal(correct('castel'), 'castle')
  // "explain" is a real word the corpus lacks; rewriting it to "exploit"
  // produced a confident answer to a question nobody asked.
  assert.equal(correct('explain'), null)
})

// --- retrieval -----------------------------------------------------------

test('a specific topic outranks a broad one regardless of corpus order', () => {
  // The core defect of the old chain: a broad rule near the top of the file
  // swallowed every narrower rule below it, so ordering decided the answer.
  const { hits } = index.search('what is kvk')
  assert.equal(hits[0].doc.id, 'kvk')
})

test('curated keywords beat passing mentions in prose', () => {
  // "vip", "scam" and "discord" appear in dozens of answer bodies. Deriving
  // IDF from bodies made them look common and let incidental words outrank
  // them, so IDF is computed from keywords and titles instead.
  assert.ok(index.idf.get('vip') > 3, 'vip should read as a rare, identifying term')
  assert.equal(index.search('whats the discord link').hits
    .slice(0, 3).some(h => h.doc.id === 'discord'), true)
})

test('confidence separates known questions from unknown ones', () => {
  const known = confidence(index.search('best formation for attacking').hits)
  const unknown = confidence(index.search('how do i cook pasta').hits)
  assert.ok(known > 0.6, `known question scored ${known.toFixed(2)}`)
  assert.ok(unknown < 0.5, `out-of-domain question scored ${unknown.toFixed(2)}`)
  assert.ok(known > unknown + 0.2)
})

// --- conversation memory -------------------------------------------------

test('memory carries an entity forward and is bounded', () => {
  const m = new Memory({ maxSessions: 3 })
  m.remember('a', { question: 'tell me about spiders', topic: 'live:alliance', alliance: 'ryo' })
  m.remember('a', { question: 'who leads it', topic: 'live:alliance' })
  assert.equal(m.get('a').alliance, 'ryo', 'entity should survive a follow-up')
  m.remember('a', { question: 'what about ice', topic: 'live:alliance', alliance: 'ice' })
  assert.equal(m.get('a').alliance, 'ice', 'a named entity should replace the carried one')

  // The old joke tracker was an unbounded object keyed by visitor IP.
  for (const id of ['b', 'c', 'd', 'e']) m.remember(id, { question: 'x', topic: 't' })
  assert.ok(m.size <= 3, `expected eviction, held ${m.size}`)
})

// --- tools ---------------------------------------------------------------

test('state-changing tools are refused for visitors', () => {
  // The query is attacker-controlled text; the role check, not the phrasing,
  // is what stops "crown me king" from reaching the database.
  assert.equal(detectTool('crown me High King', { isAdmin: false }).denied, true)
  assert.equal(detectTool('sync the news now', { isAdmin: false }).denied, true)
})

test('admin instructions parse into a tool call needing confirmation', () => {
  const t = detectTool('crown Dunngeon as High King of [ICE] IceHunters', { isAdmin: true })
  assert.equal(t.name, 'update_king_status')
  assert.equal(t.args.name, 'Dunngeon')
  assert.equal(t.args.king_type, 'High King')
  assert.equal(t.args.alliance_tag, '[ICE]')
  assert.equal(t.needsConfirm, true)
})

test('questions are not mistaken for instructions', () => {
  assert.equal(detectTool('who is the king', { isAdmin: true }), null)
  assert.equal(detectTool('what is kvk', { isAdmin: true }), null)
})

// --- end to end ----------------------------------------------------------

function seedDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE alliances (slug TEXT PRIMARY KEY, name TEXT, leader TEXT, language TEXT, tagline TEXT);
    CREATE TABLE king_status (id INTEGER PRIMARY KEY, king_type TEXT, name TEXT, alliance_tag TEXT, alliance_name TEXT, updated_at TEXT);
    CREATE TABLE alliance_schedules (alliance_slug TEXT, event_name TEXT, event_time TEXT, updated_at TEXT);
    CREATE TABLE kingshot_sync (id TEXT PRIMARY KEY, type TEXT, title TEXT, category TEXT, date TEXT, excerpt TEXT, synced_at TEXT);
    CREATE TABLE transfers (id INTEGER PRIMARY KEY, name TEXT, alliance TEXT, status TEXT, created_at TEXT);
    INSERT INTO alliances VALUES ('ryo','Spiders','Shoni','English','Loyal warriors'),
                                 ('ice','IceHunters','Dunngeon','English','Cold steel');
    INSERT INTO king_status VALUES (1,'High King','Spartan','[RYO]','Spiders','2026-09-01');
    INSERT INTO alliance_schedules VALUES ('ice','Bear Hunt -1','14:00','2026-09-02');
  `)
  return db
}

test('live questions are answered from the database, not the corpus', async () => {
  const advisor = createEngine({ db: seedDb(), scheduleDefaults: {} })
  const king = await advisor.ask('who is the king', { sessionId: 's1' })
  assert.equal(king.topic, 'live:king')
  assert.match(king.reply, /High King Spartan/)
})

test('a follow-up resolves its pronoun against the previous turn', async () => {
  const advisor = createEngine({ db: seedDb(), scheduleDefaults: {} })
  await advisor.ask('tell me about icehunters', { sessionId: 's2' })
  const followUp = await advisor.ask('when is their bear hunt', { sessionId: 's2' })
  assert.equal(followUp.topic, 'live:schedule')
  assert.match(followUp.reply, /IceHunters \[ICE\]/)
  assert.match(followUp.reply, /14:00/)
})

test('a timing word alone does not trigger a schedule', async () => {
  // The old rule fired on any message containing "time", so asking how long a
  // shield lasts returned an alliance timetable.
  const advisor = createEngine({ db: seedDb(), scheduleDefaults: {} })
  const out = await advisor.ask('how long does a peace shield last', { sessionId: 's3' })
  assert.ok(!out.topic.startsWith('live:schedule'), `got ${out.topic}`)
})

test('an unknown question is answered honestly, not guessed at', async () => {
  const advisor = createEngine({ db: seedDb(), scheduleDefaults: {} })
  const out = await advisor.ask('how do i cook pasta', { sessionId: 's4' })
  assert.equal(out.topic, 'unknown')
  assert.match(out.reply, /not certain|do not have an answer/i)
})

test('an admin action runs only after confirmation, and cancels cleanly', async () => {
  const ran = []
  const advisor = createEngine({
    db: seedDb(), scheduleDefaults: {},
    executeTool: async (name, args) => { ran.push([name, args]); return 'done' },
  })
  const ask = (m) => advisor.ask(m, { sessionId: 'admin1', isAdmin: true })

  const prompt = await ask('crown Dunngeon as High King')
  assert.equal(prompt.topic, 'tool:confirm')
  assert.equal(ran.length, 0, 'nothing should run before confirmation')

  await ask('yes')
  assert.equal(ran.length, 1)
  assert.equal(ran[0][0], 'update_king_status')

  await ask('set the leader of spiders to Aria')
  const cancelled = await ask('no')
  assert.equal(cancelled.topic, 'tool:cancelled')
  assert.equal(ran.length, 1, 'a cancelled action must not run')
})

test('small talk is matched on stems, and never by answer text', async () => {
  const advisor = createEngine({ db: seedDb(), scheduleDefaults: {} })
  // "thanks" reaching the topic keyed on "thank" needs stem matching.
  assert.equal((await advisor.ask('thanks', { sessionId: 's5' })).topic, 'smalltalk:thank')
  // These topics answer by listing what else to ask; indexing their bodies for
  // retrieval made them match every question asked.
  const real = await advisor.ask('how do i defend my city', { sessionId: 's5' })
  assert.ok(!real.topic.startsWith('smalltalk:'), `got ${real.topic}`)
})
