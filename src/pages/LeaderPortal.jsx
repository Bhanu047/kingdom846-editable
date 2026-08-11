import { useState, useEffect } from 'react'
import { Panel } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import Icon from '../components/Icon'
import { apiJson } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const EVENT_META = {
  'Bear Hunt -1': { icon: 'crosshair', desc: 'First bear hunt rally of the week' },
  'Bear Hunt-2': { icon: 'crosshair', desc: 'Second bear hunt rally of the week' },
  'Vikings Vengeance Tuesday': { icon: 'zap', desc: 'Tuesday Vikings Vengeance event' },
  'Vikings Vengeance Thursday': { icon: 'zap', desc: 'Thursday Vikings Vengeance event' },
  'Tri-Alliance Clash Legion-1': { icon: 'layers', desc: 'First Tri-Alliance Clash of the week' },
  'Tri-Alliance Clash Legion-2': { icon: 'layers', desc: 'Second Tri-Alliance Clash of the week' },
  'Swordland Showdown Legion-1': { icon: 'swords', desc: 'First Swordland Showdown of the week' },
  'Swordland Showdown Legion-2': { icon: 'swords', desc: 'Second Swordland Showdown of the week' },
}

function getEventMeta(name) {
  return EVENT_META[name] || { icon: 'flag', desc: 'Recurring alliance event' }
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
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse mb-2" />
          ))}
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-5">
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

      <div className="royal-divider"><span className="royal-divider-icon">◆</span></div>

      <div className="space-y-3">
        {schedule.map((s, i) => {
          const meta = getEventMeta(s.event)
          return (
            <div
              key={s.event}
              className="royal-plaque stagger-in flex items-center gap-4"
              style={{ animationDelay: `${Math.min(i * 0.06, 0.4)}s` }}
            >
              <div className="royal-icon-circle text-gold-bright"><Icon name={meta.icon} size={16} /></div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-display font-semibold text-parchment truncate">{s.event}</div>
                <div className="text-[10px] text-parchment/40 truncate mt-0.5">{meta.desc}</div>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={s.time?.split(':')[0] || ''}
                  onChange={(e) => {
                    const mins = s.time?.split(':')[1] || '00'
                    updateTime(s.event, `${e.target.value}:${mins}`)
                  }}
                  className="royal-select"
                >
                  <option value="">--</option>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-gold/40 font-bold">:</span>
                <select
                  value={s.time?.split(':')[1] || '00'}
                  onChange={(e) => {
                    const hrs = s.time?.split(':')[0] || '00'
                    updateTime(s.event, `${hrs}:${e.target.value}`)
                  }}
                  className="royal-select"
                >
                  {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="royal-time-label ml-1">UTC</span>
              </div>

              {s.updated && (
                <span className="hidden sm:flex items-center gap-1 text-[9px] text-emerald-400/70">
                  <span className="pulse-dot" style={{ width: 4, height: 4 }} />
                  Updated
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="royal-divider"><span className="royal-divider-icon">✦</span></div>

      <Panel className="flex items-center justify-between">
        <div className="text-[11px] text-parchment/50">
          {saved ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Icon name="shieldCheck" size={14} /> Schedule saved — changes are now live
            </span>
          ) : (
            'Changes are not live until you save'
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary btn-royal !py-2 !text-xs flex items-center gap-2"
        >
          <Icon name="refresh" size={14} /> {saving ? 'Saving…' : saved ? 'Saved' : 'Save Schedule'}
        </button>
      </Panel>
    </div>
  )
}
