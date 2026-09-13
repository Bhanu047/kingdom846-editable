// Kingdom 846 — data layer.
//
// REAL kingdom roster (alliances, players, ministry, kingdom status) sourced
// from the user's original Kingdom 846 portal.
// REAL public tracker data (Atlas rank, KvK rating, timeline, KvK history,
// reputation, transfers) sourced from:
//  - Kingshot Atlas: https://ks-atlas.com/kingdom/846
//  - Kingshot Optimizer timeline: https://kingshotoptimizer.com/kingdom-timeline/846
//  - Kingshot Optimizer KvK rankings: https://kingshotoptimizer.com/kvk-rankings/kingdom/846

import { tracker846 } from './tracker846'

export const kingdom = {
  id: 846,
  name: 'Kingdom 846',
  motto: "One Crown. Four Alliances. Endless Glory.",
  tagline: "Where legends are forged in fire and crowned in gold.",
  season: 'Season of the Fire Tyrant',
  // Kingdom status.
  //
  // These are FALLBACKS. The pages read the live crown from /api/king-status and
  // the rest from /api/content; what is written here only shows if one of those
  // calls fails. They had drifted badly -- the crown still named a king two
  // rotations old, and the leading alliance named SAS while RYO had held rank 1
  // in game -- so a failed request rendered a plausible-looking wrong kingdom
  // instead of an obviously broken one.
  //
  // The crown changes hands every 14 days, so this WILL go stale again. Refresh
  // it whenever you touch this file; it is a safety net, not a source of truth.
  king: 'Lovelykhaos',
  kingTitle: 'Queen',
  kingTag: '[KzK] KamikazeKarnival',
  kingAllianceSlug: 'kzk',
  leadingAlliance: '[RYO] Spiders',
  totalPower: '111,597,006,633',
  level: 100,
  // Public tracker data (real).
  //
  // These were a second, hand-typed copy of the Atlas and Optimizer figures,
  // and the copy had fallen a full KvK cycle behind the verified snapshot in
  // tracker846.js: Atlas 60.91 at rank 66 here against 66.38 at rank 33 there,
  // 7 dominations in 10 KvKs against 8 in 11, a 2.564 rating at global rank 25
  // against 2.873 at rank 15. That is the exact drift the `stats` export below
  // was already repaired for, so these read from the snapshot as well now.
  // tracker846.js is the single place a new KvK result gets typed.
  tier: tracker846.tier,
  atlasScore: tracker846.atlas.score,
  atlasRank: tracker846.atlas.rank,
  // The Atlas profile publishes this as "ranks better than N% of all
  // kingdoms"; the page states the complement.
  atlasPercentile: `Top ${100 - tracker846.atlas.percentile}%`,
  // Mystic Trial has no entry in the tracker snapshot, so it stays a literal
  // here, covered by trackerVerified like the rest of the snapshot.
  mysticScore: 186025,
  mysticRank: 259,
  mysticPercentile: 'Top 11.1%',
  transferStatus: tracker846.transfers[0].status,
  // KvK performance overview
  get kvkOverview() {
    const k = tracker846.kvk
    const share = (n) => Math.round((n / k.total) * 100)
    return {
      totalKvks: k.total,
      outcomes: [
        { label: 'Dominations', value: k.dominations, pct: k.dominationRate, icon: 'crown' },
        { label: 'Comebacks', value: k.comebacks, pct: share(k.comebacks), icon: 'refresh' },
        { label: 'Reversals', value: k.reversals, pct: share(k.reversals), icon: 'refresh' },
        { label: 'Invasions', value: k.invasions, pct: share(k.invasions), icon: 'swords' },
      ],
      prepPhase: { wins: k.prep.wins, losses: k.prep.losses, streak: k.prep.streak, winRate: `${k.prep.winRate}%`, best: k.prep.best },
      // The snapshot records a best run for the battle phase but no current
      // one; the current run is the best run until a loss ends it.
      battlePhase: { wins: k.battle.wins, losses: k.battle.losses, streak: k.battle.streak ?? k.battle.best, winRate: `${k.battle.winRate}%`, best: k.battle.best },
    }
  },
  created: '2025-08-17',
  // Kingdom age is DERIVED, not stored. It was hardcoded at 359 and had drifted
  // to twelve days stale, which is the failure mode of every snapshotted
  // counter: it is right on the day it is written and wrong every day after.
  get currentDay() {
    const start = Date.parse(this.created + 'T00:00:00Z')
    return Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1)
  },
  // The tracker figures ARE snapshots -- they come from ks-atlas and
  // kingshotoptimizer, which have no public API, and are typed once into
  // tracker846.js. This records when that snapshot was last checked, so the
  // page can say so rather than implying the numbers are live. Move it when
  // you refresh tracker846.js, not when you touch this file.
  trackerVerified: '2026-08-23',
  kvkRating: tracker846.kvk.rating,
  kvkCurrentRank: tracker846.kvk.rank,
  source: 'https://ks-atlas.com/kingdom/846',
  timelineSource: 'https://kingshotoptimizer.com/kingdom-timeline/846',
  kvkSource: 'https://kingshotoptimizer.com/kvk-rankings/kingdom/846'
}

// Kingdom hero stats.
//
// Nothing imports this today -- it is a leftover export. It is kept rather than
// deleted because the shape is useful, but it was four hardcoded strings and
// every one had drifted from tracker846.js, which the pages actually read:
// 2.564 / rank 25 here against 2.873 / rank 15 there, 7 of 10 dominations
// against 8 of 11, Atlas #66 against #33, and a different leading alliance
// than kingdom.leadingAlliance. None of that was on screen, but the moment
// someone wired this up it would have shipped stale figures beside live ones.
//
// Derived from the tracker snapshot now, so it cannot drift again: updating
// tracker846.js updates this with it.
export const stats = [
  {
    label: 'Leading Alliance',
    value: kingdom.leadingAlliance.match(/\[([^\]]+)\]/)?.[1] ?? kingdom.leadingAlliance,
    icon: 'shield',
    sub: kingdom.leadingAlliance.replace(/^\[[^\]]+\]\s*/, ''),
  },
  {
    label: 'KvK Rating',
    value: tracker846.kvk.rating.toFixed(3),
    icon: 'trophy',
    sub: `Global Rank #${tracker846.kvk.rank}`,
  },
  {
    label: 'KvK Dominations',
    value: `${tracker846.kvk.dominations}/${tracker846.kvk.total}`,
    icon: 'crown',
    sub: `${tracker846.kvk.dominationRate}% domination rate`,
  },
  {
    label: 'Atlas Rank',
    value: `#${tracker846.atlas.rank}`,
    icon: 'landmark',
    sub: tracker846.tier,
  },
]

// Recurring alliance event names, in pairs — times are set per-alliance via Admin → Alliances.
const eventScheduleTemplate = [
  { event: 'Bear Hunt -1' },
  { event: 'Bear Hunt-2' },
  { event: 'Vikings Vengeance Tuesday' },
  { event: 'Vikings Vengeance Thursday' },
  { event: 'Tri-Alliance Clash Legion-1' },
  { event: 'Tri-Alliance Clash Legion-2' },
  { event: 'Swordland Showdown Legion-1' },
  { event: 'Swordland Showdown Legion-2' }
]

// Merge saved per-alliance schedule data with the current event list, so renaming
// or adding events never orphans times already saved via Admin.
export function buildSchedule(saved) {
  return eventScheduleTemplate.map((t) => {
    const match = (saved || []).find((s) => s.event === t.event)
    return { event: t.event, time: match?.time || '' }
  })
}

// Alliance event schedules (UTC times)
const SCHEDULE_DEFAULT = [
  { event: 'Bear Hunt -1', time: '04:00' },
  { event: 'Bear Hunt-2', time: '12:00' },
  { event: 'Vikings Vengeance Tuesday', time: '16:00' },
  { event: 'Vikings Vengeance Thursday', time: '16:00' },
  { event: 'Tri-Alliance Clash Legion-1', time: '20:00' },
  { event: 'Tri-Alliance Clash Legion-2', time: '20:00' },
  { event: 'Swordland Showdown Legion-1', time: '21:00' },
  { event: 'Swordland Showdown Legion-2', time: '21:00' }
]
const SCHEDULE_ICE = [
  { event: 'Bear Hunt -1', time: '14:00' },
  { event: 'Bear Hunt-2', time: '22:00' },
  { event: 'Vikings Vengeance Tuesday', time: '02:00' },
  { event: 'Vikings Vengeance Thursday', time: '02:00' },
  { event: 'Tri-Alliance Clash Legion-1', time: '06:00' },
  { event: 'Tri-Alliance Clash Legion-2', time: '06:00' },
  { event: 'Swordland Showdown Legion-1', time: '07:00' },
  { event: 'Swordland Showdown Legion-2', time: '07:00' }
]

// Real alliances (4) — from the user's Kingdom 846 portal.
export const alliances = [
  {
    rank: 1, tag: '[RYO]', name: 'Spiders', power: '31,734,600,086', color: 'gold',
    leader: 'Shoni', members: 312, lang: 'English', slug: 'ryo',
    tagline: 'First to muster, last to fall back.',
    desc: "The kingdom's founding alliance and current Castle leadership. Deep veteran core, strongest rally coordination in 846, and the backbone of every KVK matchmaking push.",
    art: './assets/banner-spiders.webp',
    schedule: SCHEDULE_DEFAULT
  },
  {
    rank: 2, tag: '[KzK]', name: 'KamikazeKarnival', power: '23,589,950,586', color: 'violet',
    leader: 'Lovely Khaos', members: 288, lang: 'English & Turkish', slug: 'kzk',
    tagline: 'Loud, fast, and impossible to ignore.',
    desc: 'A high-tempo alliance built around aggressive rallying and constant event turnout. Known for filling every Bear Trap slot and never missing a Fire Tyrant window.',
    art: './assets/banner-kamilkaze.webp',
    schedule: SCHEDULE_DEFAULT
  },
  {
    rank: 3, tag: '[SAS]', name: 'SaintsAndSinners', power: '23,057,797,350', color: 'crimson',
    leader: 'Lady Charlotte', members: 265, lang: 'English', slug: 'sas',
    tagline: 'Discipline on the field, chaos in Discord.',
    desc: 'A tightly organized alliance with a strong internal ranking system and rotating rally leads. Reliable second wave on every Castle Battle.',
    art: './assets/banner-saints-sinners.webp',
    schedule: SCHEDULE_DEFAULT
  },
  {
    rank: 4, tag: '[ICE]', name: 'IceHunters', power: '19,215,658,611', color: 'blue',
    leader: 'Dunngeon', members: 201, lang: 'English & Chinese', slug: 'ice',
    tagline: "The kingdom's night shift, always awake.",
    desc: 'A largely Asia-Pacific alliance that keeps 846 covered around the clock. Smaller roster, outsized presence in every off-hours event.',
    art: './assets/banner-icehunters.webp',
    schedule: SCHEDULE_ICE
  }
]

// Top players — seed data for Hall of Legends display.
// Leaders can upload real rosters via the Leader Portal to replace this.
export const AVATAR_OPTIONS = [
  'king', 'queen', 'warrior', 'knight', 'mage', 'shieldmaiden', 'sorceress', 'archer', 'berserker', 'spartan'
]

export const players = [
  { rank: 1, name: 'SpartanWarrior', tag: '[RYO]', slug: 'ryo', alliance: 'Spiders', avatar: 'spartan' },
  { rank: 2, name: 'DragonSlayer', tag: '[KzK]', slug: 'kzk', alliance: 'KamikazeKarnival', avatar: 'berserker' },
  { rank: 3, name: 'IronFist', tag: '[SAS]', slug: 'sas', alliance: 'SaintsAndSinners', avatar: 'warrior' },
  { rank: 4, name: 'FrostBite', tag: '[ICE]', slug: 'ice', alliance: 'IceHunters', avatar: 'knight' },
  { rank: 5, name: 'ShadowBlade', tag: '[RYO]', slug: 'ryo', alliance: 'Spiders', avatar: 'archer' },
]


// Kingdom Chronicle — derived from REAL timeline milestones and KvK results.
export const news = [
  {
    id: 'anniv-approaching',
    title: 'Kingdom 846 approaches its First Anniversary',
    category: 'ANNIVERSARY',
    date: 'Aug 10, 2026',
    excerpt: 'Founded August 17, 2025, the kingdom reaches Day 359. Anniversary milestone unlocks August 16, 2026.',
    body: 'Kingdom 846 was founded on August 17, 2025. The First Anniversary milestone unlocks on August 16, 2026, followed immediately by Generation 6 Heroes and Pets on August 17. Anniversary rewards and a kingdom-wide celebration are expected.',
    source: kingdom.timelineSource
  },
  {
    id: 'gen6-heroes',
    title: 'Generation 6 Heroes unlock next week — Triton, Sophia, Yang',
    category: 'HEROES',
    date: 'Aug 10, 2026',
    excerpt: 'A new hero generation becomes available August 17, alongside Generation 6 Pets (Regal White Lion, Ironclad War Elephant).',
    body: 'Generation 6 Heroes (Triton, Sophia, Yang) unlock on August 17, 2026, alongside Generation 6 Pets (Regal White Lion, Ironclad War Elephant). Commanders should prepare recruitment and bonding resources.',
    source: kingdom.timelineSource
  },
  {
    id: 'flamedragon',
    title: 'First Flamedragon Tyrant Competition begins August 30',
    category: 'PVP',
    date: 'Aug 10, 2026',
    excerpt: 'A new competitive world-boss event opens. Prepare anti-burn gear and rally compositions.',
    body: 'The First Flamedragon Tyrant Competition begins August 30, 2026. Rallies should prepare anti-burn loadouts and optimized march compositions for the world-boss damage race.',
    source: kingdom.timelineSource
  },
  {
    id: 'kvk16-recap',
    title: 'KvK 16 concludes vs K623 — Prep won, Battle lost',
    category: 'KVK',
    date: 'Jul 18, 2026',
    excerpt: 'Kingdom 846 faced its toughest opponent (#5 ranked K623, match quality 5.75). Preparation phase won, battle phase lost.',
    body: 'KvK 16 (July 18, 2026) pitted Kingdom 846 against K623, ranked #5 globally — the toughest matchup in the kingdom\'s history at match quality 5.75. Kingdom 846 won the preparation phase but lost the battle phase. Overall KvK record stands at 8-2 prep and 8-2 battle across 10 KvKs, with a 2.564 rating and global rank #25.',
    source: kingdom.kvkSource
  },
  {
    id: 'masters-unlocked',
    title: '5th & 6th Masters unlocked',
    category: 'FEATURE',
    date: 'Jul 20, 2026',
    excerpt: 'The kingdom unlocked its fifth and sixth Masters on July 20, 2026.',
    body: 'On July 20, 2026, Kingdom 846 unlocked its fifth and sixth Masters, expanding the available Master roster for combat formations.',
    source: kingdom.timelineSource
  }
]

// Generic strategy library (real Kingshot concepts) with real guide content.
export const guides = [
  {
    id: 'kvk-prep', title: 'KvK Preparation Checklist', category: 'Strategy', art: './assets/art-kvk-prep.webp', read: '6 min',
    excerpt: 'What to save, when to spend, and how top kingdoms prepare for Kingdom of Power battles.',
    body: [
      '2 weeks before KvK: Stop spending speedups on anything non-essential. Stockpile troop training speedups, construction speedups, and research speedups.',
      '1 week before: Confirm your rally march composition with your alliance leader. Ensure your top 3 heroes are geared and leveled. Stockpile resources (food, wood, stone, gold) — you will need them for healing and reinforcing.',
      'Prep phase (Day 1-3): Focus entirely on earning prep points — complete personal prep quests, donate to alliance prep tech, and participate in all prep events. Every point counts toward the prep phase victory.',
      'Battle phase (Day 4-7): Coordinate rally timing with your alliance. Join every castle battle. Use your speedups strategically — don\'t blow all healing at once. Watch the scoreboard and adjust your strategy based on enemy movements.',
      'Post-KvK: Immediately start saving for the next one. The kingdom that prepares earliest wins most often.',
    ].join('\n\n')
  },
  {
    id: 'nap-rules', title: 'NAP Rules & Royal Decrees', category: 'Diplomacy', art: './assets/art-nap-rules.webp', read: '5 min',
    excerpt: 'How non-aggression pacts are registered, tracked, and enforced across the season.',
    body: [
      'A NAP (Non-Aggression Pact) is a formal agreement between alliances not to attack each other. NAPs are typically established at the kingdom level by the King and leading alliances.',
      'NAP Registration: NAPs are registered with the Kingdom 846 leadership. The King or a Chief Minister records the NAP in the kingdom diplomacy channel, including the allied alliance tag, duration, and any special terms.',
      'Royal Decrees: The King can issue Royal Decrees that apply to the entire kingdom. These include mandatory NAPs during KvK prep, rally coordination orders, and resource-sharing agreements.',
      'Enforcement: Violations of a NAP are handled by the King and leadership. Repeated violations can result in being kicked from the kingdom or being targeted in the next Castle Battle.',
      'Always check the current NAP list before attacking an unknown target. When in doubt, ask in the kingdom Discord.',
    ].join('\n\n')
  },
  {
    id: 'bear-trap', title: 'Bear Hunt Rally Guide', category: 'PvE', art: './assets/art-bear-trap.webp', artPosition: '50% 15%', read: '6 min',
    excerpt: 'Optimal trap formations and reward-maximizing math for the bear hunt.',
    body: [
      'The Bear Hunt is a PvE event where alliances rally to defeat a bear boss. Higher damage means better rewards for all participants.',
      'Formation: Use your strongest infantry and cavalry heroes in the rally. The bear has high defense, so bring heroes with armor-piercing or damage-amplification skills.',
      'Rally Timing: Join rallies as soon as they appear. Full rallies do significantly more damage than partial ones. Coordinate with your alliance to stagger rally starts so everyone can participate.',
      'Stamina: Save stamina potions for Bear Hunt days. Each rally costs stamina, and running out early means missing reward tiers.',
      'Rewards: Damage milestones award progressively better gear materials, speedups, and resources. Alliance total damage also unlocks shared chests.',
      'Pro tip: Don\'t launch solo attacks during the event — rally damage is always more efficient per stamina spent.',
    ].join('\n\n')
  },
  {
    id: 'castle-battle', title: 'Castle Battle Tactics', category: 'PvP', art: './assets/art-castle-battle.webp', read: '8 min',
    excerpt: 'Rally timing, garrison swaps, and reinforcement discipline for castle fights.',
    body: [
      'Castle Battles are won by coordination, not individual power. The strongest kingdom can lose if rallies are mistimed or reinforcements are slow.',
      'Rally Leaders: Designate 2-3 primary rally leaders before the battle. Everyone else should join their rallies rather than launching competing ones.',
      'Garrison Management: Keep your strongest defender in the castle at all times. Rotate garrison leaders when their troops drop below 60% to avoid a sudden collapse.',
      'Reinforcement Discipline: Send your best troops to the castle, not your entire march. Keep enough troops home to join offensive rallies.',
      'Timing: Coordinate rally launches so multiple attacks land within a 5-second window. This prevents the enemy from healing between hits.',
      'Communication: Use voice chat during castle battles. Text chat is too slow for real-time rally coordination.',
    ].join('\n\n')
  },
  {
    id: 'transfer-guide', title: 'Transfer Season Guide', category: 'Kingdom', art: './assets/art-transfer.webp', read: '5 min',
    excerpt: 'How transfer groups, invitations, and kingdom capacity work.',
    body: [
      'Transfer events allow players to move between kingdoms during designated windows. Each kingdom is assigned to a Transfer Group based on age and power.',
      'Eligibility: Your account must meet the power requirements for the destination kingdom. High-power players may require a Special Invitation from the King.',
      'Invitations: Kingdom leadership receives a limited number of Special Invitations each transfer season. These are reserved for players who will strengthen the kingdom roster.',
      'Before Transferring: Contact Kingdom 846 leadership on Discord. Do not transfer without approval — alliance spots and event schedules need to be coordinated.',
      'After Arrival: Join your assigned alliance immediately, update your in-game name/tag if required, and introduce yourself in the kingdom Discord.',
    ].join('\n\n')
  },
  {
    id: 'hero-meta', title: 'Hero & Formation Meta', category: 'Combat', art: './assets/art-hero-meta.webp', read: '7 min',
    excerpt: 'Building balanced marches and adapting to current hero generations.',
    body: [
      'A balanced march uses heroes whose skills complement each other. Don\'t just pick your three highest-power heroes — synergy matters more.',
      'Infantry Heroes: Best for absorbing damage and holding positions. Prioritize defense, health, and damage-reduction skills.',
      'Cavalry Heroes: Excel at burst damage and mobility. Pair with heroes that boost attack speed or critical hit chance.',
      'Archer/Ranged Heroes: Provide sustained damage from the back line. Protect them with strong infantry in the front.',
      'Hero Generations: New generations are generally stronger, but a fully-upgraded older hero can outperform a low-star new one. Finish your current heroes before investing in new ones.',
      'Pet Pairings: Don\'t forget pets. Some pets provide passive buffs that complement specific hero skills. Match your pet to your hero composition for maximum effect.',
      'Counter-Picking: In KvK, pay attention to what the enemy is fielding. If they are running infantry-heavy marches, counter with cavalry. Adaptability wins battles.',
    ].join('\n\n')
  }
]

// Featured upcoming events — derived from the real timeline. Kept empty
// until fresh dated events are available; stale past-dated entries should
// never sit here since buildUpcoming() surfaces them as "upcoming".
export const events = []

// Kingdom milestone timeline — sourced from kingshotoptimizer.com/kingdom-timeline/846
export const timeline = [
  { name: 'Generation 1 Heroes', date: '2025-08-17', category: 'Heroes', status: 'past' },
  { name: 'First Hall of Governors (HoG)', date: '2025-08-22', category: 'Feature', status: 'past' },
  { name: 'First Sanctuary Competition', date: '2025-08-23', category: 'PvP', status: 'past' },
  { name: 'Plains Fog Cleared', date: '2025-08-30', category: 'Feature', status: 'past' },
  { name: 'First Fortress Competition', date: '2025-09-10', category: 'PvP', status: 'past' },
  { name: 'Hero Gear Reforge Unlocked', date: '2025-09-13', category: 'Feature', status: 'past' },
  { name: 'Generation 2 Heroes (Zoe, Hilde, Marlin)', date: '2025-09-22', category: 'Heroes', status: 'past' },
  { name: 'Fertile Land Fog Cleared', date: '2025-09-24', category: 'Feature', status: 'past' },
  { name: 'Alliance Resource Exchange Unlocks', date: '2025-09-30', category: 'Feature', status: 'past' },
  { name: 'First Castle Competition', date: '2025-10-09', category: 'PvP', status: 'past' },
  { name: 'Generation 1 Pets (Gray Wolf, Lynx, Bison)', date: '2025-10-10', category: 'Pets', status: 'past' },
  { name: 'Age of Truegold', date: '2025-10-25', category: 'Truegold', status: 'past' },
  { name: 'Generation 2 Pets (Cheetah, Moose)', date: '2025-10-27', category: 'Pets', status: 'past' },
  { name: 'Mystic Trial Unlocked', date: '2025-10-28', category: 'Feature', status: 'past' },
  { name: 'First KvK Prep Starts', date: '2025-11-03', category: 'PvP', status: 'past' },
  { name: 'First KvK Castle Competition', date: '2025-11-08', category: 'PvP', status: 'past' },
  { name: 'First Alliance Brawl', date: '2025-11-10', category: 'PvP', status: 'past' },
  { name: 'Generation 3 Heroes (Eric, Petra, Jaeger)', date: '2025-11-24', category: 'Heroes', status: 'past' },
  { name: 'Generation 3 Pets (Lion, Grizzly Bear)', date: '2025-11-24', category: 'Pets', status: 'past' },
  { name: 'Gov Gear Material Exchange Unlocks', date: '2025-12-28', category: 'Feature', status: 'past' },
  { name: 'Truegold 5', date: '2026-01-05', category: 'Truegold', status: 'past' },
  { name: 'Gov Charm Material Exchange Unlocked', date: '2026-01-05', category: 'Feature', status: 'past' },
  { name: 'Governor Charm Cap Raised', date: '2026-02-02', category: 'Feature', status: 'past' },
  { name: 'Generation 4 Heroes (Alcar, Margot, Rosa)', date: '2026-02-16', category: 'Heroes', status: 'past' },
  { name: 'Generation 4 Pets (Giant Rhino, Mighty Bison)', date: '2026-02-16', category: 'Pets', status: 'past' },
  { name: 'War Academy Unlocked', date: '2026-03-16', category: 'Feature', status: 'past' },
  { name: 'Masters Unlocked (Valora, Pan, Roman)', date: '2026-04-27', category: 'Feature', status: 'past' },
  { name: 'Generation 5 Heroes (Long Fei, Thrud, Vivian)', date: '2026-05-11', category: 'Heroes', status: 'past' },
  { name: 'Generation 5 Pets (Great Moose, Alpha Black Panther)', date: '2026-05-11', category: 'Pets', status: 'past' },
  { name: '4th Master Unlocked (Cassia)', date: '2026-05-25', category: 'Feature', status: 'past' },
  { name: 'Truegold 8 — Tempered Truegold', date: '2026-06-22', category: 'Truegold', status: 'past' },
  { name: '5th & 6th Masters Unlocked', date: '2026-07-20', category: 'Feature', status: 'past' },
  { name: 'First Anniversary', date: '2026-08-16', category: 'Anniversary', status: 'past', art: './assets/art-season-opening.webp' },
  { name: 'Generation 6 Heroes (Triton, Sophia, Yang)', date: '2026-08-17', category: 'Heroes', status: 'past' },
  { name: 'Generation 6 Pets (Regal White Lion, Ironclad War Elephant)', date: '2026-08-17', category: 'Pets', status: 'past' },
  { name: 'First Flamedragon Tyrant Competition', date: '2026-08-30', category: 'PvP', status: 'past', art: './assets/art-fire-tyrant.webp' },
  { name: 'Generation 7 Heroes (Wee & Woo, Ava, Charles)', date: '2026-11-09', category: 'Heroes', status: 'future' },
  { name: 'Generation 7 Pets (Ironclad War Bear)', date: '2026-11-09', category: 'Pets', status: 'future' },
  { name: 'Advanced Truegold Research', date: '2026-12-21', category: 'Truegold', status: 'future' },
  { name: 'Generation 8 Heroes', date: '2027-02-01', category: 'Heroes', status: 'predicted' },
  { name: 'Generation 9 Heroes', date: '2027-04-26', category: 'Heroes', status: 'predicted' },
  { name: 'Truegold 10', date: '2027-06-07', category: 'Truegold', status: 'future' }
]

// KvK history — the verified snapshot in tracker846.js, which is where a new
// KvK result gets typed.
//
// This was a second copy of the same table, and the two disagreed twice over:
// it stopped at KvK 16 while the snapshot already carried KvK 17, and it
// recorded different figures for matches both of them listed (KvK 16's
// opponent at rank 5 and quality 5.75 here against rank 11 and quality 5.93
// there). Copied rather than shared, a table can only drift.
export const kvkHistory = [...tracker846.kvk.history]

export const kvkStats = {
  total: tracker846.kvk.total,
  dominations: tracker846.kvk.dominations,
  comebacks: tracker846.kvk.comebacks,
  reversals: tracker846.kvk.reversals,
  prepRecord: tracker846.kvk.prep.record,
  prepWinRate: tracker846.kvk.prep.winRate,
  prepStreak: tracker846.kvk.prep.streak,
  battleRecord: tracker846.kvk.battle.record,
  battleWinRate: tracker846.kvk.battle.winRate,
  battleBestStreak: tracker846.kvk.battle.best,
  rating: tracker846.kvk.rating,
  currentRank: tracker846.kvk.rank,
}

// Transfer windows.
//
// The closed windows are the verified snapshot. #8 is the announced window,
// which the snapshot cannot carry because it has not happened yet -- and its
// status was written as a bare 'Upcoming', which is a label with an expiry
// date on it: correct until the window opens and wrong every day after. The
// window's own dates decide it now, the same way hasPassed() rather than a
// frozen `status` string decides whether a timeline milestone is past.
//
// `endsAfter` is the first day the window is over -- midnight following its
// last day -- because hasPassed() turns true at the start of the date it is
// given, and a window is still open on its closing day.
const transfer8 = { transfer: 8, date: 'Sep 13–19, 2026', group: '—', opens: '2026-09-13', endsAfter: '2026-09-20' }

export const transfers = [
  {
    transfer: transfer8.transfer,
    date: transfer8.date,
    group: transfer8.group,
    status: hasPassed(transfer8.endsAfter) ? 'Closed' : hasPassed(transfer8.opens) ? 'Open' : 'Upcoming',
    upcoming: !hasPassed(transfer8.endsAfter),
  },
  ...tracker846.transfers,
]

// Ratings from the verified snapshot; the review texts are only on the
// Optimizer profile, so they stay written out here.
export const reputation = {
  ...tracker846.reputation,
  reviewList: [
    { rating: 5.0, time: '4 months ago', text: 'Fun KvK match. Very organized castle battle and easy to get along with.' },
    { rating: 5.0, time: '3 months ago', text: 'The people were nice. It was a fun kvk' }
  ]
}

// Helper: given an original rotation date and a cycle length (in days),
// roll forward in whole cycles until we land on the next upcoming date.
// This keeps a recurring countdown (e.g. "crown rotates every 14 days")
// correct forever, instead of freezing once the original date passes.
export function nextRecurringDate(anchorIso, cycleDays) {
  const cycleMs = cycleDays * 86400000
  const anchor = new Date(anchorIso + 'T00:00:00').getTime()
  const now = Date.now()
  if (anchor >= now) return anchorIso
  const cyclesElapsed = Math.ceil((now - anchor) / cycleMs)
  const next = new Date(anchor + cyclesElapsed * cycleMs)
  return next.toISOString().slice(0, 10)
}

// Helper: live countdown to a future ISO date from "now"
export function countdownTo(iso) {
  const target = new Date(iso + 'T00:00:00').getTime()
  const now = Date.now()
  let diff = target - now
  if (diff < 0) diff = 0
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return { days, hours, mins, secs, total: diff }
}

// Whether a timeline/event date has actually occurred yet. Milestone `status`
// strings ('upcoming', 'future', 'predicted') are hand-authored and go stale
// the moment their date passes -- this is the ground truth every consumer
// should defer to instead of trusting a frozen label, the same way
// countdownTo/nextRecurringDate never freeze once their anchor date passes.
export function hasPassed(iso) {
  return new Date(iso + 'T00:00:00').getTime() < Date.now()
}

// Shared alliance banner lookup (used by Dashboard, Rankings, Transfer, etc.)
export const BANNERS = {
  ryo: './assets/banner-spiders.webp',
  kzk: './assets/banner-kamilkaze.webp',
  sas: './assets/banner-saints-sinners.webp',
  ice: './assets/banner-icehunters.webp',
}

export const nav = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'about', label: 'About Kingdom', icon: 'crown' },
  { id: 'alliances', label: 'Alliances', icon: 'shield' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'timeline', label: 'Timeline', icon: 'clock' },
  { id: 'news', label: 'News', icon: 'newspaper' },
  { id: 'guides', label: 'Guides', icon: 'book' },
  { id: 'rankings', label: 'Rankings', icon: 'trophy' },
  { id: 'transfer', label: 'Transfer', icon: 'transfer' },
  { id: 'apply', label: 'Apply', icon: 'scroll' }
]
