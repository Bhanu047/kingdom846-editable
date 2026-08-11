import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

// mode: 'admin' (Sparta master via Royal Access) | 'leader' (top-right Login)
export default function Login({ onClose, onSuccess, mode = 'leader' }) {
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const isAdmin = mode === 'admin'

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(username, password, mode)
    setLoading(false)
    if (error) setError(error.message)
    else { onSuccess?.(); onClose?.() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="page-enter panel aurora-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold">
            <Icon name={isAdmin ? 'crown' : 'shield'} size={18} />
            <span className="font-display text-sm uppercase tracking-widest">Kingdom 846</span>
          </div>
          <button onClick={onClose} className="text-parchment/50 hover:text-parchment"><Icon name="logout" size={16} /></button>
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-parchment">{isAdmin ? 'Royal Access' : 'Leader Login'}</h2>
        <p className="mt-1 text-xs text-parchment/50">
          {isAdmin
            ? 'Sparta master account — full control of the realm.'
            : 'Alliance leader portal — manage your roster and requests.'}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-parchment/50">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              data-testid="input-username"
              className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
              placeholder={isAdmin ? 'Sparta username' : 'Leader username'}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-parchment/50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
              className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full" data-testid="button-submit">
            {loading ? 'Verifying…' : isAdmin ? 'Enter the Realm' : 'Access Portal'}
          </button>
        </form>

        <div className="mt-4 rounded-md border border-gold/20 bg-gold/5 px-3 py-2 text-[11px] text-gold/80">
          {isAdmin
            ? 'For the Sparta master account only. Leaders must use the top-right Login button.'
            : 'For alliance leaders only. Sparta uses the Royal Access button.'}
        </div>
      </div>
    </div>
  )
}
