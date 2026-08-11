import Icon from './Icon'

/**
 * RoyalSectionHeader — icon + gradient gold title + ornate divider.
 * Content-safe: all decoration is behind text via z-index.
 */
export function RoyalSectionHeader({ icon, eyebrow, title, action }) {
  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gold/10 blur-md" />
            <div className="relative grid h-9 w-9 place-items-center rounded-full border border-gold/30 bg-ink-2">
              <Icon name={icon} size={16} className="text-gold" />
            </div>
          </div>
        )}
        <div className="flex-1">
          {eyebrow && <div className="eyebrow text-gold/60">{eyebrow}</div>}
          <h2 className="font-display text-lg font-bold gradient-gold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="divider-ornate mt-2">
        <span className="divider-ornate-icon">◆</span>
      </div>
    </div>
  )
}

/**
 * StatusRibbon — small pulse-dot ribbon for "Live", "Open", "Next" status.
 */
export function StatusRibbon({ label, tone = 'gold' }) {
  const tones = {
    gold: 'border-gold/40 bg-gold/10 text-gold',
    red: 'border-crimson/40 bg-crimson/10 text-crimson',
    blue: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
    green: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>
      <span className="pulse-dot" style={{ width: 6, height: 6 }} />
      {label}
    </span>
  )
}

/**
 * GraphicTile — large clickable tile with background image + overlay text.
 * Content-safe: image is always behind text.
 */
export function GraphicTile({ image, label, sublabel, icon, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="lift-glow gold-border-hover img-zoom group relative overflow-hidden rounded-lg border border-gold/20 text-left"
    >
      <div className="relative h-28 sm:h-32">
        <img src={image} alt={label} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        {badge && (
          <span className="absolute top-2 right-2">
            <StatusRibbon label={badge.label} tone={badge.tone} />
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2">
            {icon && <Icon name={icon} size={14} className="text-gold" />}
            <span className="font-display text-sm font-bold text-parchment">{label}</span>
          </div>
          {sublabel && <p className="text-[10px] text-parchment/50 mt-0.5">{sublabel}</p>}
        </div>
      </div>
    </button>
  )
}

/**
 * RankMedal — colored medal badge for rankings.
 */
export function RankMedal({ rank }) {
  const medals = {
    1: { bg: 'from-yellow-300 to-yellow-500', text: 'text-ink', emoji: '🥇' },
    2: { bg: 'from-slate-200 to-slate-400', text: 'text-ink', emoji: '🥈' },
    3: { bg: 'from-orange-400 to-orange-600', text: 'text-ink', emoji: '🥉' },
  }
  const m = medals[rank]
  if (!m) return <span className="grid h-7 w-7 place-items-center rounded-full bg-white/5 border border-gold/15 text-xs font-bold text-parchment/50">{rank}</span>
  return (
    <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b ${m.bg} ${m.text} text-xs font-bold border border-white/20 shadow-md`}>
      {rank}
    </span>
  )
}
