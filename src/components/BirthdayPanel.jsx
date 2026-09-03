import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import Icon from './Icon'
import { apiJson, apiFetch } from '../lib/api'
import { alliances } from '../data/kingdom'

/* Birthdays, in the Master Console.
 *
 * The only thing in here that is not about rallying people. Sparta adds a name,
 * an alliance and a date; on the day the kingdom is told once and the app shows
 * it on the crest.
 *
 * Day and month, never the year. Asking a stranger for their birth year in
 * order to wish them a happy birthday is a bad trade, and nothing here needs it.
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

const prettyDate = (day, month) => `${day} ${MONTHS[month - 1]}`

export default function BirthdayPanel() {
  const [people, setPeople] = useState(null)
  const [settings, setSettings] = useState({ time: '12:00', enabled: true })
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [day, setDay] = useState(new Date().getDate())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await apiJson('/api/birthdays')
      setPeople(data.people || [])
      setSettings(data.settings || { time: '12:00', enabled: true })
      setErr(null)
    } catch (e) { setErr(e.message || 'Could not read the birthday list.'); setPeople([]) }
  }, [])
  useEffect(() => { load() }, [load])

  async function add() {
    if (!name.trim() || busy) return
    setBusy(true); setMsg(null); setErr(null)
    try {
      const r = await apiJson('/api/birthdays', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), alliance_slug: slug || null, day: Number(day), month: Number(month) }),
      })
      const who = name.trim()
      setName(''); setSlug('')
      // Say what actually happened. "Added" alone leaves Sparta wondering
      // whether the kingdom heard, which is the whole reason for entering it.
      setMsg(
        r.announce === 'now' ? `${who} added — the kingdom has just been told.`
        : r.announce === 'scheduled' ? `${who} added — it's today, and the kingdom hears at ${r.announce_time} UTC.`
        : r.announce === 'off' ? `${who} added, but birthday announcements are switched off below.`
        : `${who} added — the kingdom will hear on ${prettyDate(day, month)}.`
      )
      await load()
    } catch (e) { setErr(e.message || 'Could not add that.') } finally { setBusy(false) }
  }

  async function remove(person) {
    setBusy(true); setMsg(null); setErr(null)
    try {
      await apiFetch(`/api/birthdays/${person.id}`, { method: 'DELETE' })
      setMsg(`${person.name} removed.`)
      await load()
    } catch (e) { setErr(e.message || 'Could not remove that.') } finally { setBusy(false) }
  }

  async function saveSettings(next) {
    setBusy(true); setMsg(null); setErr(null)
    try {
      const data = await apiJson('/api/birthday-settings', { method: 'PUT', body: JSON.stringify(next) })
      setSettings(data)
      setMsg(data.enabled ? `Announced at ${data.time} UTC.` : 'Birthday announcements are off.')
    } catch (e) { setErr(e.message || 'Could not save that.') } finally { setBusy(false) }
  }

  // A date that does not exist must not be enterable: 31 February would be a
  // birthday nobody is ever wished.
  const maxDay = DAYS_IN_MONTH[month - 1]
  const safeDay = Math.min(day, maxDay)
  const [hh, mm] = (settings.time || '12:00').split(':')

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle eyebrow="The Kingdom" title="Birthdays" />
        <Pill tone={settings.enabled ? 'green' : 'muted'}>{settings.enabled ? 'On' : 'Off'}</Pill>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-parchment/60">
        Add someone and on the day the whole kingdom gets one notification, and the app shows it on the
        crest when they open it. Day and month only — <strong className="text-gold/80">no year, no age</strong>.
        Add a birthday that is <strong className="text-gold/80">today</strong> and the kingdom is told
        straight away, so finding out late still means they get wished.
      </p>

      {/* Add someone */}
      <div className="royal-plaque mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            placeholder="Player name"
            aria-label="Player name"
            maxLength={60}
            className="min-w-[9rem] flex-1 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"
          />
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="royal-select" aria-label="Alliance">
            <option value="">No alliance</option>
            {alliances.map((a) => <option key={a.slug} value={a.slug}>{a.tag} {a.name}</option>)}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => { const m = Number(e.target.value); setMonth(m); setDay((d) => Math.min(d, DAYS_IN_MONTH[m - 1])) }}
            className="royal-select" aria-label="Birthday month"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={safeDay} onChange={(e) => setDay(Number(e.target.value))} className="royal-select" aria-label="Birthday day">
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={add} disabled={busy || !name.trim()} className="btn-primary ml-auto !py-1.5 !text-xs disabled:opacity-35">
            {busy ? 'Saving…' : 'Add birthday'}
          </button>
        </div>
      </div>

      {/* The list */}
      <div className="mt-3 space-y-1.5">
        {people === null && <div className="py-4 text-center text-sm text-parchment/40">Loading…</div>}
        {people?.length === 0 && (
          <p className="rounded-lg border border-gold/15 bg-white/5 p-3 text-xs leading-relaxed text-parchment/50">
            Nobody yet. Add your leaders and your veterans first — the people whose day the kingdom would
            want to know about.
          </p>
        )}
        {people?.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border border-gold/15 bg-white/5 px-3 py-2">
            <span className="w-24 shrink-0 font-mono text-[11px] tabular-nums text-gold-bright">{prettyDate(p.day, p.month)}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-parchment">{p.name}</span>
            {p.alliance_slug && <span className="setup-tag shrink-0">[{p.alliance_slug.toUpperCase()}]</span>}
            <button
              onClick={() => remove(p)}
              disabled={busy}
              aria-label={`Remove ${p.name}`}
              className="shrink-0 rounded-md border border-rose-500/25 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {msg && <p className="mt-3 text-xs text-emerald-300/90">{msg}</p>}
      {err && <p className="mt-3 text-xs text-rose-300/90">{err}</p>}

      {/* When */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gold/10 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-parchment/40">Announced at</span>
        <select value={hh} onChange={(e) => saveSettings({ time: `${e.target.value}:${mm}` })} className="royal-select" aria-label="Announcement hour">
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="font-bold text-gold/40">:</span>
        <select value={mm} onChange={(e) => saveSettings({ time: `${hh}:${e.target.value}` })} className="royal-select" aria-label="Announcement minute">
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="royal-time-label ml-1">UTC</span>
        <button
          onClick={() => saveSettings({ enabled: !settings.enabled })}
          disabled={busy}
          className="ml-auto rounded-lg border border-gold/25 px-3 py-1.5 text-xs font-semibold text-parchment/70 hover:bg-white/5 disabled:opacity-40"
        >
          {settings.enabled ? 'Turn off' : 'Turn back on'}
        </button>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-parchment/40">
        <Icon name="bell" size={11} className="text-gold/50" />
        Several on one day means one notification naming everybody, not one buzz each.
      </p>
    </Panel>
  )
}
