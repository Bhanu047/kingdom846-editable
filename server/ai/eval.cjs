/**
 * Retrieval quality check for the Royal Advisor.
 *
 *   npm run advisor:eval
 *
 * Each case is a question phrased the way a visitor would type it — not in the
 * words the topic uses — paired with the topics that would be a good answer.
 * That measures whether retrieval generalises, rather than whether it can find
 * a keyword it was handed.
 *
 * Use this when tuning: add the phrasings your visitors actually use, run it,
 * then adjust `synonyms.cjs` (the usual fix) or a topic's keyword list until
 * the score comes back up. The out-of-domain block matters just as much as the
 * hits — the advisor's honesty depends on unknown questions scoring low.
 */

const { Bm25Index, confidence } = require('./bm25.cjs')
const { MIN_CONFIDENCE } = require('./engine.cjs')
const knowledge = require('./knowledge.json')

const CASES = [
  // Found by asking 62 questions the way a player types them and keeping the
  // ones that fell through to "I am not sure". These were real misses.
  ['how do i apply for minister', ['apply-role']],
  ['how do i reserve a buff day', ['apply-role']],
  ['is there a truce', ['nap']],
  ['what is kvk', ['kvk']],
  ['explain kingdom versus kingdom', ['kvk', 'kvk-season']],
  ['how do i win kvk', ['win-kvk', 'kvk']],
  ['whats the discord link', ['discord', 'website-url']],
  ['where can i chat with the community', ['discord']],
  ['how do i defend my city', ['defend', 'what-is-a-bubble']],
  ['i keep getting attacked help', ['zeroed-again', 'defend']],
  ['how do i move to kingdom 846', ['transfer', 'switch-kingdom']],
  ['i want to switch kingdoms', ['switch-kingdom', 'transfer']],
  ['best formation for attacking', ['best-formation', 'formation']],
  ['what troops beat cavalry', ['counter', 'troop']],
  ['how do i upgrade my castle', ['castle', 'best-castle-level']],
  ['how to play without spending money', ['f2p', 'what-is-f2p', 'how-much']],
  ['is vip worth it', ['vip', 'vip-level', 'best-investment']],
  ['someone is trying to scam me', ['scam', 'report']],
  ['i just started what do i do', ['new-player']],
  ['how do rallies work', ['rally', 'rally-capacity', 'rally-spot']],
  ['how do i get more heroes', ['get-more-heroes', 'hero']],
  ['gathering resources tips', ['gather', 'gathering-hero']],
  ['bear hunt strategy tips', ['bear']],
  ['trasnfer to 846', ['transfer', 'switch-kingdom']],
]

// Questions the kingdom has no business answering. These must land below the
// engine's confidence floor, or the advisor starts bluffing.
const OUT_OF_DOMAIN = [
  'how do i cook pasta',
  'who won the world cup',
  'what is the capital of france',
  'help me write a resume',
]

function run() {
  const index = new Bm25Index(knowledge)
  let top1 = 0, top3 = 0
  const misses = []

  for (const [query, want] of CASES) {
    const { hits } = index.search(query, 3)
    const ids = hits.map(h => h.doc.id)
    if (want.includes(ids[0])) top1++
    else misses.push([query, want.join(' | '), ids[0] || '(none)', confidence(hits)])
    if (ids.some(id => want.includes(id))) top3++
  }

  const pct = (n) => `${n}/${CASES.length} (${Math.round(n / CASES.length * 100)}%)`
  console.log(`Royal Advisor retrieval — ${knowledge.length} topics indexed`)
  console.log(`  top-1: ${pct(top1)}`)
  console.log(`  top-3: ${pct(top3)}`)

  if (misses.length) {
    console.log('\n  misses:')
    for (const [q, want, got, c] of misses) {
      console.log(`    ${q.padEnd(34)} want ${want.padEnd(30)} got ${got.padEnd(18)} conf ${c.toFixed(2)}`)
    }
  }

  console.log(`\n  out-of-domain (must score below ${MIN_CONFIDENCE}):`)
  let bluffs = 0
  for (const q of OUT_OF_DOMAIN) {
    const c = confidence(index.search(q, 3).hits)
    const ok = c < MIN_CONFIDENCE
    if (!ok) bluffs++
    console.log(`    ${ok ? 'ok  ' : 'BLUFF'} ${c.toFixed(2)}  ${q}`)
  }

  const failed = top3 < CASES.length || bluffs > 0
  console.log(`\n  ${failed ? 'NEEDS WORK' : 'healthy'}`)
  return failed ? 1 : 0
}

if (require.main === module) process.exit(run())
module.exports = { run, CASES, OUT_OF_DOMAIN }
