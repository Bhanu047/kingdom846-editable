// March times, as the War Room reads and writes them.
//
// The roster field is free text because that is how people type a march time
// -- "1:09", "69", "0:69" all mean the same 69 seconds, and being strict about
// it mid-rally is worse than being lenient. So parsing stays permissive and the
// tidying happens on the way out.

/** Seconds from anything a person plausibly types. Never negative, never NaN. */
export function parseMarchTime(value) {
  const s = String(value ?? '').trim()
  if (!s) return 0
  if (s.includes(':')) {
    const [m, sec] = s.split(':')
    return Math.max(0, (parseInt(m, 10) || 0) * 60 + (parseInt(sec, 10) || 0))
  }
  return Math.max(0, parseInt(s, 10) || 0)
}

/** The canonical M:SS a march time is shown as. */
export function formatMarchTime(totalSeconds) {
  const n = Math.max(0, Math.round(Number(totalSeconds) || 0))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

/**
 * What a typed march time should be STORED as.
 *
 * "0:69" is the case this exists for. It parses to 69 seconds and every
 * calculation built on it was already right -- but it was displayed back
 * verbatim, in the firing order, next to a name the caller is about to read
 * out. A caller glancing at "0:69" reads sixty-nine and then has to convert,
 * or misreads it as sixty-nine of something. Normalising to "1:09" costs
 * nothing and removes a place to trip in the one minute that matters.
 */
export const normalizeMarchTime = (value) => formatMarchTime(parseMarchTime(value))
