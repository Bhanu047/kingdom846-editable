import { useState } from 'react'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { Embers } from '../components/Embers'
import { applyRoles } from '../data/kingdom'
import { useAuth } from '../context/AuthContext'
import { apiJson } from '../lib/api'

// 30-minute slots 00.00 -> 24.00
const SLOTS = Array.from({ length: 49 }, (_, i) => {
  const h = Math.floor(i / 2), m = i % 2 ? '30' : '00'
  return `${String(h).padStart(2, '0')}.${m}`
})

function AvailabilityRanges({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const Row = ({ label, prefix }) => (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <select value={value[`${prefix}_from`] || ''} onChange={(e) => set(`${prefix}_from`, e.target.value)} className="rounded-md border border-gold/20 bg-ink/60 px-2 py-2 text-xs text-parchment outline-none focus:border-gold/60">
          <option value="">Start time</option>{SLOTS.slice(0, 48).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={value[`${prefix}_until`] || ''} onChange={(e) => set(`${prefix}_until`, e.target.value)} className="rounded-md border border-gold/20 bg-ink/60 px-2 py-2 text-xs text-parchment outline-none focus:border-gold/60">
          <option value="">End time</option>{SLOTS.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
  return (
    <div className="space-y-3">
      <Row label="Range 1 · Available from / until" prefix="r1" />
      <Row label="Range 2 · Optional" prefix="r2" />
      <p className="text-[11px] text-parchment/40">You receive one appointment at the first available 30-minute time covered by your range. e.g. 14.00–16.00 includes 14.00, 14.30, 15.00 and 15.30.</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-parchment/50">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
const inputCls = 'w-full rounded-md border border-gold/20 bg-ink/60 px-3 py-2 text-sm text-parchment outline-none focus:border-gold/60'

export default function Apply({ type, onNavigate }) {
  const role = applyRoles.find((r) => r.id === type)
  const { isAdmin } = useAuth()

  // Landing: no specific role selected — show both roles
  if (!role) {
    return (
      <div className="space-y-6">
        <Panel glow className="reveal-clip relative overflow-hidden p-0">
          <div className="relative h-40">
            <img src="./assets/apply-chief-minister.png" alt="Apply" className="h-full w-full drift-slow object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6 md:p-10">
              <div className="eyebrow">Kingdom 846 leadership</div>
              <h1 className="shimmer-text glow-pulse mt-1 font-display text-3xl font-bold md:text-4xl">Apply for a Role</h1>
              <p className="mt-1 text-sm text-parchment/60">Choose a position to begin your application.</p>
            </div>
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          {applyRoles.map((r) => (
            <button key={r.id} onClick={() => onNavigate(r.id === 'chief_minister' ? 'apply-chief' : 'apply-noble')} className="reveal-clip lift panel group relative overflow-hidden text-left">
              <img src={r.art} alt={r.label} className="h-32 w-full object-cover opacity-80 transition group-hover:opacity-100" />
              <div className="p-4">
                <div className="font-display text-lg font-bold text-gold">{r.glyph} Apply for {r.label}</div>
                <p className="mt-1 text-xs text-parchment/60">{r.tagline}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">Begin application <Icon name="arrow" size={12} /></span>
              </div>
            </button>
          ))}
        </div>
        {isAdmin && <AdminApplications />}
      </div>
    )
  }

  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    player_id: '', nickname: '',
    request_kind: '', day: '',
    ttg: '', tg: '', dust: '', tcFrom: '0', tcTo: '0', speedups: '', troopSpeedups: '',
    r1_from: '', r1_until: '', r2_from: '', r2_until: '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setError(null); setSubmitting(true)
    try {
      const payload = { ...form }
      delete payload.player_id; delete payload.nickname
      await apiJson('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ type: role.id, player_id: form.player_id, nickname: form.nickname, request_kind: form.request_kind || null, day: form.day || null, payload }),
      })
      setDone(true)
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const next = () => { setError(null); setStep((s) => s + 1) }
  const back = () => { setError(null); setStep((s) => s - 1) }

  if (done) {
    return (
      <div className="space-y-6">
        <Panel glow className="reveal-clip text-center">
          <Icon name="shieldCheck" size={32} className="mx-auto text-gold" />
          <h1 className="shimmer-text mt-2 font-display text-2xl font-bold">Application received</h1>
          <p className="mt-2 text-sm text-parchment/70">Thank you, <span className="font-semibold text-parchment">{form.nickname || 'Commander'}</span>.</p>
          <p className="mt-1 text-sm text-parchment/70">Your <span className="text-gold">{role.label}</span> request was saved successfully.</p>
          <p className="mt-1 text-xs text-parchment/40">You may apply again, up to 4 times per day. Only your latest application for that day will be considered.</p>
          <button onClick={() => { setDone(false); setStep(1); setForm({ player_id: '', nickname: '', request_kind: '', day: '', ttg: '', tg: '', dust: '', tcFrom: '0', tcTo: '0', speedups: '', troopSpeedups: '', r1_from: '', r1_until: '', r2_from: '', r2_until: '' }) }} className="btn-secondary mt-4">Submit another application</button>
        </Panel>
        {isAdmin && <AdminApplications />}
      </div>
    )
  }

  const isChief = role.id === 'chief_minister'

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Panel glow className="reveal-clip relative overflow-hidden p-0">
        <div className="relative h-48">
          <img src={role.art} alt={role.label} className="h-full w-full drift-slow object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
          <Embers count={10} />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6 md:p-10">
            <div className="eyebrow">Kingdom 846 leadership</div>
            <h1 className="shimmer-text glow-pulse mt-1 font-display text-3xl font-bold md:text-4xl">{role.glyph} Apply for {role.label}</h1>
            <p className="mt-2 max-w-xl text-sm text-parchment/70">{role.tagline}</p>
          </div>
        </div>
      </Panel>

      <Panel className="reveal-clip">
        {/* Stepper */}
        <div className="mb-5 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${step >= s ? 'bg-gold text-ink' : 'bg-white/10 text-parchment/50'}`}>{s}</div>
              <span className={`text-xs ${step >= s ? 'text-parchment' : 'text-parchment/40'}`}>{isChief ? (s === 1 ? 'Verify' : s === 2 ? 'Buff day' : 'Materials') : (s === 1 ? 'Verify' : s === 2 ? 'Details' : 'Availability')}</span>
              {s < 3 && <div className={`h-px flex-1 ${step > s ? 'bg-gold/50' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}

        {/* Step 1: verification */}
        {step === 1 && (
          <div className="space-y-4">
            <SectionTitle eyebrow="Step 1" title="Player verification" />
            <p className="text-sm text-parchment/60">Your Player ID is used for verification. Your nickname is collected only to help Kingdom 846 leadership identify applications later.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Player ID"><input value={form.player_id} onChange={set('player_id')} placeholder="e.g. 123456789" className={inputCls} /></Field>
              <Field label="Nickname"><input value={form.nickname} onChange={set('nickname')} placeholder="Your governor name" className={inputCls} /></Field>
            </div>
            <p className="text-[11px] text-parchment/40">Your details are checked securely and are not shown publicly.</p>
            <button onClick={next} disabled={!form.player_id || !form.nickname} className="btn-primary w-full">Continue</button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            {isChief ? (
              <>
                <SectionTitle eyebrow="Step 2" title="Choose your buff day" />
                <p className="text-sm text-parchment/60">What are you applying for? Please include any general speedups you plan to use on the selected day in your speedup total. You may submit up to 4 applications for each day. Only your latest application for that day is considered.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ k: 'construction', label: 'Day 1 · Construction' }, { k: 'research', label: 'Day 2 · Research' }].map((d) => (
                    <button key={d.k} onClick={() => setForm((f) => ({ ...f, day: d.k, request_kind: d.k }))} className={`rounded-lg border p-4 text-sm font-semibold transition ${form.day === d.k ? 'border-gold bg-gold/15 text-gold' : 'border-gold/20 text-parchment/60 hover:bg-white/5'}`}>{d.label}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <SectionTitle eyebrow="Step 2" title="Troop training request" />
                <p className="text-sm text-parchment/60">You may submit up to 4 applications. Only your latest one is considered.</p>
                <Field label="Troop speedups (in days)"><input type="number" min="0" value={form.troopSpeedups} onChange={set('troopSpeedups')} placeholder="0" className={inputCls} /></Field>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={back} className="btn-secondary flex-1">Back</button>
              <button onClick={next} disabled={isChief && !form.day} className="btn-primary flex-1">Continue</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            {isChief && form.day === 'construction' && (
              <>
                <SectionTitle eyebrow="Step 3" title="Construction materials" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Amount of TTG"><input type="number" min="0" value={form.ttg} onChange={set('ttg')} placeholder="0" className={inputCls} /></Field>
                  <Field label="Amount of TG"><input type="number" min="0" value={form.tg} onChange={set('tg')} placeholder="0" className={inputCls} /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Expected TG TC level · From"><select value={form.tcFrom} onChange={set('tcFrom')} className={inputCls}>{[0,1,2,3,4,5,6,7,8].map((n)=><option key={n} value={n}>{n}</option>)}</select></Field>
                  <Field label="To"><select value={form.tcTo} onChange={set('tcTo')} className={inputCls}>{[0,1,2,3,4,5,6,7,8].map((n)=><option key={n} value={n}>{n}</option>)}</select></Field>
                </div>
                <Field label="Construction speedups (in days)"><input type="number" min="0" value={form.speedups} onChange={set('speedups')} placeholder="0" className={inputCls} /></Field>
              </>
            )}
            {isChief && form.day === 'research' && (
              <>
                <SectionTitle eyebrow="Step 3" title="Research materials" />
                <Field label="Amount of TG dust"><input type="number" min="0" value={form.dust} onChange={set('dust')} placeholder="0" className={inputCls} /></Field>
                <Field label="Research speedups (in days)"><input type="number" min="0" value={form.speedups} onChange={set('speedups')} placeholder="0" className={inputCls} /></Field>
              </>
            )}
            {!isChief && (
              <SectionTitle eyebrow="Step 3" title="Choose your availability · UTC" />
            )}
            <AvailabilityRanges value={form} onChange={setForm} />
            <div className="flex gap-2">
              <button onClick={back} className="btn-secondary flex-1">Back</button>
              <button onClick={submit} disabled={submitting} className="btn-primary flex-1"><Icon name="arrow" size={14} /> {submitting ? 'Sending…' : 'Apply'}</button>
            </div>
          </div>
        )}
      </Panel>

      {isAdmin && <AdminApplications />}
    </div>
  )
}

function AdminApplications() {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const load = async () => { try { setItems(await apiJson('/api/applications')) } catch {} setLoaded(true) }
  const toggle = () => { if (!open) load(); setOpen(!open) }
  const setStatus = async (id, status) => { await apiJson(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load() }
  const label = (t) => t === 'chief_minister' ? 'Chief Minister' : 'Noble Advisor'

  return (
    <Panel className="reveal-clip">
      <button onClick={toggle} className="flex w-full items-center justify-between">
        <SectionTitle eyebrow="Admin" title="Applications" />
        <Pill tone="gold">{open ? 'Hide' : 'View'} ({items.length || '…'})</Pill>
      </button>
      {open && (
        <div className="mt-3">
          {!loaded ? <p className="text-sm text-parchment/50">Loading…</p> :
           items.length === 0 ? <p className="text-sm text-parchment/50">No applications yet.</p> :
           <div className="space-y-2">
             {items.map((a) => (
               <div key={a.id} className="lift rounded-lg border border-gold/15 bg-white/5 p-3">
                 <div className="flex flex-wrap items-center justify-between gap-2">
                   <div><span className="font-semibold text-parchment">{a.nickname}</span><span className="text-parchment/40"> · ID {a.player_id}</span></div>
                   <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">{label(a.type)}{a.request_kind ? ` · ${a.request_kind}` : ''}</span>
                 </div>
                 <div className="mt-1 text-xs text-parchment/50">{a.status} · {new Date(a.created_at + 'Z').toLocaleString()}</div>
                 <div className="mt-2 flex gap-1.5">
                   <button onClick={() => setStatus(a.id, 'contacted')} className="rounded bg-sky-500/15 px-2 py-1 text-[10px] text-sky-300">Mark contacted</button>
                   <button onClick={() => setStatus(a.id, 'done')} className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-300">Mark done</button>
                 </div>
               </div>
             ))}
           </div>}
        </div>
      )}
    </Panel>
  )
}
