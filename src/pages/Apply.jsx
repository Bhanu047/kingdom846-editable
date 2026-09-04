import { Panel } from '../components/ui'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'

const SHEET_LINK = 'https://docs.google.com/spreadsheets/d/1S7YMhrjHGftb2vovfAahrxpbZsplo6M0I2f89NZiWHA/edit?usp=sharing'

const FORMS = {
  chief_minister: {
    title: 'Chief Minister Reservation',
    embed: 'https://docs.google.com/forms/d/e/1FAIpQLScM2_mDXcHPC6-rnvckvyDYBIjafHY5mP3STTRNbSBJGu295w/viewform?embedded=true',
    link: 'https://docs.google.com/forms/d/e/1FAIpQLScM2_mDXcHPC6-rnvckvyDYBIjafHY5mP3STTRNbSBJGu295w/viewform',
    art: './assets/apply-chief-minister.png',
  },
  noble_advisor: {
    title: 'Noble Advisor Reservation',
    embed: 'https://docs.google.com/forms/d/e/1FAIpQLSeiyP94snSb7NJ-Ke7weQAHOovdBFtaQBYJ26IsmJwtjMeYBg/viewform?embedded=true',
    link: 'https://docs.google.com/forms/d/e/1FAIpQLSeiyP94snSb7NJ-Ke7weQAHOovdBFtaQBYJ26IsmJwtjMeYBg/viewform',
    art: './assets/apply-noble-advisor.png',
  },
}

export default function Apply({ type, onNavigate }) {
  const form = type ? FORMS[type] : null

  // Landing page: show both options with graphics
  if (!form) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Kingdom 846 Leadership"
          title="Apply for a Role"
          subtitle="Choose a position to begin your reservation."
          art="./assets/hero-apply-chief.webp"
          alt="Apply"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => onNavigate('apply-chief')} className="panel lift-glow gold-border-hover img-zoom group relative overflow-hidden text-left stagger-in flex flex-col">
            <div className="relative h-32 overflow-hidden">
              <img src="./assets/hero-apply-chief.webp" alt="Chief Minister" decoding="async" className="h-full w-full object-cover opacity-80 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
            </div>
            <div className="p-4">
              <div className="font-display text-lg font-bold gradient-gold">Chief Minister</div>
              <p className="mt-1 text-xs text-parchment/60">Reserve your buff day for construction or research.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">Open form <Icon name="arrow" size={12} /></span>
            </div>
          </button>
          <button onClick={() => onNavigate('apply-noble')} className="panel lift-glow gold-border-hover img-zoom group relative overflow-hidden text-left stagger-in flex flex-col">
            <div className="relative h-32 overflow-hidden">
              <img src="./assets/hero-apply-noble.webp" alt="Noble Advisor" decoding="async" className="h-full w-full object-cover opacity-80 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
            </div>
            <div className="p-4">
              <div className="font-display text-lg font-bold gradient-gold">Noble Advisor</div>
              <p className="mt-1 text-xs text-parchment/60">Reserve your troops training slot.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">Open form <Icon name="arrow" size={12} /></span>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Kingdom 846 Leadership"
        title={form.title}
        subtitle="Complete the form below to reserve this position."
        art={form.art}
        alt={form.title}
        action={<button onClick={() => onNavigate('apply')} className="btn-secondary btn-sm">← Back to roles</button>}
      />

      {/* Role info cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="gold-corners p-3 text-center">
          <div className="text-2xl mb-1">⚔️</div>
          <div className="text-xs font-bold text-gold">Coordinate</div>
          <div className="text-[10px] text-parchment/50">Lead the alliance strategy</div>
        </Panel>
        <Panel className="gold-corners p-3 text-center">
          <div className="text-2xl mb-1">🛡️</div>
          <div className="text-xs font-bold text-gold">Protect</div>
          <div className="text-[10px] text-parchment/50">Defend the realm together</div>
        </Panel>
        <Panel className="gold-corners p-3 text-center">
          <div className="text-2xl mb-1">👑</div>
          <div className="text-xs font-bold text-gold">Excel</div>
          <div className="text-[10px] text-parchment/50">Rise through the ranks</div>
        </Panel>
      </div>

      {/* Embed form with ornate frame */}
      <Panel className="gold-corners p-0 overflow-hidden glass-panel">
        <div className="px-1 pt-1">
          <iframe
            src={form.embed}
            width="100%"
            height="700"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title={form.title}
            style={{ border: 'none', minHeight: '700px', borderRadius: '0.5rem' }}
          >
            Loading…
          </iframe>
        </div>
      </Panel>

      {/* Check signup status + fallback link */}
      <Panel className="text-center space-y-3">
        <a href={SHEET_LINK} target="_blank" rel="noreferrer" className="btn-secondary inline-flex">
          <Icon name="search" size={14} /> Check if you signed up
        </a>
        <p className="text-sm text-parchment/40">Form not loading? <a href={form.link} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright underline">Open form in new tab</a></p>
      </Panel>
    </div>
  )
}
