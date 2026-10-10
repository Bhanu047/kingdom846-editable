import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Check, X, Play, Eye, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import RallyConsole from '../components/RallyConsole'
import RallyApproach, { useApproachPreview } from '../components/RallyApproach'
import { ALLIANCES } from '../components/brand'
import { parseMarchTime, normalizeMarchTime } from '../lib/marchTime'

const STORAGE_KEY = 'k791-no-legacy-import-v1'   // legacy: one bare array of whales
// The groups the room last saw, plus which tab THIS device was looking at.
// Since the roster became shared this is a cache, not the record: the server
// holds the groups, and the active tab is deliberately not shared -- Panini
// reading the counter rally must not drag Shoni's screen off the main one.
const GROUPS_KEY = 'k791-war-room-groups-v1'
const POLL_MS = 6000
const STATUS_OPTIONS = ['Castle Garrison', 'East Turret Garrison', 'West Turret Garrison', 'North Turret Garrison', 'South Turret Garrison', 'Undeployed']
const STATUS_TONE = {
  'Castle Garrison': 'gold', 'East Turret Garrison': 'blue', 'West Turret Garrison': 'blue',
  'North Turret Garrison': 'blue', 'South Turret Garrison': 'blue', Undeployed: 'muted'
}

function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

// Rosters saved before march times were normalised still hold whatever was
// typed, so tidy on the way in as well as on the way out.
const tidyWhales = (list) => (Array.isArray(list) ? list : []).map((w) => ({
  id: w?.id || newId(),
  name: w?.name || 'Unnamed',
  march: normalizeMarchTime(w?.march),
  status: w?.status || 'Undeployed',
}))
const tidyGroups = (gs) => (Array.isArray(gs) ? gs : []).map((g) => ({
  id: g?.id || newId(),
  name: g?.name || 'Untitled',
  whales: tidyWhales(g?.whales),
}))
const countWhales = (gs) => (gs || []).reduce((n, g) => n + (g.whales?.length || 0), 0)

/** SQLite writes "2026-09-06 16:05:00" in UTC, with no zone marker of its own. */
function whenText(stamp) {
  if (!stamp) return ''
  const at = new Date(`${String(stamp).replace(' ', 'T')}Z`)
  if (isNaN(at)) return ''
  const secs = Math.round((Date.now() - at.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return at.toLocaleString()
}

export default function WarRoom({ onDock }) {
  const { user, canUseWarRoom, getWarRoom, saveWarRoom } = useAuth()
  /* Groups. A castle fight is not one roster -- there is the main rally and
     the counter, and retyping march times between them under fire is how a
     call gets missed. Each group keeps its own whales; everything below reads
     the active one.

     `whales` and `setWhales` keep the exact shapes they had before groups
     existed, so every roster function underneath is untouched. */
  const [groups, setGroups] = useState([])
  const [activeId, setActiveId] = useState(null)
  const active = groups.find((g) => g.id === activeId) || null
  const whales = active?.whales || []
  const setWhales = (updater) => setGroups((gs) => gs.map((g) => (g.id === activeId
    ? { ...g, whales: typeof updater === 'function' ? updater(g.whales) : updater }
    : g)))
  const [selected, setSelected] = useState({}), [running, setRunning] = useState(false), [saved, setSaved] = useState(false)
  /* The room is shared, so the screen has to say what it is showing and where
     it came from. `version` is what the groups on screen were built on: a save
     carries it, and the server refuses one built on groups somebody else has
     already replaced rather than burying theirs. */
  const [version, setVersion] = useState(null)
  const [lastSave, setLastSave] = useState({ by: null, at: null })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [link, setLink] = useState('loading') // loading | live | offline
  // Newer groups that have NOT been applied, because applying them would have
  // deleted what the caller was in the middle of typing. They choose.
  const [incoming, setIncoming] = useState(null)
  const [cacheOffer, setCacheOffer] = useState(null)
  const startRef = useRef(0)
  const dirtyRef = useRef(false)
  const versionRef = useRef(null)
  useEffect(() => { dirtyRef.current = dirty }, [dirty])
  useEffect(() => { versionRef.current = version }, [version])

  const touched = () => { setDirty(true); setSaved(false) }

  // What this device last saw, so the room opens on something while the first
  // request is in flight and still reads when there is no signal at all.
  const readCache = () => {
    try {
      const rawGroups = localStorage.getItem(GROUPS_KEY)
      if (rawGroups) {
        const parsed = JSON.parse(rawGroups)
        if (Array.isArray(parsed?.groups) && parsed.groups.length) {
          return { groups: tidyGroups(parsed.groups), activeId: parsed.activeId }
        }
      }
      // Nobody loses a roster to this change: the single list saved before
      // groups existed becomes the first group.
      const raw = localStorage.getItem(STORAGE_KEY)
      const legacy = raw ? tidyWhales(JSON.parse(raw)) : []
      if (legacy.length) return { groups: [{ id: newId(), name: 'Main rally', whales: legacy }], activeId: null }
    } catch {}
    return { groups: [], activeId: null }
  }

  useEffect(() => {
    const cached = readCache()
    const gs = cached.groups.length ? cached.groups : [{ id: newId(), name: 'Main rally', whales: [] }]
    setGroups(gs)
    setActiveId(gs.some((g) => g.id === cached.activeId) ? cached.activeId : gs[0].id)
  }, [])

  /* Written on every change, not only when Save Roster is pressed. Switching
     group would otherwise throw away whatever had just been typed into the one
     being left, which is a trap rather than a feature. Saving to the ROOM is
     still the explicit button: this is only this device's copy. */
  useEffect(() => {
    if (!groups.length || !activeId) return
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify({ groups, activeId })) } catch {}
  }, [groups, activeId])

  const applyRemote = useCallback((data) => {
    const gs = tidyGroups(data?.groups)
    const next = gs.length ? gs : [{ id: newId(), name: 'Main rally', whales: [] }]
    setGroups(next)
    // Stay on the tab this device was reading if it still exists.
    setActiveId((prev) => (next.some((g) => g.id === prev) ? prev : next[0].id))
    setVersion(data?.version ?? 0)
    setLastSave({ by: data?.updated_by || null, at: data?.updated_at || null })
    setIncoming(null)
    setDirty(false)
    setError(null)
    setLink('live')
    // A whale deleted by somebody else must not stay ticked for a rally.
    const alive = new Set(next.flatMap((g) => g.whales.map((w) => w.id)))
    setSelected((prev) => Object.fromEntries(Object.entries(prev).filter(([id, on]) => on && alive.has(id))))
  }, [])

  // First read, then a poll. The poll is what makes the room shared: a save by
  // any of the crew shows up on every other screen within a few seconds.
  useEffect(() => {
    if (!canUseWarRoom) return
    let alive = true
    const pull = async (first) => {
      try {
        const data = await getWarRoom()
        if (!alive) return
        // Mid-edit, newer groups are offered rather than applied.
        if (dirtyRef.current && !first) {
          if (data.version !== versionRef.current) setIncoming(data)
          setLink('live')
          return
        }
        applyRemote(data)
        if (first && !countWhales(data.groups)) {
          // The room is empty on the server but this device still holds a
          // roster from before it was shared. Offer to publish it -- silently
          // uploading someone's old list would be a surprise.
          const cached = readCache()
          if (countWhales(cached.groups)) setCacheOffer(cached.groups)
        }
      } catch {
        if (!alive) return
        setLink('offline')
      }
    }
    pull(true)
    const id = setInterval(() => { if (!document.hidden) pull(false) }, POLL_MS)
    const onVisible = () => { if (!document.hidden) pull(false) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [canUseWarRoom, getWarRoom, applyRemote])

  const sequence = useMemo(() => { const chosen = whales.filter(w => selected[w.id]).map(w => ({...w, marchSec: parseMarchTime(w.march)})); if (!chosen.length) return []; const longest = Math.max(...chosen.map(w => w.marchSec)); return chosen.map(w => ({...w, offset: Math.max(0, longest-w.marchSec)})).sort((a,b)=>a.offset-b.offset||a.name.localeCompare(b.name)) }, [whales,selected])

  // Every march lands together, so impact is the longest one -- the same
  // number the console lands on, computed here for the preview.
  const impactAt = useMemo(
    () => sequence.reduce((max, w) => Math.max(max, w.offset + (w.marchSec || 0)), 0),
    [sequence],
  )
  // Watching the plan run in four seconds is the same information as reading
  // the offsets, checked rather than trusted.
  const [preview, playPreview] = useApproachPreview(impactAt)
  useEffect(() => { onDock?.(!running); return () => onDock?.(false) }, [running, onDock])
  if (!canUseWarRoom) return <div className="card card-pad"><h1 className="card-title">Private War Room</h1><p className="card-sub">Reserved for authorised Kingdom 791 commanders.</p></div>
  function addWhale(){setWhales(p=>[...p,{id:newId(),name:'New commander',march:'0:30',status:'Undeployed'}]);touched()}
  function updateWhale(id,field,value){setWhales(p=>p.map(w=>w.id===id?{...w,[field]:value}:w));touched()}
  // Only writes when the tidied form actually differs, so tabbing through a
  // roster does not mark it unsaved for no reason.
  function normalizeMarch(id,value){const tidy=normalizeMarchTime(value);if(tidy!==value)updateWhale(id,'march',tidy)}
  function removeWhale(id){setWhales(p=>p.filter(w=>w.id!==id));setSelected(p=>{const n={...p};delete n[id];return n});touched()}
  function addGroup(){const g={id:newId(),name:'New group',whales:[]};setGroups(p=>[...p,g]);setActiveId(g.id);touched()}
  function renameGroup(v){setGroups(p=>p.map(g=>g.id===activeId?{...g,name:v}:g));touched()}
  function removeGroup(){if(groups.length<2)return;const next=groups.filter(g=>g.id!==activeId);setGroups(next);setActiveId(next[0].id);touched()}

  // Saving publishes to the whole room. `force` is the second press, after the
  // caller has been shown the groups they would be replacing.
  async function saveRoster(list = groups, force = false) {
    setSaving(true)
    setError(null)
    try {
      const data = await saveWarRoom(list, force ? undefined : version)
      applyRemote(data)
      setCacheOffer(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      if (err.conflict) { setIncoming(err.conflict); setError(err.message) }
      else { setError(err.message); setLink('offline') }
    } finally { setSaving(false) }
  }
  // Three seconds of arming before the first call, so the caller can settle
  // into the screen rather than being shouted at the instant they tap.
  function startRally(){if(!sequence.length)return;startRef.current=Date.now()+3000;setRunning(true)}
  function stopRally(){setRunning(false)}


  const mine = (lastSave.by || '').toLowerCase() === String(user?.display_name || user?.username || '').toLowerCase()
  const linkText = link === 'live' ? 'Live' : link === 'offline' ? 'Offline' : 'Connecting'
  const selCount = sequence.length
  const total = countWhales(groups)
  const saveLine = dirty ? 'Unsaved changes on this device'
    : lastSave.by ? `Saved by ${mine ? 'you' : lastSave.by}${lastSave.at ? ' · ' + whenText(lastSave.at) : ''}`
    : 'Not saved to the room yet'
  const allArmed = whales.length > 0 && whales.every((w) => selected[w.id])
  const toggleAll = () => setSelected((s) => {
    const n = { ...s }
    for (const w of whales) n[w.id] = !allArmed
    return n
  })

  if (running) return (
    <div className="console-wrap">
      <RallyConsole sequence={sequence} startAt={startRef.current} onAbort={stopRally} onComplete={stopRally} />
    </div>
  )

  const launchPanel = (
    <section className="card card-pad launch" aria-labelledby="launch-title">
      <p className="kicker">Synced launch</p>
      <h2 id="launch-title" className="card-title">{selCount ? `${selCount} march${selCount === 1 ? '' : 'es'} armed` : 'No marches armed'}</h2>
      <p className="card-sub">{selCount ? 'Calls are staggered so every march lands together.' : 'Tick commanders in the roster to arm a rally.'}</p>
      <div className="launch-figs">
        <div><b>{selCount}</b><span>Armed</span></div>
        <div><b>{selCount ? formatClock(impactAt) : '—'}</b><span>Impact after start</span></div>
      </div>
      <div className="btns">
        <button onClick={startRally} disabled={!selCount} className="btn btn-war btn-lg btn-block"><Play size={16} fill="currentColor" />Start synced rally</button>
        {selCount > 0 && <button onClick={playPreview} className="btn btn-block"><Eye size={16} />Preview the approach</button>}
      </div>
    </section>
  )

  const orderPanel = selCount > 0 && (
    <section className="card card-pad" aria-labelledby="order-title">
      <div className="card-head"><div><p className="kicker">Call order</p><h2 id="order-title" className="card-title">Firing sequence</h2></div></div>
      <ol className="order">
        {sequence.map((w, i) => (
          <li key={w.id}>
            <span className="n">{i + 1}</span>
            <div style={{ minWidth: 0 }}><b>{w.name}</b><small>March {w.march}</small></div>
            <em>{w.offset ? `+${formatClock(w.offset)}` : 'First'}</em>
          </li>
        ))}
      </ol>
    </section>
  )

  return <div className="wr">
    <section className="hero" aria-labelledby="wr-title">
      <picture><source media="(min-width: 768px)" srcSet="/art/scene-wide.webp" /><img src="/art/scene-castle.webp" alt="" /></picture>
      <div className="hero-in">
        <div className="hero-top">
          <p className="kicker"><span className="k-long">Kingdom 791 · </span>Rally command</p>
          <span className={'live-pill ' + link} role="status"><i />{linkText}</span>
        </div>
        <div className="hero-body">
          <div className="hero-left">
            <div>
              <h1 id="wr-title" className="gilt">War Room</h1>
              <p className="hero-meta">{saveLine}</p>
            </div>
            <div className="stats">
              <div className="stat"><b>{total}</b><span>Roster</span></div>
              <div className="stat"><b>{groups.length}</b><span>Group{groups.length === 1 ? '' : 's'}</span></div>
              <div className={'stat' + (selCount ? ' hot' : '')}><b>{selCount}</b><span>Armed</span></div>
            </div>
          </div>
          <div className="hero-allies" aria-label="Alliances of Kingdom 791">
            <p className="kicker">Alliances of 791</p>
            <div className="row">
              {ALLIANCES.map((a) => <div key={a.tag} className={'chip tone-' + a.tone}><img src={a.emblem} alt="" /><div><b>[{a.tag}]</b><span>{a.name}</span></div></div>)}
            </div>
          </div>
        </div>
      </div>
    </section>

    {incoming && <div className="alert" role="alert">
      <p><b>{incoming.updated_by || 'Someone'}</b> saved newer rally groups{whenText(incoming.updated_at) ? ` ${whenText(incoming.updated_at)}` : ''}. Loading them replaces what you typed here.</p>
      <div><button className="btn btn-sm" onClick={() => applyRemote(incoming)}>Load theirs</button><button className="btn btn-sm btn-danger" onClick={() => saveRoster(groups, true)} disabled={saving}>Keep mine</button></div>
    </div>}
    {cacheOffer && !incoming && <div className="alert">
      <p>The room is empty, but this device still holds {countWhales(cacheOffer)} entr{countWhales(cacheOffer) === 1 ? 'y' : 'ies'} from before.</p>
      <div><button className="btn btn-sm btn-gold" onClick={() => saveRoster(cacheOffer, true)} disabled={saving}>Publish to the room</button><button className="btn btn-sm btn-ghost" onClick={() => setCacheOffer(null)}>Dismiss</button></div>
    </div>}

    <div className="wr-layout">
      <div className="wr-col">
        <section className="card card-pad" aria-labelledby="groups-title">
          <div className="card-head">
            <div><p className="kicker">Coordination</p><h2 id="groups-title" className="card-title">Rally groups</h2></div>
            {groups.length > 1 && <button onClick={removeGroup} className="btn btn-sm btn-danger"><Trash2 size={14} />Delete group</button>}
          </div>
          <div className="groups" role="tablist" aria-label="Rally groups">
            {groups.map((g) => <button key={g.id} role="tab" aria-selected={g.id === activeId} onClick={() => setActiveId(g.id)} className={'gtab' + (g.id === activeId ? ' on' : '')}><span>{g.name || 'Untitled'}</span><small>{g.whales.length}</small></button>)}
            <button onClick={addGroup} className="gtab add"><Plus size={15} />New group</button>
          </div>
          <div className="field">
            <label className="label" htmlFor="group-name">Group name</label>
            <input id="group-name" value={active?.name || ''} onChange={(e) => renameGroup(e.target.value)} className="input" placeholder="e.g. Main rally" maxLength={48} />
          </div>
        </section>

        <section className="card card-pad" aria-labelledby="roster-title">
          <div className="card-head">
            <div><p className="kicker">Roster</p><h2 id="roster-title" className="card-title">{active?.name || 'Roster'}</h2><p className="card-sub">March time as M:SS. Tick a row to arm it.</p></div>
            <button onClick={addWhale} className="btn btn-gold"><Plus size={16} />Add</button>
          </div>
          {whales.length > 0 && <div className="rhead" aria-hidden="true">
            <span style={{ textAlign: 'center' }}>Arm</span><span>Commander</span><span style={{ textAlign: 'center' }}>March</span><span>Garrison</span><span />
          </div>}
          <div className="rlist">
            {whales.map((w, i) => <div key={w.id} className={'rrow' + (selected[w.id] ? ' sel' : '')}>
              <label className="chk c-chk">
                <input type="checkbox" checked={!!selected[w.id]} onChange={() => setSelected((s) => ({ ...s, [w.id]: !s[w.id] }))} aria-label={'Arm ' + w.name} />
                <span className="box"><Check size={15} strokeWidth={3} /></span>
                <em>{i + 1}</em>
              </label>
              <input value={w.name} onChange={(e) => updateWhale(w.id, 'name', e.target.value)} className="input c-name" aria-label={`Name, row ${i + 1}`} maxLength={64} />
              <input value={w.march} onChange={(e) => updateWhale(w.id, 'march', e.target.value)} onBlur={(e) => normalizeMarch(w.id, e.target.value)} aria-label={`March time for ${w.name}`} inputMode="numeric" className="input c-time" maxLength={16} />
              <div className="stat-wrap" data-tone={STATUS_TONE[w.status] || 'muted'}>
                <select value={w.status} onChange={(e) => updateWhale(w.id, 'status', e.target.value)} className="input" aria-label={`Garrison for ${w.name}`}>{STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
              </div>
              <button onClick={() => removeWhale(w.id)} className="del c-del" aria-label={'Remove ' + w.name}><X size={18} /></button>
            </div>)}
            {!whales.length && <div className="empty">
              <img src="/art/lion-crest-sm.webp" alt="" />
              <p>{link === 'loading' ? 'Loading the shared roster…' : 'This group is empty. Add the commanders who will march in this rally.'}</p>
              {link !== 'loading' && <button onClick={addWhale} className="btn btn-gold"><Plus size={16} />Add first commander</button>}
            </div>}
          </div>
          {error && <p className="notice notice-bad" role="alert" style={{ marginTop: 12 }}>{error}</p>}
          <div className="rfoot">
            <span className={'state' + (saved ? ' ok' : dirty ? ' dirty' : '')}><i className="dot" />{saved ? 'Saved — the whole room can see it.' : dirty ? 'Unsaved changes' : 'In sync with the room'}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {whales.length > 1 && <button onClick={toggleAll} className="btn btn-ghost btn-sm">{allArmed ? 'Disarm all' : 'Arm all'}</button>}
              <button onClick={() => saveRoster()} disabled={saving} className="btn btn-gold"><Save size={16} />{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </section>

        <div className="mob-only" style={{ display: 'grid', gap: 12 }}>
          {orderPanel}
          {sequence.length > 0 && <RallyApproach sequence={sequence} now={preview ?? 0} impactAt={impactAt} phase="HOLD" />}
          {selCount > 0 && <button onClick={playPreview} className="btn btn-block"><Eye size={16} />Preview the approach</button>}
        </div>
      </div>

      <aside className="wr-col wr-aside desk-only" aria-label="Launch">
        {launchPanel}
        {orderPanel}
        {sequence.length > 0 && <RallyApproach sequence={sequence} now={preview ?? 0} impactAt={impactAt} phase="HOLD" />}
      </aside>
    </div>

    <div className="dock" role="region" aria-label="Launch">
      <div className="dock-figs">
        <div><b className={selCount ? 'gilt' : ''}>{selCount}</b><span>Armed</span></div>
        <div><b>{selCount ? formatClock(impactAt) : '—'}</b><span>Impact</span></div>
      </div>
      <button onClick={startRally} disabled={!selCount} className="btn btn-war"><Play size={15} fill="currentColor" />Start rally</button>
    </div>
  </div>
}

function formatClock(sec) {
  const n = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}
