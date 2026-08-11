import { useState } from 'react'
import { Panel, Pill } from '../components/ui'
import Icon from '../components/Icon'

const FORMS = {
  chief: {
    title: 'Chief Minister Reservation',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScM2_mDXcHPC6-rnvckvyDYBIjafHY5mP3STTRNbSBJGu295w/viewform?embedded=true',
    description: 'Reserve your Chief Minister buffs for construction or research days.',
  },
  noble: {
    title: 'Noble Advisor Reservation',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSeiyP94snSb7NJ-Ke7weQAHOovdBFtaQBYJ26IsmJwtjMeYBg/viewform?embedded=true',
    description: 'Reserve your Noble Advisor slot for troops training.',
  },
}

export default function Apply({ type, onNavigate }) {
  const form = FORMS[type] || null

  // Landing page: show both options
  if (!form) {
    return (
      <div className="space-y-4">
        <Panel glow>
          <h1 className="font-display text-2xl font-bold text-parchment">Apply for a Role</h1>
          <p className="mt-1 text-sm text-parchment/60">Choose a position to begin your reservation.</p>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => onNavigate('apply-chief')} className="panel lift group p-5 text-left">
            <div className="font-display text-lg font-bold text-gold">Chief Minister</div>
            <p className="mt-1 text-xs text-parchment/60">Reserve your buff day for construction or research.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">Open form <Icon name="arrow" size={12} /></span>
          </button>
          <button onClick={() => onNavigate('apply-noble')} className="panel lift group p-5 text-left">
            <div className="font-display text-lg font-bold text-gold">Noble Advisor</div>
            <p className="mt-1 text-xs text-parchment/60">Reserve your troops training slot.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">Open form <Icon name="arrow" size={12} /></span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Panel glow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold text-parchment">{form.title}</h1>
            <p className="mt-1 text-sm text-parchment/60">{form.description}</p>
          </div>
          <button onClick={() => onNavigate('apply')} className="btn-secondary text-xs whitespace-nowrap">
            <Icon name="arrow" size={12} /> Back
          </button>
        </div>
      </Panel>
      <Panel className="p-0 overflow-hidden">
        <iframe
          src={form.url}
          width="100%"
          height="640"
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
          title={form.title}
          style={{ border: 'none', minHeight: '640px' }}
        >
          Loading…
        </iframe>
      </Panel>
    </div>
  )
}
