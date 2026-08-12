// Kingdom 846 — data layer.
//
// REAL kingdom roster (alliances, players, ministry, kingdom status) sourced
// from the user's original Kingdom 846 portal.
// REAL public tracker data (Atlas rank, KvK rating, timeline, KvK history,
// reputation, transfers) sourced from:
//  - Kingshot Atlas: https://ks-atlas.com/kingdom/846
//  - Kingshot Optimizer timeline: https://kingshotoptimizer.com/kingdom-timeline/846
//  - Kingshot Optimizer KvK rankings: https://kingshotoptimizer.com/kvk-rankings/kingdom/846

export const kingdom = {
  id: 846,
  name: 'Kingdom 846',
  motto: "One Crown. Four Alliances. Endless Glory.",
  tagline: "Where legends are forged in fire and crowned in gold.",
  season: 'Season of the Fire Tyrant',
  // Kingdom status (real)
  king: 'Oliver',
  kingTag: '[SAS] SaintsAndSinners',
  kingAllianceSlug: 'sas',
  leadingAlliance: '[SAS] SaintsAndSinners',
  totalPower: '111,597,006,633',
  level: 100,
  // Public tracker data (real)
  tier: 'S-Tier',
  atlasScore: 60.91,
  atlasRank: 66,
  atlasPercentile: 'Top 3.3%',
  mysticScore: 186025,
  mysticRank: 259,
  mysticPercentile: 'Top 11.1%',
  transferStatus: 'Leading',
  // KvK performance overview
  kvkOverview: {
    totalKvks: 10,
    outcomes: [
      { label: 'Dominations', value: 7, pct: 70, icon: 'crown' },
      { label: 'Comebacks', value: 1, pct: 10, icon: 'refresh' },
      { label: 'Reversals', value: 1, pct: 10, icon: 'refresh' },
      { label: 'Invasions', value: 1, pct: 10, icon: 'swords' },
    ],
    prepPhase: { wins: 8, losses: 2, streak: '4W', winRate: '80%', best: '4W' },
    battlePhase: { wins: 8, losses: 2, streak: '5W', winRate: '80%', best: '5W' },
  },
  created: '2025-08-17',
  currentDay: 359,
  kvkRating: 2.564,
  kvkCurrentRank: 25,
  source: 'https://ks-atlas.com/kingdom/846',
  timelineSource: 'https://kingshotoptimizer.com/kingdom-timeline/846',
  kvkSource: 'https://kingshotoptimizer.com/kvk-rankings/kingdom/846'
}

// Dashboard hero stats — mix of kingdom status + public tracker data (all real).
export const stats = [
  { label: 'Leading Alliance', value: '[RYO]', icon: 'shield', sub: 'Spiders' },
  { label: 'KvK Rating', value: '2.564', icon: 'trophy', sub: 'Global Rank #25' },
  { label: 'KvK Dominations', value: '7/10', icon: 'crown', sub: '70% domination rate' },
  { label: 'Atlas Rank', value: '#66', icon: 'landmark', sub: 'Top 3.3% · S-Tier' }
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
    art: './assets/banner-spiders.png',
    schedule: SCHEDULE_DEFAULT
  },
  {
    rank: 2, tag: '[KzK]', name: 'KamilKazeKarnival', power: '23,589,950,586', color: 'violet',
    leader: 'Lovely Khaos', members: 288, lang: 'English & Turkish', slug: 'kzk',
    tagline: 'Loud, fast, and impossible to ignore.',
    desc: 'A high-tempo alliance built around aggressive rallying and constant event turnout. Known for filling every Bear Trap slot and never missing a Fire Tyrant window.',
    art: './assets/banner-kamilkaze.png',
    schedule: SCHEDULE_DEFAULT
  },
  {
    rank: 3, tag: '[SAS]', name: 'SaintsAndSinners', power: '23,057,797,350', color: 'crimson',
    leader: 'Lady Charlotte', members: 265, lang: 'English', slug: 'sas',
    tagline: 'Discipline on the field, chaos in Discord.',
    desc: 'A tightly organized alliance with a strong internal ranking system and rotating rally leads. Reliable second wave on every Castle Battle.',
    art: './assets/banner-saints-sinners.png',
    schedule: SCHEDULE_DEFAULT
  },
  {
    rank: 4, tag: '[ICE]', name: 'IceHunters', power: '19,215,658,611', color: 'blue',
    leader: 'Dunngeon', members: 201, lang: 'English & Chinese', slug: 'ice',
    tagline: "The kingdom's night shift, always awake.",
    desc: 'A largely Asia-Pacific alliance that keeps 846 covered around the clock. Smaller roster, outsized presence in every off-hours event.',
    art: './assets/banner-icehunters.png',
    schedule: SCHEDULE_ICE
  }
]

// Top players — seed data for Hall of Legends display.
// Leaders can upload real rosters via the Leader Portal to replace this.
export const AVATAR_OPTIONS = [
  'king', 'queen', 'warrior', 'knight', 'mage', 'shieldmaiden', 'sorceress', 'archer', 'berserker'
]

export const players = [
  { rank: 1, name: 'SpartanWarrior', tag: '[RYO]', slug: 'ryo', alliance: 'Spiders', avatar: 'king' },
  { rank: 2, name: 'DragonSlayer', tag: '[KzK]', slug: 'kzk', alliance: 'KamilKazeKarnival', avatar: 'berserker' },
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
    id: 'kvk-prep', title: 'KvK Preparation Checklist', category: 'Strategy', art: './assets/art-kvk-prep.png', read: '6 min',
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
    id: 'nap-rules', title: 'NAP Rules & Royal Decrees', category: 'Diplomacy', art: './assets/art-nap-rules.png', read: '5 min',
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
    id: 'bear-trap', title: 'Bear Hunt Rally Guide', category: 'PvE', art: './assets/art-bear-trap.png', read: '6 min',
    excerpt: 'Optimal trap formations and reward-maximizing math for the bear hunt.',
    body: [
      'The Bear Hunt is a PvE event where alliances rally to defeat a bear boss. Higher damage means better rewards for all participants.',
      'Formation: Use your strongest infantry and cavalry heroes in the rally. The bear has high defense, so bring heroes with armor-piercing or percentage-based damage skills.',
      'Trap Placement: Place traps at the rally point before the bear spawns. Each trap adds bonus damage to the rally. More traps = more damage = better rewards.',
      'Timing: Join the rally within the first 10 seconds for maximum damage bonus. Late joiners contribute less damage and get fewer rewards.',
      'Reward Tiers: Damage thresholds determine reward tiers. Coordinate with your alliance to ensure everyone hits the minimum damage threshold for top-tier rewards.',
      'Pro Tip: Use speedups to train extra troops before Bear Hunt days. More troops in the rally means more damage.',
    ].join('\n\n')
  },
  {
    id: 'castle-rotation', title: 'Castle Rotation Strategy', category: 'Strategy', art: './assets/art-castle-rotation.png', read: '10 min',
    excerpt: 'Optimizing march rotation through the castle gateway during KvK.',
    body: [
      'Castle rotation is the strategy of cycling marches through the castle gateway during KvK to maintain constant pressure and maximize points.',
      'Wave 1: Send your top 2 marches immediately when the castle opens. These should be your strongest compositions with your best heroes.',
      'Wave 2: As Wave 1 marches return (heavily damaged), send your next 2 marches. This ensures the castle is never left undefended.',
      'Rotation Timing: A full rotation cycle takes about 3-4 minutes depending on march speed and hospital healing time. Coordinate with alliance members to stagger your waves.',
      'Gateway Control: The alliance that controls the gateway can block enemy marches. Station a strong garrison at the gateway to slow enemy rotations.',
      'Hospital Management: Keep hospitals clear between waves. Use healing speedups strategically — don\'t waste them on low-tier troops. Prioritize healing your strongest marches first.',
      'Communication: Use Discord voice chat during castle battles. Call out enemy movements, coordinate wave timing, and alert the team when your marches are returning.',
    ].join('\n\n')
  },
  {
    id: 'fire-tyrant', title: 'Fire Tyrant — World Boss Guide', category: 'Boss', art: './assets/art-fire-tyrant.png', read: '7 min',
    excerpt: 'Anti-burn gear, rally timing, and damage-race strategy for the dragon world boss.',
    body: [
      'The Fire Tyrant is a world boss that deals heavy burn damage. Preparation is critical — unprepared marches will be wiped instantly.',
      'Anti-Burn Gear: Equip heroes with burn-resistant gear. Fire resistance charms and anti-burn accessories are essential. Check your gear before the event starts.',
      'Rally Composition: Use heroes with high HP and defense stats. Infantry-heavy compositions tend to survive longer against the Fire Tyrant\'s AoE burn attacks.',
      'Timing: The Fire Tyrant spawns at a set time. Have your rally ready 5 minutes before spawn. The first rally to hit gets a damage bonus.',
      'Damage Race: This is a damage race, not a survival fight. Maximize DPS even if your marches die — every point of damage counts toward your reward tier.',
      'Healing: Bring extra healing items. After each rally, heal immediately and rejoin. The faster you cycle marches, the more damage you contribute.',
      'Rewards: Reward tiers are based on total damage dealt. Coordinate with your alliance to ensure everyone participates — alliance-wide rewards scale with total participation.',
    ].join('\n\n')
  },
  {
    id: 'heroes', title: 'Commander & Hero Pairings', category: 'Combat', art: './assets/art-heroes.png', read: '12 min',
    excerpt: 'Best hero synergies for rallies and field fights across generations.',
    body: [
      'Hero pairings are critical for maximizing march effectiveness. Different hero combinations excel in different situations.',
      'Rally Pairings: For castle rallies, pair a high-damage hero with a support hero that buffs attack or reduces enemy defense. Example: a Gen-5 DPS hero paired with a Gen-3 support hero that provides an attack buff.',
      'Field Fight Pairings: For open-field combat, prioritize heroes with crowd control and mobility skills. A hero that can freeze or slow enemies paired with a high-burst damage hero is devastating in skirmishes.',
      'Generation Synergy: Heroes from the same generation often have synergy bonuses. Check your hero roster for generation bonuses and build around them.',
      'Gear Matters: A well-geared older hero can outperform a poorly-geared newer hero. Always gear up your top 3-5 heroes before investing in new ones.',
      'Pet Pairings: Don\'t forget pets. Some pets provide passive buffs that complement specific hero skills. Match your pet to your hero composition for maximum effect.',
      'Counter-Picking: In KvK, pay attention to what the enemy is fielding. If they are running infantry-heavy marches, counter with cavalry. Adaptability wins battles.',
    ].join('\n\n')
  }
]

// Featured upcoming events — derived from the real timeline.
export const events = [
  { id: 'kvk-castle', title: 'KvK Castle Battle', date: '2026-08-15', category: 'Castle Battle', featured: true, art: './assets/art-kvk-prep.png', desc: 'The realm clashes in the KvK Castle Battle for the crown stronghold. The king changes every 14 days after this battle.' },
  { id: 'swordland', title: 'Swordland Summit Championship', date: '2026-08-16', time: '12:00 UTC', category: 'Castle Battle', featured: true, art: './assets/art-castle-battle.png', desc: 'The kingdom\'s premier castle battle championship. Rallies clash for supremacy — kicks off at 12:00 UTC.' },
  { id: 'anniversary', title: 'First Anniversary', date: '2026-08-16', category: 'Anniversary', featured: true, art: './assets/art-season-opening.png', desc: 'Kingdom 846 celebrates one year. Anniversary rewards, kingdom-wide buff, and a ceremonial gathering at the capital.' }
]

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
  { name: 'Generation 6 Heroes (Triton, Sophia, Yang)', date: '2026-08-17', category: 'Heroes', status: 'upcoming' },
  { name: 'Generation 6 Pets (Regal White Lion, Ironclad War Elephant)', date: '2026-08-17', category: 'Pets', status: 'upcoming' },
  { name: 'First Flamedragon Tyrant Competition', date: '2026-08-30', category: 'PvP', status: 'upcoming', art: './assets/art-fire-tyrant.png' },
  { name: 'Generation 7 Heroes (Wee & Woo, Ava, Charles)', date: '2026-11-09', category: 'Heroes', status: 'future' },
  { name: 'Generation 7 Pets (Ironclad War Bear)', date: '2026-11-09', category: 'Pets', status: 'future' },
  { name: 'Advanced Truegold Research', date: '2026-12-21', category: 'Truegold', status: 'future' },
  { name: 'Generation 8 Heroes', date: '2027-02-01', category: 'Heroes', status: 'predicted' },
  { name: 'Generation 9 Heroes', date: '2027-04-26', category: 'Heroes', status: 'predicted' },
  { name: 'Truegold 10', date: '2027-06-07', category: 'Truegold', status: 'future' }
]

// KvK history — sourced from kingshotoptimizer.com/kvk-rankings/kingdom/846
export const kvkHistory = [
  { kvk: 16, date: '2026-07-18', opponent: 'K623', opponentRank: 5, quality: 5.75, prep: 'W', battle: 'L' },
  { kvk: 15, date: '2026-06-20', opponent: 'K766', opponentRank: 147, quality: 4.35, prep: 'W', battle: 'W' },
  { kvk: 14, date: '2026-05-23', opponent: 'K610', opponentRank: 1198, quality: 3.48, prep: 'W', battle: 'W' },
  { kvk: 13, date: '2026-04-25', opponent: 'K832', opponentRank: 670, quality: 3.74, prep: 'W', battle: 'W' },
  { kvk: 12, date: '2026-03-28', opponent: 'K777', opponentRank: 42, quality: 4.93, prep: 'L', battle: 'L' },
  { kvk: 11, date: '2026-02-28', opponent: 'K833', opponentRank: 212, quality: 4.19, prep: 'W', battle: 'W' },
  { kvk: 10, date: '2026-01-31', opponent: 'K815', opponentRank: 1245, quality: 3.45, prep: 'W', battle: 'W' },
  { kvk: 9, date: '2026-01-03', opponent: 'K791', opponentRank: 276, quality: 4.10, prep: 'L', battle: 'W' },
  { kvk: 8, date: '2025-12-06', opponent: 'K840', opponentRank: 1216, quality: 3.46, prep: 'W', battle: 'W' },
  { kvk: 7, date: '2025-11-08', opponent: 'K841', opponentRank: 1083, quality: 3.53, prep: 'W', battle: 'W' }
]

export const kvkStats = {
  total: 10,
  dominations: 7,
  comebacks: 1,
  reversals: 1,
  prepRecord: '8-2',
  prepWinRate: 80,
  prepStreak: '4W',
  battleRecord: '8-2',
  battleWinRate: 80,
  battleBestStreak: '5W',
  rating: 2.564,
  currentRank: 25
}

export const transfers = [
  { transfer: 8, date: 'Sep 13–19, 2026', group: '—', status: 'Upcoming', upcoming: true },
  { transfer: 7, date: 'Jul 2026', group: 3, status: 'Leading' },
  { transfer: 6, date: 'Jun 2026', group: 4, status: 'Ordinary' },
  { transfer: 5, date: 'Apr 2026', group: 4, status: 'Ordinary' },
  { transfer: 4, date: 'Mar 2026', group: 5, status: 'Ordinary' },
  { transfer: 3, date: 'Jan 2026', group: 6, status: 'Ordinary' }
]

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

// Shared alliance banner lookup (used by Dashboard, Rankings, Transfer, etc.)
export const BANNERS = {
  ryo: './assets/banner-spiders.png',
  kzk: './assets/banner-kamilkaze.png',
  sas: './assets/banner-saints-sinners.png',
  ice: './assets/banner-icehunters.png',
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
  { id: 'transfer', label: 'Transfer', icon: 'arrow' },
  { id: 'apply', label: 'Apply', icon: 'scroll' }
]
