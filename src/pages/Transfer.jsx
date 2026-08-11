import { useState } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { Embers } from '../components/Embers'
import { useAuth } from '../context/AuthContext'
import { apiJson, apiDownload } from '../lib/api'

export default function Transfer() {
  const { user } = useAuth()
  const isLeadership = user?.role === 'admin' || user?.role === 'leader'
  const [form, setForm] = useState({ name: '', game_id: '', discord: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setSubmitting(true)
    try {
      await apiJson('/api/transfers', { method: 'POST', body: JSON.stringify(form) })
      setDone(true)
      setForm({ name: '', game_id: '', discord: '', note: '' })
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Panel glow className="reveal-clip aurora-border relative overflow-hidden p-0">
        <div className="relative h-52">
          <img src="./assets/banner-icehunters.png" alt="Transfer to 846" className="h-full w-full drift-slow object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
          <Embers count={12} />
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center p-6 md:p-10">
            <div className="eyebrow">Recruitment Open</div>
            <h1 className="shimmer-text glow-pulse mt-2 font-display text-3xl font-bold md:text-4xl">Transfer to Kingdom 846</h1>
            <p className="mt-2 text-sm text-gold/90">because your power deserves a better home</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <Panel className="reveal-clip lg:col-span-2">
          <SectionTitle eyebrow="Apply" title="Transfer Request" />
          {done ? (
            <div className="rounded-lg border border-gold/30 bg-gold/10 p-6 text-center">
              <Icon name="shieldCheck" size={28} className="mx-auto text-gold" />
              <h3 className="mt-2 font-display text-lg text-parchment">Request received</h3>
              <p className="mt-1 text-sm text-parchment/60">A recruitment officer will reach out on Discord to confirm.</p>
              <button onClick={() => setDone(false)} className="btn-secondary mt-4">Submit another</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="In-game Name" value={form.name} onChange={set('name')} placeholder="Your governor name" required />
                <Input label="Player ID" value={form.game_id} onChange={set('game_id')} placeholder="e.g. 123456789" required />
              </div>
              <Input label="Discord" value={form.discord} onChange={set('discord')} placeholder="username or discord.id" required />

              <div>
                <label className="text-[10px] uppercase tracking-wider text-parchment/50">Note (optional)</label>
                <textarea value={form.note} onChange={set('note')} rows={3} placeholder="Current power, KV experience, timezone…" className="mt-1 w-full rounded-md border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60" />
              </div>
              {error && <div className="rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                <Icon name="arrow" size={14} /> {submitting ? 'Sending…' : 'Submit Transfer Request'}
              </button>
              <p className="text-center text-[11px] italic text-gold/70">because your power deserves a better home</p>
            </form>
          )}
        </Panel>

        {/* Why 846 */}
        <Panel className="reveal-clip">
          <SectionTitle eyebrow="Why 846" title="A Realm That Shows Up" />
          <ul className="space-y-3 text-sm text-parchment/70">
            {[
              ['shield', 'Active 24/7 across four time-zoned alliances'],
              ['swords', 'Coordinated KV rallies and Castle Battle calls'],
              ['users', 'Mature, organized community with real leadership'],
              ['sparkles', 'S-Tier kingdom ranked in the global top 3.3%'],
            ].map(([icon, text]) => (
              <li key={icon} className="lift flex items-start gap-3 rounded-lg bg-white/5 p-3">
                <Icon name={icon} size={16} className="mt-0.5 text-gold" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {isLeadership && <TransferMonitor isAdmin={user.role === 'admin'} />}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</span>
      <input {...props} className="mt-1 w-full rounded-md border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60" />
    </label>
  )
}

// Leadership (admin + leaders) monitor incoming transfer requests + CSV download
export function TransferMonitor({ isAdmin }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    try { setItems(await apiJson('/api/transfers')) } catch (e) { setError(e.message) }
    setLoaded(true)
  }
  const toggle = () => { if (!open) load(); setOpen(!open) }
  const setStatus = async (id, status) => {
    try { await apiJson(`/api/transfers/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load() }
    catch (e) { setError(e.message) }
  }
  const download = async () => {
    setDownloading(true); setError(null)
    try { await apiDownload('/api/transfers/export', 'kingdom846-transfers.csv') }
    catch (e) { setError(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <Panel className="reveal-clip">
      <button onClick={toggle} className="flex w-full items-center justify-between">
        <SectionTitle eyebrow={isAdmin ? 'Admin' : 'Leadership'} title="Transfer Requests" />
        <Pill tone="gold">{open ? 'Hide' : 'View'} ({items.length || '…'})</Pill>
      </button>
      {open && (
        <div className="mt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button onClick={download} disabled={downloading} className="btn-secondary" data-testid="button-download-transfers">
              <Icon name="download" size={14} /> {downloading ? 'Preparing…' : 'Download CSV'}
            </button>
            <span className="text-[11px] text-parchment/50">Signed in as {user?.display_name || user?.username}{isAdmin ? ' (Sparta)' : ''}</span>
          </div>
          {error && <div className="mb-2 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}
          {!loaded ? <p className="text-sm text-parchment/50">Loading…</p> :
           items.length === 0 ? <p className="text-sm text-parchment/50">No transfer requests yet.</p> :
           <div className="space-y-2">
             {items.map((t) => (
               <div key={t.id} className="lift rounded-lg border border-gold/15 bg-white/5 p-3">
                 <div className="flex flex-wrap items-center justify-between gap-2">
                   <div>
                     <span className="font-semibold text-parchment">{t.name}</span>
                     <span className="text-parchment/40"> · ID {t.game_id}</span>
                   </div>
                   <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${t.status === 'new' ? 'bg-gold/15 text-gold' : t.status === 'contacted' ? 'bg-sky-500/15 text-sky-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{t.status}</span>
                 </div>
                 <div className="mt-1 text-xs text-parchment/60">Discord: {t.discord}</div>
                 {t.note && <div className="mt-1 text-xs text-parchment/40">{t.note}</div>}
                 {isAdmin && (
                   <div className="mt-2 flex gap-1.5">
                     <button onClick={() => setStatus(t.id, 'contacted')} className="rounded bg-sky-500/15 px-2 py-1 text-[10px] text-sky-300">Mark contacted</button>
                     <button onClick={() => setStatus(t.id, 'done')} className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300">Mark done</button>
                   </div>
                 )}
               </div>
             ))}
           </div>}
        </div>
      )}
    </Panel>
  )
}
