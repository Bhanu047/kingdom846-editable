import { useState, useEffect } from 'react'
import { Panel } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const EVENT_DESCRIPTIONS = {
  'Bear Hunt -1': 'First bear hunt rally of the week',
  'Bear Hunt-2': 'Second bear hunt rally of the week',
  'Vikings Vengeance Tuesday': 'Tuesday Vikings Vengeance event',
  'Vikings Vengeance Thursday': 'Thursday Vikings Vengeance event',
  'Tri-Alliance Clash Legion-1': 'First Tri-Alliance Clash of the week',
  'Tri-Alliance Clash Legion-2': 'Second Tri-Alliance Clash of the week',
  'Swordland Showdown Legion-1': 'First Swordland Showdown of the week',
  'Swordland Showdown Legion-2': 'Second Swordland Showdown of the week',
}

const HOURS = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function LeaderPortal() {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    apiJson('/api/leader/schedule')
      .then((d) => { if (active) { setSchedule(d.schedule); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function updateTime(event, time) {
    setSchedule(prev => prev.map(s => s.event === event ? { ...s, time } : s))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await apiJson('/api/leader/schedule', {
        method: 'PUT',
        body: JSON.stringify({ schedule })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Panel>
          <div className="h-6 bg-white/5 rounded animate-pulse w-1/3 mb-3" />
          {[1,2,3,4].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse mb-2" />
          ))}
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Panel glow className="gold-corners">
        <RoyalSectionHeader
          icon="clock"
          eyebrow={`${user?.alliance_tag || ''} ${user?.display_name || ''}`}
          title="Event Schedule Manager"
        />
        <p className="text-sm text-parchment/50 mt-1">
          Set the event timing for your alliance. Times are in UTC (24-hour format).
          These show on the Events page and Alliances page for all visitors.
        </p>
      </Panel>

      <Panel>
        <div className="space-y-2">
          {schedule.map((s, i) => (
            <div
              key={s.event}
              className="stagger-in flex items-center gap-3 rounded-lg border border-gold/15 bg-ink-2/50 p-3 hover:border-gold/30 transition"
              style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
            >
              {/* Event icon */}
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                <Icon name="clock" size={16} />
              </div>

              {/* Event name + description */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-parchment/90 truncate">{s.event}</div>
                <div className="text-[10px] text-parchment/40 truncate">
                  {EVENT_DESCRIPTIONS[s.event] || 'Recurring alliance event'}
                </div>
              </div>

              {/* Time picker — 24hr dropdowns */}
              <div className="flex items-center gap-1.5">
                <select
                  value={s.time?.split(':')[0] || ''}
                  onChange={(e) => {
                    const mins = s.time?.split(':')[1] || '00'
                    updateTime(s.event, `${e.target.value}:${mins}`)
                  }}
                  className="bg-ink rounded-md border border-gold/20 px-1.5 py-1.5 text-sm text-parchment outline-none focus:border-gold/50 transition cursor-pointer"
                >
                  <option value="">--</option>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-parchment/40">:</span>
                <select
                  value={s.time?.split(':')[1] || '00'}
                  onChange={(e) => {
                    const hrs = s.time?.split(':')[0] || '00'
                    updateTime(s.event, `${hrs}:${e.target.value}`)
                  }}
                  className="bg-ink rounded-md border border-gold/20 px-1.5 py-1.5 text-sm text-parchment outline-none focus:border-gold/50 transition cursor-pointer"
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="text-[10px] text-parchment/30 ml-0.5">UTC</span>
              </div>

              {/* Status */}
              {s.updated && (
                <span className="hidden sm:flex items-center gap-1 text-[9px] text-gold/40">
                  <span className="pulse-dot" style={{ width: 4, height: 4 }} />
                  Updated
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Save bar */}
        <div className="mt-4 flex items-center justify-between border-t border-gold/15 pt-3">
          <div className="text-[10px] text-parchment/40">
            {saved ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Icon name="shieldCheck" size={12} /> Saved successfully
              </span>
            ) : (
              'Changes are not live until you save'
            )}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary !py-1.5 !text-xs flex items-center gap-1.5"
          >
            <Icon name="refresh" size={12} /> {saving ? 'Saving…' : saved ? 'Saved' : 'Save Schedule'}
          </button>
        </div>
      </Panel>
    </div>
  )
}
