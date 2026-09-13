// Verified Kingdom 846 tracker snapshot.
//
// Sources, and when each block was last read off them:
// - Kingshot Optimizer: https://kingshotoptimizer.com/kvk-rankings/kingdom/846
//   KvK block — read 2026-09-13, after KvK 18.
// - Kingshot Atlas: https://ks-atlas.com/kingdom/846
//   Atlas block — read 2026-09-13 through a browser that runs the page's
//   JavaScript, which a plain fetch cannot do: the score and rank, the
//   decomposition, the radar, the per-KvK curve behind its history charts, and
//   its simulator's projection for the next KvK.
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

// The profile's own history charts, point by point.
//
// Score and rank are read off the plotted points, so they carry about +/-0.1
// and +/-1 of reading error; the win rates are exact, and they reproduce what
// the runs above compute to the decimal, which is the check that the rows line
// up with the right KvKs.
//
// The last point disagrees with the header on purpose: the chart plots KvK 18
// at 71.90 and #14, while the profile's current standing reads 70.04 and #23.
// Atlas recalculates after a KvK settles and the header is the live figure, so
// the curve is drawn as the site draws it and "current" is taken from the
// header -- the same split the real profile shows.
const curve = [
  { kvk: 7,  score: 23.20, rank: 458, prepWinRate: 100.0, battleWinRate: 100.0 },
  { kvk: 8,  score: 32.06, rank: 294, prepWinRate: 100.0, battleWinRate: 100.0 },
  { kvk: 9,  score: 34.83, rank: 335, prepWinRate: 66.7,  battleWinRate: 100.0 },
  { kvk: 10, score: 47.84, rank: 117, prepWinRate: 75.0,  battleWinRate: 100.0 },
  { kvk: 11, score: 58.26, rank: 41,  prepWinRate: 80.0,  battleWinRate: 100.0 },
  { kvk: 12, score: 46.03, rank: 256, prepWinRate: 66.7,  battleWinRate: 83.3 },
  { kvk: 13, score: 57.04, rank: 77,  prepWinRate: 71.4,  battleWinRate: 85.7 },
  { kvk: 14, score: 62.18, rank: 38,  prepWinRate: 75.0,  battleWinRate: 87.5 },
  { kvk: 15, score: 66.97, rank: 16,  prepWinRate: 77.8,  battleWinRate: 88.9 },
  { kvk: 16, score: 62.77, rank: 57,  prepWinRate: 80.0,  battleWinRate: 80.0 },
  { kvk: 17, score: 68.24, rank: 24,  prepWinRate: 81.8,  battleWinRate: 81.8 },
  { kvk: 18, score: 71.90, rank: 14,  prepWinRate: 83.3,  battleWinRate: 83.3 },
]

export const tracker846 = {
  tier: 'S-Tier',
  atlas: {
    // Score, rank and percentile: read off the live profile on the date below.
    // Atlas renders client-side, so this needed a browser that runs JavaScript;
    // plain fetches get the app's boot shell and nothing else.
    verified: '2026-09-13',
    score: 70.04,
    rank: 23,
    // "Top 1.0%" on the profile -- stored as the percentage it ranks better
    // than, which is what the site states in prose.
    percentile: 99,
    tierThreshold: 57,
    // The move the profile calls out above its history charts. The rest of the
    // curve is in `curve` below, so this is a label rather than the only thing
    // known -- and the test file holds it against the two points it spans.
    lastMove: { fromKvk: 17, toKvk: 18, score: 3.66, ranks: 10 },
    // Read the same day as the score, from the profile's Analytics tab.
    componentsVerified: '2026-09-13',
    // Atlas labels its own decomposition approximate; these five sum to 70.01
    // against a published 70.04, which is the rounding that label refers to.
    breakdown: [
      { key: 'base',    label: 'Base Score', note: 'win rates', pts: 49.00 },
      { key: 'dominv',  label: 'Dom / Inv',  note: 'impact',    pts: 4.90 },
      { key: 'form',    label: 'Form',       note: 'last 5',    pts: 7.11 },
      { key: 'streaks', label: 'Streaks',    note: 'bonus',     pts: 5.00 },
      { key: 'history', label: 'History',    note: 'bonus',     pts: 4.00 },
    ],
    experiencePenalty: false,
    // Read off the charts on the same day as the score; see `curve` above for
    // what is exact in it and what is a reading.
    curve: curve.map((point) => ({ ...point })),
    // Atlas's own projection for the next KvK, from its Score Simulator with
    // the default outcome selected: both phases won, which it calls a
    // domination. Only that scenario is published as figures. The others move
    // with inputs we do not have, so nothing else is stored and nothing is
    // extrapolated from this one.
    simulator: {
      nextKvk: 19,
      outcome: 'Domination — prep and battle both won',
      projected: 73.61,
      delta: 3.57,
      deltaPct: 5.1,
      parts: [
        { label: 'Base Win Rate', pts: 3.37 },
        { label: 'Streak Impact', pts: 0.15 },
        { label: 'Experience', pts: 0.00 },
        { label: 'Form Bonus', pts: 0.04 },
      ],
    },
    radar: [
      { label: 'Win Rate',   value: 83 },
      { label: 'Domination', value: 75 },
      { label: 'Form',       value: 83 },
      { label: 'Streaks',    value: 100 },
      { label: 'Experience', value: 100 },
      { label: 'Resilience', value: 92 },
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
