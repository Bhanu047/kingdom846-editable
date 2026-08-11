import { useState } from 'react'
import Icon from './Icon'

export function RosterPending({ title, schema, icon = 'users', description }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(schema.csv).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }
  return (
    <div className="space-y-6">
      <div className="panel panel-glow p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/10 text-gold">
            <Icon name={icon} size={22} />
          </div>
          <div>
            <div className="eyebrow">Awaiting Data</div>
            <h1 className="font-display text-2xl font-bold text-parchment">{title}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-parchment/60">
          {description || 'Live roster data for Kingdom 846 is not publicly available — it requires a logged-in game account. Import your kingdom\'s roster to populate this section.'}
        </p>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow">Import Template</div>
            <h2 className="font-display text-base font-bold text-parchment">{schema.label} CSV schema</h2>
          </div>
          <button onClick={copy} className="btn-secondary">
            <Icon name={copied ? 'shieldCheck' : 'book'} size={14} /> {copied ? 'Copied' : 'Copy template'}
          </button>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-gold/15 bg-ink/60">
          <pre className="px-4 py-3 font-mono text-[11px] leading-relaxed text-parchment/70 whitespace-pre">{schema.csv}</pre>
        </div>
        <p className="mt-3 text-[11px] text-parchment/40">
          Fields: {schema.fields.join(', ')}. Replace the sample row with your kingdom's real data, then it can be imported into the database.
        </p>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, eyebrow, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="panel panel-glow max-h-[85vh] overflow-y-auto">
          {(title || eyebrow) && (
            <div className="flex items-start justify-between gap-3 border-b border-gold/15 p-5">
              <div>
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                <h3 className="font-display text-lg font-bold text-parchment">{title}</h3>
              </div>
              <button onClick={onClose} className="text-parchment/50 hover:text-parchment">
                <Icon name="chevron" size={18} className="rotate-90" />
              </button>
            </div>
          )}
          <div className="p-5 text-sm text-parchment/80">{children}</div>
          {footer && <div className="border-t border-gold/15 p-4">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
