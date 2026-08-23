// Verified Kingdom 846 tracker snapshot.
// Sources supplied by the site owner:
// - Kingshot Atlas: https://ks-atlas.com/kingdom/846
// - Kingshot Optimizer: https://kingshotoptimizer.com/kvk-rankings/kingdom/846

export const tracker846 = {
  tier: 'S-Tier',
  atlas: {
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
    total: 11,
    dominations: 8,
    dominationRate: 73,
    comebacks: 1,
    reversals: 1,
    invasions: 1,
    prep: {
      wins: 9,
      losses: 2,
      record: '9-2',
      streak: '5W',
      winRate: 82,
      best: '5W',
    },
    battle: {
      wins: 9,
      losses: 2,
      record: '9-2',
      winRate: 82,
      best: '5W',
    },
    rating: 2.873,
    rank: 15,
    latest: {
      kvk: 17,
      date: '2026-08-15',
      opponent: 'K795',
      opponentRank: 404,
      quality: 4.26,
      prep: 'W',
      battle: 'W',
    },
    history: [
      { kvk: 17, date: '2026-08-15', opponent: 'K795', opponentRank: 404, quality: 4.26, prep: 'W', battle: 'W' },
      { kvk: 16, date: '2026-07-18', opponent: 'K623', opponentRank: 11, quality: 5.93, prep: 'W', battle: 'L' },
      { kvk: 15, date: '2026-06-20', opponent: 'K766', opponentRank: 117, quality: 4.83, prep: 'W', battle: 'W' },
      { kvk: 14, date: '2026-05-23', opponent: 'K610', opponentRank: 1408, quality: 3.71, prep: 'W', battle: 'W' },
      { kvk: 13, date: '2026-04-25', opponent: 'K832', opponentRank: 386, quality: 4.28, prep: 'W', battle: 'W' },
      { kvk: 12, date: '2026-03-28', opponent: 'K777', opponentRank: 90, quality: 4.93, prep: 'L', battle: 'L' },
      { kvk: 11, date: '2026-02-28', opponent: 'K833', opponentRank: 160, quality: 4.68, prep: 'W', battle: 'W' },
      { kvk: 10, date: '2026-01-31', opponent: 'K815', opponentRank: 983, quality: 3.88, prep: 'W', battle: 'W' },
      { kvk: 9, date: '2026-01-03', opponent: 'K791', opponentRank: 165, quality: 4.66, prep: 'L', battle: 'W' },
      { kvk: 8, date: '2025-12-06', opponent: 'K840', opponentRank: 844, quality: 3.96, prep: 'W', battle: 'W' },
      { kvk: 7, date: '2025-11-08', opponent: 'K841', opponentRank: 1314, quality: 3.75, prep: 'W', battle: 'W' },
    ],
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
