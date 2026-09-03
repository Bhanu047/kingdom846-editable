import { useCallback, useEffect, useState } from 'react'
import { Panel, SectionTitle, Pill } from './ui'
import { apiJson } from '../lib/api'

/* When each kingdom event runs, in the Master Console.
 *
 * These are properties of the game rather than of an alliance — [ICE] cannot
 * move Bear Hunt to a Tuesday, it can only choose what time it musters — so the
 * pattern is set once here and the four leaders keep control of their times.
 *
 * The panel shows the next four dates under every rule as you change it. A
 * recurrence you cannot see the consequences of is one you find out about when
 * three hundred phones buzz on the wrong evening.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const NTH = ['first', 'second', 'third', 'fourth', 'fifth']

const TYPES = [
  { value: 'interval', label: 'Every so many days' },
  { value: 'weekdays', label: 'Certain weekdays' },
  { value: 'monthly', label: 'Once a month' },
]

function describe(rule) {
  if (!rule) return ''
  if (rule.type === 'interval') {
    if (rule.days === 1) return 'every day'
    if (rule.days === 2) return 'every other day — one day of cooldown'
    if (rule.days === 7) return 'once a week'
    if (rule.days === 14) return 'every second week'
    return `every ${rule.days} days`
  }
  if (rule.type === 'weekdays') {
    const days = rule.days || []
    if (!days.length) return 'every day'
    return days.map((d) => WEEKDAYS[d]).join(' and ')
  }
  if (rule.type === 'monthly') return `the ${NTH[(rule.nth || 1) - 1]} ${WEEKDAYS[rule.weekday ?? 6]} of each month`
  return ''
}

function prettyDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export default function EventRepeatPanel() {
  const [rules, setRules] = useState(null)
  const [upcoming, setUpcoming] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiJson('/api/event-repeat')
      setRules(data.rules)
      setUpcoming(data.upcoming || {})
      setErr(null)
    } catch (e) { setErr(e.message || 'Could not read the event schedule.') }
  }, [])
  useEffect(() => { load() }, [load])

  function update(event, patch) {
    setRules((prev) => ({ ...prev, [event]: { ...prev[event], ...patch } }))
    setDirty(true)
    setMsg(null)
  }

  function changeType(event, type) {
    // Each type needs its own fields; switching to one with nothing filled in
    // would otherwise save an incomplete rule the server has to reject.
    const seed = type === 'interval'
      ? { type: 'interval', days: 2, anchor: new Date().toISOString().slice(0, 10) }
      : type === 'monthly'
        ? { type: 'monthly', weekday: 6, nth: 1 }
        : { type: 'weekdays', days: [2, 4] }
    setRules((prev) => ({ ...prev, [event]: seed }))
    setDirty(true)
    setMsg(null)
  }

  function toggleDay(event, day) {
    const days = rules[event]?.days || []
    update(event, { days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort() })
  }

  async function save() {
    setSaving(true); setMsg(null); setErr(null)
    try {
      const data = await apiJson('/api/event-repeat', { method: 'PUT', body: JSON.stringify({ rules }) })
      setRules(data.rules)
      setUpcoming(data.upcoming || {})
      setDirty(false)
      setMsg('Saved — reminders now follow these dates for every alliance.')
    } catch (e) {
      setErr(e.message || 'Could not save that.')
    } finally { setSaving(false) }
  }

  if (!rules) {
    return (
      <Panel className="p-5">
        <SectionTitle eyebrow="Realm" title="Event Schedule" />
        <div className="mt-3 py-6 text-center text-sm text-parchment/40">{err || 'Loading…'}</div>
      </Panel>
    )
  }

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle eyebrow="Realm" title="Event Schedule" />
        {dirty && <Pill tone="red">Unsaved</Pill>}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-parchment/60">
        Which days each event runs, for the whole kingdom. Alliance leaders still set their own
        <strong className="text-gold/80"> times</strong>; this decides the <strong className="text-gold/80">days</strong>,
        because an alliance cannot move a game event. The next four dates are shown under each rule.
      </p>

      <div className="mt-4 space-y-2">
        {Object.keys(rules).map((event) => {
          const rule = rules[event]
          const dates = upcoming[event] || []
          return (
            <div key={event} className="royal-plaque">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-[10rem] flex-1 text-sm font-display font-semibold text-parchment">{event}</span>
                <select value={rule.type} onChange={(e) => changeType(event, e.target.value)} className="royal-select" aria-label={`How ${event} repeats`}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {rule.type === 'interval' && (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-parchment/40">Every</span>
                    <input
                      type="number" min="1" max="365" value={rule.days ?? 2}
                      onChange={(e) => update(event, { days: Number(e.target.value) })}
                      aria-label={`${event}: repeat every how many days`}
                      className="w-16 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm font-mono text-parchment outline-none focus:border-gold/60"
                    />
                    <span className="text-xs text-parchment/50">days, starting</span>
                    <input
                      type="date" value={rule.anchor || ''}
                      onChange={(e) => update(event, { anchor: e.target.value })}
                      aria-label={`${event}: first date`}
                      className="rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm font-mono text-parchment outline-none focus:border-gold/60"
                    />
                  </>
                )}

                {rule.type === 'weekdays' && SHORT.map((label, day) => (
                  <button
                    key={day} type="button" onClick={() => toggleDay(event, day)}
                    aria-pressed={(rule.days || []).includes(day)} title={WEEKDAYS[day]}
                    className={`day-chip ${(rule.days || []).includes(day) ? 'is-on' : ''}`}
                  >{label}</button>
                ))}

                {rule.type === 'monthly' && (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-parchment/40">The</span>
                    <select value={rule.nth ?? 1} onChange={(e) => update(event, { nth: Number(e.target.value) })} className="royal-select" aria-label={`${event}: which week`}>
                      {NTH.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                    </select>
                    <select value={rule.weekday ?? 6} onChange={(e) => update(event, { weekday: Number(e.target.value) })} className="royal-select" aria-label={`${event}: which weekday`}>
                      {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
                    </select>
                    <span className="text-xs text-parchment/50">of each month</span>
                  </>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-gold/10 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-parchment/35">
                  {dirty ? 'Next dates (save to update)' : 'Next'}
                </span>
                {dates.length
                  ? dates.map((iso) => <span key={iso} className="font-mono text-[11px] text-gold-bright tabular-nums">{prettyDate(iso)}</span>)
                  : <span className="text-[11px] text-parchment/35">—</span>}
                <span className="ml-auto text-[11px] italic text-parchment/40">{describe(rule)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {msg && <p className="mt-3 text-xs text-emerald-300/90">{msg}</p>}
      {err && <p className="mt-3 text-xs text-rose-300/90">{err}</p>}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gold/10 pt-4">
        <span className="text-xs text-parchment/45">
          {dirty ? 'Changes are not live until you save.' : 'Reminders follow these dates.'}
        </span>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary !py-1.5 !text-xs disabled:opacity-35">
          {saving ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </Panel>
  )
}
