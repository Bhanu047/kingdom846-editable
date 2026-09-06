import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Pill } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import RallyConsole from '../components/RallyConsole'
import RallyApproach, { useApproachPreview } from '../components/RallyApproach'
import { parseMarchTime, normalizeMarchTime } from '../lib/marchTime'

const STORAGE_KEY = 'k846-shoni-war-room-v1'   // legacy: one bare array of whales
const GROUPS_KEY = 'k846-war-room-groups-v1'   // { groups: [{id,name,whales}], activeId }
const STATUS_OPTIONS = ['RYO', 'KzK', 'SAS', 'ICE', 'HUN', 'Castle Garrison', 'East Turret Garrison', 'West Turret Garrison', 'North Turret Garrison', 'South Turret Garrison', 'Undeployed']
const STATUS_TONE = {
  RYO: 'gold', KzK: 'red', SAS: 'red', ICE: 'blue', HUN: 'green',
  'Castle Garrison': 'gold', 'East Turret Garrison': 'blue', 'West Turret Garrison': 'blue',
  'North Turret Garrison': 'blue', 'South Turret Garrison': 'blue', Undeployed: 'muted'
}

function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export default function WarRoom() {
  const { user, isAdmin } = useAuth()
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
  const startRef = useRef(0)
  // Rosters saved before march times were normalised still hold whatever was
  // typed, so tidy on the way in as well as on the way out.
  useEffect(() => {
    const tidy = (list) => (list || []).map((w) => ({ ...w, march: normalizeMarchTime(w.march) }))
    const fresh = () => { const g = { id: newId(), name: 'Main rally', whales: [] }; setGroups([g]); setActiveId(g.id) }
    try {
      const rawGroups = localStorage.getItem(GROUPS_KEY)
      if (rawGroups) {
        const parsed = JSON.parse(rawGroups)
        if (Array.isArray(parsed?.groups) && parsed.groups.length) {
          const gs = parsed.groups.map((g) => ({ ...g, whales: tidy(g.whales) }))
          setGroups(gs)
          setActiveId(gs.some((g) => g.id === parsed.activeId) ? parsed.activeId : gs[0].id)
          return
        }
      }
      // Nobody loses a roster to this change: the single list saved before
      // groups existed becomes the first group.
      const raw = localStorage.getItem(STORAGE_KEY)
      const legacy = raw ? tidy(JSON.parse(raw)) : []
      const g = { id: newId(), name: 'Main rally', whales: legacy }
      setGroups([g]); setActiveId(g.id)
    } catch { fresh() }
  }, [])

  /* Written on every change, not only when Save Roster is pressed. Switching
     group would otherwise throw away whatever had just been typed into the one
     being left, which is a trap rather than a feature. */
  useEffect(() => {
    if (!groups.length || !activeId) return
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify({ groups, activeId })) } catch {}
  }, [groups, activeId])
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
  if(!isAdmin && user?.username?.toLowerCase()!=='shoni') return <div className="grid place-items-center py-20"><Panel glow className="max-w-lg text-center"><Icon name="shieldCheck" size={34} className="mx-auto text-gold mb-3"/><h1 className="font-display text-2xl font-bold text-parchment">Private War Room</h1><p className="mt-2 text-sm text-parchment/50">This command room is reserved for Sparta admin and Shoni.</p></Panel></div>
  function addWhale(){setWhales(p=>[...p,{id:newId(),name:'New Whale',march:'0:30',status:'Undeployed'}]);setSaved(false)}
  function updateWhale(id,field,value){setWhales(p=>p.map(w=>w.id===id?{...w,[field]:value}:w));setSaved(false)}
  // Only writes when the tidied form actually differs, so tabbing through a
  // roster does not mark it unsaved for no reason.
  function normalizeMarch(id,value){const tidy=normalizeMarchTime(value);if(tidy!==value)updateWhale(id,'march',tidy)}
  function removeWhale(id){setWhales(p=>p.filter(w=>w.id!==id));setSelected(p=>{const n={...p};delete n[id];return n});setSaved(false)}
  function saveRoster(){try{localStorage.setItem(GROUPS_KEY,JSON.stringify({groups,activeId}))}catch{};setSaved(true);setTimeout(()=>setSaved(false),2500)}
  function addGroup(){const g={id:newId(),name:'New group',whales:[]};setGroups(p=>[...p,g]);setActiveId(g.id);setSaved(false)}
  function renameGroup(v){setGroups(p=>p.map(g=>g.id===activeId?{...g,name:v}:g));setSaved(false)}
  function removeGroup(){if(groups.length<2)return;const next=groups.filter(g=>g.id!==activeId);setGroups(next);setActiveId(next[0].id);setSaved(false)}
  // Three seconds of arming before the first call, so the caller can settle
  // into the screen rather than being shouted at the instant they tap.
  function startRally(){if(!sequence.length)return;startRef.current=Date.now()+3000;setRunning(true)}
  function stopRally(){setRunning(false)}
  return <div className="space-y-5">
    <Panel glow className="gold-corners overflow-hidden p-0">
      <div className="relative min-h-[250px] overflow-hidden">
        <img src="./assets/strategy-war-academy.webp" alt="Kingdom 846 royal war command room" className="absolute inset-0 h-full w-full object-cover drift-slow" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/35" />
        <div className="absolute inset-0" style={{background:'radial-gradient(circle at 72% 35%, rgba(212,175,55,.18), transparent 36%)'}} />
        <div className="relative z-10 flex min-h-[250px] max-w-3xl flex-col justify-center p-6 md:p-8">
          <RoyalSectionHeader icon="swords" eyebrow="[RYO] SHONI · PRIVATE COMMAND" title="War Room"/>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-parchment/70">Coordinate synchronized whale rallies from the royal command table. Save march times, select the rally team, and use the live call sequence so every march lands together.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Pill tone="gold">Royal Command</Pill><Pill tone="red">Castle Operations</Pill><Pill tone="blue">Synced Rally</Pill></div>
        </div>
      </div>
    </Panel>
    {!running?<><Panel><div className="flex items-center justify-between gap-3 mb-3"><div className="eyebrow">Rally Groups</div>{groups.length>1&&<button onClick={removeGroup} className="rounded-md border border-rose-500/25 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/10">Delete group</button>}</div><div className="flex flex-wrap gap-2">{groups.map(g=><button key={g.id} onClick={()=>setActiveId(g.id)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${g.id===activeId?'border-gold/70 bg-gold/15 text-gold-bright':'border-gold/20 text-parchment/60 hover:bg-white/5'}`}>{g.name||'Untitled'}</button>)}<button onClick={addGroup} className="rounded-lg border border-gold/20 px-3 py-2 text-xs text-parchment/50 hover:bg-white/5">+ New group</button></div><input value={active?.name||''} onChange={e=>renameGroup(e.target.value)} aria-label="Group name" className="mt-3 w-full rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"/></Panel>
    {sequence.length>0&&<Panel><div className="flex items-center justify-between gap-3 mb-3"><div className="eyebrow">Synchronized Call Order</div><button onClick={playPreview} className="rounded-lg border border-gold/30 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-gold transition hover:bg-gold/10">Preview the approach</button></div><div className="space-y-2">{sequence.map((w,i)=><div key={w.id} className="stagger-in royal-plaque flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-gold/30 text-xs font-bold text-gold">{i+1}</span><span className="flex-1 font-semibold text-parchment">{w.name}</span><span className="font-mono text-xs text-parchment/50">march {w.march}</span><span className="font-mono text-xs text-gold">call +{w.offset}s</span></div>)}</div></Panel>}<Panel><div className="flex items-center justify-between gap-3 mb-4"><div><div className="eyebrow">Whale Roster</div><div className="text-xs text-parchment/40 mt-1">March time format: M:SS</div></div><button onClick={addWhale} className="btn-primary !py-1.5 !text-xs">+ Add Whale</button></div><div className="space-y-2">{whales.map(w=><div key={w.id} className="stagger-in royal-plaque flex flex-wrap items-center gap-2"><input type="checkbox" checked={!!selected[w.id]} onChange={()=>setSelected(s=>({...s,[w.id]:!s[w.id]}))} className="h-4 w-4 accent-[#D4AF37]"/><input value={w.name} onChange={e=>updateWhale(w.id,'name',e.target.value)} className="min-w-32 flex-1 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"/><input value={w.march} onChange={e=>updateWhale(w.id,'march',e.target.value)} onBlur={e=>normalizeMarch(w.id,e.target.value)} aria-label="March time" className="w-20 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm font-mono text-parchment outline-none focus:border-gold/60"/><select value={w.status} onChange={e=>updateWhale(w.id,'status',e.target.value)} className="royal-select">{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select><Pill tone={STATUS_TONE[w.status]||'muted'}>{w.status}</Pill><button onClick={()=>removeWhale(w.id)} className="rounded-md border border-rose-500/25 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">Delete</button></div>)}{!whales.length&&<div className="py-8 text-center text-sm text-parchment/40">No whales saved yet.</div>}</div><div className="mt-4 flex items-center justify-between gap-3 border-t border-gold/10 pt-4"><span className="text-xs text-parchment/45">{saved?'Roster saved on this device.':`${sequence.length} selected for rally`}</span><button onClick={saveRoster} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">Save Roster</button></div></Panel>
    {sequence.length>0&&<RallyApproach sequence={sequence} now={preview ?? 0} impactAt={impactAt} phase="HOLD" />}
    <button onClick={startRally} disabled={!sequence.length} className="btn-primary w-full !py-4 !text-base disabled:opacity-30">Start Synced Rally {sequence.length?`(${sequence.length})`:''}</button></>:<RallyConsole sequence={sequence} startAt={startRef.current} onAbort={stopRally} onComplete={stopRally}/>}
  </div>
}
