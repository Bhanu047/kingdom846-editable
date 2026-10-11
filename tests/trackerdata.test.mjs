/* The kingdom's public record, checked against itself.
 *
 * Every countable figure in tracker846.js is derived from the KvK runs
 * rather than stored beside them -- totals, records, win rates, streaks, and
 * the four outcome kinds. That removes the drift that had put ten different
 * numbers on the page at once, but it moves the risk: a run typed with the
 * wrong prep or battle letter now silently changes the totals, the streaks,
 * the outcome counts and the chart together, and they would all still agree
 * with each other.
 *
 * What they cannot silently agree with is what the SOURCES publish. Atlas and
 * the Optimizer print the records, the outcome counts and the per-KvK win
 * rates, and those published figures are written out here as fixed strings.
 * If a run is ever mistyped, the derivation walks away from them and these
 * fail -- which is the only way this file can be wrong and still look right.
 *
 * Figures below are from the profiles as read on 2026-10-11, after KvK 19.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { tracker846 } from '../src/data/tracker846.js'

const { kvk, atlas } = tracker846

test('the runs reproduce the records both sources publish', () => {
  assert.equal(kvk.total, 13)
  assert.equal(kvk.prep.record, '11-2', 'Atlas and the Optimizer both print prep 11-2')
  assert.equal(kvk.battle.record, '10-3', 'both print battle 10-3')
  assert.equal(kvk.prep.winRate, 85)
  assert.equal(kvk.battle.winRate, 77)
})

test('the four outcome kinds add up to every KvK played', () => {
  // Atlas's own header: 9 / 1 / 2 / 1 of 13.
  assert.equal(kvk.dominations, 9)
  assert.equal(kvk.comebacks, 1)
  assert.equal(kvk.reversals, 2)
  assert.equal(kvk.invasions, 1)
  assert.equal(kvk.dominations + kvk.comebacks + kvk.reversals + kvk.invasions, kvk.total,
    'every KvK is exactly one of the four, so a gap means a run has no outcome')
  assert.equal(kvk.dominationRate, 69)
})

test('the streaks are the ones the profile shows', () => {
  assert.equal(kvk.prep.streak, '7W')
  assert.equal(kvk.prep.best, '7W')
  assert.equal(kvk.battle.streak, '1L')
  assert.equal(kvk.battle.best, '5W')
})

test('the history is whole, newest first, with no repeated KvK', () => {
  const numbers = kvk.history.map((r) => r.kvk)
  assert.deepEqual(numbers, [...numbers].sort((a, b) => b - a), 'history must run newest first')
  assert.equal(new Set(numbers).size, numbers.length, 'a KvK appears twice')
  assert.deepEqual(kvk.latest, kvk.history[0], 'latest must be the newest run, not a copy that can drift')
  for (const run of kvk.history) {
    assert.match(run.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(['W', 'L'].includes(run.prep) && ['W', 'L'].includes(run.battle), `KvK ${run.kvk} has a phase that is neither W nor L`)
  }
})

test('the toughest matchup is the worst draw on the record', () => {
  const worst = Math.max(...kvk.history.map((r) => r.quality))
  assert.equal(kvk.toughest.quality, worst)
  // The Optimizer names it: KvK 16 against K623 at 5.70.
  assert.equal(kvk.toughest.kvk, 16)
  assert.equal(kvk.toughest.opponent, 'K623')
})

test('the trend agrees with the record it is drawn from', () => {
  const oldestFirst = [...kvk.history].reverse()
  assert.equal(atlas.trend.length, kvk.total, 'the trend must have a point per KvK')
  oldestFirst.forEach((run, i) => assert.equal(atlas.trend[i].kvk, run.kvk, 'trend points must line up with the runs'))
  // Atlas's Performance Trend at the points read off it on 2026-09-13 -- the
  // last two KvKs before this one -- and where the record now ends.
  const at = (n) => atlas.trend.find((p) => p.kvk === n)
  assert.deepEqual([at(17).prepWinRate, at(17).battleWinRate], [81.8, 81.8])
  assert.deepEqual([at(18).prepWinRate, at(18).battleWinRate], [83.3, 83.3])
  assert.deepEqual([at(19).prepWinRate, at(19).battleWinRate], [84.6, 76.9])
})

test('the Atlas ratings are the ones the profile header prints', () => {
  assert.equal(atlas.rating, 1196.9)
  assert.equal(atlas.rank, 30)
  assert.deepEqual(atlas.prep, { rating: 1221.4, rank: 80 })
  assert.deepEqual(atlas.battle, { rating: 1176.8, rank: 48 })
  assert.deepEqual(atlas.mystic, { total: 224722, rank: 112 })
})

/* The advisor's copy of the record.
 *
 * server/ai/record.cjs restates the war record for the corpus, because the
 * production image ships server/ and dist/ only -- src/data/tracker846.js is
 * not on disk at runtime and is an ES module besides. That duplication is the
 * exact thing this file exists to catch, so it is checked rather than trusted.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require_ = createRequire(import.meta.url)
const advisor = require_('../server/ai/record.cjs')

test('the atlas block still carries everything the cards read', () => {
  // AtlasAnalytics, About and the Dashboard dereference these directly; losing
  // one renders an error boundary where the analytics should be, which no
  // build step notices.
  for (const key of ['rating', 'rank', 'prep', 'battle', 'mystic', 'trend', 'verified']) {
    assert.ok(atlas[key] !== undefined, `atlas.${key} is missing — the page reads it`)
  }
  assert.ok(tracker846.tier, 'the tier pill reads tracker846.tier')
  for (const p of atlas.trend) {
    assert.ok(p.prepWinRate >= 0 && p.prepWinRate <= 100 && p.battleWinRate >= 0 && p.battleWinRate <= 100)
  }
})

test('the advisor states the same record the kingdom does', () => {
  assert.equal(advisor.record.wars, kvk.total)
  assert.equal(advisor.record.dominations, kvk.dominations)
  assert.equal(advisor.record.comebacks, kvk.comebacks)
  assert.equal(advisor.record.reversals, kvk.reversals)
  assert.equal(advisor.record.invasions, kvk.invasions)
  assert.equal(advisor.record.prepRecord, kvk.prep.record)
  assert.equal(advisor.record.battleRecord, kvk.battle.record)
  assert.equal(advisor.record.rating, kvk.rating)
  assert.equal(advisor.record.ratingRank, kvk.rank)
  assert.equal(advisor.record.atlasRating, atlas.rating)
  assert.equal(advisor.record.atlasRank, atlas.rank)
  assert.equal(advisor.record.tier, tracker846.tier)
})

test('no topic states the war record as prose', () => {
  const here = path.dirname(new URL(import.meta.url).pathname)
  const corpus = JSON.parse(fs.readFileSync(path.join(here, '..', 'server', 'ai', 'knowledge.json'), 'utf8'))
  const stale = []
  for (const topic of corpus) {
    if (typeof topic.answer !== 'string') continue
    // A bare count of wars or dominations is the shape that went stale: it
    // reads as fact, answers questions, and nothing about it looks old.
    const m = topic.answer.match(/\b\d+\s+(?:wars|dominations)\b/i)
    if (m) stale.push(`${topic.id}: "${m[0]}"`)
  }
  assert.deepEqual(stale, [], 'these topics hard-code a figure that moves every KvK — use a {{placeholder}}')
})

test('every placeholder a topic uses is one the advisor can fill', () => {
  const here = path.dirname(new URL(import.meta.url).pathname)
  const corpus = JSON.parse(fs.readFileSync(path.join(here, '..', 'server', 'ai', 'knowledge.json'), 'utf8'))
  const used = new Set()
  for (const topic of corpus) {
    for (const m of String(topic.answer || '').matchAll(/\{\{(\w+)\}\}/g)) used.add(m[1])
  }
  assert.ok(used.size > 0, 'the placeholders went missing — the figures are hard-coded again')
  for (const key of used) {
    assert.ok(advisor.FIELDS.includes(key), `{{${key}}} has no value in record.cjs, so visitors are shown the raw braces`)
  }
  // And nothing survives filling.
  const filled = advisor.fillCorpus(corpus)
  assert.deepEqual(filled.filter((t) => /\{\{\w+\}\}/.test(t.answer || '')).map((t) => t.id), [])
})
