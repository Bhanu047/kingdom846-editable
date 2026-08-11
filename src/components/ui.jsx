import Icon from './Icon'

export function Panel({ children, className = '', glow }) {
  return <div className={`panel p-5 ${glow ? 'panel-glow gold-corners' : ''} ${className}`}>{children}</div>
}

export function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="section-ornate">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="text-lg font-bold text-parchment">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Pill({ children, tone = 'gold' }) {
  const tones = {
    gold: 'border-gold/40 text-gold-bright bg-gold/10',
    blue: 'border-sky-400/40 text-sky-200 bg-sky-400/10',
    red: 'border-rose-400/40 text-rose-200 bg-rose-400/10',
    green: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/10',
    muted: 'border-white/15 text-parchment/60 bg-white/5'
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function ArtImage({ src, alt, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
    </div>
  )
}


export function ArtCard({ src, alt, title, children, action }) {
  return (
    <div className="panel group overflow-hidden">
      <div className="relative h-40 overflow-hidden">
        <ArtImage src={src} alt={alt} className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="text-base font-bold text-parchment drop-shadow">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        {children}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

