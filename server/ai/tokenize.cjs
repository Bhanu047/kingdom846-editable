/**
 * Text normalisation for the Kingdom 846 advisor.
 *
 * Everything the engine indexes and every query it answers passes through
 * `tokenize`, so a question and the topic that answers it get reduced to the
 * same word stems. "Which alliances are recruiting?" and a topic written as
 * "Alliance recruitment" both come out as ['allianc', 'recruit'].
 */

// Words carried by almost every question, so they say nothing about which
// topic is meant. Dropping them stops "what is the best formation" from
// matching every topic containing "what".
const STOPWORDS = new Set(`a an the and or but if then than of in on at to for
from by with about into over after is are was were be been being do does did
doing have has had having i me my we our you your he she it they them this that
these those there here can could will would shall should may might must not no
nor as so too very just also any some each other only own same s t don now
please tell show give need want know like get
what how who when where why which whom whose whats hows
work works working mean means meaning happen happens use uses using used
way ways thing things stuff explain describe tell told say says said
lot really actually even still back good bad ok looking look`.split(/\s+/))

// The last two rows are question words and low-content filler. Both are
// dropped because they separate no topic from another, and leaving them in
// actively misranks: in this corpus "work" is rarer than "rally", so
// "how do rallies work" scored a topic containing "work" above the rally
// topic itself. Question words are not thrown away — `questionWord` reads
// them back off the raw text for intent detection.

// Contractions and possessives, expanded before the word split so "what's"
// becomes "what is" rather than the token "what" plus a stray "s".
const CONTRACTIONS = [
  [/\bwhat's\b/g, 'what is'], [/\bwho's\b/g, 'who is'], [/\bwhere's\b/g, 'where is'],
  [/\bhow's\b/g, 'how is'], [/\bthat's\b/g, 'that is'], [/\bit's\b/g, 'it is'],
  [/\bcan't\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\bn't\b/g, ' not'],
  [/\b(i|we|you|they)'re\b/g, '$1 are'], [/\bi'm\b/g, 'i am'],
  [/\b(\w+)'ll\b/g, '$1 will'], [/\b(\w+)'ve\b/g, '$1 have'], [/\b(\w+)'s\b/g, '$1'],
]

function normalize(text) {
  let s = String(text || '').toLowerCase()
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to)
  // Keep digits: kingdom numbers (846), troop tiers (t10) and castle levels
  // (c25) are meaningful tokens in this domain.
  return s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Porter stemmer, so "defending", "defends" and "defence" collapse toward one
 * token. Chosen over a word list because the corpus keeps growing and a
 * stemmer needs no maintenance as topics are added.
 */
function stem(w) {
  if (w.length < 3) return w
  const C = '[^aeiou]', V = '[aeiouy]'
  const mGT0 = new RegExp(`^(${C})?(${V}+${C}+)`)
  const measure = (s) => (s.match(new RegExp(`(${V}+${C}+)`, 'g')) || []).length

  // Step 1a — plurals
  if (/sses$/.test(w)) w = w.slice(0, -2)
  else if (/ies$/.test(w)) w = w.slice(0, -2)
  else if (/([^s])s$/.test(w)) w = w.slice(0, -1)

  // Step 1b — past tense and progressive
  if (/eed$/.test(w)) { if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1) }
  else {
    let m = w.match(/^(.*)(ed|ing)$/)
    if (m && new RegExp(V).test(m[1])) {
      w = m[1]
      if (/(at|bl|iz)$/.test(w)) w += 'e'
      else if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1)
      else if (measure(w) === 1 && new RegExp(`${C}${V}[^aeiouwxy]$`).test(w)) w += 'e'
    }
  }

  // Step 1c — terminal y
  if (/y$/.test(w) && new RegExp(V).test(w.slice(0, -1))) w = w.slice(0, -1) + 'i'

  // Steps 2-4 — common derivational suffixes, longest first
  const S2 = [['ational','ate'],['tional','tion'],['fulness','ful'],['ousness','ous'],
    ['iveness','ive'],['ization','ize'],['ation','ate'],['biliti','ble'],['alism','al'],
    ['aliti','al'],['iviti','ive'],['entli','ent'],['ousli','ous'],['ition','ite'],
    ['ator','ate'],['alli','al'],['eli','e'],['izer','ize'],['anci','ance'],['enci','ence']]
  for (const [suf, rep] of S2) {
    if (w.endsWith(suf) && measure(w.slice(0, -suf.length)) > 0) { w = w.slice(0, -suf.length) + rep; break }
  }
  const S3 = [['icate','ic'],['ative',''],['alize','al'],['iciti','ic'],['ical','ic'],['ful',''],['ness','']]
  for (const [suf, rep] of S3) {
    if (w.endsWith(suf) && measure(w.slice(0, -suf.length)) > 0) { w = w.slice(0, -suf.length) + rep; break }
  }
  const S4 = ['ement','ance','ence','able','ible','ment','ant','ent','ism','ate','iti',
    'ous','ive','ize','ion','al','er','ic']
  for (const suf of S4) {
    if (w.endsWith(suf)) {
      const base = w.slice(0, -suf.length)
      // "ion" only drops after s or t, else "lion" would stem to "l"
      if (suf === 'ion' && !/[st]$/.test(base)) continue
      if (measure(base) > 1) { w = base; break }
    }
  }

  // Step 5 — trailing e and doubled l
  if (/e$/.test(w) && measure(w.slice(0, -1)) > 1) w = w.slice(0, -1)
  if (/ll$/.test(w) && measure(w) > 1) w = w.slice(0, -1)
  return w
}

/**
 * Full pipeline: normalise, split, drop stopwords, stem.
 * `keepStops` is used when indexing very short topic titles, where dropping
 * stopwords could leave nothing behind.
 */
function tokenize(text, { keepStops = false } = {}) {
  return normalize(text)
    .split(' ')
    .filter(w => w && (keepStops || !STOPWORDS.has(w)))
    .map(stem)
    .filter(Boolean)
}

/** The leading question word, if any — "who is the king" -> "who". */
function questionWord(text) {
  const m = normalize(text).match(/\b(what|how|who|when|where|why|which)\b/)
  return m ? m[1] : null
}

/** Adjacent token pairs, so "bear hunt" outranks topics that merely say "bear". */
function bigrams(tokens) {
  const out = []
  for (let i = 0; i < tokens.length - 1; i++) out.push(tokens[i] + '_' + tokens[i + 1])
  return out
}

module.exports = { normalize, stem, tokenize, bigrams, questionWord, STOPWORDS }
