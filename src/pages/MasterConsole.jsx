import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { apiJson, apiFetch } from '../lib/api'

const KING_TYPES = ['High King', 'King']
const KING_ALLIANCES = [
  { tag: '[RYO]', name: 'Spiders' }, { tag: '[KzK]', name: 'KamilKazeKarnival' },
  { tag: '[SAS]', name: 'SaintsAndSinners' }, { tag: '[ICE]', name: 'IceHunters' },
]
export default function MasterConsole() {
  const { user, changeOwnCredentials, listLeaders, resetLeader } = useAuth()

  // --- Kingdom Status (current king + alliance) ---
  const [king, setKing] = useState({ kingType: 'High King', name: '', allianceTag: '[RYO]', allianceName: 'Spiders' })
  const [kDraft, setKDraft] = useState(king)
  const [kSaving, setKSaving] = useState(false)
  const [kMsg, setKMsg] = useState(null)
  const [kErr, setKErr] = useState(null)
  useEffect(() => {
    apiJson('/api/king-status').then((k) => {
      if (k && k.king_type) {
        const next = { kingType: k.king_type, name: k.name, allianceTag: k.alliance_tag, allianceName: k.alliance_name }
        setKing(next); setKDraft(next)
      }
    }).catch(() => {})
  }, [])
  const saveKing = async (e) => {
    e.preventDefault()
    setKErr(null); setKMsg(null)
    if (!kDraft.name.trim()) { setKErr('King name is required.'); return }
    setKSaving(true)
    try {
      await apiFetch('/api/king-status', { method: 'PUT', body: JSON.stringify({ king_type: kDraft.kingType, name: kDraft.name, alliance_tag: kDraft.allianceTag, alliance_name: kDraft.allianceName }) })
      setKing(kDraft); setKMsg('Kingdom status updated — the realm now reflects the new sovereign.')
    } catch (err) { setKErr(err.message) }
    finally { setKSaving(false) }
  }

  // --- Change my credentials ---
  const [curPw, setCurPw] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPw, setNewPw] = useState('')
  const [myMsg, setMyMsg] = useState(null)
  const [myErr, setMyErr] = useState(null)
  const [mySaving, setMySaving] = useState(false)

  const saveMine = async (e) => {
    e.preventDefault()
    setMyErr(null); setMyMsg(null)
    if (!newUser && !newPw) { setMyErr('Enter a new username or password.'); return }
    setMySaving(true)
    try {
      await changeOwnCredentials(curPw, newUser || user.username, newPw)
      setMyMsg('Your credentials are updated. Please log in again with your new details.')
      setCurPw(''); setNewUser(''); setNewPw('')
    } catch (err) { setMyErr(err.message) }
    finally { setMySaving(false) }
  }

  // --- Leaders list + reset ---
  const [leaders, setLeaders] = useState([])
  const [resetId, setResetId] = useState(null)
  const [rUser, setRUser] = useState('')
  const [rPw, setRPw] = useState('')
  const [rMsg, setRMsg] = useState(null)
  const [rErr, setRErr] = useState(null)
  const [rSaving, setRSaving] = useState(false)

  const refresh = useCallback(async () => {
    try { setLeaders(await listLeaders()) } catch {}
  }, [listLeaders])
  useEffect(() => { refresh() }, [refresh])

  const openReset = (l) => { setResetId(l.id); setRUser(l.username); setRPw(''); setRMsg(null); setRErr(null) }
  const doReset = async (e) => {
    e.preventDefault()
    setRErr(null); setRMsg(null)
    if (!rPw) { setRErr('Enter a new password for the leader.'); return }
    setRSaving(true)
    try {
      await resetLeader(resetId, rUser, rPw)
      setRMsg(`Credentials updated for ${rUser}. They can now log in with the new details.`)
      setRPw('')
      refresh()
    } catch (err) { setRErr(err.message) }
    finally { setRSaving(false) }
  }

  return (
    <div className="space-y-6">
      <Panel glow className="reveal-clip">
        <div className="eyebrow">Sparta Master</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-parchment">Master Console</h1>
        <p className="mt-2 text-sm text-parchment/60">Change your own login, and reset alliance leader passwords when they forget theirs.</p>
      </Panel>

      {/* Kingdom Status — current king + alliance */}
      <Panel className="reveal-clip p-5">
        <SectionTitle eyebrow="Realm" title="Kingdom Status" icon="crown" />
        <p className="mb-4 text-xs text-parchment/50">Current sovereign: <span className="font-semibold text-gold">{king.kingType} {king.name}</span> · <span className="text-gold">{king.allianceTag} {king.allianceName}</span></p>
        <form onSubmit={saveKing} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-parchment/50">King Title</label>
            <select value={kDraft.kingType} onChange={(e) => setKDraft({ ...kDraft, kingType: e.target.value })} className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60" data-testid="select-king-type">
              {KING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Current King Name" value={kDraft.name} onChange={(v) => setKDraft({ ...kDraft, name: v })} placeholder="e.g. Oliver" testId="input-king-name" />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-parchment/50">Alliance</label>
            <select value={kDraft.allianceTag} onChange={(e) => {
              const a = KING_ALLIANCES.find((x) => x.tag === e.target.value)
              setKDraft({ ...kDraft, allianceTag: e.target.value, allianceName: a ? a.name : kDraft.allianceName })
            }} className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60" data-testid="select-king-alliance">
              {KING_ALLIANCES.map((a) => <option key={a.tag} value={a.tag}>{a.tag} {a.name}</option>)}
            </select>
          </div>
          <Field label="Alliance Name" value={kDraft.allianceName} onChange={(v) => setKDraft({ ...kDraft, allianceName: v })} testId="input-king-alliance-name" />
          <div className="flex items-end sm:col-span-2">
            <button type="submit" disabled={kSaving} className="btn-primary w-full" data-testid="button-save-king">
              {kSaving ? 'Saving…' : 'Update Kingdom Status'}
            </button>
          </div>
        </form>
        {kErr && <div className="mt-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{kErr}</div>}
        {kMsg && <div className="mt-3 rounded-md bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{kMsg}</div>}
      </Panel>

      {/* Change my credentials */}
      <Panel className="reveal-clip p-5">
        <SectionTitle eyebrow="Account" title="My Sparta Login" icon="crown" />
        <p className="mb-4 text-xs text-parchment/50">Current username: <span className="font-semibold text-gold">{user?.username}</span></p>
        <form onSubmit={saveMine} className="grid gap-3 sm:grid-cols-2">
          <Field label="Current Password" type="password" value={curPw} onChange={setCurPw} testId="input-current-pw" />
          <Field label="New Username" value={newUser} onChange={setNewUser} placeholder={user?.username} testId="input-new-user" />
          <Field label="New Password" type="password" value={newPw} onChange={setNewPw} placeholder="Leave blank to keep" testId="input-new-pw" />
          <div className="flex items-end">
            <button type="submit" disabled={mySaving} className="btn-primary w-full" data-testid="button-save-mine">
              {mySaving ? 'Saving…' : 'Update My Login'}
            </button>
          </div>
        </form>
        {myErr && <div className="mt-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{myErr}</div>}
        {myMsg && <div className="mt-3 rounded-md bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{myMsg}</div>}
      </Panel>

      {/* Leader management */}
      <Panel className="reveal-clip p-5">
        <SectionTitle eyebrow="Leaders" title="Alliance Leader Logins" icon="users" />
        <div className="space-y-2">
          {leaders.map((l) => (
            <div key={l.id} className="lift flex items-center gap-3 rounded-lg border border-gold/15 bg-white/5 px-3 py-2.5">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-gold/10 font-display text-xs font-bold text-gold">{l.alliance_tag?.replace(/[\[\]]/g, '')}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-parchment">{l.display_name} <span className="text-parchment/40">· {l.username}</span></div>
                <div className="text-[11px] text-parchment/40">{l.alliance_tag} {l.alliance_slug?.toUpperCase()}</div>
              </div>
              <button onClick={() => openReset(l)} className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20" data-testid={`button-reset-${l.id}`}>
                <Icon name="refresh" size={13} className="mr-1 inline" /> Reset
              </button>
            </div>
          ))}
          {leaders.length === 0 && <div className="py-4 text-center text-sm text-parchment/40">Loading leaders…</div>}
        </div>
      </Panel>

      {/* Reset modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 " onClick={() => setResetId(null)}>
          <div className="w-full max-w-sm panel panel-glow p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-gold">Reset Leader Login</h3>
              <button onClick={() => setResetId(null)} className="text-parchment/50 hover:text-parchment"><Icon name="logout" size={16} /></button>
            </div>
            <form onSubmit={doReset} className="mt-4 space-y-3">
              <Field label="Username" value={rUser} onChange={setRUser} testId="input-r-user" />
              <Field label="New Password" type="password" value={rPw} onChange={setRPw} placeholder="Min 6 characters" testId="input-r-pw" />
              {rErr && <div className="rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{rErr}</div>}
              {rMsg && <div className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{rMsg}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setResetId(null)} className="btn-secondary flex-1">Close</button>
                <button type="submit" disabled={rSaving} className="btn-primary flex-1" data-testid="button-do-reset">{rSaving ? 'Saving…' : 'Reset Login'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, testId }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="mt-1 w-full rounded-lg border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
      />
    </div>
  )
}
