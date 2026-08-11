import { useState } from 'react'
import Icon from './Icon'

export default function LoginModal({ open, onClose }) {
  const [showAuth, setShowAuth] = useState(false)

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 " onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="panel panel-glow overflow-hidden">
          <div className="relative">
            <img src="./assets/art-castle-rotation.png" alt="" className="h-28 w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/40 to-ink" />
            <button onClick={onClose} className="absolute right-3 top-3 text-parchment/70 hover:text-parchment">
              <Icon name="chevron" size={18} className="rotate-90" />
            </button>
          </div>
          <div className="p-6">
            <div className="eyebrow">Access the Realm</div>
            <h1 className="mt-1 font-display text-2xl font-bold text-parchment">Royal Access</h1>
            <p className="mt-2 text-sm text-parchment/60">
              Member accounts, war council tools, and roster management require a connected backend (PostgreSQL + NextAuth, per the project's environment config).
            </p>

            <div className="mt-4 rounded-lg border border-amber/30 bg-amber/10 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber">
                <Icon name="shield" size={14} /> Backend not connected
              </div>
              <p className="mt-1 text-[11px] text-amber/70">
                This is a live preview. No accounts are created and no credentials are stored. To enable real login, a database and auth provider must be configured.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button onClick={() => setShowAuth(!showAuth)} className="btn-secondary w-full justify-between">
                <span className="flex items-center gap-2"><Icon name="book" size={14} /> How to connect a backend</span>
                <Icon name="chevron" size={14} className={showAuth ? 'rotate-90' : 'rotate-180'} />
              </button>
              {showAuth && (
                <div className="rounded-lg border border-gold/15 bg-ink/60 p-3 font-mono text-[10px] leading-relaxed text-parchment/60">
                  <div># .env</div>
                  <div>DATABASE_URL=postgresql://...</div>
                  <div>NEXTAUTH_SECRET=...</div>
                  <div>NEXTAUTH_URL=https://...</div>
                  <div className="mt-2 text-parchment/40">Configure these and wire an auth provider to enable real Royal Access.</div>
                </div>
              )}
            </div>

            <button onClick={onClose} className="btn-primary mt-4 w-full">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
