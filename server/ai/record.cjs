/**
 * The kingdom's war record, for the advisor.
 *
 * Four topics in knowledge.json stated it as prose -- "fought in 10 wars and
 * won 7 dominations" -- and it had been wrong for two KvKs by the time anyone
 * noticed, because nothing about answering a question makes a corpus file look
 * stale. The advisor was telling visitors the kingdom had 10 wars while its own
 * About page showed 12.
 *
 * The figures live here now and the topics carry placeholders, so there is one
 * line to change per KvK instead of four sentences to hunt down.
 *
 * WHY NOT read src/data/tracker846.js, which derives all of this from the runs
 * and is the actual source of truth: the production image ships `server/` and
 * `dist/` only (see Dockerfile), so src/ is not on disk at runtime, and it is
 * an ES module besides. The duplication is deliberate and it is GUARDED --
 * tests/trackerdata.test.mjs imports both and fails the moment they disagree,
 * so this cannot quietly drift the way the prose did.
 */

const record = {
  wars: 12,
  dominations: 9,
  comebacks: 1,
  reversals: 1,
  invasions: 1,
  prepRecord: '10-2',
  battleRecord: '10-2',
  rating: 3.115,
  ratingRank: 10,
  atlasScore: 70.04,
  atlasRank: 23,
  tier: 'S-Tier',
}

// Placeholder -> value. Topics write {{wars}} and get the number.
const FIELDS = Object.keys(record)

/** Fill {{field}} placeholders in a string of topic prose. */
function fill(text) {
  if (typeof text !== 'string') return text
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key) => (
    Object.prototype.hasOwnProperty.call(record, key) ? String(record[key]) : whole
  ))
}

/** Fill every answer in a corpus, leaving everything else untouched. */
function fillCorpus(topics) {
  return topics.map((topic) => (
    typeof topic.answer === 'string' ? { ...topic, answer: fill(topic.answer) } : topic
  ))
}

module.exports = { record, FIELDS, fill, fillCorpus }
