import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Pill } from '../components/ui'
import { RoyalSectionHeader } from '../components/VisualElements'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'k846-shoni-war-room-v1'
const STATUS_OPTIONS = ['RYO', 'KzK', 'SAS', 'ICE', 'HUN', 'Castle Garrison', 'East Turret Garrison', 'West Turret Garrison', 'North Turret Garrison', 'South Turret Garrison', 'Undeployed']
const STATUS_TONE = {
  RYO: 'gold', KzK: 'red', SAS: 'red', ICE: 'blue', HUN: 'green',
  'Castle Garrison': 'gold', 'East Turret Garrison': 'blue', 'West Turret Garrison': 'blue',
  'North Turret Garrison': 'blue', 'South Turret Garrison': 'blue', Undeployed: 'muted'
}

function parseTime(value) {
  const s = String(value || '').trim()
  if (!s) return 0
  if (s.includes(':')) { const [m, sec] = s.split(':'); return Math.max(0, (parseInt(m, 10) || 0) * 60 + (parseInt(sec, 10) || 0)) }
  return Math.max(0, parseInt(s, 10) || 0)
}
function formatClock(seconds) { const n = Math.max(0, Math.ceil(seconds)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` }
function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export default function WarRoom() {
  const { user, isAdmin } = useAuth()
  const [whales, setWhales] = useState([]), [selected, setSelected] = useState({}), [running, setRunning] = useState(false), [, setTick] = useState(0), [saved, setSaved] = useState(false)
  const startRef = useRef(0), timerRef = useRef(null)
  useEffect(() => { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setWhales(JSON.parse(raw)) } catch {} }, [])
  useEffect(() => () => clearInterval(timerRef.current), [])
  const sequence = useMemo(() => { const chosen = whales.filter(w => selected[w.id]).map(w => ({...w, marchSec: parseTime(w.march)})); if (!chosen.length) return []; const longest = Math.max(...chosen.map(w => w.marchSec)); return chosen.map(w => ({...w, offset: Math.max(0, longest-w.marchSec)})).sort((a,b)=>a.offset-b.offset||a.name.localeCompare(b.name)) }, [whales,selected])
  const elapsed = running ? Math.max(0,(Date.now()-startRef.current)/1000):0
  const active = running ? sequence.find(w=>elapsed>=w.offset-3&&elapsed<w.offset+1):null
  const complete = running&&sequence.length>0&&elapsed>sequence[sequence.length-1].offset+1
  useEffect(()=>{if(complete){clearInterval(timerRef.current);setRunning(false)}},[complete])
  if(!isAdmin && user?.username?.toLowerCase()!=='shoni') return <div className="grid place-items-center py-20"><Panel glow className="max-w-lg text-center"><Icon name="shieldCheck" size={34} className="mx-auto text-gold mb-3"/><h1 className="font-display text-2xl font-bold text-parchment">Private War Room</h1><p className="mt-2 text-sm text-parchment/50">This command room is reserved for Sparta admin and Shoni.</p></Panel></div>
  function addWhale(){setWhales(p=>[...p,{id:newId(),name:'New Whale',march:'0:30',status:'Undeployed'}]);setSaved(false)}
  function updateWhale(id,field,value){setWhales(p=>p.map(w=>w.id===id?{...w,[field]:value}:w));setSaved(false)}
  function removeWhale(id){setWhales(p=>p.filter(w=>w.id!==id));setSelected(p=>{const n={...p};delete n[id];return n});setSaved(false)}
  function saveRoster(){localStorage.setItem(STORAGE_KEY,JSON.stringify(whales));setSaved(true);setTimeout(()=>setSaved(false),2500)}
  function startRally(){if(!sequence.length)return;startRef.current=Date.now()+3000;setRunning(true);clearInterval(timerRef.current);timerRef.current=setInterval(()=>setTick(n=>n+1),100)}
  function stopRally(){clearInterval(timerRef.current);setRunning(false)}
  const remaining=active?active.offset-elapsed:null
  return <div className="space-y-5">
    <Panel glow className="gold-corners overflow-hidden p-0">
      <div className="relative min-h-[250px] overflow-hidden">
        <img src="./assets/strategy-war-academy.png" alt="Kingdom 846 royal war command room" className="absolute inset-0 h-full w-full object-cover drift-slow" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/35" />
        <div className="absolute inset-0" style={{background:'radial-gradient(circle at 72% 35%, rgba(212,175,55,.18), transparent 36%)'}} />
        <div className="relative z-10 flex min-h-[250px] max-w-3xl flex-col justify-center p-6 md:p-8">
          <RoyalSectionHeader icon="swords" eyebrow="[RYO] SHONI · PRIVATE COMMAND" title="War Room"/>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-parchment/70">Coordinate synchronized whale rallies from the royal command table. Save march times, select the rally team, and use the live call sequence so every march lands together.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Pill tone="gold">Royal Command</Pill><Pill tone="red">Castle Operations</Pill><Pill tone="blue">Synced Rally</Pill></div>
        </div>
      </div>
    </Panel>
    {!running?<><Panel><div className="flex items-center justify-between gap-3 mb-4"><div><div className="eyebrow">Whale Roster</div><div className="text-xs text-parchment/40 mt-1">March time format: M:SS</div></div><button onClick={addWhale} className="btn-primary !py-1.5 !text-xs">+ Add Whale</button></div><div className="space-y-2">{whales.map(w=><div key={w.id} className="royal-plaque flex flex-wrap items-center gap-2"><input type="checkbox" checked={!!selected[w.id]} onChange={()=>setSelected(s=>({...s,[w.id]:!s[w.id]}))} className="h-4 w-4 accent-[#D4AF37]"/><input value={w.name} onChange={e=>updateWhale(w.id,'name',e.target.value)} className="min-w-32 flex-1 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm text-parchment outline-none focus:border-gold/60"/><input value={w.march} onChange={e=>updateWhale(w.id,'march',e.target.value)} className="w-20 rounded-md border border-gold/20 bg-ink/60 px-2 py-1.5 text-sm font-mono text-parchment outline-none focus:border-gold/60"/><select value={w.status} onChange={e=>updateWhale(w.id,'status',e.target.value)} className="royal-select">{STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select><Pill tone={STATUS_TONE[w.status]||'muted'}>{w.status}</Pill><button onClick={()=>removeWhale(w.id)} className="rounded-md border border-rose-500/25 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">Delete</button></div>)}{!whales.length&&<div className="py-8 text-center text-sm text-parchment/40">No whales saved yet.</div>}</div><div className="mt-4 flex items-center justify-between gap-3 border-t border-gold/10 pt-4"><span className="text-xs text-parchment/45">{saved?'Roster saved on this device.':`${sequence.length} selected for rally`}</span><button onClick={saveRoster} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">Save Roster</button></div></Panel>
    {sequence.length>0&&<Panel><div className="eyebrow mb-3">Synchronized Call Order</div><div className="space-y-2">{sequence.map((w,i)=><div key={w.id} className="royal-plaque flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-gold/30 text-xs font-bold text-gold">{i+1}</span><span className="flex-1 font-semibold text-parchment">{w.name}</span><span className="font-mono text-xs text-parchment/50">march {w.march}</span><span className="font-mono text-xs text-gold">call +{w.offset}s</span></div>)}</div></Panel>}<button onClick={startRally} disabled={!sequence.length} className="btn-primary w-full !py-4 !text-base disabled:opacity-30">Start Synced Rally {sequence.length?`(${sequence.length})`:''}</button></>:<><div className="flex items-center justify-between"><div className="font-mono text-sm text-gold">MISSION CLOCK +{elapsed.toFixed(1)}s</div><button onClick={stopRally} className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300">Abort</button></div><Panel glow className="gold-corners py-10 text-center">{active?<><div className="eyebrow mb-2">Now Calling</div><div className="font-display text-4xl font-bold text-parchment">{active.name}</div>{remaining>0?<div className="mt-3 font-mono text-7xl font-bold text-gold">{Math.ceil(remaining)}</div>:<div className="mt-3 font-mono text-6xl font-bold text-emerald-400 animate-pulse">GO</div>}</>:<><Icon name="crosshair" size={38} className="mx-auto text-gold/35"/><div className="mt-3 font-display text-2xl font-bold text-parchment">Standing By</div><div className="mt-1 text-sm text-parchment/45">Next call incoming…</div></>}</Panel><Panel><div className="eyebrow mb-3">Rally Queue</div><div className="space-y-2">{sequence.map(w=>{const callIn=w.offset-elapsed;return <div key={w.id} className={`royal-plaque flex items-center justify-between ${callIn<=0?'opacity-50':''}`}><span className="font-semibold text-parchment">{w.name}</span><span className="font-mono text-xs text-parchment/50">{callIn>0?`call in ${formatClock(callIn)}`:'called'}</span></div>})}</div></Panel></>}
  </div>
}
