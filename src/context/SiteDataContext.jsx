import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiJson, apiFetch, getAuthToken } from '../lib/api'
import * as defaults from '../data/kingdom'

const Ctx = createContext(null)

const DEFAULT_DATA = {
  kingdom: defaults.kingdom,
  stats: defaults.stats,
  alliances: defaults.alliances,
  players: defaults.players,
  news: defaults.news,
  guides: defaults.guides,
  events: defaults.events,
  kvkStats: defaults.kvkStats,
  kvkHistory: defaults.kvkHistory,
  timeline: defaults.timeline,
  transfers: defaults.transfers,
  reputation: defaults.reputation,
}

export function SiteDataProvider({ children }) {
  const [data, setData] = useState(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await apiJson('/api/content')
      if (res?.data) setData((prev) => ({ ...prev, ...res.data }))
    } catch { /* fall back to defaults */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const saveData = useCallback(async (newData) => {
    if (!getAuthToken()) return { error: { message: 'Sign in as Sparta to save changes.' } }
    setSaving(true)
    try {
      await apiFetch('/api/content', { method: 'PUT', body: JSON.stringify(newData) })
      setData(newData)
      setLastSavedAt(new Date().toISOString())
      return { error: null }
    } catch (err) {
      return { error: { message: err.message } }
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <Ctx.Provider value={{ data, loading, saving, saveData, lastSavedAt, reload: load }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSiteData = () => useContext(Ctx)
