import { Panel } from './ui'

// One header for every page — and this time with something in it.
//
// The first version of this made all nine pages consistent by deleting
// everything that gave any of them life: the artwork stopped drifting, the
// embers went, the shimmer went, the aurora border went, the tallest banners
// were cut to the shortest one's height and the biggest title was cut to the
// smallest one's size. Consistent and dead. Consistency is meant to be about
// STRUCTURE — the same eyebrow, title, subtitle, in the same place, at the same
// size — not about levelling every page down to the plainest thing on it.
//
// So the structure is still fixed and shared, and the treatment is now the full
// royal stack: a lit room behind the words, gilt on the type, and four separate
// slow cycles that never line up, so the band is never quite still.
const EMBERS = [
  { left: '12%', delay: '0s' }, { left: '28%', delay: '2.4s' },
  { left: '46%', delay: '4.9s' }, { left: '63%', delay: '1.3s' },
  { left: '79%', delay: '3.6s' }, { left: '91%', delay: '6.1s' },
]

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  art,
  alt = '',
  children,   // optional extra under the copy (a countdown, a sync line)
  action,     // optional control pinned right on wide screens
  tall,       // for a header that has to hold more than three lines of copy
}) {
  return (
    <Panel glow className="page-header gold-corners relative overflow-hidden p-0">
      {/* flex + items-center on the BAND, not just on the copy: the copy block
          is auto-height, so inside a plain min-height box it pinned to the top
          and left a slab of empty dark underneath -- which is most of what made
          the first version read as dull. */}
      <div className={`relative flex items-center ${tall ? 'min-h-[17rem] md:min-h-[19rem]' : 'min-h-[13.5rem] md:min-h-[15.5rem]'}`}>
        {art && (
          <div className="absolute inset-0 overflow-hidden">
            {/* drift-slow: the picture breathes instead of sitting there. This
                is the single biggest difference between a banner and a slab. */}
            <img src={art} alt={alt} className="drift-slow h-full w-full object-cover" loading="lazy" />
          </div>
        )}

        {/* The room. grade sets the light, rake drops shafts across it, bloom
            glows behind the subject — the same three the home hero uses, on
            cycles of 12s / 29s / 14s so they never beat together. */}
        <div className="hero-grade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="hero-rake pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="ph-bloom pointer-events-none" aria-hidden="true" />
        {/* Copy scrim: lighter than the old flat wash, and weighted to the side
            the words are on, so the artwork stays a picture. */}
        <div className="ph-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="ember-field" aria-hidden="true">
          {EMBERS.map((e) => <span key={e.left} className="ember" style={{ left: e.left, animationDelay: e.delay }} />)}
        </div>

        {/* In flow, not absolutely positioned inside a fixed box — the same fix
            the home hero needed, so the band grows to whatever the copy needs
            instead of clipping it on a narrow screen. */}
        <div className="relative flex w-full flex-col justify-center gap-4 px-6 py-9 md:flex-row md:items-center md:px-11 md:py-10">
          <div className="ph-copy min-w-0 flex-1">
            {eyebrow && (
              <div className="flex items-center gap-2.5">
                <span className="ph-rule" aria-hidden="true" />
                <span className="eyebrow text-glow">{eyebrow}</span>
              </div>
            )}
            <h1 className="gilt-display mt-2.5 font-display text-[1.7rem] font-black leading-[1.12] sm:text-4xl">{title}</h1>
            {subtitle && (
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-parchment/80 text-glow">{subtitle}</p>
            )}
            {children}
          </div>
          {action && <div className="shrink-0 md:self-center">{action}</div>}
        </div>
      </div>
    </Panel>
  )
}
