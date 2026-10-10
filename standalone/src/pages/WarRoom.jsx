import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Pill } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import RallyConsole from '../components/RallyConsole'
import RallyApproach, { useApproachPreview } from '../components/RallyApproach'
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

export default function WarRoom() {
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
  if(!canUseWarRoom) return <div className="grid place-items-center py-20"><Panel glow className="max-w-lg text-center"><Icon name="shieldCheck" size={34} className="mx-auto text-gold mb-3"/><h1 className="font-display text-2xl font-bold text-parchment">Private War Room</h1><p className="mt-2 text-sm text-parchment/50">This command room is reserved for authorized Kingdom 791 members.</p></Panel></div>
  function addWhale(){setWhales(p=>[...p,{id:newId(),name:'New Whale',march:'0:30',status:'Undeployed'}]);touched()}
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
  return <div className="kw">
    {!running&&<section className="kw-hero">
      <img src="/art/war-scene.webp" alt="" className="kw-hero-img"/>
      <div className="kw-hero-shade"/>
      <div className="kw-hero-body">
        <div>
          <p className="k-kicker">Shared Command</p>
          <h1>Rally Command</h1>
          <p className="kw-hero-sub">One roster for the whole crew. Save a march time and every screen updates.</p>
        </div>
        <div className="kw-stats">
          <div><b>{countWhales(groups)}</b><span>Whales</span></div>
          <div><b>{groups.length}</b><span>Groups</span></div>
          <div><b>{selCount}</b><span>Selected</span></div>
          <div className={'kw-link kw-link-'+link}><b><i/>{linkText}</b><span>{dirty?'Unsaved changes':mine?'Saved by you':lastSave.by?'By '+lastSave.by:'Not saved yet'}{lastSave.at&&!dirty?' · '+whenText(lastSave.at):''}</span></div>
        </div>
      </div>
    </section>}

    {!running&&incoming&&<div className="kw-alert">
      <p>{(incoming.updated_by || 'Someone')} saved newer rally groups{whenText(incoming.updated_at) ? ` ${whenText(incoming.updated_at)}` : ''}. Loading them replaces what you typed here.</p>
      <div><button className="kw-btn" onClick={() => applyRemote(incoming)}>Load theirs</button><button className="kw-btn kw-danger" onClick={() => saveRoster(groups, true)} disabled={saving}>Keep mine</button></div>
    </div>}
    {!running&&cacheOffer&&!incoming&&<div className="kw-alert">
      <p>The room is empty, but this device still holds {countWhales(cacheOffer)} whale{countWhales(cacheOffer) === 1 ? '' : 's'} from before.</p>
      <div><button className="kw-btn" onClick={() => saveRoster(cacheOffer, true)} disabled={saving}>Publish to the room</button><button className="kw-btn" onClick={() => setCacheOffer(null)}>Dismiss</button></div>
    </div>}

    {!running?<div className="kw-grid">
      <aside className="kw-launch">
        <div className="kw-card kw-launch-card">
          <p className="k-kicker">Launch</p>
          <h2>Synced Rally</h2>
          <p className="kw-muted">{selCount?`${selCount} whale${selCount===1?'':'s'} armed. Calls are staggered so every march lands together.`:'Tick whales in the roster to arm a rally.'}</p>
          <button onClick={startRally} disabled={!selCount} className="kw-go">Start Synced Rally{selCount?` (${selCount})`:''}</button>
          {selCount>0&&<button onClick={playPreview} className="kw-btn kw-wide">Preview the approach</button>}
        </div>
        {selCount>0&&<div className="kw-card"><p className="k-kicker">Call Order</p>
          <ol className="kw-order">{sequence.map((w,i)=><li key={w.id}><span className="kw-n">{i+1}</span><div><b>{w.name}</b><small>March {w.march}</small></div><em>+{w.offset}s</em></li>)}</ol>
        </div>}
      </aside>

      <section className="kw-main">
        <div className="kw-card">
          <div className="kw-head"><div><p className="k-kicker">Rally Groups</p><h2>Groups</h2></div>{groups.length>1&&<button onClick={removeGroup} className="kw-btn kw-danger">Delete group</button>}</div>
          <div className="kw-tabs">{groups.map(g=><button key={g.id} onClick={()=>setActiveId(g.id)} className={g.id===activeId?'on':''}>{g.name||'Untitled'}<small>{g.whales.length}</small></button>)}<button onClick={addGroup} className="kw-add">+ New group</button></div>
          <input value={active?.name||''} onChange={e=>renameGroup(e.target.value)} aria-label="Group name" className="kw-input" placeholder="Group name"/>
        </div>

        <div className="kw-card">
          <div className="kw-head"><div><p className="k-kicker">Whale Roster</p><h2>{active?.name||'Roster'}</h2><p className="kw-muted">March time format M:SS</p></div><button onClick={addWhale} className="kw-btn kw-gold">+ Add whale</button></div>
          <div className="kw-rows">{whales.map((w,i)=><div key={w.id} className={'kw-row'+(selected[w.id]?' sel':'')}>
            <label className="kw-check"><input type="checkbox" checked={!!selected[w.id]} onChange={()=>setSelected(s=>({...s,[w.id]:!s[w.id]}))} aria-label={'Select '+w.name}/><span>{i+1}</span></label>
            <input value={w.name} onChange={e=>updateWhale(w.id,'name',e.target.value)} className="kw-input kw-name" aria-label="Whale name"/>
            <input value={w.march} onChange={e=>updateWhale(w.id,'march',e.target.value)} onBlur={e=>normalizeMarch(w.id,e.target.value)} aria-label="March time" inputMode="numeric" className="kw-input kw-time"/>
            <select value={w.status} onChange={e=>updateWhale(w.id,'status',e.target.value)} className="kw-input kw-status" aria-label="Status">{STATUS_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}</select>
            <button onClick={()=>removeWhale(w.id)} className="kw-x" aria-label={'Delete '+w.name}>&times;</button>
          </div>)}
          {!whales.length&&<div className="kw-empty"><img src="/art/lion-crest.webp" alt=""/><p>{link==='loading'?'Loading the shared roster…':'No whales yet. Add your first whale to start planning.'}</p></div>}</div>
          {error&&<div className="k-err">{error}</div>}
          <div className="kw-foot"><span>{saved?'Saved. The whole room can see it.':`${selCount} selected for rally`}</span><button onClick={()=>saveRoster()} disabled={saving} className="kw-btn kw-gold">{saving?'Saving…':'Save roster'}</button></div>
        </div>
      </section>
      {sequence.length>0&&<div className="kw-approach"><RallyApproach sequence={sequence} now={preview ?? 0} impactAt={impactAt} phase="HOLD" /></div>}
    </div>:<RallyConsole sequence={sequence} startAt={startRef.current} onAbort={stopRally} onComplete={stopRally}/>}
  </div>
}
