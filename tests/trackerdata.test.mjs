/* The kingdom's public record, checked against itself.
 *
 * Every countable figure in tracker846.js is derived from the twelve KvK runs
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
 * Figures below are from the profiles as read on 2026-09-13, after KvK 18.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { tracker846 } from '../src/data/tracker846.js'

const { kvk, atlas } = tracker846

test('the runs reproduce the records both sources publish', () => {
  assert.equal(kvk.total, 12)
  assert.equal(kvk.prep.record, '10-2', 'Atlas and the Optimizer both print prep 10-2')
  assert.equal(kvk.battle.record, '10-2', 'both print battle 10-2')
  assert.equal(kvk.prep.winRate, 83)
  assert.equal(kvk.battle.winRate, 83)
})

test('the four outcome kinds add up to every KvK played', () => {
  // Atlas's own decomposition on the Data tab: 9 / 1 / 1 / 1 of 12.
  assert.equal(kvk.dominations, 9)
  assert.equal(kvk.comebacks, 1)
  assert.equal(kvk.reversals, 1)
  assert.equal(kvk.invasions, 1)
  assert.equal(kvk.dominations + kvk.comebacks + kvk.reversals + kvk.invasions, kvk.total,
    'every KvK is exactly one of the four, so a gap means a run has no outcome')
  assert.equal(kvk.dominationRate, 75)
})

test('the streaks are the ones the profile shows', () => {
  assert.equal(kvk.prep.streak, '6W')
  assert.equal(kvk.prep.best, '6W')
  assert.equal(kvk.battle.streak, '2W')
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
  // The Optimizer names it: KvK 16 against K623 at 6.01.
  assert.equal(kvk.toughest.kvk, 16)
  assert.equal(kvk.toughest.opponent, 'K623')
})

test('the score breakdown adds up to the score it decomposes', () => {
  const total = atlas.breakdown.reduce((sum, part) => sum + part.pts, 0)
  // Atlas labels its decomposition approximate; the gap it means by that is
  // rounding, not a stale component read on a different day.
  assert.ok(Math.abs(total - atlas.score) <= 0.05,
    `breakdown sums to ${total.toFixed(2)} against a score of ${atlas.score} — more than rounding apart`)
})

test('the plotted curve agrees with the record it is drawn from', () => {
  const oldestFirst = [...kvk.history].reverse()
  assert.equal(atlas.curve.length, kvk.total, 'the curve must have a point per KvK')

  let prep = 0
  let battle = 0
  oldestFirst.forEach((run, i) => {
    if (run.prep === 'W') prep += 1
    if (run.battle === 'W') battle += 1
    const point = atlas.curve[i]
    assert.equal(point.kvk, run.kvk, 'curve points must line up with the runs')
    // The win rates on the chart are exact figures, not readings, so they have
    // to match the cumulative record to the decimal. This is what catches a
    // run typed with the wrong letter.
    assert.equal(point.prepWinRate, Math.round((prep / (i + 1)) * 1000) / 10)
    assert.equal(point.battleWinRate, Math.round((battle / (i + 1)) * 1000) / 10)
  })
})

test('the published last move matches the curve it describes', () => {
  const to = atlas.curve.find((p) => p.kvk === atlas.lastMove.toKvk)
  const from = atlas.curve.find((p) => p.kvk === atlas.lastMove.fromKvk)
  assert.ok(to && from, 'lastMove names a KvK the curve does not contain')
  // Score and rank are read off chart points, so allow the reading error the
  // data file documents: about +/-0.1 a point and +/-1 a rank, doubled here
  // because a difference carries the error of both ends.
  assert.ok(Math.abs((to.score - from.score) - atlas.lastMove.score) <= 0.2,
    'the published score move disagrees with the two points it spans')
  assert.ok(Math.abs((from.rank - to.rank) - atlas.lastMove.ranks) <= 2,
    'the published rank move disagrees with the two points it spans')
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
  assert.equal(advisor.record.atlasScore, atlas.score)
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
