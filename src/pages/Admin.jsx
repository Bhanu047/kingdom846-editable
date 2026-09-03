import { useState, useEffect } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { buildSchedule, AVATAR_OPTIONS } from '../data/kingdom'
import { apiJson, apiFetch } from '../lib/api'
import { RoyalSectionHeader } from '../components/VisualElements'
import SyncReport from '../components/SyncReport'

const SECTIONS = ['Alliances', 'Players', 'Events', 'Analytics']

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

  /* Which of these times a leader has already overridden.
   *
   * There are two editors for one fact — this page, and the Leader Portal — and
   * a leader's own time wins. Without this, a time typed here would silently do
   * nothing while the phones kept announcing the leader's, which is a version
   * of the bug that had [RYO] hearing 12:00 for a 21:30 Bear Hunt.
   */
  const [overrides, setOverrides] = useState({})
  useEffect(() => {
    let cancelled = false
    apiJson('/api/alliance-schedules')
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return
        const map = {}
        for (const r of rows) {
          for (const item of r.schedule || []) {
            if (item.source === 'leader') map[`${r.alliance_slug}|${item.event}`] = item.time
          }
        }
        setOverrides(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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
                        {schedule.map((s, si) => {
                          const overridden = overrides[`${a.slug}|${s.event}`]
                          return (
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
                            {overridden && overridden !== s.time && (
                              <span className="mt-1 block text-[10px] leading-snug text-amber-300/80">
                                The leader has set {overridden} — that is what will be sent, not this.
                              </span>
                            )}
                          </label>
                          )
                        })}
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
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-parchment/50">Avatar</label>
                      <select
                        value={p.avatar || 'warrior'}
                        onChange={(e) => update(['players', i, 'avatar'], e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60"
                      >
                        {AVATAR_OPTIONS.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                      </select>
                    </div>
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
                <button onClick={() => setDraft((prev) => { const next = structuredClone(prev); next.players.push({ rank: next.players.length + 1, name: 'New Player', tag: '', alliance: '', slug: '', avatar: 'warrior' }); return next })}
                  className="btn-secondary">+ Add Player</button>
              </div>
            )}

            {section === 'Analytics' && <Analytics />}

            {section === 'Events' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-parchment">Manage Events</div>
                    <div className="text-[11px] text-parchment/45">Add upcoming events or remove completed events, then click Save Changes.</div>
                  </div>
                  <button onClick={() => setDraft((prev) => {
                    const next = structuredClone(prev)
                    next.events.push({
                      id: `event-${Date.now()}`,
                      title: 'New Event',
                      category: 'Event',
                      date: new Date().toISOString().slice(0, 10),
                      time: '',
                      featured: false,
                      art: './assets/hero-events.webp',
                      desc: ''
                    })
                    return next
                  })} className="btn-secondary">+ Add Event</button>
                </div>

                {draft.events.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gold/20 bg-white/[0.02] p-6 text-center text-sm text-parchment/45">
                    No events listed. Use <span className="text-gold">+ Add Event</span> to create one.
                  </div>
                )}

                {draft.events.map((ev, i) => (
                  <Row key={ev.id || i} onDelete={() => setDraft((prev) => {
                    const next = structuredClone(prev)
                    next.events.splice(i, 1)
                    return next
                  })}>
                    <Field label="Title" value={ev.title} onChange={(v) => update(['events', i, 'title'], v)} />
                    <Field label="Category" value={ev.category} onChange={(v) => update(['events', i, 'category'], v)} />
                    <Field label="Date" value={ev.date} onChange={(v) => update(['events', i, 'date'], v)} />
                    <Field label="Time" value={ev.time} onChange={(v) => update(['events', i, 'time'], v)} />
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

// --- Analytics ---
//
// Reads /api/admin/analytics. Everything shown is an aggregate except the
// member list, which only covers people who chose to log in. There is no
// per-visitor profile to show because the server does not keep one: the
// visitor pseudonym is re-derived daily, so "unique visitors" is answerable
// and "what did this person do last week" deliberately is not.
function Analytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiJson(`/api/admin/analytics?days=${days}`)
      .then((d) => { if (!cancelled) { setData(d); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days])

  if (loading && !data) return <p className="text-sm text-parchment/50">Loading analytics…</p>
  if (error) return <p className="text-sm text-red-300/80">{error}</p>
  if (!data) return null

  // The CSV route needs the auth header, so it cannot be a plain link.
  const exportCsv = async () => {
    try {
      const res = await apiFetch(`/api/admin/analytics/export?days=${days}`)
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `kingdom846-analytics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) { setError(e.message) }
  }

  const ago = (ts) => {
    const m = Math.round((Date.now() - ts) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.round(m / 60)
    return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`
  }
  const peak = Math.max(1, ...data.series.map((d) => d.visitors || 0))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RoyalSectionHeader title="Traffic" subtitle="Self-hosted · no third-party trackers" />
        <div className="flex items-center gap-1.5">
          {data.live > 0 && (
            <span className="mr-1 inline-flex items-center gap-1.5 rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {data.live} now
            </span>
          )}
          <button onClick={exportCsv}
            className="mr-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-parchment/50 transition hover:bg-white/5 hover:text-gold-bright">
            CSV
          </button>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${days === d ? 'bg-gold/15 text-gold' : 'text-parchment/50 hover:bg-white/5'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[['Today', data.today, null], ['Last 7 days', data.week, null],
          [`Last ${data.days} days`, data.selected, data.previous]].map(([label, w, prev]) => {
          // Only the selected window has a comparable previous period.
          const delta = prev && prev.visitors > 0
            ? Math.round(((w.visitors - prev.visitors) / prev.visitors) * 100) : null
          return (
            <div key={label} className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-parchment/40">{label}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-2xl text-gold-bright">{w.visitors.toLocaleString()}</span>
                {delta !== null && (
                  <span className={`text-[11px] font-semibold ${delta >= 0 ? 'text-emerald-300/80' : 'text-red-300/80'}`}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                  </span>
                )}
              </div>
              <div className="text-[10px] text-parchment/45">
                visitors · {w.pageviews.toLocaleString()} views
                {delta !== null ? <span className="text-parchment/30"> · vs previous {data.days}d</span> : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Visit-level quality. Counts alone cannot tell you whether people stayed. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Visits', data.engagement.visits.toLocaleString(), 'sessions, 30-min gap'],
          ['Bounce rate', `${data.engagement.bounceRate}%`, 'left after one page'],
          ['Pages / visit', data.engagement.pagesPerVisit, 'average'],
          ['Typical visit', data.engagement.medianSeconds >= 60
            ? `${Math.round(data.engagement.medianSeconds / 60)}m`
            : `${data.engagement.medianSeconds}s`, 'median, multi-page visits'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
            <div className="text-[10px] uppercase tracking-wider text-parchment/40">{label}</div>
            <div className="mt-0.5 font-display text-xl text-parchment/90">{value}</div>
            <div className="text-[9px] text-parchment/35">{note}</div>
          </div>
        ))}
      </div>

      {/* Bars rather than a chart library: one dependency-free row per day. */}
      <div className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-parchment/40">Visitors per day</div>
        {data.series.length === 0 ? (
          <p className="text-[11px] text-parchment/40">No traffic recorded yet.</p>
        ) : (
          <div className="flex h-24 items-end gap-[2px]">
            {data.series.map((d) => (
              <div key={d.day} className="group relative flex-1 rounded-t bg-gold/30 transition hover:bg-gold/60"
                style={{ height: `${Math.max(3, (d.visitors / peak) * 100)}%` }}
                title={`${d.day}: ${d.visitors} visitors, ${d.pageviews} views`} />
            ))}
          </div>
        )}
      </div>

      <ActivityGrid rows={data.activity} />

      {data.livePages.length > 0 && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.03] p-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-emerald-200/50">On the site right now</div>
          <div className="flex flex-wrap gap-2">
            {data.livePages.map((r) => (
              <span key={r.name} className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-100/80">
                {r.name} <span className="text-emerald-200/50">· {r.visitors}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <RankList title="Top pages" rows={data.pages} unit="views" valueKey="hits" />
        <RankList title="Battle Lab tools" rows={data.tools} unit="opens" valueKey="hits" />
        <RankList title="Actions" rows={data.actions} unit="times" valueKey="hits" />
        <RankList title="Entry pages" rows={data.entries} unit="visits" valueKey="hits" />
        <RankList title="Traffic sources" rows={data.referrers} unit="visitors" valueKey="visitors" empty="All direct — no external referrers." />
        <RankList title="Campaign links" rows={data.campaigns} unit="visitors" valueKey="visitors" empty="Add ?utm_source=discord to a shared link to track it here." />
        <RankList title="Countries" rows={data.countries} unit="visitors" valueKey="visitors" empty="Your host is not sending a country header." />
        <RankList title="Links out" rows={data.outbound} unit="clicks" valueKey="hits" empty="No outbound clicks yet." />
        <RankList title="Dead links" rows={data.notFound} unit="hits" valueKey="hits" empty="No broken routes — good." />
        <RankList title="Devices" rows={data.devices} unit="visitors" valueKey="visitors" />
        <RankList title="Browsers" rows={data.browsers} unit="visitors" valueKey="visitors" />
      </div>

      <RoyalSectionHeader title="Members" subtitle="Only people who logged in" />
      <div className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
        {data.members.length === 0 ? (
          <p className="text-[11px] text-parchment/40">No member activity in this window.</p>
        ) : (
          <div className="space-y-1.5">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate text-parchment/80">
                  {m.alliance_tag ? <span className="text-gold-bright/60">{m.alliance_tag} </span> : null}
                  {m.display_name || m.username}
                  <span className="text-parchment/30"> · {m.role}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-parchment/45">
                  {m.pageviews} views · {ago(m.last_seen)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
        <summary className="cursor-pointer list-none text-[10px] uppercase tracking-wider text-gold-bright/50 hover:text-gold-bright/80">
          Recent member activity <span className="text-parchment/30">({data.recent.length})</span>
        </summary>
        <div className="mt-2 space-y-1">
          {data.recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate text-parchment/65">
                {r.display_name || r.username}
                <span className="text-parchment/30"> — {r.kind} </span>
                <span className="font-mono text-parchment/55">{r.name}{r.detail ? ` (${r.detail})` : ''}</span>
              </span>
              <span className="shrink-0 font-mono text-parchment/35">{ago(r.ts)}</span>
            </div>
          ))}
        </div>
      </details>

      <p className="text-[10px] leading-relaxed text-parchment/35">
        Visitors are counted with a pseudonym the server re-derives from the request each day, so the same
        person is a different value tomorrow — daily counts work, cross-day profiling is not possible.
        Raw IPs are never stored. Visitors who send Do Not Track or Global Privacy Control are not recorded
        at all. Event rows are pruned after {data.retentionDays} days, with daily totals kept.
      </p>
    </div>
  )
}

// When the kingdom is online. The server returns UTC buckets; this shifts them
// into the admin's own timezone, which for a game community is the difference
// between a useful chart and a confusing one.
function ActivityGrid({ rows }) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const cells = new Array(168).fill(0)
  // getTimezoneOffset is minutes BEHIND UTC, so a positive value means local is
  // behind and the bucket moves earlier. Rounded to the hour; half-hour zones
  // like IST land on the nearer hour rather than being dropped.
  const shift = -Math.round(new Date().getTimezoneOffset() / 60)
  let max = 0
  for (const r of rows) {
    const i = (((r.dow * 24 + r.hour + shift) % 168) + 168) % 168
    cells[i] += r.visitors
    if (cells[i] > max) max = cells[i]
  }
  const tzName = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'local time' }
  })()

  return (
    <div className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-parchment/40">When the kingdom is online</span>
        <span className="text-[9px] text-parchment/30">{tzName}</span>
      </div>
      {max === 0 ? (
        <p className="text-[11px] text-parchment/35">Not enough traffic yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            {DAYS.map((d, dow) => (
              <div key={d} className="flex items-center gap-[3px]">
                <span className="w-7 shrink-0 text-right text-[9px] text-parchment/35">{d}</span>
                {Array.from({ length: 24 }, (_, h) => {
                  const v = cells[dow * 24 + h]
                  return (
                    <div key={h} className="h-3 flex-1 rounded-[2px]"
                      style={{ backgroundColor: v ? `rgba(226,181,48,${0.12 + (v / max) * 0.75})` : 'rgba(255,255,255,.03)' }}
                      title={`${d} ${String(h).padStart(2, '0')}:00 — ${v} visitor${v === 1 ? '' : 's'}`} />
                  )
                })}
              </div>
            ))}
            <div className="mt-1 flex gap-[3px] pl-7 text-[8px] text-parchment/25">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="flex-1 text-center">{h % 6 === 0 ? h : ''}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RankList({ title, rows, unit, valueKey, empty }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey] || 0))
  return (
    <div className="rounded-xl border border-gold/12 bg-white/[.02] p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-parchment/40">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-parchment/35">{empty || 'Nothing recorded yet.'}</p>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.name} className="relative flex items-center justify-between gap-3 rounded px-1.5 py-1 text-[12px]">
              {/* The bar is a background fill so long names still truncate cleanly. */}
              <div className="absolute inset-y-0 left-0 rounded bg-gold/[.08]" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
              <span className="relative truncate text-parchment/75">{r.name}</span>
              <span className="relative shrink-0 font-mono text-[11px] text-parchment/45">{r[valueKey].toLocaleString()} {unit}</span>
            </div>
          ))}
        </div>
      )}
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'The Royal Advisor encountered an error. Please try again.' }])
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
            Next auto-run: {new Date(agentStatus.next_run).toLocaleTimeString()}</span>
        )}
      </div>

      <SyncReport report={agentStatus?.last_sync} />

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
                <span className="shrink-0 text-gold/60">{log.action}</span>
                <span className="truncate">{log.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="mb-3 max-h-48 overflow-y-auto space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 text-xs ${m.role === 'user' ? 'ml-8 bg-gold/10 text-gold' : 'mr-8 bg-white/5 text-parchment/70'}`}>
              {m.content}
            </div>
          ))}
        </div>
      )}

      {/* Quick prompts */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {prompts.map((p) => (
          <button key={p} onClick={() => setInput(p)} className="rounded-full border border-gold/15 bg-white/5 px-2.5 py-1 text-[10px] text-parchment/60 hover:border-gold/40 hover:text-gold">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder="Ask the Royal Advisor…"
          className="min-w-0 flex-1 rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/30 focus:border-gold/50"
        />
        <button onClick={send} disabled={loading || !input.trim()} className="btn-primary !px-3">
          {loading ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}
