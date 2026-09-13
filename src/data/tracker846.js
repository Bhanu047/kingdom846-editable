// Verified Kingdom 846 tracker snapshot.
//
// Sources, and when each block was last read off them:
// - Kingshot Optimizer: https://kingshotoptimizer.com/kvk-rankings/kingdom/846
//   KvK block — read 2026-09-13, after KvK 18.
// - Kingshot Atlas: https://ks-atlas.com/kingdom/846
//   Atlas block — read 2026-08-23. Atlas renders client-side and could not be
//   read on the 13th, so the score, rank and breakdown are still the August
//   figures and say so through `atlas.verified`.
//
// The KvK runs are the only record typed out here. Everything countable --
// totals, records, win rates, streaks, and the four outcome kinds -- is counted
// off them, because every one of those was previously stored beside the runs
// and every one of them was a KvK behind by the time anyone looked.

// Newest first. Opponent rank and match quality are as the Optimizer shows them
// today: an opponent's rank keeps moving after the match, so these rows drift
// on the source too, and are re-read whole rather than appended to.
const runs = [
  { kvk: 18, date: '2026-09-12', opponent: 'K617', opponentRank: 659, quality: 4.35, prep: 'W', battle: 'W' },
  { kvk: 17, date: '2026-08-15', opponent: 'K795', opponentRank: 646, quality: 4.36, prep: 'W', battle: 'W' },
  { kvk: 16, date: '2026-07-18', opponent: 'K623', opponentRank: 20, quality: 6.01, prep: 'W', battle: 'L' },
  { kvk: 15, date: '2026-06-20', opponent: 'K766', opponentRank: 141, quality: 5.01, prep: 'W', battle: 'W' },
  { kvk: 14, date: '2026-05-23', opponent: 'K610', opponentRank: 1159, quality: 4.10, prep: 'W', battle: 'W' },
  { kvk: 13, date: '2026-04-25', opponent: 'K832', opponentRank: 709, quality: 4.32, prep: 'W', battle: 'W' },
  { kvk: 12, date: '2026-03-28', opponent: 'K777', opponentRank: 200, quality: 4.86, prep: 'L', battle: 'L' },
  { kvk: 11, date: '2026-02-28', opponent: 'K833', opponentRank: 134, quality: 5.04, prep: 'W', battle: 'W' },
  { kvk: 10, date: '2026-01-31', opponent: 'K815', opponentRank: 777, quality: 4.27, prep: 'W', battle: 'W' },
  { kvk: 9, date: '2026-01-03', opponent: 'K791', opponentRank: 123, quality: 5.11, prep: 'L', battle: 'W' },
  { kvk: 8, date: '2025-12-06', opponent: 'K840', opponentRank: 891, quality: 4.20, prep: 'W', battle: 'W' },
  { kvk: 7, date: '2025-11-08', opponent: 'K841', opponentRank: 1034, quality: 4.13, prep: 'W', battle: 'W' },
]

const count = (fn) => runs.filter(fn).length

// A phase record, counted rather than stored. Matches what the Optimizer
// publishes beside it (prep 10-2, battle 10-2) -- which is the point: if a run
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

export const tracker846 = {
  tier: 'S-Tier',
  atlas: {
    // As of atlas.verified below -- the Atlas profile is client-rendered and
    // was not re-read after KvK 18. Rating and rank in the kvk block ARE
    // current; these are not, and the two are dated separately for that reason.
    verified: '2026-08-23',
    score: 66.38,
    rank: 33,
    // "Ranks better than 98% of all kingdoms", per the Atlas profile.
    percentile: 98,
    tierThreshold: 57,
    // The only step of the score/rank history the profile actually publishes
    // as a figure. The rest of the curve is drawn on their page but not given
    // numerically, so we plot this step and say so rather than inventing it.
    lastMove: { fromKvk: 16, toKvk: 17, score: 5.47, ranks: 33 },
    // Atlas labels its own decomposition approximate; these five sum to 66.37
    // against a published 66.38, which is the rounding that label refers to.
    breakdown: [
      { key: 'base',    label: 'Base Score', note: 'win rates', pts: 47.93 },
      { key: 'dominv',  label: 'Dom / Inv',  note: 'impact',    pts: 4.55 },
      { key: 'form',    label: 'Form',       note: 'last 5',    pts: 6.61 },
      { key: 'streaks', label: 'Streaks',    note: 'bonus',     pts: 3.61 },
      { key: 'history', label: 'History',    note: 'bonus',     pts: 3.67 },
    ],
    experiencePenalty: false,
    radar: [
      { label: 'Win Rate',   value: 82 },
      { label: 'Domination', value: 73 },
      { label: 'Form',       value: 83 },
      { label: 'Streaks',    value: 100 },
      { label: 'Experience', value: 100 },
      { label: 'Resilience', value: 91 },
    ],
  },
  kvk: {
    verified: '2026-09-13',
    total: runs.length,
    dominations,
    dominationRate: Math.round((dominations / runs.length) * 100),
    comebacks,
    reversals,
    invasions,
    prep: phase('prep'),
    battle: phase('battle'),
    // Published by the Optimizer, not derivable: its rating model is its own.
    rating: 3.115,
    rank: 10,
    latest: { ...runs[0] },
    // The hardest draw the kingdom has had, by the source's own match quality.
    toughest: runs.reduce((hardest, run) => (run.quality > hardest.quality ? run : hardest)),
    history: runs.map((run) => ({ ...run })),
  },
  transfers: [
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
