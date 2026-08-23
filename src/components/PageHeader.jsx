import { Panel } from './ui'

// One header for every page.
//
// Before this, nine pages hand-rolled their own and no two matched: four
// different h1 sizes (text-2xl, text-3xl, text-3xl md:text-4xl, and Guides
// running an h2 at text-lg, which is why that one read as dull next to the
// rest), three different ways of darkening the artwork, banner heights from
// h-36 to h-72, and eyebrows that were sometimes shadowed and sometimes bare.
// A visitor moving between pages saw a different site each time.
//
// Everything here is fixed except the words, the picture and an optional slot
// under the copy. If a page needs something structurally different from this,
// that is a signal to change this component rather than to fork it again.
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
    <Panel glow className="hero-frame gold-corners relative overflow-hidden p-0">
      <div className={`relative ${tall ? 'min-h-[15rem] md:min-h-[17rem]' : 'min-h-[11rem] md:min-h-[12.5rem]'}`}>
        {art && (
          <div className="absolute inset-0">
            <img src={art} alt={alt} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        {/* The same directional scrim every banner uses: heavy under the copy,
            clearing to almost nothing on the far side so the artwork is still
            a picture rather than a texture. */}
        <div className="hero-overlay pointer-events-none absolute inset-0" />

        {/* In flow, not absolutely positioned. A fixed-height box with the copy
            floating inside it is what clipped the home hero's buttons on a
            phone; here the banner grows to whatever the copy needs. */}
        <div className="relative flex flex-col justify-center gap-4 px-6 py-7 md:flex-row md:items-center md:px-10 md:py-8">
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="eyebrow text-glow">{eyebrow}</div>}
            <h1 className="gradient-gold glow-pulse mt-1.5 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-parchment/75 text-glow">{subtitle}</p>
            )}
            {children}
          </div>
          {action && <div className="shrink-0 md:self-center">{action}</div>}
        </div>
      </div>
    </Panel>
  )
}
