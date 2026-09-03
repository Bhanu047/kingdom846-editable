/**
 * Domain vocabulary for Kingshot and Kingdom 846.
 *
 * This is the part of the engine that carries knowledge no general-purpose
 * model would have: that "kvk" means kingdom versus kingdom, that [RYO] is
 * Spiders, that players say "bubble" when they mean peace shield. Retrieval
 * quality tracks this file more than any other, so add a line here whenever
 * visitors phrase something in a way the advisor misses.
 */

// Multi-word forms, rewritten before the text is split into words.
// Longest first: "kingdom vs kingdom" must win over "kingdom".
const PHRASES = [
  [/\bkingdom (vs|versus) kingdom\b/g, 'kvk'],
  [/\bkingdom war\b/g, 'kvk'],
  [/\bpeace shield\b/g, 'shield'],
  [/\bbubble up\b/g, 'shield'],
  [/\btri[- ]alliance clash\b/g, 'clash'],
  [/\bviking vengeance\b/g, 'viking'],
  [/\bsword ?land\b/g, 'swordland'],
  [/\bbear hunt\b/g, 'bearhunt'],
  [/\bchief minister\b/g, 'chiefminister'],
  [/\bnoble advisor\b/g, 'nobleadvisor'],
  [/\bfree to play\b/g, 'f2p'],
  [/\bpay to win\b/g, 'p2w'],
  [/\bnon[- ]aggression( pact| treaty)?\b/g, 'nap'],
  [/\btroop tier\b/g, 'tier'],
  [/\bhow (do|can) i\b/g, 'how to'],
  [/\bwhat time\b/g, 'schedule'],
  [/\bhow much time\b/g, 'schedule'],
  [/\bwhat about\b/g, ''],
]

// Single words, rewritten after the split. Left column is what a visitor
// might type; right column is the form the corpus uses.
const WORDS = {
  // Alliances — tags, names and the nicknames players actually use
  ryo: 'spiders', spider: 'spiders', kzk: 'karnival', kamilkazekarnival: 'karnival',
  sas: 'saints', saint: 'saints', sinner: 'saints', saintsandsinners: 'saints',
  ice: 'icehunters', icehunter: 'icehunters', hunter: 'icehunters',
  guild: 'alliance', clan: 'alliance', team: 'alliance', group: 'alliance',
  // Rulers
  queen: 'king', monarch: 'king', ruler: 'king', sovereign: 'king',
  throne: 'king', crown: 'king', governor: 'king',
  // Combat vocabulary
  defence: 'defend', defense: 'defend', defending: 'defend', protect: 'defend',
  attacking: 'attack', attacker: 'attack', offence: 'attack', offense: 'attack',
  raid: 'attack', hit: 'attack', zero: 'attack', zeroed: 'attack',
  rally: 'rally', rallies: 'rally', garrison: 'defend',
  inf: 'infantry', cav: 'cavalry', archer: 'archers', marksman: 'archers',
  troop: 'troops', army: 'troops', soldier: 'troops', unit: 'troops',
  hero: 'heroes', general: 'heroes', commander: 'heroes',
  // Progression
  upgrade: 'upgrade', lvl: 'level', lv: 'level', power: 'power',
  res: 'resources', resource: 'resources', food: 'resources', wood: 'resources',
  stone: 'resources', iron: 'resources', gem: 'gems', gold: 'gems',
  farm: 'gather', gathering: 'gather', mine: 'gather',
  ct: 'castle', townhall: 'castle', th: 'castle', keep: 'castle',
  // Site and community
  discord: 'discord', server: 'discord', chat: 'discord',
  site: 'website', portal: 'website', page: 'website', app: 'website',
  signup: 'apply', register: 'apply', application: 'apply', enlist: 'apply',
  migrate: 'transfer', move: 'transfer', switch: 'transfer',
  admin: 'admin', spartan: 'admin', owner: 'admin', dev: 'admin',
  // Question intent
  timing: 'schedule', time: 'schedule', hour: 'schedule', clock: 'schedule',
  cost: 'price', worth: 'price', spend: 'price',
  best: 'best', top: 'best', strongest: 'best', recommend: 'best',
  bug: 'problem', broken: 'problem', error: 'problem', issue: 'problem',
}

/** Rewrite phrases in already-normalised (lowercase, punctuation-free) text. */
function expandPhrases(text) {
  let s = text
  for (const [re, to] of PHRASES) s = s.replace(re, to)
  return s
}

/** Map one raw word to its canonical form. */
function canonical(word) {
  return WORDS[word] || word
}

module.exports = { PHRASES, WORDS, expandPhrases, canonical }
