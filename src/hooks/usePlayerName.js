import { useEffect, useState } from 'react'

const STORAGE_KEY = 'k846-player-name'

// Shared across Mystic Trials and PvP Suite so a name entered once follows
// the player between tools instead of being re-typed per page — the whole
// point is attributing a report to whoever ran it, which only works if the
// name sticks around.
export function usePlayerName() {
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
  })

  useEffect(() => {
    try {
      if (playerName) localStorage.setItem(STORAGE_KEY, playerName)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [playerName])

  return [playerName, setPlayerName]
}
