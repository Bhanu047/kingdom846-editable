const STORAGE_KEY = 'kingdom846.battleLab.profiles.v1'
const ACTIVE_KEY = 'kingdom846.battleLab.activeProfile.v1'

export const EMPTY_PROFILE = {
  id: '',
  name: 'My Player',
  kingdom: '846',
  capacity: 750000,
  stats: {
    infantry: { attack: 300, lethality: 250, defense: 300, health: 250 },
    cavalry: { attack: 300, lethality: 250, defense: 300, health: 250 },
    archers: { attack: 300, lethality: 250, defense: 300, health: 250 },
  },
  sources: {
    heroes: 0,
    heroGear: 0,
    widgets: 0,
    pets: 0,
    petSkills: 0,
    charms: 0,
    academy: 0,
    warAcademy: 0,
    governorGear: 0,
  },
  updatedAt: '',
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeProfile(profile = {}) {
  const base = clone(EMPTY_PROFILE)
  const next = {
    ...base,
    ...profile,
    id: profile.id || uid(),
    name: String(profile.name || base.name).slice(0, 40),
    kingdom: String(profile.kingdom || base.kingdom).slice(0, 12),
    capacity: Math.max(1, Number(profile.capacity) || base.capacity),
    stats: {
      infantry: { ...base.stats.infantry, ...(profile.stats?.infantry || {}) },
      cavalry: { ...base.stats.cavalry, ...(profile.stats?.cavalry || {}) },
      archers: { ...base.stats.archers, ...(profile.stats?.archers || {}) },
    },
    sources: { ...base.sources, ...(profile.sources || {}) },
    updatedAt: profile.updatedAt || new Date().toISOString(),
  }
  return next
}

export function createBlankProfile(name = 'My Player') {
  return normalizeProfile({ name })
}

export function loadProfiles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeProfile) : []
  } catch {
    return []
  }
}

export function saveProfile(profile) {
  const normalized = normalizeProfile({ ...profile, updatedAt: new Date().toISOString() })
  const profiles = loadProfiles()
  const index = profiles.findIndex((item) => item.id === normalized.id)
  if (index >= 0) profiles[index] = normalized
  else profiles.push(normalized)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
  localStorage.setItem(ACTIVE_KEY, normalized.id)
  return normalized
}

export function deleteProfile(id) {
  const profiles = loadProfiles().filter((profile) => profile.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
  if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY)
  return profiles
}

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_KEY) || ''
}

export function setActiveProfileId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

export function exportProfilesJson() {
  return JSON.stringify({
    version: 1,
    app: 'Kingdom 846 Battle Lab',
    exportedAt: new Date().toISOString(),
    profiles: loadProfiles(),
  }, null, 2)
}

export function importProfilesJson(text) {
  const parsed = JSON.parse(text)
  const incoming = Array.isArray(parsed) ? parsed : parsed?.profiles
  if (!Array.isArray(incoming)) throw new Error('This file does not contain Battle Lab profiles.')
  const existing = loadProfiles()
  const byId = new Map(existing.map((profile) => [profile.id, profile]))
  incoming.map(normalizeProfile).forEach((profile) => byId.set(profile.id, profile))
  const merged = [...byId.values()]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  return merged
}
