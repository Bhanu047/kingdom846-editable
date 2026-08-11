import { useState, useEffect } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { buildSchedule } from '../data/kingdom'
import { apiJson } from '../lib/api'
import { RoyalSectionHeader } from '../components/VisualElements'

const SECTIONS = ['Alliances', 'Players', 'Events']

function Field({ label, value, onChange, textarea }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</span>
      {textarea ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3}
          className="mt-1 w-full rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60" />
      ) : (
        <input value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60" />
      )}
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60">
        <option value="" disabled>Select alliance…</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>{o.tag} {o.name}</option>
        ))}
      </select>
    </label>
  )
}

function Row({ children, onDelete }) {
  return (
    <div className="lift rounded-lg border border-gold/15 bg-white/5 p-3">
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
      {onDelete && <button onClick={onDelete} className="mt-2 text-[11px] text-crimson-200 hover:underline">Remove</button>}
    </div>
  )
}

export default function Admin() {
  const { data, saveData, saving, lastSavedAt, loading } = useSiteData()
  const { isAdmin } = useAuth()
  const [section, setSection] = useState('Alliances')
  const [draft, setDraft] = useState(data)

  // Re-sync draft when live data changes (e.g. after save)
  useEffect(() => { setDraft(data) }, [data])

  if (!isAdmin) {
    return (
      <div className="panel p-6 text-center">
        <Icon name="shieldCheck" size={28} className="mx-auto text-gold" />
        <h1 className="mt-2 font-display text-xl text-parchment">Admin access required</h1>
        <p className="mt-1 text-sm text-parchment/50">Only the Sparta account can edit the website.</p>
      </div>
    )
  }

  const update = (path, value) => {
    setDraft((prev) => {
      const next = structuredClone(prev)
      let cur = next
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]]
      cur[path[path.length - 1]] = value
      return next
    })
  }

  const save = async () => {
    await saveData(draft)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(data)

  return (
    <div className="space-y-4">
      <div className="panel aurora-border flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="eyebrow">Admin Console</div>
          <h1 className="font-display text-xl font-bold text-parchment">Website Editor</h1>
        </div>
        <div className="flex items-center gap-2">
          {lastSavedAt && <span className="text-[11px] text-parchment/40">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>}
          <button onClick={save} disabled={saving || !dirty} className="btn-primary">
            <Icon name="refresh" size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* AI Assistant Panel */}
      <AdminAI />

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${section === s ? 'bg-gold/15 text-gold' : 'text-parchment/60 hover:bg-white/5'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="panel p-4">
        {loading ? <p className="text-sm text-parchment/50">Loading…</p> : (
          <>
            {section === 'Alliances' && (
              <div className="space-y-3">
                {draft.alliances.map((a, i) => {
                  const schedule = buildSchedule(a.schedule)
                  return (
                  <Row key={i}>
                    <Field label="Tag" value={a.tag} onChange={(v) => update(['alliances', i, 'tag'], v)} />
                    <Field label="Name" value={a.name} onChange={(v) => update(['alliances', i, 'name'], v)} />
                    <Field label="Leader" value={a.leader} onChange={(v) => update(['alliances', i, 'leader'], v)} />
                    <Field label="Language" value={a.lang} onChange={(v) => update(['alliances', i, 'lang'], v)} />
                    <div className="sm:col-span-2"><Field label="Tagline" value={a.tagline} onChange={(v) => update(['alliances', i, 'tagline'], v)} /></div>
                    <div className="sm:col-span-2 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-parchment/50">Event Schedule (UTC)</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {schedule.map((s, si) => (
                          <label key={si} className="block rounded-lg border border-gold/15 bg-white/5 p-2.5">
                            <span className="text-[10px] text-parchment/40">{s.event}</span>
                            <input
                              value={s.time || ''}
                              placeholder="e.g. 14:00 UTC"
                              onChange={(e) => {
                                const next = schedule.map((row, idx) => idx === si ? { ...row, time: e.target.value } : row)
                                update(['alliances', i, 'schedule'], next)
                              }}
                              className="mt-1 w-full rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </Row>
                  )
                })}
              </div>
            )}

            {section === 'Players' && (
              <div className="space-y-3">
                {draft.players.map((p, i) => (
                  <Row key={i} onDelete={() => setDraft((prev) => { const next = structuredClone(prev); next.players.splice(i, 1); return next })}>
                    <Field label="Position (#)" value={p.rank} onChange={(v) => update(['players', i, 'rank'], Number(v) || v)} />
                    <Field label="Name" value={p.name} onChange={(v) => update(['players', i, 'name'], v)} />
                    <div className="sm:col-span-2">
                      <Select
                        label="Alliance (sets tag + background banner)"
                        value={p.slug}
                        options={draft.alliances}
                        onChange={(slug) => {
                          const a = draft.alliances.find((x) => x.slug === slug)
                          setDraft((prev) => {
                            const next = structuredClone(prev)
                            next.players[i].slug = slug
                            next.players[i].tag = a?.tag || ''
                            next.players[i].alliance = a?.name || ''
                            return next
                          })
                        }}
                      />
                    </div>
                  </Row>
                ))}
                <button onClick={() => setDraft((prev) => { const next = structuredClone(prev); next.players.push({ rank: next.players.length + 1, name: 'New Player', tag: '', alliance: '', slug: '' }); return next })}
                  className="btn-secondary">+ Add Player</button>
              </div>
            )}

            {section === 'Events' && (
              <div className="space-y-3">
                {draft.events.map((ev, i) => (
                  <Row key={i}>
                    <Field label="Title" value={ev.title} onChange={(v) => update(['events', i, 'title'], v)} />
                    <Field label="Category" value={ev.category} onChange={(v) => update(['events', i, 'category'], v)} />
                    <Field label="Date" value={ev.date} onChange={(v) => update(['events', i, 'date'], v)} />
                    <div className="sm:col-span-2"><Field label="Description" textarea value={ev.desc} onChange={(v) => update(['events', i, 'desc'], v)} /></div>
                  </Row>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// --- Admin AI Assistant ---
function AdminAI() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [agentStatus, setAgentStatus] = useState(null)

  // Fetch AI agent status on load
  useEffect(() => {
    apiJson('/api/ai/status').then(setAgentStatus).catch(() => {})
    const id = setInterval(() => apiJson('/api/ai/status').then(setAgentStatus).catch(() => {}), 30000)
    return () => clearInterval(id)
  }, [])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    try {
      const res = await apiJson('/api/ai/admin', {
        method: 'POST',
        body: JSON.stringify({ message: text })
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI not configured. Set GEMINI_API_KEY in Render environment variables.' }])
    } finally {
      setLoading(false)
    }
  }

  async function syncNow() {
    setSyncing(true)
    try {
      const res = await fetch('https://kingdom-846.onrender.com/api/sync-kingshot?key=k846-sync-a7f3e9c2b1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: `Sync complete: ${data.synced?.news || 0} news, ${data.synced?.guides || 0} guides updated.` }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sync failed. Try again later.' }])
    } finally {
      setSyncing(false)
    }
  }

  const prompts = [
    'Summarize kingdom status',
    'What alliances need attention?',
    'What events are next?',
  ]

  return (
    <div className="panel gold-corners p-4">
      <RoyalSectionHeader icon="sparkles" eyebrow="AI Powered" title="Admin Assistant" action={
        <div className="flex items-center gap-2">
          {agentStatus?.last_run && (
            <span className="text-[10px] text-parchment/40">Last run: {new Date(agentStatus.last_run).toLocaleTimeString()}</span>
          )}
          <button onClick={async () => {
            setSyncing(true)
            try { await apiJson('/api/ai/run-agent', { method: 'POST' }); setMessages(prev => [...prev, { role: 'assistant', content: 'Agent triggered manually. Check back in a moment for insights.' }]) }
            catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to trigger agent.' }]) }
            finally { setSyncing(false) }
          }} disabled={syncing} className="btn-secondary !py-1 !text-xs">
            <Icon name="refresh" size={12} /> {syncing ? 'Running…' : 'Run Agent'}
          </button>
        </div>
      } />

      {/* Agent insights */}
      {agentStatus?.insights?.length > 0 && (
        <div className="mb-3 space-y-1">
          {agentStatus.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-gold/10 bg-gold/5 px-3 py-2">
              <span className="text-gold text-xs mt-0.5">◆</span>
              <span className="text-xs text-parchment/70">{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI status badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`pulse-dot ${agentStatus?.configured ? '' : 'opacity-30'}`} style={{ width: 6, height: 6 }} />
        <span className="text-[10px] text-parchment/40">
          {agentStatus?.configured ? 'AI Online' : 'AI Offline — set GEMINI_API_KEY in Render'}
        </span>
        {agentStatus?.next_run && (
          <span className="text-[10px] text-parchment/30 ml-auto">
            Next auto-run: {new Date(agentStatus.next_run).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* AI Activity Log */}
      {agentStatus?.activity_log?.length > 0 && (
        <div className="mb-3 rounded-lg border border-gold/10 bg-ink-2/50 p-2">
          <div className="mb-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-gold/40">
            <span>⚙</span> AI Activity Log
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {agentStatus.activity_log.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-parchment/50">
                <span className="text-gold/40 shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
                <span className="shrink-0 text-gold/60 font-medium">{log.action}</span>
                <span className="truncate">{log.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-3 max-h-48 overflow-y-auto space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${m.role === 'user' ? 'bg-gold/15 text-parchment' : 'bg-ink/60 border border-gold/10 text-parchment/90'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-sm text-parchment/40">Advisor is thinking…</div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {prompts.map(p => (
            <button key={p} onClick={() => setInput(p)} className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-[10px] text-gold/80 hover:bg-gold/10 transition">{p}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
          placeholder="Ask the AI assistant…"
          className="flex-1 rounded-md border border-gold/20 bg-ink/60 px-3 py-1.5 text-sm text-parchment placeholder-parchment/30 outline-none focus:border-gold/60"
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()} className="btn-primary !py-1.5 !text-xs">
          <Icon name="arrow" size={12} />
        </button>
      </div>
    </div>
  )
}
