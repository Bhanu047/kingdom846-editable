// A log of what actually HAPPENED, so the model can eventually be calibrated
// against real battles instead of against another calculator.
//
// Why this exists: every constant in kingshotCombat.js is either published
// mechanics or -- in the single case of FRONT_ROW_SPILL -- fitted to two proxy
// references (an established optimizer and the community openers). Neither is
// ground truth. The optimizer's own answer scatters up to 18 points across the
// same fight, so matching it more closely stopped being possible, let alone
// meaningful. Real outcomes are the only thing that can settle what is left.
//
// The data collection is free: a Mystic battle report is POST-battle, so the
// counts and bonuses already typed in ARE the composition that was actually
// fielded. All that is missing is one bit -- did it clear -- and that is the
// only thing this asks for.
//
// Everything stays on the player's own device until they choose to export it.

const STORAGE_KEY = 'k846-outcome-log'
const VERSION = 1
export const MAX_ENTRIES = 500

const TYPES = ['infantry', 'cavalry', 'archers']
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

function readRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
    return true
  } catch {
    // Private browsing, or the quota is full. Losing a log entry must never
    // take the page down with it.
    return false
  }
}

export function readLog() {
  return readRaw()
}

export function logCount() {
  return readRaw().length
}

const side = (army, tier) => Object.fromEntries(TYPES.map((type) => [type, {
  count: num(army?.[type]?.count),
  attack: num(army?.[type]?.attack),
  lethality: num(army?.[type]?.lethality),
  defense: num(army?.[type]?.defense),
  health: num(army?.[type]?.health),
  tier: army?.[type]?.tier || tier || null,
}]))

const splitOf = (army) => {
  const total = TYPES.reduce((sum, t) => sum + num(army?.[t]?.count), 0)
  if (total <= 0) return null
  return TYPES.map((t) => Math.round((num(army[t].count) / total) * 1000) / 10)
}

/**
 * Records one finished battle.
 *
 * `played` is taken straight from the entered army rather than asked for again:
 * the report is from a fight already fought, so those counts are what was
 * fielded. `predicted` stores what the model said at the time, together with
 * the spill value that produced it, so a later calibration can score the
 * model's own prediction rather than only re-fitting from scratch.
 */
export function recordOutcome({ zone, outcome, yours, opponent, yourTier, enemyTier, predicted = null, modelSpill = null }) {
  if (outcome !== 'cleared' && outcome !== 'lost') return null
  const entry = {
    v: VERSION,
    at: new Date().toISOString(),
    zone: zone || null,
    outcome,
    played: splitOf(yours),
    you: side(yours, yourTier),
    enemy: side(opponent, enemyTier),
    predicted: predicted
      ? { split: predicted.split, score: Math.round(predicted.score * 10000) / 10000, spill: modelSpill }
      : null,
  }
  const entries = readRaw()
  entries.push(entry)
  return writeRaw(entries) ? entry : null
}

/** Removes the most recent entry — for an outcome tapped by mistake. */
export function undoLast() {
  const entries = readRaw()
  if (!entries.length) return false
  entries.pop()
  return writeRaw(entries)
}

export function clearLog() {
  try { localStorage.removeItem(STORAGE_KEY); return true } catch { return false }
}

export function exportJson() {
  return JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), battles: readRaw() }, null, 2)
}

/** A one-line-per-battle summary, for a quick look without opening the JSON. */
export function summary() {
  const entries = readRaw()
  const cleared = entries.filter((e) => e.outcome === 'cleared').length
  const byZone = {}
  for (const e of entries) {
    const z = e.zone || 'unknown'
    byZone[z] = byZone[z] || { cleared: 0, lost: 0 }
    byZone[z][e.outcome === 'cleared' ? 'cleared' : 'lost'] += 1
  }
  return { total: entries.length, cleared, lost: entries.length - cleared, byZone }
}
