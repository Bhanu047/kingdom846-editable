import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Pill } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import RallyConsole from '../components/RallyConsole'
import RallyApproach, { useApproachPreview } from '../components/RallyApproach'
import { parseMarchTime, normalizeMarchTime } from '../lib/marchTime'

const STORAGE_KEY = 'k846-shoni-war-room-v1'   // legacy: one bare array of whales
// The groups the room last saw, plus which tab THIS device was looking at.
// Since the roster became shared this is a cache, not the record: the server
// holds the groups, and the active tab is deliberately not shared -- Panini
// reading the counter rally must not drag Shoni's screen off the main one.
const GROUPS_KEY = 'k846-war-room-groups-v1'
const POLL_MS = 6000
const STATUS_OPTIONS = ['RYO', 'KzK', 'SAS', 'ICE', 'HUN', 'Castle Garrison', 'East Turret Garrison', 'West Turret Garrison', 'North Turret Garrison', 'South Turret Garrison', 'Undeployed']
const STATUS_TONE = {
  RYO: 'gold', KzK: 'red', SAS: 'red', ICE: 'blue', HUN: 'green',
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
  if(!canUseWarRoom) return <div className="grid place-items-center py-20"><Panel glow className="max-w-lg text-center"><Icon name="shieldCheck" size={34} className="mx-auto text-gold mb-3"/><h1 className="font-display text-2xl font-bold text-parchment">Private War Room</h1><p className="mt-2 text-sm text-parchment/50">This command room is reserved for Sparta admin and the war room crew.</p></Panel></div>
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

  return <div className="space-y-5">
    {/* The hero is the room's front door, not part of the operation. Once a
        rally is live it is 290px of scenery above the only three things that
        matter, so it stands down for the duration. */}
    {!running&&<Panel glow className="gold-corners overflow-hidden p-0">
      <div className="relative min-h-[132px] overflow-hidden md:min-h-[250px]">
        <img src="./assets/strategy-war-academy.webp" alt="Kingdom 846 royal war command room" className="absolute inset-0 h-full w-full object-cover drift-slow" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/35" />
        <div className="absolute inset-0" style={{background:'radial-gradient(circle at 72% 35%, rgba(212,175,55,.18), transparent 36%)'}} />
        <div className="relative z-10 flex min-h-[132px] max-w-3xl flex-col justify-center p-5 md:min-h-[250px] md:p-8">
          <RoyalSectionHeader icon="swords" eyebrow="[RYO] SHARED COMMAND" title="War Room"/>
          <p className="mt-3 hidden max-w-2xl text-sm leading-relaxed text-parchment/70 md:block">Coordinate synchronized whale rallies from the royal command table. One set of rally groups is shared by the whole command crew — save a march time and every other war room screen picks it up.</p>
          <div className="mt-4 hidden flex-wrap gap-2 md:flex"><Pill tone="gold">Royal Command</Pill><Pill tone="red">Castle Operations</Pill><Pill tone={link === 'live' ? 'green' : 'muted'}>{link === 'live' ? 'Shared · Live' : link === 'offline' ? 'Offline · Local Copy' : 'Connecting…'}</Pill></div>
        </div>
      </div>
    </Panel>}

    {/* Who last changed the plan, which is the first thing a caller asks. */}
    {!running&&<Panel className="flex flex-wrap items-center justify-between gap-3 !py-3">
      <div className="text-xs text-parchment/50">
        Shared with the war room · last saved by <span className="text-gold">{mine ? 'you' : (lastSave.by || '—')}</span>
        {lastSave.at && <span className="text-parchment/35"> · {whenText(lastSave.at)}</span>}
      </div>
      <div className="text-xs text-parchment/40">{dirty ? 'Unsaved changes on this device' : link === 'offline' ? 'Reconnecting…' : link === 'live' ? 'In sync with the room' : 'Loading…'}</div>
    </Panel>}

    {!running&&incoming&&<Panel className="border-amber-400/40 !py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-amber-200">
          {(incoming.updated_by || 'Someone')} saved newer rally groups{whenText(incoming.updated_at) ? ` ${whenText(incoming.updated_at)}` : ''}. Loading them replaces what you have typed here.
        </div>
        <div className="flex gap-2">
          <button onClick={() => applyRemote(incoming)} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">Load theirs</button>
          <button onClick={() => saveRoster(groups, true)} disabled={saving} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-40">Keep mine &amp; overwrite</button>
        </div>
      </div>
    </Panel>}

    {!running&&cacheOffer&&!incoming&&<Panel className="!py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-parchment/60">The room is empty, but this device still holds {countWhales(cacheOffer)} whale{countWhales(cacheOffer) === 1 ? '' : 's'} from before the roster was shared.</div>
        <div className="flex gap-2">
          <button onClick={() => saveRoster(cacheOffer, true)} disabled={saving} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10 disabled:opacity-40">Publish to the room</button>
          <button onClick={() => setCacheOffer(null)} className="rounded-lg border border-gold/15 px-3 py-1.5 text-xs text-parchment/50 hover:bg-white/5">Dismiss</button>
        </div>
      </div>
    </Panel>}

    {!running?<><Panel><div className="flex items-center justify-between gap-3 mb-3"><div className="eyebrow">Rally Groups</div>{groups.length>1&&<button onClick={removeGroup} className="rounded-md border border-rose-500/25 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/10">Delete group</button>}</div><div className="flex flex-wrap gap-2">{groups.map(g=><button key={g.id} onClick={()=>setActiveId(g.id)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${g.id===activeId?'border-gold/70 bg-gold/15 text-gold-bright':'border-gold/20 text-parchment/60 hover:bg-white/5'}`}>{g.name||'Untitled'}</button>)}<button onClick={addGroup} className="rounded-lg border border-gold/20 px-3 py-2 text-xs text-parchment/50 hover:bg-white/5">+ New group</button></div><input value={active?.name||''} onChange={e=>renameGroup(e.target.value)} aria-label="Group name" className="mt-3 w-full rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"/></Panel>
    {sequence.length>0&&<Panel><div className="flex items-center justify-between gap-3 mb-3"><div className="eyebrow">Synchronized Call Order</div><button onClick={playPreview} className="rounded-lg border border-gold/30 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-gold transition hover:bg-gold/10">Preview the approach</button></div><div className="space-y-2">{sequence.map((w,i)=><div key={w.id} className="stagger-in royal-plaque flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-gold/30 text-xs font-bold text-gold">{i+1}</span><span className="flex-1 font-semibold text-parchment">{w.name}</span><span className="font-mono text-xs text-parchment/50">march {w.march}</span><span className="font-mono text-xs text-gold">call +{w.offset}s</span></div>)}</div></Panel>}<button onClick={startRally} disabled={!sequence.length} className="btn-primary w-full !py-4 !text-base disabled:opacity-30">Start Synced Rally {sequence.length?`(${sequence.length})`:''}</button>
    <Panel><div className="flex items-center justify-between gap-3 mb-4"><div><div className="eyebrow">Whale Roster</div><div className="text-xs text-parchment/40 mt-1">March time format: M:SS</div></div><button onClick={addWhale} className="btn-primary !py-1.5 !text-xs">+ Add Whale</button></div><div className="space-y-2">{whales.map(w=><div key={w.id} className="stagger-in royal-plaque flex flex-wrap items-center gap-2"><input type="checkbox" checked={!!selected[w.id]} onChange={()=>setSelected(s=>({...s,[w.id]:!s[w.id]}))} className="h-4 w-4 accent-[#D4AF37]"/><input value={w.name} onChange={e=>updateWhale(w.id,'name',e.target.value)} className="min-w-32 flex-1 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"/><input value={w.march} onChange={e=>updateWhale(w.id,'march',e.target.value)} onBlur={e=>normalizeMarch(w.id,e.target.value)} aria-label="March time" className="w-20 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm font-mono text-parchment outline-none focus:border-gold/60"/><select value={w.status} onChange={e=>updateWhale(w.id,'status',e.target.value)} className="royal-select">{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select><Pill tone={STATUS_TONE[w.status]||'muted'}>{w.status}</Pill><button onClick={()=>removeWhale(w.id)} className="rounded-md border border-rose-500/25 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">Delete</button></div>)}{!whales.length&&<div className="py-8 text-center text-sm text-parchment/40">{link==='loading'?'Loading the shared roster…':'No whales saved yet.'}</div>}</div>{error&&<div className="mt-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}<div className="mt-4 flex items-center justify-between gap-3 border-t border-gold/10 pt-4"><span className="text-xs text-parchment/45">{saved?'Saved — the whole room can see it.':`${sequence.length} selected for rally`}</span><button onClick={()=>saveRoster()} disabled={saving} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10 disabled:opacity-40">{saving?'Saving…':'Save Roster'}</button></div></Panel>
    {sequence.length>0&&<RallyApproach sequence={sequence} now={preview ?? 0} impactAt={impactAt} phase="HOLD" />}
    </>:<RallyConsole sequence={sequence} startAt={startRef.current} onAbort={stopRally} onComplete={stopRally}/>}
  </div>
}
