// Verified Kingdom 846 tracker snapshot.
//
// Sources, and when each block was last read off them:
// - Kingshot Optimizer: https://kingshotoptimizer.com/kvk-rankings/kingdom/846
//   KvK block — read 2026-10-11, after KvK 19.
// - Kingshot Atlas: https://ks-atlas.com/kingdom/846
//   Atlas block — read 2026-10-11, after KvK 19, through a browser that runs
//   the page's JavaScript, which a plain fetch cannot do. Atlas has since moved
//   from a 0-100 score (with a breakdown and radar) to three ratings, each with
//   its own rank; the old score, breakdown, radar and score curve no longer
//   exist on the profile, so they are not kept here either.
//
// The KvK runs are the only record typed out here. Everything countable --
// totals, records, win rates, streaks, and the four outcome kinds -- is counted
// off them, because every one of those was previously stored beside the runs
// and every one of them was a KvK behind by the time anyone looked.

// Newest first. Opponent rank and match quality are as the Optimizer shows them
// today: an opponent's rank keeps moving after the match, so these rows drift
// on the source too, and are re-read whole rather than appended to.
const runs = [
  { kvk: 19, date: '2026-10-10', opponent: 'K719', opponentRank: 351, quality: 4.42, prep: 'W', battle: 'L' },
  { kvk: 18, date: '2026-09-12', opponent: 'K617', opponentRank: 792, quality: 4.07, prep: 'W', battle: 'W' },
  { kvk: 17, date: '2026-08-15', opponent: 'K795', opponentRank: 492, quality: 4.25, prep: 'W', battle: 'W' },
  { kvk: 16, date: '2026-07-18', opponent: 'K623', opponentRank: 30, quality: 5.70, prep: 'W', battle: 'L' },
  { kvk: 15, date: '2026-06-20', opponent: 'K766', opponentRank: 230, quality: 4.63, prep: 'W', battle: 'W' },
  { kvk: 14, date: '2026-05-23', opponent: 'K610', opponentRank: 1096, quality: 3.90, prep: 'W', battle: 'W' },
  { kvk: 13, date: '2026-04-25', opponent: 'K832', opponentRank: 836, quality: 4.03, prep: 'W', battle: 'W' },
  { kvk: 12, date: '2026-03-28', opponent: 'K777', opponentRank: 168, quality: 4.78, prep: 'L', battle: 'L' },
  { kvk: 11, date: '2026-02-28', opponent: 'K833', opponentRank: 188, quality: 4.73, prep: 'W', battle: 'W' },
  { kvk: 10, date: '2026-01-31', opponent: 'K815', opponentRank: 1208, quality: 3.88, prep: 'W', battle: 'W' },
  { kvk: 9, date: '2026-01-03', opponent: 'K791', opponentRank: 288, quality: 4.53, prep: 'L', battle: 'W' },
  { kvk: 8, date: '2025-12-06', opponent: 'K840', opponentRank: 769, quality: 4.08, prep: 'W', battle: 'W' },
  { kvk: 7, date: '2025-11-08', opponent: 'K841', opponentRank: 1550, quality: 3.72, prep: 'W', battle: 'W' },
]

const count = (fn) => runs.filter(fn).length

// A phase record, counted rather than stored. Matches what the Optimizer
// publishes beside it (prep 11-2, battle 10-3) -- which is the point: if a run
// is added and these disagree with the source, the run was typed wrong.
function phase(key) {
  const wins = count((r) => r[key] === 'W')
  const losses = count((r) => r[key] === 'L')
  return {
    wins,
    losses,
    record: `${wins}-${losses}`,
    winRate: Math.round((wins / runs.length) * 100),
    streak: currentRun(key),
    best: longestRun(key),
  }
}

// The streak as it stands after the newest KvK.
function currentRun(key) {
  const outcome = runs[0]?.[key]
  if (!outcome) return '—'
  let n = 0
  for (const run of runs) {
    if (run[key] !== outcome) break
    n += 1
  }
  return `${n}${outcome}`
}

// The longest winning run the kingdom has ever put together in this phase.
function longestRun(key) {
  let best = 0
  let current = 0
  for (const run of runs) {
    current = run[key] === 'W' ? current + 1 : 0
    if (current > best) best = current
  }
  return `${best}W`
}

// Atlas names a KvK by what happened across both phases. Winning both is a
// domination; losing prep and taking the battle is a comeback; the reverse is a
// reversal; losing both is an invasion. Counting them off the runs reproduces
// the figures Atlas published in August exactly, so the same rule is applied to
// the runs since.
const dominations = count((r) => r.prep === 'W' && r.battle === 'W')
const comebacks = count((r) => r.prep === 'L' && r.battle === 'W')
const reversals = count((r) => r.prep === 'W' && r.battle === 'L')
const invasions = count((r) => r.prep === 'L' && r.battle === 'L')

// Prep and battle win rate as they stood after each KvK, oldest first -- the
// "Performance Trend" Atlas plots. Counted off the runs, so it is exact: Atlas
// draws its rating and ranking histories as charts without printing the
// numbers behind them, and a line read off a chart is not put on this page.
const trend = [...runs].reverse().map((run, i, oldestFirst) => {
  const upTo = oldestFirst.slice(0, i + 1)
  const rate = (key) => Math.round((upTo.filter((r) => r[key] === 'W').length / upTo.length) * 1000) / 10
  return { kvk: run.kvk, prepWinRate: rate('prep'), battleWinRate: rate('battle') }
})

export const tracker846 = {
  tier: 'S-Tier',
  atlas: {
    // Read off the live profile header on the date below.
    verified: '2026-10-11',
    rating: 1196.9,
    rank: 30,
    prep: { rating: 1221.4, rank: 80 },
    battle: { rating: 1176.8, rank: 48 },
    // "Mystic Trials Top 100 Total" on the same header.
    mystic: { total: 224722, rank: 112 },
    trend,
  },
  kvk: {
    verified: '2026-10-11',
    total: runs.length,
    dominations,
    dominationRate: Math.round((dominations / runs.length) * 100),
    comebacks,
    reversals,
    invasions,
    prep: phase('prep'),
    battle: phase('battle'),
    // Published by the Optimizer, not derivable: its rating model is its own.
    rating: 2.885,
    rank: 25,
    latest: { ...runs[0] },
    // The hardest draw the kingdom has had, by the source's own match quality.
    toughest: runs.reduce((hardest, run) => (run.quality > hardest.quality ? run : hardest)),
    history: runs.map((run) => ({ ...run })),
  },
  transfers: [
    { transfer: 8, date: 'Sep 2026', group: 4, status: 'Ordinary' },
    { transfer: 7, date: 'Jul 2026', group: 3, status: 'Leading' },
    { transfer: 6, date: 'Jun 2026', group: 4, status: 'Ordinary' },
    { transfer: 5, date: 'Apr 2026', group: 4, status: 'Ordinary' },
    { transfer: 4, date: 'Mar 2026', group: 5, status: 'Ordinary' },
    { transfer: 3, date: 'Jan 2026', group: 6, status: 'Ordinary' },
  ],
  reputation: {
    overall: 5.0,
    reviews: 2,
    communication: 5.0,
    compliance: 5.0,
    sportsmanship: 5.0,
  },
}
