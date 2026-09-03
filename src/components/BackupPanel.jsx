import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import Icon from './Icon'
import { apiJson, apiFetch } from '../lib/api'

/* Backups, in the Master Console.
 *
 * The nightly copy runs whether or not anyone looks at this panel. What the
 * panel is for is the part a server cannot do for you: showing that the copies
 * exist and are recent, and handing one over so a copy can live somewhere other
 * than the disk it was taken from. A backup nobody can see is one nobody trusts,
 * and a backup on the same disk as the original is only half a backup.
 */

function formatBytes(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ageOf(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function BackupPanel() {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    try { setState(await apiJson('/api/admin/backups')); setErr(null) }
    catch (e) { setErr(e.message || 'Could not read the backup list.') }
  }, [])

  useEffect(() => { load() }, [load])

  async function backupNow() {
    setBusy(true); setMsg(null); setErr(null)
    try {
      const result = await apiJson('/api/admin/backups', { method: 'POST' })
      setMsg(`Backed up — ${formatBytes(result.bytes)}, checked and sound.`)
      await load()
    } catch (e) {
      setErr(e.message || 'The backup did not complete.')
    } finally { setBusy(false) }
  }

  // Downloaded through fetch rather than a plain link because the endpoint needs
  // the auth header — a bare <a href> would arrive without it and be refused.
  async function download(name) {
    setErr(null)
    try {
      const res = await apiFetch(`/api/admin/backups/${encodeURIComponent(name)}`)
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoked on the next tick; revoking immediately can cancel the download
      // before the browser has started reading the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setErr(e.message || 'Could not download that backup.')
    }
  }

  const backups = state?.backups || []
  const latest = backups[0]
  // A backup older than a day and a half means the nightly job has not run —
  // worth saying out loud rather than leaving to be noticed.
  const stale = latest && (Date.now() - new Date(latest.taken_at).getTime()) > 36 * 60 * 60 * 1000

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle eyebrow="Safety" title="Database Backups" />
        {latest
          ? <Pill tone={stale ? 'red' : 'green'}>{stale ? 'Out of date' : 'Up to date'}</Pill>
          : <Pill tone="muted">None yet</Pill>}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-parchment/60">
        A copy of the whole kingdom database is taken automatically every day, and each one is
        checked before it is kept. Copies live on the server{state?.keep ? `, newest ${state.keep} kept` : ''}.
        {' '}<strong className="text-gold/80">Download one now and then</strong> — a copy stored somewhere
        else is the only one that survives losing the server itself.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={backupNow} disabled={busy} className="btn-primary !py-1.5 !text-xs disabled:opacity-40">
          {busy ? 'Backing up…' : 'Back up now'}
        </button>
        <span className="text-xs text-parchment/45">
          {latest ? `Last backup ${ageOf(latest.taken_at)}` : 'No backup has been taken yet.'}
          {state?.database_bytes != null && ` · database ${formatBytes(state.database_bytes)}`}
        </span>
      </div>

      {msg && <p className="mt-3 text-xs text-emerald-300/90">{msg}</p>}
      {err && <p className="mt-3 text-xs text-rose-300/90">{err}</p>}

      {stale && (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/5 p-3 text-xs leading-relaxed text-rose-200/90">
          The most recent backup is more than a day old. The automatic copy may have stopped —
          take one now, and check the server logs for <code>[backup]</code>.
        </p>
      )}

      <div className="mt-4 space-y-1.5">
        {backups.length === 0 && (
          <div className="py-6 text-center text-sm text-parchment/40">
            No backups on the server yet. One is taken when the server starts.
          </div>
        )}
        {backups.map((b, i) => (
          <div key={b.name} className="royal-plaque flex flex-wrap items-center gap-x-3 gap-y-1">
            <Icon name="shieldCheck" size={14} className={i === 0 ? 'text-gold' : 'text-parchment/30'} />
            <span className="font-mono text-xs text-parchment/80">{b.name}</span>
            {i === 0 && <Pill tone="gold">Newest</Pill>}
            <span className="ml-auto text-[11px] text-parchment/45 tabular-nums">
              {formatBytes(b.bytes)} · {ageOf(b.taken_at)}
            </span>
            <button
              onClick={() => download(b.name)}
              className="rounded-lg border border-gold/30 px-2.5 py-1 text-[11px] font-semibold text-gold hover:bg-gold/10"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}
