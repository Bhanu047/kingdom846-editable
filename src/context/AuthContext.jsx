import { createContext, useContext, useCallback, useState } from 'react'
import { apiJson, apiFetch, setAuthToken, getAuthToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  // Restore session on mount if token exists in sessionStorage
  useCallback(() => {
    const token = getAuthToken()
    if (token) {
      apiJson('/api/me').then((u) => setUser(u)).catch(() => setAuthToken(null)).finally(() => {})
    }
  }, [])

  const signIn = useCallback(async (username, password, mode) => {
    try {
      const data = await apiJson('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, mode }),
      })
      setAuthToken(data.token)
      setUser(data.user)
      return { error: null }
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

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, changeOwnCredentials, listLeaders, resetLeader, getMyRoster, uploadRoster, getRoster }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
