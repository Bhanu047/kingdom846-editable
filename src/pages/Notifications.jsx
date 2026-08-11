import { useState, useEffect, useCallback } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { Embers } from '../components/Embers'
import { useAuth } from '../context/AuthContext'
import { apiJson, apiDownload } from '../lib/api'

const ROLE_LABEL = (t) => t === 'chief_minister' ? 'Chief Minister' : t === 'noble_advisor' ? 'Noble Advisor' : t

export default function Notifications() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try { setItems(await apiJson('/api/applications')) } catch (e) { setError(e.message) }
    setLoaded(true)
  }, [])
  useEffect(() => { load() }, [load])

  const setStatus = async (id, status) => {
    try { await apiJson(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load() }
    catch (e) { setError(e.message) }
  }
  const download = async () => {
    setDownloading(true); setError(null)
    try { await apiDownload('/api/applications/export', 'kingdom846-applications.xlsx') }
    catch (e) { setError(e.message) }
    finally { setDownloading(false) }
  }

  const filtered = items.filter((a) => filter === 'all' ? true : a.status === filter)
  const counts = {
    all: items.length,
    new: items.filter((a) => a.status === 'new').length,
    contacted: items.filter((a) => a.status === 'contacted').length,
    done: items.filter((a) => a.status === 'done').length,
  }

  return (
    <div className="space-y-6">
      <Panel glow className="reveal-clip relative overflow-hidden p-0">
        <div className="relative h-44">
          <img src="./assets/news-throne-room.png" alt="Notifications" className="h-full w-full drift-slow object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
          <Embers count={10} />
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-6 md:p-10">
            <div className="eyebrow">Leadership</div>
            <h1 className="shimmer-text glow-pulse mt-2 font-display text-3xl font-bold md:text-4xl">Notifications</h1>
            <p className="mt-2 text-sm text-gold/90">Applications & transfer requests — all in one place.</p>
          </div>
        </div>
      </Panel>

      <Panel className="reveal-clip">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle eyebrow="Inbox" title="Applications" icon="bell" />
          <div className="flex items-center gap-2">
            <button onClick={download} disabled={downloading} className="btn-primary" data-testid="button-download-applications">
              <Icon name="download" size={14} /> {downloading ? 'Preparing…' : 'Download Excel'}
            </button>
            <button onClick={load} className="btn-secondary" data-testid="button-refresh-applications">
              <Icon name="refresh" size={14} /> Refresh
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-parchment/50">
          Signed in as <span className="font-semibold text-gold">{user?.display_name || user?.username}</span>{isAdmin ? ' (Sparta · admin)' : ' (leader)'}. {isAdmin ? 'You can mark status.' : 'View-only — only Sparta can change status.'}
        </p>

        {error && <div className="mt-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[['all','All'],['new','New'],['contacted','Contacted'],['done','Done']].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} data-testid={`filter-applications-${k}`}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${filter === k ? 'border-gold bg-gold/15 text-gold' : 'border-gold/20 text-parchment/60 hover:bg-white/5'}`}>
              {label} ({counts[k]})
            </button>
          ))}
        </div>

        <div className="mt-4">
          {!loaded ? <p className="text-sm text-parchment/50">Loading…</p> :
           filtered.length === 0 ? (
             <div className="rounded-lg border border-gold/15 bg-white/5 p-8 text-center">
               <Icon name="bell" size={28} className="mx-auto text-parchment/30" />
               <p className="mt-2 text-sm text-parchment/50">No {filter === 'all' ? '' : filter} applications yet.</p>
             </div>
           ) : (
             <div className="space-y-2">
               {filtered.map((a) => {
                 let payload = {}
                 try { payload = typeof a.payload === 'string' ? JSON.parse(a.payload) : (a.payload || {}) } catch {}
                 return (
                   <div key={a.id} className="lift rounded-lg border border-gold/15 bg-white/5 p-3" data-testid={`card-application-${a.id}`}>
                     <div className="flex flex-wrap items-center justify-between gap-2">
                       <div>
                         <span className="font-semibold text-parchment">{a.nickname}</span>
                         <span className="text-parchment/40"> · ID {a.player_id}</span>
                       </div>
                       <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${a.status === 'new' ? 'bg-gold/15 text-gold' : a.status === 'contacted' ? 'bg-sky-500/15 text-sky-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{a.status}</span>
                     </div>
                     <div className="mt-1 text-xs text-parchment/60">{ROLE_LABEL(a.type)}{a.request_kind ? ` · ${a.request_kind}` : ''}{a.day ? ` · ${a.day}` : ''}</div>
                     <div className="mt-1 text-[11px] text-parchment/40">{new Date(a.created_at + 'Z').toLocaleString()}</div>
                     {Object.keys(payload).length > 0 && (
                       <div className="mt-2 flex flex-wrap gap-1">
                         {Object.entries(payload).slice(0, 6).map(([k, v]) => (
                           <span key={k} className="rounded bg-ink/60 px-1.5 py-0.5 text-[10px] text-parchment/50">{k}: {String(v)}</span>
                         ))}
                       </div>
                     )}
                     {isAdmin && (
                       <div className="mt-2 flex gap-1.5">
                         <button onClick={() => setStatus(a.id, 'contacted')} className="rounded bg-sky-500/15 px-2 py-1 text-[10px] text-sky-300">Mark contacted</button>
                         <button onClick={() => setStatus(a.id, 'done')} className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300">Mark done</button>
                         <button onClick={() => setStatus(a.id, 'new')} className="rounded bg-white/5 px-2 py-1 text-[10px] text-parchment/50">Reset</button>
                       </div>
                     )}
                   </div>
                 )
               })}
             </div>
           )}
        </div>
      </Panel>
    </div>
  )
}
