import { Panel } from '../components/ui'
import Icon from '../components/Icon'

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
        <Panel glow className="hero-frame relative overflow-hidden p-0">
          <div className="relative h-40 sm:h-48">
            <img src="./assets/hero-apply-chief.png" alt="Apply" className="h-full w-full object-cover" />
            <div className="hero-overlay absolute inset-0" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6 md:p-10">
              <div className="eyebrow">Kingdom 846 leadership</div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold gradient-gold">Apply for a Role</h1>
              <p className="mt-1 text-sm text-parchment/60">Choose a position to begin your reservation.</p>
            </div>
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => onNavigate('apply-chief')} className="panel lift-glow gold-border-hover img-zoom group relative overflow-hidden text-left stagger-in">
            <div className="relative h-32 overflow-hidden">
              <img src="./assets/hero-apply-chief.png" alt="Chief Minister" className="h-full w-full object-cover opacity-80 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
            </div>
            <div className="p-4">
              <div className="font-display text-lg font-bold gradient-gold">Chief Minister</div>
              <p className="mt-1 text-xs text-parchment/60">Reserve your buff day for construction or research.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">Open form <Icon name="arrow" size={12} /></span>
            </div>
          </button>
          <button onClick={() => onNavigate('apply-noble')} className="panel lift-glow gold-border-hover img-zoom group relative overflow-hidden text-left stagger-in">
            <div className="relative h-32 overflow-hidden">
              <img src="./assets/hero-apply-noble.png" alt="Noble Advisor" className="h-full w-full object-cover opacity-80 transition" />
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
      <Panel glow className="hero-frame gold-corners relative overflow-hidden p-0">
        <div className="relative h-36 sm:h-44">
          <img src={form.art} alt={form.title} className="h-full w-full object-cover" />
          <div className="hero-overlay absolute inset-0" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6">
            <button onClick={() => onNavigate('apply')} className="text-xs text-gold/70 hover:text-gold mb-1">← Back to roles</button>
            <h1 className="font-display text-xl sm:text-2xl font-bold gradient-gold">{form.title}</h1>
          </div>
        </div>
      </Panel>

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
