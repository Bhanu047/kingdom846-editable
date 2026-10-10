import { useEffect, useState } from 'react'
import { Swords, UserRound, Users, LogOut, Eye, EyeOff, Check, PenLine, KeyRound, ShieldCheck } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import WarRoom from './pages/WarRoom'
import { ALLIANCES, allianceFor, AllianceBadge, Crest, Portrait } from './components/brand'

async function post(path, body) {
  const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  let d = {}
  try { d = await r.json() } catch {}
  if (!r.ok) throw new Error(d.error || 'Unable to save')
  return d
}

function PasswordInput({ id, value, onChange, autoComplete, minLength, name, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-wrap">
      <input id={id} name={name} className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength}
        value={value} onChange={onChange} placeholder={placeholder} required />
      <button type="button" className="reveal" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ login */
function Login() {
  const { login } = useAuth()
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await login(u, p) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="login">
      <div className="login-bg" aria-hidden="true">
        <picture>
          <source media="(min-width: 900px)" srcSet="/art/scene-wide.webp" />
          <img src="/art/scene-lion.webp" alt="" fetchpriority="high" />
        </picture>
      </div>
      <div className="login-glow" aria-hidden="true" />
      <main className="login-col">
        <div className="login-crest"><Crest size="lg" alt="" /></div>
        <h1 className="login-title gilt">Kingdom 791</h1>
        <p className="login-rule">War Room</p>
        <section className="login-card" aria-labelledby="signin-title">
          <h2 id="signin-title">Sign in</h2>
          <p className="card-sub">Authorised commanders only.</p>
          <form onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="k-user">Username</label>
              <input id="k-user" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={u} onChange={(e) => setU(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="k-pass">Password</label>
              <PasswordInput id="k-pass" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
            </div>
            {err && <p role="alert" className="notice notice-bad">{err}</p>}
            <button className="btn btn-war btn-lg btn-block" disabled={busy}>{busy ? 'Opening the gates…' : 'Enter the War Room'}</button>
          </form>
        </section>
        <p className="login-foot">Private rally command · Kingdom 791</p>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ shell */
function Shell() {
  const { user, logout, refresh } = useAuth()
  const [tab, setTab] = useState('warroom')
  const [dock, setDock] = useState(false)
  const isOwner = user.role === 'admin'
  const tabs = [
    ['warroom', 'War Room', Swords],
    ['account', 'Account', UserRound],
    ...(isOwner ? [['members', 'Members', Users]] : []),
  ]
  const go = (id) => { setTab(id); window.scrollTo({ top: 0 }) }
  return (
    <div className="shell">
      <header className="hdr">
        <div className="hdr-in">
          <button className="brand" onClick={() => go('warroom')} aria-label="Kingdom 791 War Room">
            <Crest alt="" />
            <span className="brand-name"><b className="gilt">Kingdom 791</b><span>War Room</span></span>
          </button>
          <nav className="nav" aria-label="Sections">
            {tabs.map(([id, label, Ico]) => (
              <button key={id} onClick={() => go(id)} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}><Ico size={16} />{label}</button>
            ))}
          </nav>
          <div className="hdr-right">
            <button className="me" onClick={() => go('account')} aria-label="My account">
              <Portrait username={user.username} size={32} />
              <span className="me-text"><b>{user.display_name}</b><span>{isOwner ? 'Owner' : 'Commander'}</span></span>
            </button>
            <button className="btn btn-ghost btn-icon exit" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
          </div>
        </div>
      </header>
      <main className={'main' + (tab === 'warroom' && dock ? ' with-dock' : '')}>
        {tab === 'members' && isOwner ? <Members />
          : tab === 'account' ? <Account user={user} refresh={refresh} logout={logout} />
          : <WarRoom onDock={setDock} />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {tabs.map(([id, label, Ico]) => (
          <button key={id} onClick={() => go(id)} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}><Ico size={21} strokeWidth={1.8} /><span>{label}</span></button>
        ))}
      </nav>
    </div>
  )
}

/* -------------------------------------------------------------- alliances */
function AlliancePicker({ value, onSave, busy, idPrefix }) {
  const [pick, setPick] = useState('')
  const [other, setOther] = useState('')
  useEffect(() => {
    const k = allianceFor(value)
    setPick(k ? k.label : value ? 'other' : '')
    setOther(k ? '' : value || '')
  }, [value])
  const next = pick === 'other' ? other.trim() : pick
  const changed = next !== (value || '')
  return (
    <div className="apick">
      <div className="atiles" role="radiogroup" aria-label="Alliance">
        {ALLIANCES.map((a) => {
          const on = pick === a.label
          return (
            <button type="button" role="radio" aria-checked={on} key={a.tag} aria-label={a.label}
              className={'atile tone-' + a.tone + (on ? ' on' : '')} onClick={() => setPick(a.label)}>
              <img src={a.emblem} alt="" />
              <span className="atile-plate"><b>[{a.tag}]</b><span>{a.name.split(/(?<=[a-z])(?=[A-Z])/).map((part, i) => <span key={i}>{i > 0 && <wbr />}{part}</span>)}</span></span>
              <i className="atile-check" aria-hidden="true"><Check size={13} strokeWidth={3.2} /></i>
            </button>
          )
        })}
      </div>
      <button type="button" className={'aother' + (pick === 'other' ? ' on' : '')} aria-pressed={pick === 'other'} onClick={() => setPick(pick === 'other' ? '' : 'other')}>
        <PenLine size={15} />{pick === 'other' ? 'Using a different alliance label' : 'Use a different alliance label'}
      </button>
      {pick === 'other' && (
        <div className="field">
          <label className="label" htmlFor={idPrefix + '-other'}>Alliance label</label>
          <input id={idPrefix + '-other'} className="input" maxLength={60} value={other} onChange={(e) => setOther(e.target.value)} placeholder="e.g. [TAG] AllianceName" autoFocus />
        </div>
      )}
      <div className="apick-foot">
        <span className="hint">{changed ? (next ? 'Selected: ' + next : 'Alliance will be cleared') : value ? 'Current: ' + value : 'No alliance set'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {value && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onSave('')}>Clear</button>}
          <button type="button" className="btn btn-gold" disabled={busy || !changed || (pick === 'other' && !other.trim())} onClick={() => onSave(next)}>Save alliance</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- account */
function Account({ user, refresh, logout }) {
  const [cur, setCur] = useState(''), [nw, setNw] = useState(''), [conf, setConf] = useState('')
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const run = async (fn, ok) => {
    setMsg(null); setBusy(true)
    try { await fn(); setMsg({ ok: true, text: ok }); refresh() } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const a = allianceFor(user.alliance)
  return (
    <div className="page">
      <section className="card profile">
        <div className="profile-cover"><img src={a ? a.banner : '/art/scene-castle.webp'} alt="" /></div>
        <div className="profile-body">
          <Portrait username={user.username} size={104} square />
          <div className="who">
            <span className={'role' + (user.role === 'admin' ? '' : ' muted')}>{user.role === 'admin' ? <><ShieldCheck size={12} />Owner</> : 'Commander'}</span>
            <h1>{user.display_name}</h1>
            <div className="who-row"><span className="faint" style={{ fontSize: 13 }}>@{user.username}</span><AllianceBadge value={user.alliance} /></div>
          </div>
        </div>
      </section>
      {msg && <p role="status" className={'notice ' + (msg.ok ? 'notice-ok' : 'notice-bad')}>{msg.text}</p>}
      <div className="two">
        <section className="card card-pad">
          <div className="card-head"><div><p className="kicker">Allegiance</p><h2 className="card-title">Your alliance</h2><p className="card-sub">Shown beside your name across the War Room.</p></div></div>
          <AlliancePicker idPrefix="me" value={user.alliance} busy={busy} onSave={(v) => run(() => post('/api/me/alliance', { alliance: v }), 'Alliance saved.')} />
        </section>
        <section className="card card-pad">
          <div className="card-head"><div><p className="kicker">Security</p><h2 className="card-title">Change password</h2><p className="card-sub">At least 12 characters.</p></div></div>
          <form style={{ display: 'grid', gap: 14 }} onSubmit={(e) => {
            e.preventDefault()
            if (nw !== conf) { setMsg({ ok: false, text: 'The new passwords do not match.' }); return }
            run(async () => { await post('/api/me/password', { currentPassword: cur, newPassword: nw }); setCur(''); setNw(''); setConf('') }, 'Password updated.')
          }}>
            <div className="field"><label className="label" htmlFor="pw-cur">Current password</label><PasswordInput id="pw-cur" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
            <div className="field"><label className="label" htmlFor="pw-new">New password</label><PasswordInput id="pw-new" autoComplete="new-password" minLength={12} value={nw} onChange={(e) => setNw(e.target.value)} /></div>
            <div className="field"><label className="label" htmlFor="pw-conf">Confirm new password</label><PasswordInput id="pw-conf" autoComplete="new-password" minLength={12} value={conf} onChange={(e) => setConf(e.target.value)} /></div>
            <button className="btn btn-gold" disabled={busy}><KeyRound size={16} />Update password</button>
          </form>
        </section>
      </div>
      <section className="card card-pad signout">
        <div><h2 className="card-title" style={{ marginTop: 0 }}>Sign out</h2><p className="card-sub">End your session on this device.</p></div>
        <button className="btn btn-danger" onClick={logout}><LogOut size={16} />Sign out</button>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- members */
function MemberCard({ u, onDone }) {
  const [pw, setPw] = useState(''), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const run = async (fn, ok) => {
    setMsg(null); setBusy(true)
    try { await fn(); setMsg({ ok: true, text: ok }); onDone() } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const known = allianceFor(u.alliance)
  const sel = known ? known.label : u.alliance ? '__custom' : ''
  const isOwner = u.role === 'admin'
  return (
    <article className="card member">
      <div className="mtop">
        <Portrait username={u.username} size={58} />
        <div className="who">
          <h3>{u.display_name}</h3>
          <div className="who-row"><span className="handle">@{u.username}</span><span className={'role' + (isOwner ? '' : ' muted')}>{isOwner ? 'Owner' : 'Commander'}</span></div>
          <div><AllianceBadge value={u.alliance} /></div>
        </div>
      </div>
      <div className="mactions">
        <div className="field">
          <label className="label" htmlFor={'al-' + u.username}>Alliance</label>
          <select id={'al-' + u.username} className="input" value={sel} disabled={busy}
            onChange={(e) => {
              const v = e.target.value
              if (v === '__custom') return
              run(() => post('/api/admin/alliance', { username: u.username, alliance: v }), 'Alliance updated.')
            }}>
            <option value="">No alliance</option>
            {ALLIANCES.map((a) => <option key={a.tag} value={a.label}>{a.label}</option>)}
            {sel === '__custom' && <option value="__custom">{u.alliance}</option>}
          </select>
        </div>
        {!isOwner && (
          <form className="field" onSubmit={(e) => { e.preventDefault(); run(async () => { await post('/api/admin/reset-password', { username: u.username, password: pw }); setPw('') }, 'New password set. Their sessions were signed out.') }}>
            <label className="label" htmlFor={'pw-' + u.username}>Set new password</label>
            <div className="inline">
              <PasswordInput id={'pw-' + u.username} autoComplete="new-password" minLength={12} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="12+ characters" />
              <button className="btn btn-gold" disabled={busy || pw.length < 12}>Set</button>
            </div>
          </form>
        )}
        {isOwner && <p className="hint">Change your own password from the Account page.</p>}
        {msg && <p role="status" className={'notice ' + (msg.ok ? 'notice-ok' : 'notice-bad')}>{msg.text}</p>}
      </div>
    </article>
  )
}

function Members() {
  const [rows, setRows] = useState(null), [err, setErr] = useState('')
  const load = async () => {
    try {
      const r = await fetch('/api/admin/users', { credentials: 'same-origin' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Unable to load members')
      setRows((d.users || []).sort((a, b) => (a.role === b.role ? a.display_name.localeCompare(b.display_name) : a.role === 'admin' ? -1 : 1)))
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])
  const members = rows ? rows.filter((r) => r.role !== 'admin').length : 0
  return (
    <div className="page">
      <section className="card card-pad">
        <p className="kicker">Owner control</p>
        <h1 className="card-title" style={{ fontSize: 30 }}>Members</h1>
        <p className="card-sub">{rows ? `${members} commanders and 1 owner. Set alliances and issue new passwords — commanders can change their own afterwards.` : 'Loading…'}</p>
      </section>
      {err && <p role="alert" className="notice notice-bad">{err}</p>}
      <div className="mgrid">{(rows || []).map((u) => <MemberCard key={u.username} u={u} onDone={load} />)}</div>
    </div>
  )
}

/* ----------------------------------------------------------------- screen */
function Screen() {
  const { user, ready, refresh } = useAuth()
  useEffect(() => { refresh() }, [refresh])
  if (!ready) return <div className="splash"><Crest size="lg" alt="" /><p>Opening the gates…</p></div>
  return user ? <Shell /> : <Login />
}

export default function App() { return <AuthProvider><Screen /></AuthProvider> }
