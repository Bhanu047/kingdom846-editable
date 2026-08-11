import { useState, useEffect } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { buildSchedule } from '../data/kingdom'

const SECTIONS = ['Alliances', 'Players', 'News', 'Events', 'Guides']

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
                    <div className="sm:col-span-2"><Field label="Description" textarea value={a.desc} onChange={(v) => update(['alliances', i, 'desc'], v)} /></div>
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

            {section === 'News' && (
              <div className="space-y-3">
                {draft.news.map((n, i) => (
                  <Row key={i} onDelete={() => setDraft((p) => { const next = structuredClone(p); next.news.splice(i, 1); return next })}>
                    <Field label="Title" value={n.title} onChange={(v) => update(['news', i, 'title'], v)} />
                    <Field label="Date" value={n.date} onChange={(v) => update(['news', i, 'date'], v)} />
                    <div className="sm:col-span-2"><Field label="Excerpt" textarea value={n.excerpt} onChange={(v) => update(['news', i, 'excerpt'], v)} /></div>
                    <div className="sm:col-span-2"><Field label="Full Dispatch Text" textarea value={n.body} onChange={(v) => update(['news', i, 'body'], v)} /></div>
                  </Row>
                ))}
                <button onClick={() => setDraft((p) => { const next = structuredClone(p); next.news.push({ id: 'n' + Date.now(), title: 'New article', date: 'Today', excerpt: '', body: '' }); return next })}
                  className="btn-secondary">+ Add Article</button>
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

            {section === 'Guides' && (
              <div className="space-y-3">
                {draft.guides.map((g, i) => (
                  <Row key={i}>
                    <Field label="Title" value={g.title} onChange={(v) => update(['guides', i, 'title'], v)} />
                    <Field label="Category" value={g.category} onChange={(v) => update(['guides', i, 'category'], v)} />
                    <div className="sm:col-span-2"><Field label="Excerpt" textarea value={g.excerpt} onChange={(v) => update(['guides', i, 'excerpt'], v)} /></div>
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
