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

// Share of all KvKs run, as a whole percentage -- the outcome tiles used to
// carry both the count and a percentage typed beside it, which is two chances
// to be wrong instead of one.
const sharePct = (n) => Math.round((n / tracker846.kvk.total) * 100)

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
  //
  // Read off the live portal on 2026-09-13, where the crown had already moved
  // on from Queen Lovelykhaos of KzK: the Sep 12 rotation took it to RYO. The
  // next one is Sep 26, which is when these four lines start lying again.
  king: 'Nomnomnom',
  kingTitle: 'High King',
  kingTag: '[RYO] Spiders',
  kingAllianceSlug: 'ryo',
  leadingAlliance: '[RYO] Spiders',
  totalPower: '111,597,006,633',
  level: 100,
  // Public tracker data (real). Everything the Atlas snapshot already carries
  // is read from it; a second hand-typed copy is just a second thing to forget.
  // The mystic figures have no entry in tracker846.js, so they stay written out
  // here -- read off the Atlas header on 2026-09-13 with the rest.
  tier: tracker846.tier,
  atlasScore: tracker846.atlas.score,
  atlasRank: tracker846.atlas.rank,
  atlasPercentile: `Top ${(100 - tracker846.atlas.percentile).toFixed(1)}%`,
  mysticScore: 198614,
  mysticRank: 250,
  mysticPercentile: 'Top 10.3%',
  transferStatus: tracker846.transfers[0]?.status ?? 'Ordinary',
  // KvK performance overview -- read off the tracker snapshot, not typed again.
  // This block held its own copy of every figure and all of them had fallen a
  // KvK behind: 10 KvKs against 11, 7 dominations against 8, an 8-2 record
  // against 9-2. Derived, it cannot disagree with the page beside it.
  kvkOverview: {
    totalKvks: tracker846.kvk.total,
    outcomes: [
      { label: 'Dominations', value: tracker846.kvk.dominations, pct: sharePct(tracker846.kvk.dominations), icon: 'crown' },
      { label: 'Comebacks', value: tracker846.kvk.comebacks, pct: sharePct(tracker846.kvk.comebacks), icon: 'refresh' },
      { label: 'Reversals', value: tracker846.kvk.reversals, pct: sharePct(tracker846.kvk.reversals), icon: 'refresh' },
      { label: 'Invasions', value: tracker846.kvk.invasions, pct: sharePct(tracker846.kvk.invasions), icon: 'swords' },
    ],
    prepPhase: {
      wins: tracker846.kvk.prep.wins,
      losses: tracker846.kvk.prep.losses,
      streak: tracker846.kvk.prep.streak,
      winRate: `${tracker846.kvk.prep.winRate}%`,
      best: tracker846.kvk.prep.best,
    },
    battlePhase: {
      wins: tracker846.kvk.battle.wins,
      losses: tracker846.kvk.battle.losses,
      streak: tracker846.kvk.battle.streak,
      winRate: `${tracker846.kvk.battle.winRate}%`,
      best: tracker846.kvk.battle.best,
    },
  },
  created: '2025-08-17',
  // Kingdom age is DERIVED, not stored. It was hardcoded at 359 and had drifted
  // to twelve days stale, which is the failure mode of every snapshotted
  // counter: it is right on the day it is written and wrong every day after.
  get currentDay() {
    const start = Date.parse(this.created + 'T00:00:00Z')
    return Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1)
  },
  // The tracker figures below ARE snapshots -- they come from ks-atlas and
  // kingshotoptimizer, which have no public API. This records when they were
  // last checked so the page can say so rather than implying they are live.
  trackerVerified: tracker846.kvk.verified,
  atlasVerified: tracker846.atlas.verified,
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

// Mystic Trial — top 15 by total stages cleared, read off the in-game board.
//
// These are real governors, not the five invented names that stood here before
// (SpartanWarrior, DragonSlayer, IronFist and the rest were placeholders, and a
// Hall of Legends full of people who do not exist is worse than an empty one).
//
// On the alliance column: the in-game board carries tags from outside 846's four
// alliances -- THB, CWW, WEB, CGF, ATA -- because the Trial board is not scoped
// to one kingdom's alliance list. They are filed the way the kingdom asked:
// SAS to SAS, ICE to ICE, KzK to KzK, everyone else to RYO. The tag shown is
// therefore the 846 alliance they are filed under, not the tag they wear in the
// game.
//
// `stages` is the board's own Total Stages figure. An uploaded roster has no
// such number, so the board falls back to showing position when it is absent.
export const players = [
  { rank: 1,  name: 'MM27',           stages: 3278, tag: '[RYO]', slug: 'ryo', alliance: 'Spiders',           avatar: 'king' },
  { rank: 2,  name: 'Cozy',           stages: 3264, tag: '[ICE]', slug: 'ice', alliance: 'IceHunters',        avatar: 'sorceress' },
  { rank: 3,  name: 'Corgi ツ',        stages: 3234, tag: '[RYO]', slug: 'ryo', alliance: 'Spiders',           avatar: 'mage' },
  { rank: 4,  name: 'NomNomNom',      stages: 3173, tag: '[RYO]', slug: 'ryo', alliance: 'Spiders',           avatar: 'archer' },
  { rank: 5,  name: 'LittleMithril',  stages: 3024, tag: '[KzK]', slug: 'kzk', alliance: 'KamikazeKarnival',  avatar: 'berserker' },
  { rank: 6,  name: 'Peanuts',        stages: 3005, tag: '[SAS]', slug: 'sas', alliance: 'SaintsAndSinners',  avatar: 'knight' },
  { rank: 7,  name: 'TegarXRhukus',   stages: 2889, tag: '[KzK]', slug: 'kzk', alliance: 'KamikazeKarnival',  avatar: 'warrior' },
  { rank: 8,  name: 'Goaty',          stages: 2864, tag: '[ICE]', slug: 'ice', alliance: 'IceHunters',        avatar: 'shieldmaiden' },
  { rank: 9,  name: 'Spartan',        stages: 2838, tag: '[RYO]', slug: 'ryo', alliance: 'Spiders',           avatar: 'spartan' },
  { rank: 10, name: 'Armageddon',     stages: 2831, tag: '[SAS]', slug: 'sas', alliance: 'SaintsAndSinners',  avatar: 'anonymous' },
  { rank: 11, name: 'Toad You So',    stages: 2760, tag: '[SAS]', slug: 'sas', alliance: 'SaintsAndSinners',  avatar: 'panini' },
  { rank: 12, name: 'Frog',           stages: 2738, tag: '[KzK]', slug: 'kzk', alliance: 'KamikazeKarnival',  avatar: 'mage' },
  { rank: 13, name: 'Chom ツ',         stages: 2729, tag: '[RYO]', slug: 'ryo', alliance: 'Spiders',           avatar: 'queen' },
  { rank: 14, name: 'MemoryFull',     stages: 2701, tag: '[SAS]', slug: 'sas', alliance: 'SaintsAndSinners',  avatar: 'sorceress' },
  { rank: 15, name: 'MightyJayChub',  stages: 2690, tag: '[RYO]', slug: 'ryo', alliance: 'Spiders',           avatar: 'archer' },
]


// Kingdom Chronicle — derived from REAL timeline milestones and KvK results.
//
// Every headline here was written in the future tense about something that has
// since happened: the anniversary was "approaching" a month after the kingdom
// passed it, Generation 6 unlocked "next week" in mid-August, and the newest
// item on the page was a KvK recap two KvKs old that quoted a record the
// tracker had already moved past. A chronicle that talks about last month as
// though it were next week reads as abandoned even when the rest of the site
// is live.
//
// Running totals are interpolated from tracker846.js rather than typed into the
// prose, so a recap cannot outlive the record it cites.
const chronicle = [
  {
    id: 'masters-7-8',
    title: '7th & 8th Masters unlock September 14',
    category: 'FEATURE',
    date: 'Sep 13, 2026',
    excerpt: 'Two more Master slots open tomorrow, eight weeks after the 5th and 6th.',
    body: 'The kingdom\'s 7th and 8th Masters unlock on September 14, 2026, following the 5th and 6th on July 20. Two more slots to fill means two more formations worth planning before the next KvK cycle.',
    source: kingdom.timelineSource
  },
  {
    id: 'kvk18-recap',
    title: `KvK ${tracker846.kvk.latest.kvk} swept against ${tracker846.kvk.latest.opponent}`,
    category: 'KVK',
    date: 'Sep 12, 2026',
    excerpt: `Prep and battle both won. ${tracker846.kvk.prep.record} in prep, ${tracker846.kvk.battle.record} in battle, and the rating climbs to ${tracker846.kvk.rating.toFixed(3)} at global rank #${tracker846.kvk.rank}.`,
    body: `KvK ${tracker846.kvk.latest.kvk} (September 12, 2026) matched Kingdom 846 against ${tracker846.kvk.latest.opponent}, ranked #${tracker846.kvk.latest.opponentRank} globally, at match quality ${tracker846.kvk.latest.quality}. Both phases were won, and the preparation streak reaches ${tracker846.kvk.prep.streak}.\n\nAcross ${tracker846.kvk.total} KvKs that makes ${tracker846.kvk.prep.record} in preparation and ${tracker846.kvk.battle.record} in battle, with ${tracker846.kvk.dominations} dominations — a ${tracker846.kvk.dominationRate}% domination rate. The rating stands at ${tracker846.kvk.rating.toFixed(3)} for global rank #${tracker846.kvk.rank}.`,
    source: kingdom.kvkSource
  },
  {
    id: 'flamedragon',
    title: 'First Flamedragon Tyrant Competition opens',
    category: 'PVP',
    date: 'Aug 30, 2026',
    excerpt: 'The kingdom\'s first Flamedragon Tyrant Competition began August 30 — a world-boss damage race.',
    body: 'The First Flamedragon Tyrant Competition began on August 30, 2026. It is a world-boss damage race: anti-burn loadouts and optimised march compositions decide placement, and rally timing decides the rest.',
    source: kingdom.timelineSource
  },
  {
    id: 'gen6-live',
    title: 'Generation 6 Heroes and Pets are live',
    category: 'HEROES',
    date: 'Aug 17, 2026',
    excerpt: 'Triton, Sophia and Yang arrived on August 17, alongside the Regal White Lion and the Ironclad War Elephant.',
    body: 'Generation 6 Heroes — Triton, Sophia and Yang — unlocked on August 17, 2026, together with Generation 6 Pets (Regal White Lion, Ironclad War Elephant).\n\nRecruitment and bonding resources spend hard on a new generation; commanders who banked through the anniversary window are the ones fielding them first.',
    source: kingdom.timelineSource
  },
  {
    id: 'first-anniversary',
    title: 'Kingdom 846 marks its First Anniversary',
    category: 'ANNIVERSARY',
    date: 'Aug 17, 2026',
    excerpt: 'Founded August 17, 2025. The anniversary milestone unlocked August 16, and Generation 6 landed the day after.',
    body: 'Kingdom 846 was founded on August 17, 2025. The First Anniversary milestone unlocked on August 16, 2026, with Generation 6 Heroes and Pets following on the 17th — the kingdom\'s first birthday and its sixth hero generation inside a single day.',
    source: kingdom.timelineSource
  },
  {
    id: 'kvk17-recap',
    title: 'KvK 17 taken in both phases against K795',
    category: 'KVK',
    date: 'Aug 15, 2026',
    excerpt: 'Prep and battle both won, at match quality 4.36 — the start of the run the kingdom is still on.',
    body: 'KvK 17 (August 15, 2026) matched Kingdom 846 against K795 at match quality 4.36. Both phases were won.\n\nIt opened the run the kingdom is still on: no phase lost in either KvK since.',
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
  },
  {
    id: 'kvk16-recap',
    title: 'KvK 16 split against K623 — prep won, battle lost',
    category: 'KVK',
    date: 'Jul 18, 2026',
    excerpt: `The toughest matchup in the kingdom's history by match quality (${tracker846.kvk.toughest.quality}). The preparation phase was won; the battle phase was not.`,
    body: `KvK 16 (July 18, 2026) put Kingdom 846 against ${tracker846.kvk.toughest.opponent}, ranked #${tracker846.kvk.toughest.opponentRank} globally, at match quality ${tracker846.kvk.toughest.quality} — the hardest draw in the kingdom's history. Preparation was won and the battle phase was lost.\n\nIt is the last phase the kingdom has dropped: every KvK since has been taken in both.`,
    source: kingdom.kvkSource
  }
]

// Newest first, sorted rather than arranged by hand. The page renders the array
// in order, and the last edit left a September recap sitting below an August
// one because the new entry went in where the old one had been.
export const news = [...chronicle].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

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
  { name: 'Generation 6 Heroes (Triton, Sophia, Yang)', date: '2026-08-17', category: 'Heroes', status: 'past' },
  { name: 'Generation 6 Pets (Regal White Lion, Ironclad War Elephant)', date: '2026-08-17', category: 'Pets', status: 'past' },
  { name: 'First Flamedragon Tyrant Competition', date: '2026-08-30', category: 'PvP', status: 'past', art: './assets/art-fire-tyrant.webp' },
  { name: '7th & 8th Masters Unlocked', date: '2026-09-14', category: 'Feature', status: 'upcoming', featured: true },
  { name: 'Generation 7 Heroes (Wee & Woo, Ava, Charles)', date: '2026-11-09', category: 'Heroes', status: 'future' },
  { name: 'Generation 7 Pets (Ironclad War Bear)', date: '2026-11-09', category: 'Pets', status: 'future' },
  { name: 'Advanced Truegold Research', date: '2026-12-21', category: 'Truegold', status: 'future' },
  { name: 'Generation 8 Heroes', date: '2027-02-01', category: 'Heroes', status: 'predicted' },
  { name: 'Generation 9 Heroes', date: '2027-04-26', category: 'Heroes', status: 'predicted' },
  { name: 'Truegold 10', date: '2027-06-07', category: 'Truegold', status: 'future' }
]

// KvK history and totals.
//
// These were a second, hand-typed copy of what tracker846.js already holds,
// and the two had drifted apart on every figure that matters: 10 KvKs here
// against 11 there, rating 2.564 against 2.873, global rank #25 against #15,
// and a different opponent rank and match quality on every single run. The
// pages read the tracker; this copy fed the content API, so the same kingdom
// could be described two ways depending on which one answered first.
//
// Projected from the snapshot now. Update tracker846.js and these follow.
export const kvkHistory = tracker846.kvk.history.map((run) => ({ ...run }))

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
  currentRank: tracker846.kvk.rank
}

// Transfer events, from the tracker snapshot.
//
// The window for the current one is the only thing added here. Atlas records a
// transfer's GROUP and its status ('Leading', 'Ordinary'); it does not say
// whether the doors are open right now, and that was written out as the fixed
// string 'Upcoming' -- which stopped being true the morning the window opened
// and stayed untrue after it shut. The dates drive it now, so the row reads
// correctly on all three days of its life: before, during, and after.
//
// The transfer itself is no longer written out twice. It was listed here by
// hand while it was still in the future, and the snapshot has since recorded
// it -- which would have shown transfer 8 on the page twice, once as a guess
// and once as a fact.
const currentWindow = { transfer: 8, opens: '2026-09-13', closes: '2026-09-19' }

function windowState({ opens, closes }) {
  const now = Date.now()
  if (now < new Date(opens + 'T00:00:00').getTime()) return 'Upcoming'
  if (now <= new Date(closes + 'T23:59:59').getTime()) return 'Open now'
  return 'Closed'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function windowLabel({ opens, closes }) {
  const [, om, od] = opens.split('-').map(Number)
  const [y, cm, cd] = closes.split('-').map(Number)
  const to = om === cm ? `${cd}` : `${MONTHS[cm - 1]} ${cd}`
  return `${MONTHS[om - 1]} ${od}\u2013${to}, ${y}`
}

export const transfers = tracker846.transfers.map((t) => {
  if (t.transfer !== currentWindow.transfer) return { ...t }
  const state = windowState(currentWindow)
  return { ...t, date: windowLabel(currentWindow), window: state, upcoming: state !== 'Closed' }
})

export const reputation = {
  overall: 5.0,
  reviews: 2,
  communication: 5.0,
  compliance: 5.0,
  sportsmanship: 5.0,
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
