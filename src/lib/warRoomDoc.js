// The War Room's shared document, as the page holds it.
//
// Whales live once, in `catalog`, with the march time that belongs to them; a
// rally group only says which whales are in it and where each is deployed. So
// a march time fixed in one group is fixed in all of them, and picking a whale
// in a group brings its march time along.
//
// A pet buff runs for two hours: until `petUntil` the whale marches at
// `petMarch`, then back at `march` without anyone touching it.

import { normalizeMarchTime } from './marchTime'

export const PET_MS = 2 * 60 * 60 * 1000

export function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

const nameKey = (name) => String(name || '').trim().toLowerCase()

export const petActive = (w, now = Date.now()) => !!(w && w.petUntil && w.petUntil > now)
export const marchOf = (w, now = Date.now()) => (w ? (petActive(w, now) ? w.petMarch : w.march) : '0:00')

export function tidyCatalog(list, now = Date.now()) {
  const seen = new Set()
  return (Array.isArray(list) ? list : []).filter((w) => w && !seen.has(w.id) && seen.add(w.id)).map((w) => {
    const whale = { id: String(w.id || newId()), name: w.name || 'Unnamed', march: normalizeMarchTime(w.march) }
    if (petActive(w, now)) { whale.petUntil = Number(w.petUntil); whale.petMarch = normalizeMarchTime(w.petMarch ?? w.march) }
    return whale
  })
}

/**
 * Groups and catalog from whatever was stored. Rosters saved before the shared
 * list kept a name and march on every whale in every group; those are matched
 * to the list by name, and a name it does not have joins it.
 */
export function tidyDoc(rawGroups, rawCatalog) {
  const catalog = tidyCatalog(rawCatalog)
  const byId = new Map(catalog.map((w) => [w.id, w]))
  const byName = new Map(catalog.map((w) => [nameKey(w.name), w]))
  const groups = (Array.isArray(rawGroups) ? rawGroups : []).map((g) => ({
    id: g?.id || newId(),
    name: g?.name || 'Untitled',
    whales: (Array.isArray(g?.whales) ? g.whales : []).map((e) => {
      let whale = e?.whaleId != null ? byId.get(String(e.whaleId)) : null
      if (!whale && e?.name) {
        whale = byName.get(nameKey(e.name))
        if (!whale) {
          whale = { id: newId(), name: e.name, march: normalizeMarchTime(e.march) }
          catalog.push(whale); byId.set(whale.id, whale); byName.set(nameKey(whale.name), whale)
        }
      }
      return whale ? { id: e?.id || newId(), whaleId: whale.id, status: e?.status || 'Undeployed' } : null
    }).filter(Boolean),
  }))
  return { groups, catalog }
}

export const countWhales = (gs) => (gs || []).reduce((n, g) => n + (g.whales?.length || 0), 0)

/** "1:59:07" -- what is left of a pet, read at a glance. */
export function petLeft(w, now = Date.now()) {
  const s = Math.max(0, Math.ceil((Number(w?.petUntil) - now) / 1000))
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
