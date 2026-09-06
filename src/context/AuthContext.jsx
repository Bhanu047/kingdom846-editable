import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { apiJson, apiFetch, setAuthToken, getAuthToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  // Restore the session on mount when sessionStorage still holds a token.
  // This was a useCallback, which only *creates* a function -- it never ran, so
  // a refresh silently dropped an admin back to logged-out with a valid token
  // still sitting in storage.
  useEffect(() => {
    if (!getAuthToken()) return
    apiJson('/api/me')
      .then((u) => setUser(u))
      .catch(() => setAuthToken(null))
  }, [])

  const signIn = useCallback(async (username, password, mode) => {
    try {
      const data = await apiJson('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, mode }),
      })
      setAuthToken(data.token)
      setUser(data.user)
      return { error: null, user: data.user }
    } catch (err) {
      return { error: { message: err.message } }
    }
  }, [])

  const signOut = useCallback(() => {
    setAuthToken(null)
    setUser(null)
  }, [])

  const changeOwnCredentials = useCallback(async (currentPassword, username, newPassword) => {
    const res = await apiFetch('/api/me/credentials', {
      method: 'PATCH',
      body: JSON.stringify({ current_password: currentPassword, username, new_password: newPassword || undefined }),
    })
    if (!res.ok) {
      let msg = `Request failed (${res.status})`
      try { msg = (await res.json()).error || msg } catch {}
      throw new Error(msg)
    }
    // The server lowercases the username it stores; carry that into the session
    // so the screen does not keep naming an account that no longer exists.
    const stored = String(username || '').trim().toLowerCase()
    setUser((prev) => (prev && stored ? { ...prev, username: stored } : prev))
    return res.json()
  }, [])

  const listLeaders = useCallback(async () => apiJson('/api/admin/leaders'), [])

  const getMyRoster = useCallback(async () => apiJson('/api/leader/roster'), [])
  const uploadRoster = useCallback(async (members) => apiJson('/api/leader/roster', {
    method: 'POST',
    body: JSON.stringify({ members }),
  }), [])
  const getRoster = useCallback(async () => apiJson('/api/roster'), [])

  const resetLeader = useCallback(async (id, username, newPassword) => {
    const res = await apiFetch(`/api/admin/leaders/${id}/credentials`, {
      method: 'PATCH',
      body: JSON.stringify({ username: username || undefined, new_password: newPassword || undefined }),
    })
    if (!res.ok) {
      let msg = `Request failed (${res.status})`
      try { msg = (await res.json()).error || msg } catch {}
      throw new Error(msg)
    }
    return res.json()
  }, [])

  const setFirstPassword = useCallback(async (newPassword) => {
    const res = await apiFetch('/api/me/set-password', {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    })
    if (!res.ok) {
      let msg = `Request failed (${res.status})`
      try { msg = (await res.json()).error || msg } catch {}
      throw new Error(msg)
    }
    setUser((prev) => prev ? { ...prev, must_change_password: false } : prev)
    return res.json()
  }, [])

  // The shared War Room rally groups. They are one document on the server
  // rather than a copy per device, so a march time Shoni fixes is the one
  // Panini reads. `version` is what the save carries back: the server refuses a
  // save built on groups someone else has since replaced, and the room asks
  // what to do about it.
  const getWarRoom = useCallback(async () => apiJson('/api/war-room/roster'), [])
  const saveWarRoom = useCallback(async (groups, version) => {
    const res = await apiFetch('/api/war-room/roster', {
      method: 'PUT',
      body: JSON.stringify({ groups, version }),
    })
    if (res.status === 409) {
      const remote = await res.json().catch(() => ({}))
      const err = new Error(remote.error || 'Someone else saved the roster while you were editing.')
      err.conflict = remote
      throw err
    }
    if (!res.ok) {
      let msg = `Request failed (${res.status})`
      try { msg = (await res.json()).error || msg } catch {}
      throw new Error(msg)
    }
    return res.json()
  }, [])

  const isAdmin = user?.role === 'admin'
  // Sparta, the war-room accounts, and Shoni, who ran the room alone before it
  // was shared. Kept identical to the server's own rule.
  const canUseWarRoom = Boolean(
    user && (isAdmin || user.role === 'warroom' || user.username?.toLowerCase() === 'shoni'),
  )

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, canUseWarRoom, changeOwnCredentials, setFirstPassword, listLeaders, resetLeader, getMyRoster, uploadRoster, getRoster, getWarRoom, saveWarRoom }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
