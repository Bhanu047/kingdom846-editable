import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import { apiJson } from '../lib/api'

/* The arena reset time, in the Master Console.
 *
 * Every other event time on this site belongs to an alliance and is set by its
 * leader. The arena belongs to the game server: one time, the same for the whole
 * kingdom. It is a field rather than a constant because it is not something this
 * code can know — Sparta can read it off the game and I cannot — and a daily
 * notification firing at the wrong minute is worse than no notification.
 *
 * Until it is saved once, the panel says plainly that the time is a default
 * nobody has checked, rather than presenting a guess as a setting.
 */
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function ArenaResetPanel() {
  const [state, setState] = useState(null)
  const [draft, setDraft] = useState('00:00')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await apiJson('/api/arena-reset')
      setState(data)
      setDraft(data.time)
      setErr(null)
    } catch (e) { setErr(e.message || 'Could not read the arena reset time.') }
  }, [])
  useEffect(() => { load() }, [load])

  async function save(nextEnabled) {
    setSaving(true); setMsg(null); setErr(null)
    try {
      const data = await apiJson('/api/arena-reset', {
        method: 'PUT',
        body: JSON.stringify({ time: draft, enabled: nextEnabled ?? state?.enabled ?? true }),
      })
      setState(data)
      setDraft(data.time)
      setMsg(data.enabled ? `Saved — reminders at ${data.time} UTC, 10 and 5 minutes before.` : 'Saved — arena reminders are off.')
    } catch (e) {
      setErr(e.message || 'Could not save that.')
    } finally { setSaving(false) }
  }

  const [hh, mm] = (draft || '00:00').split(':')
  const dirty = state && draft !== state.time

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle eyebrow="Realm" title="Arena Reset" />
        {state && (
          <Pill tone={!state.enabled ? 'muted' : state.confirmed ? 'green' : 'red'}>
            {!state.enabled ? 'Off' : state.confirmed ? 'Set' : 'Unconfirmed'}
          </Pill>
        )}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-parchment/60">
        The arena resets once a day for the whole kingdom. Everyone with reminders on gets a
        notification <strong className="text-gold/80">10 minutes</strong> and{' '}
        <strong className="text-gold/80">5 minutes</strong> before, so unspent challenges don't go to waste.
      </p>

      {state && !state.confirmed && (
        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/5 p-3 text-xs leading-relaxed text-rose-200/90">
          This is still the default of {state.time} UTC — nobody has confirmed it against the game.
          Check the real reset time in Kingshot and save it below, or the whole kingdom gets reminded
          at the wrong minute every day.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-parchment/40">Resets at</span>
        <select value={hh} onChange={(e) => setDraft(`${e.target.value}:${mm}`)} className="royal-select" aria-label="Arena reset hour">
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="font-bold text-gold/40">:</span>
        <select value={mm} onChange={(e) => setDraft(`${hh}:${e.target.value}`)} className="royal-select" aria-label="Arena reset minute">
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="royal-time-label ml-1">UTC</span>

        <button onClick={() => save()} disabled={saving} className="btn-primary ml-auto !py-1.5 !text-xs disabled:opacity-40">
          {saving ? 'Saving…' : dirty || !state?.confirmed ? 'Save reset time' : 'Saved'}
        </button>
      </div>

      {state?.enabled !== undefined && (
        <button
          onClick={() => save(!state.enabled)}
          disabled={saving}
          className="mt-3 rounded-lg border border-gold/25 px-3 py-1.5 text-xs font-semibold text-parchment/70 hover:bg-white/5 disabled:opacity-40"
        >
          {state.enabled ? 'Turn arena reminders off for the kingdom' : 'Turn arena reminders back on'}
        </button>
      )}

      {msg && <p className="mt-3 text-xs text-emerald-300/90">{msg}</p>}
      {err && <p className="mt-3 text-xs text-rose-300/90">{err}</p>}
    </Panel>
  )
}
