/**
 * BM25 retrieval over the kingdom's knowledge corpus.
 *
 * This replaces the first-match-wins if/else chain the advisor used to run on.
 * That chain had an ordering bug by construction: a broad rule near the top
 * ("does the message contain 'alliance'?") swallowed every specific question
 * written below it, so the narrower answers could never fire. Ranking every
 * topic by relevance and returning the best one removes the whole class of bug
 * — order in the corpus no longer affects the answer.
 *
 * Fields are weighted because they differ in how much they say about a topic:
 * the curated keyword list is the strongest signal, the title next, and the
 * body last (a long answer mentioning "castle" once is not a castle topic).
 */

const { tokenize, bigrams, normalize } = require('./tokenize.cjs')
const { expandPhrases, canonical } = require('./synonyms.cjs')
const { makeCorrector } = require('./fuzzy.cjs')

// BM25 parameters. k1 controls how fast repeated terms stop adding value;
// b controls how strongly long documents are penalised. These are the standard
// defaults and behave well on a corpus of short topic answers.
const K1 = 1.4
const B = 0.72

const FIELD_WEIGHTS = { keywords: 3.0, title: 2.0, body: 0.6 }

/** Run raw text through synonym expansion, then tokenize into stems + bigrams. */
function analyze(text) {
  const expanded = expandPhrases(String(text || '').toLowerCase())
  const words = tokenize(expanded).map(canonical)
  return [...words, ...bigrams(words)]
}

class Bm25Index {
  constructor(docs) {
    this.docs = docs
    this.N = docs.length
    this.postings = new Map()   // term -> Map(docIndex -> weighted tf)
    this.docLen = new Float64Array(this.N)
    this.vocab = new Set()
    // Document frequencies are tracked per field group. Curated = the hand
    // written keyword list and title; body = the prose of the answer.
    this.curatedDf = new Map()
    this.bodyDf = new Map()

    docs.forEach((doc, i) => {
      const fields = {
        keywords: (doc.keywords || []).join(' '),
        title: doc.title || '',
        body: doc.answer || '',
      }
      // A few topics describe the advisor itself and answer by listing every
      // other topic. Indexing those bodies makes them match every question, so
      // they are matched on their keywords and title alone.
      if (doc.indexBody === false) fields.body = ''
      let len = 0
      const inCurated = new Set(), inBody = new Set()
      for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
        for (const term of analyze(fields[field])) {
          this.vocab.add(term)
          len += weight
          if (!this.postings.has(term)) this.postings.set(term, new Map())
          const p = this.postings.get(term)
          p.set(i, (p.get(i) || 0) + weight)
          ;(field === 'body' ? inBody : inCurated).add(term)
        }
      }
      for (const t of inCurated) this.curatedDf.set(t, (this.curatedDf.get(t) || 0) + 1)
      for (const t of inBody) this.bodyDf.set(t, (this.bodyDf.get(t) || 0) + 1)
      this.docLen[i] = len
    })

    // Curated trigger phrases, kept verbatim for exact containment checks.
    //
    // The old rule engine tested `msg.includes('vip')` and got such questions
    // right; what it got wrong was letting whichever rule sat highest in the
    // file win. Keeping the trigger as a ranking bonus preserves the precision
    // and drops the ordering bug, because every topic is still scored and the
    // best total wins rather than the first one written.
    this.phrases = []
    docs.forEach((doc, i) => {
      for (const kw of doc.keywords || []) {
        const norm = normalize(expandPhrases(String(kw).toLowerCase()))
        if (norm.length < 3) continue
        this.phrases.push({
          doc: i,
          re: new RegExp(`\\b${norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
          terms: analyze(norm),
        })
      }
    })

    this.avgLen = this.docLen.reduce((a, b) => a + b, 0) / (this.N || 1)

    // Correct typos only against words the corpus actually contains, so a
    // real word is never rewritten into a different one.
    this.correct = makeCorrector([...this.vocab].filter(t => !t.includes('_')))

    // IDF is computed from the curated fields, falling back to the body only
    // for terms no topic lists as a keyword.
    //
    // Counting bodies would bury the words that identify a topic: "discord",
    // "vip" and "scam" are each mentioned in passing by dozens of answers, so
    // body-derived IDF made them look common and let an incidental word like
    // "link" outrank them. Two topics name "vip" as a keyword; three hundred
    // mention it in prose.
    this.idf = new Map()
    for (const term of this.postings.keys()) {
      const df = this.curatedDf.get(term) || this.bodyDf.get(term) || 1
      this.idf.set(term, Math.log(1 + (this.N - df + 0.5) / (df + 0.5)))
    }
    // A word the corpus has never seen is maximally rare. Scoring unknown
    // query terms at this weight is what makes an out-of-domain question come
    // out with low confidence instead of latching onto its one familiar word.
    this.maxIdf = Math.max(...this.idf.values())
  }

  /** IDF of a term, treating unseen terms as maximally rare. */
  weightOf(term) {
    return this.idf.get(term) ?? this.maxIdf
  }

  /**
   * Rewrites unknown query words to the nearest corpus word.
   * Returns the corrected terms plus what was changed, so the engine can tell
   * the visitor how their question was read.
   */
  repair(terms) {
    const fixes = []
    const corrected = new Set()
    const out = terms.map(t => {
      if (t.includes('_') || this.postings.has(t)) return t
      const fixed = this.correct(t)
      if (fixed) { fixes.push([t, fixed]); corrected.add(fixed); return fixed }
      return t
    })
    return { terms: out, fixes, corrected }
  }

  /** Rank all documents against a query. Returns the top `limit` hits. */
  search(query, limit = 5) {
    const raw = analyze(query)
    if (!raw.length) return { hits: [], fixes: [], terms: [] }
    const { terms, fixes, corrected } = this.repair(raw)

    const scores = new Map()

    // Exact trigger bonus, applied before term scoring. Scaled by how rare the
    // trigger's words are rather than how many there are, so hitting a phrase
    // that names one topic ("bear hunt") counts for more than hitting a phrase
    // built from words half the corpus uses ("strategy tips").
    const flat = normalize(expandPhrases(String(query).toLowerCase()))
    const triggered = new Set()
    for (const ph of this.phrases) {
      if (!ph.re.test(flat)) continue
      const mass = ph.terms.reduce((sum, t) => sum + this.weightOf(t), 0)
      scores.set(ph.doc, (scores.get(ph.doc) || 0) + 0.85 * mass)
      triggered.add(ph.doc)
    }

    for (const term of terms) {
      const p = this.postings.get(term)
      if (!p) continue
      const idf = this.idf.get(term)
      for (const [docIdx, tf] of p) {
        const norm = tf * (K1 + 1) /
          (tf + K1 * (1 - B + B * (this.docLen[docIdx] / this.avgLen)))
        scores.set(docIdx, (scores.get(docIdx) || 0) + idf * norm)
      }
    }

    // Coverage is measured in IDF mass rather than term count, so matching the
    // one word that identifies the topic counts for more than matching a word
    // half the corpus contains. Terms reached only via typo correction count at
    // a discount: a wrong guess should not read as a confident match.
    const unique = [...new Set(terms.filter(t => !t.includes('_')))]
    const totalIdf = unique.reduce((sum, t) => sum + this.weightOf(t), 0)

    // Terms still unknown after typo correction. A word the corpus has never
    // seen and cannot be spelled toward — "france", "pasta", "resume" — is the
    // clearest evidence a question is not about this kingdom. A corrected typo
    // does not count: "trasnfer" resolves to a word we know.
    const unresolved = unique.filter(t => !this.postings.has(t)).length
    const unresolvedRatio = unique.length ? unresolved / unique.length : 0

    const hits = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([idx, score]) => {
        const matched = unique.filter(t => this.postings.get(t)?.has(idx))
        const matchedIdf = matched.reduce(
          (sum, t) => sum + this.weightOf(t) * (corrected.has(t) ? 0.4 : 1), 0)
        return {
          doc: this.docs[idx],
          score,
          coverage: totalIdf ? matchedIdf / totalIdf : 0,
          matched,
          triggered: triggered.has(idx),
          unresolvedRatio,
        }
      })
    return { hits, fixes, terms: unique }
  }
}

/**
 * How much to trust the top hit, on 0..1.
 *
 * Blends three signals, because none is sufficient alone: coverage (did we
 * match most of what was asked, not just one common word), absolute score
 * (a weak match everywhere is still weak), and margin over the runner-up
 * (a clear winner beats a three-way tie). The engine asks for clarification
 * below ~0.35 rather than confidently returning a wrong topic.
 */
function confidence(hits) {
  if (!hits.length) return 0
  const top = hits[0]
  const second = hits[1]?.score || 0
  const margin = top.score > 0 ? (top.score - second) / top.score : 0
  const strength = Math.min(1, top.score / 12)
  const base = 0.62 * top.coverage + 0.23 * strength + 0.15 * margin

  // Damp the whole score by how much of the question the corpus could not
  // account for. Without this, one strong match carried an out-of-domain
  // question over the line: "what is the capital of france" hit a topic
  // keyed on "capital" and a high score plus a wide margin outvoted the
  // half of the question that was unknown.
  const penalty = 1 - 0.55 * (top.unresolvedRatio || 0)
  return Math.max(0, Math.min(1, base * penalty))
}

module.exports = { Bm25Index, confidence, analyze, K1, B, FIELD_WEIGHTS }
