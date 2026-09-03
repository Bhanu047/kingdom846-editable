/**
 * Typo tolerance.
 *
 * Visitors type from phones mid-battle: "alince", "bera hunt", "trasnfer".
 * Before giving up on an unknown word, the engine looks for the closest word
 * it does know. Only unknown words are corrected, so real vocabulary is never
 * rewritten into something else.
 */

/**
 * Damerau-Levenshtein distance (optimal string alignment), bailing out once
 * the cost passes `max`.
 *
 * Counts a transposition as one edit rather than two, which plain Levenshtein
 * does not. That single difference is what catches the most common phone typo:
 * "castel" for "castle" and "kingdmo" for "kingdom" are one swap away, not two
 * substitutions. The early exit matters because this runs against every
 * vocabulary word for every unknown token.
 */
function editDistance(a, b, max = 3) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2 = null
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(
        prev[j] + 1,          // deletion
        cur[j - 1] + 1,       // insertion
        prev[j - 1] + cost    // substitution
      )
      // Transposition: the previous two characters appear swapped.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

/** Character trigrams, used as a cheap pre-filter before edit distance. */
function trigrams(s) {
  const p = `  ${s} `, out = new Set()
  for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3))
  return out
}

function trigramSimilarity(a, b) {
  const A = trigrams(a), B = trigrams(b)
  let shared = 0
  for (const t of A) if (B.has(t)) shared++
  return shared / (A.size + B.size - shared)
}

/**
 * Builds a corrector closed over a fixed vocabulary.
 * Returns a function mapping an unknown word to its best match, or null.
 */
function makeCorrector(vocabulary) {
  const vocab = [...new Set(vocabulary)].filter(w => w.length > 2)
  // Bucket by first letter and length to keep the candidate set small.
  const buckets = new Map()
  for (const w of vocab) {
    const key = w[0]
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(w)
  }

  return function correct(word) {
    if (word.length < 4 || vocab.includes(word)) return null
    // Typos usually preserve the first letter; also try neighbours in case
    // the first letter itself is wrong.
    const candidates = [
      ...(buckets.get(word[0]) || []),
      ...(buckets.get(word[1]) || []),
    ]

    // Two edits only for long words. Allowing two on short ones turns real
    // out-of-domain words into false matches ("explain" -> "exploit").
    const maxEdits = word.length >= 8 ? 2 : 1
    let best = null, bestScore = Infinity
    for (const cand of candidates) {
      if (Math.abs(cand.length - word.length) > maxEdits) continue
      if (trigramSimilarity(word, cand) < 0.3) continue
      const d = editDistance(word, cand, maxEdits)
      if (d <= maxEdits && d < bestScore) { bestScore = d; best = cand }
    }
    return best
  }
}

module.exports = { editDistance, trigrams, trigramSimilarity, makeCorrector }
