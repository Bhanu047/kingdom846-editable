import {useEffect,useState} from 'react'
import {AuthProvider,useAuth} from './context/AuthContext'
import WarRoom from './pages/WarRoom'

export const ALLIANCES=[
 {tag:'NwO',name:'NewWorldOrder',label:'[NwO] NewWorldOrder',img:'/art/alliance-nwo.webp',tone:'nwo',colors:'Gold & Green'},
 {tag:'DXP',name:'TheBadBatch',label:'[DXP] TheBadBatch',img:'/art/alliance-dxp.webp',tone:'dxp',colors:'Purple & White Wolf'},
 {tag:'FME',name:'IXXI',label:'[FME] IXXI',img:'/art/alliance-fme.webp',tone:'fme',colors:'Crimson & White'},
]
const MEMBERS=['Spartan','Poofy','Charles','Jakey','Polar','Erika']
const allianceFor=(text)=>ALLIANCES.find(a=>a.label===text||String(text||'').toUpperCase().includes('['+a.tag+']'))

function Portrait({name,size=40,ring}){
 const key=String(name||'').toLowerCase()
 const known=MEMBERS.map(m=>m.toLowerCase()).includes(key)
 return <img className={'k-portrait '+(ring?'k-ring':'')} style={{width:size,height:size}} src={known?`/art/portrait-${key}.webp`:'/art/lion-crest.webp'} alt={name+' portrait'} loading="lazy"/>
}
function Crest({size=44,className=''}){return <img className={'k-crest '+className} style={{width:size,height:size}} src="/art/lion-crest.webp" alt="Kingdom 791 lion crest"/>}
function AllianceTag({value}){
 const a=allianceFor(value)
 if(!value)return <span className="k-tag k-tag-none">No alliance</span>
 return <span className={'k-tag '+(a?'k-tag-'+a.tone:'')}>{a?.label||value}</span>
}
function AllianceCards(){
 return <div className="k-alliances">{ALLIANCES.map(a=><figure key={a.tag} className={'k-acard k-acard-'+a.tone}><div className="k-med"><img src={a.img} alt={a.label+' emblem'} loading="lazy"/></div><figcaption><b>[{a.tag}]</b><span>{a.name}</span></figcaption></figure>)}</div>
}
function AlliancePicker({value,onSave,busy}){
 const [text,setText]=useState(value||'')
 useEffect(()=>setText(value||''),[value])
 return <div className="k-picker">
  <div className="k-chips">{ALLIANCES.map(a=><button type="button" key={a.tag} className={'k-chip k-chip-'+a.tone+(text===a.label?' on':'')} onClick={()=>setText(a.label)}><img src={a.img} alt=""/>{a.label}</button>)}</div>
  <div className="k-row"><input className="wr-input" maxLength={60} value={text} onChange={e=>setText(e.target.value)} placeholder="Or type another alliance label"/><button className="btn-primary" disabled={busy} onClick={()=>onSave(text)}>Save</button></div>
 </div>
}
async function post(path,body){
 const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 let d={};try{d=await r.json()}catch{}
 if(!r.ok)throw new Error(d.error||'Unable to save')
 return d
}

function Login(){
 const {login}=useAuth()
 const [u,setU]=useState(''),[p,setP]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
 return <div className="k-login">
  <div className="k-login-bg" aria-hidden="true"/>
  <main className="k-login-main">
   <section className="k-hero">
    <Crest size={150} className="k-hero-crest"/>
    <p className="k-kicker">PRIVATE COMMAND</p>
    <h1>KINGDOM <em>791</em></h1>
    <p className="k-sub">WAR ROOM</p>
    <p className="k-lede">Plan together. Arrive together.</p>
   </section>
   <section className="k-card" aria-label="Member login">
    <h2>Enter the War Room</h2>
    <form onSubmit={async e=>{e.preventDefault();setErr('');setBusy(true);try{await login(u,p)}catch(x){setErr(x.message)}finally{setBusy(false)}}}>
     <label htmlFor="k-user">Username</label>
     <input id="k-user" className="wr-input" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={u} onChange={e=>setU(e.target.value)} required/>
     <label htmlFor="k-pass">Password</label>
     <input id="k-pass" className="wr-input" type="password" autoComplete="current-password" value={p} onChange={e=>setP(e.target.value)} required/>
     {err&&<div role="alert" className="k-err">{err}</div>}
     <button className="btn-primary k-enter" disabled={busy}>{busy?'Opening gates…':'Enter War Room'}</button>
    </form>
   </section>
   <AllianceCards/>
  </main>
 </div>
}

function Shell(){
 const {user,logout,refresh}=useAuth()
 const [tab,setTab]=useState('warroom')
 const tabs=[['warroom','War Room','swords'],['profile','Account','user'],...(user.role==='admin'?[['manage','Members','users']]:[])]
 const ico={swords:'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2',user:'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'}
 return <div className="k-shell">
  <div className="k-shell-bg" aria-hidden="true"/>
  <header className="k-header">
   <div className="k-header-in">
    <Crest size={38}/>
    <div className="k-title"><span>KINGDOM 791</span><b>War Room</b></div>
    <nav className="k-tabs k-tabs-desk" aria-label="Sections">{tabs.map(([id,l])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'on':''}>{l}</button>)}</nav>
    <button className="k-me" onClick={()=>setTab('profile')} aria-label="My account"><Portrait name={user.username} size={34} ring/><span>{user.display_name}</span></button>
    <button className="k-exit" onClick={logout} aria-label="Exit">Exit</button>
   </div>
  </header>
  <main className="k-main">
   {tab==='manage'&&user.role==='admin'?<Admin/>:tab==='profile'?<Profile user={user} refresh={refresh}/>:<WarRoom/>}
  </main>
  <nav className="k-bottom" aria-label="Sections">{tabs.map(([id,l,i])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'on':''}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ico[i]}/></svg><span>{l}</span></button>)}</nav>
 </div>
}
function CommandRoster(){
 return <div className="k-roster" aria-label="Authorized commanders">{MEMBERS.map(n=><div className="k-rp" key={n}><Portrait name={n} size={30}/><span>{n}</span></div>)}</div>
}
function Profile({user,refresh}){
 const [cur,setCur]=useState(''),[nw,setNw]=useState(''),[msg,setMsg]=useState(''),[bad,setBad]=useState(false),[busy,setBusy]=useState(false)
 const run=async(fn)=>{setMsg('');setBusy(true);try{await fn();setBad(false);setMsg('Saved');refresh()}catch(e){setBad(true);setMsg(e.message)}finally{setBusy(false)}}
 return <div className="k-narrow">
  <div className="k-panel k-profile"><Portrait name={user.username} size={120} ring/><div><p className="k-kicker">{user.role==='admin'?'OWNER':'WAR ROOM MEMBER'}</p><h2>{user.display_name}</h2><p className="k-dim">@{user.username}</p><AllianceTag value={user.alliance}/></div></div>
  {msg&&<p role="status" className={bad?'k-err':'k-ok'}>{msg}</p>}
  <div className="k-panel"><h3>My Alliance</h3><AlliancePicker value={user.alliance} busy={busy} onSave={a=>run(()=>post('/api/me/alliance',{alliance:a}))}/></div>
  <form className="k-panel k-form" onSubmit={e=>{e.preventDefault();run(async()=>{await post('/api/me/password',{currentPassword:cur,newPassword:nw});setCur('');setNw('')})}}>
   <h3>Change My Password</h3>
   <input className="wr-input" type="password" autoComplete="current-password" required placeholder="Current password" value={cur} onChange={e=>setCur(e.target.value)}/>
   <input className="wr-input" type="password" autoComplete="new-password" minLength={12} required placeholder="New password (12+ characters)" value={nw} onChange={e=>setNw(e.target.value)}/>
   <button className="btn-primary" disabled={busy}>Update Password</button>
  </form>
 </div>
}
function Admin(){
 const [rows,setRows]=useState([]),[msg,setMsg]=useState(''),[bad,setBad]=useState(false)
 const load=async()=>{const r=await fetch('/api/admin/users',{credentials:'same-origin'});const d=await r.json();setRows(d.users||[])}
 useEffect(()=>{load()},[])
 const run=async(fn)=>{setMsg('');try{await fn();setBad(false);setMsg('Saved');load()}catch(e){setBad(true);setMsg(e.message)}}
 return <div className="k-wide">
  <div className="k-panel"><p className="k-kicker">OWNER CONTROL</p><h2>Member Management</h2><p className="k-dim">Five member accounts plus your owner login. Set a new password for a member here; they can change it themselves after logging in.</p></div>
  {msg&&<p role="status" className={bad?'k-err':'k-ok'}>{msg}</p>}
  <div className="k-grid">{rows.map(u=><div className="k-panel k-member" key={u.username}>
   <div className="k-mhead"><Portrait name={u.username} size={64} ring/><div><h3>{u.display_name}</h3><p className="k-dim">@{u.username} · {u.role==='admin'?'Owner':'Member'}</p><AllianceTag value={u.alliance}/></div></div>
   <AlliancePicker value={u.alliance} onSave={a=>run(()=>post('/api/admin/alliance',{username:u.username,alliance:a}))}/>
   {u.role!=='admin'&&<form className="k-row" onSubmit={e=>{e.preventDefault();const f=e.target;const pw=f.elements.password.value;run(async()=>{await post('/api/admin/reset-password',{username:u.username,password:pw});f.reset()})}}>
    <input name="password" className="wr-input" type="password" autoComplete="new-password" minLength={12} required placeholder="New password (12+ chars)"/><button className="btn-primary">Set</button></form>}
  </div>)}</div>
 </div>
}
function Screen(){
 const {user,ready,refresh}=useAuth()
 useEffect(()=>{refresh()},[refresh])
 if(!ready)return <div className="k-loading"><Crest size={96}/><p>Opening the gates…</p></div>
 return user?<Shell/>:<Login/>
}
export default function App(){return <AuthProvider><Screen/></AuthProvider>}
