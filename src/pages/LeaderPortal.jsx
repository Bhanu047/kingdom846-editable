import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Panel, SectionTitle, Pill } from '../components/ui'
import Icon from '../components/Icon'
import { Embers } from '../components/Embers'
import { useAuth } from '../context/AuthContext'
import { useSiteData } from '../context/SiteDataContext'
import { TransferMonitor } from './Transfer'

// Accept .xlsx / .xls / .csv. Expected columns: a Name column and a Governor ID / User ID column.
// A Rank/Position column is optional. If no headers are found, col 0 = Governor ID, col 1 = Name.
const NAME_KEYS = ['name', 'player', 'nickname', 'ign']
const ID_KEYS = ['governor', 'id', 'uid', 'gid']
const POS_KEYS = ['rank', 'position', 'order']

function findCol(headers, keys) {
  return headers.findIndex((h) => {
    const toks = String(h ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    return keys.some((k) => toks.includes(k))
  })
}

function parseRosterFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim()))
        if (!rows.length) return reject(new Error('No rows found in the file.'))
        const header = rows[0].map((c) => String(c ?? '').trim())
        const hasHeader = header.some((h) => NAME_KEYS.concat(ID_KEYS).some((k) => h.toLowerCase().includes(k)) || POS_KEYS.some((k) => h.toLowerCase().includes(k)))
        let nameIdx, idIdx, posIdx, start
        if (hasHeader) {
          nameIdx = findCol(header, NAME_KEYS)
          idIdx = findCol(header, ID_KEYS)
          posIdx = findCol(header, POS_KEYS)
          start = 1
          if (nameIdx === -1) nameIdx = 1
          if (idIdx === -1) idIdx = 0
        } else {
          nameIdx = 1
          idIdx = 0
          posIdx = -1
          start = 0
        }
        const members = []
        for (let i = start; i < rows.length; i++) {
          const row = rows[i]
          const name = String(row[nameIdx] ?? '').trim()
          if (!name) continue
          members.push({
            governorId: String(row[idIdx] ?? '').trim(),
            name,
            position: posIdx >= 0 && row[posIdx] != null && !isNaN(Number(row[posIdx])) ? Number(row[posIdx]) : (members.length + 1),
          })
        }
        if (!members.length) return reject(new Error('Could not find any member rows. Make sure the file has a Name column.'))
        resolve({ members, total: rows.length - start })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsArrayBuffer(file)
  })
}

export default function LeaderPortal() {
  const { user, uploadRoster, getMyRoster } = useAuth()
  const { data } = useSiteData()
  const alliance = data.alliances.find((a) => a.slug === user?.alliance_slug)
  const [members, setMembers] = useState([])
  const [current, setCurrent] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    let active = true
    getMyRoster().then((d) => { if (active && Array.isArray(d.members)) setCurrent(d.members) }).catch(() => {})
    return () => { active = false }
  }, [getMyRoster])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setStatus(null)
    try {
      const { members, total } = await parseRosterFile(file)
      setMembers(members)
      setStatus({ type: 'parsed', count: members.length, total })
    } catch (err) {
      setError(err.message)
      setMembers([])
    }
  }

  const submit = async () => {
    if (!members.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await uploadRoster(members)
      setStatus({ type: 'saved', count: res.count })
      setMembers([])
      if (inputRef.current) inputRef.current.value = ''
      const fresh = await getMyRoster()
      if (Array.isArray(fresh.members)) setCurrent(fresh.members)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Download a fill-in template (.xlsx) with the correct headers.
  // Pre-fills the leader's current roster so they can just edit and re-upload — less work, time saved.
  const downloadTemplate = () => {
    const rows = (current.length ? current : []).map((m, i) => ({
      Position: m.position ?? i + 1,
      'Governor ID': m.governor_id || m.governorId || '',
      Name: m.name || '',
    }))
    // include a couple of blank rows if the roster is empty so they have room to type
    const data = rows.length ? rows : [{ Position: 1, 'Governor ID': '', Name: '' }, { Position: 2, 'Governor ID': '', Name: '' }, { Position: 3, 'Governor ID': '', Name: '' }]
    const ws = XLSX.utils.json_to_sheet(data)
    // widen columns for readability
    ws['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 26 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Roster')
    XLSX.writeFile(wb, `${alliance ? alliance.tag.replace(/[\[\]]/g, '') + '-' : ''}roster-template.xlsx`)
  }

  return (
    <div className="space-y-6">
      <Panel glow className="aurora-border">
        <Embers count={8} />
        <div className="eyebrow">Leader Portal</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-parchment">Roster Upload</h1>
        <p className="mt-2 text-sm text-parchment/60">
          Signed in as <span className="text-gold">{user?.display_name || user?.username}</span> — managing{' '}
          <span className="text-gold">{alliance ? `${alliance.tag} ${alliance.name}` : 'your alliance'}</span>.
        </p>
      </Panel>

      <Panel>
        <SectionTitle eyebrow="Step 1" title="Upload your roster file" />
        <p className="mb-3 text-xs text-parchment/50">
          Excel (.xlsx / .xls) or CSV. Include a <b className="text-parchment/70">Name</b> column and a{' '}
          <b className="text-parchment/70">Governor ID / User ID</b> column. A Rank/Position column is optional.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-primary cursor-pointer" data-testid="button-upload">
            <Icon name="upload" size={15} /> Choose file
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" data-testid="input-roster-file" />
          </label>
          <button onClick={downloadTemplate} className="btn-secondary" data-testid="button-download-template">
            <Icon name="download" size={14} /> Download template
          </button>
          <span className="text-xs text-parchment/50">{members.length ? `${members.length} members parsed` : 'No file selected yet'}</span>
        </div>
        <p className="mt-3 text-xs text-parchment/50">
          Tip: click <b className="text-parchment/70">Download template</b> to get a ready Excel file with the correct columns{current.length ? ' and your current roster pre-filled' : ''}. Fill it in (or edit the existing names), save, then <b className="text-parchment/70">Choose file</b> to upload it back.
        </p>
        {error && <div className="mt-3 rounded-md bg-crimson/15 px-3 py-2 text-xs text-crimson-200">{error}</div>}
        {status?.type === 'parsed' && (
          <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Parsed {status.count} members from the file. Review below, then submit to save to the kingdom database.
          </div>
        )}
        {status?.type === 'saved' && (
          <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Roster saved. {status.count} members stored for {alliance ? `${alliance.tag} ${alliance.name}` : 'your alliance'}.
          </div>
        )}
      </Panel>

      {members.length > 0 && (
        <Panel>
          <div className="flex items-center justify-between">
            <SectionTitle eyebrow="Step 2" title="Review & submit" />
            <Pill tone="blue">{members.length} members</Pill>
          </div>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-gold/15">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-ink-3 text-[10px] uppercase tracking-wider text-gold/70">
                <tr><th className="px-3 py-2">Pos</th><th className="px-3 py-2">Governor ID</th><th className="px-3 py-2">Name</th></tr>
              </thead>
              <tbody>
                {members.slice(0, 200).map((m, i) => (
                  <tr key={i} className="border-t border-gold/10">
                    <td className="px-3 py-1.5 text-gold">{m.position ?? i + 1}</td>
                    <td className="px-3 py-1.5 text-parchment/70">{m.governorId || '—'}</td>
                    <td className="px-3 py-1.5 font-semibold text-parchment">{m.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={submit} disabled={loading} className="btn-primary" data-testid="button-submit-roster">
              {loading ? 'Saving…' : 'Submit & save roster'}
            </button>
            <button onClick={() => { setMembers([]); setStatus(null); if (inputRef.current) inputRef.current.value = '' }} className="btn-ghost">Clear</button>
          </div>
        </Panel>
      )}

      <Panel>
        <SectionTitle eyebrow="Current roster" title="Saved members" action={<Pill tone="gold">{current.length} stored</Pill>} />
        {current.length === 0 ? (
          <p className="text-sm text-parchment/50">No roster uploaded yet for {alliance ? `${alliance.tag} ${alliance.name}` : 'your alliance'}.</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {current.map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-gold/15 bg-white/5 px-3 py-2">
                <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-gold/10 font-display text-xs font-bold text-gold">{m.position ?? i + 1}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-parchment">{m.name}</div>
                  <div className="text-[10px] text-parchment/40">{m.governor_id || m.governorId || 'No ID'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <TransferMonitor isAdmin={false} />

      <p className="text-[10px] text-parchment/30">
        Only your alliance's roster is editable from this portal. Submissions replace the previous roster. Passwords are never stored in plain text.
      </p>
    </div>
  )
}
