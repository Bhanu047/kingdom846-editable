import { Panel, ArtImage } from '../components/ui'
import Icon from '../components/Icon'
import { kingdom } from '../data/kingdom'

export default function KingdomPage() {
  return (
    <div className="space-y-6">
      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-64">
          <ArtImage src="./assets/art-kingdom-status.png" alt="Kingdom 846 overview" className="h-full w-full drift-slow" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <div className="eyebrow">The Realm</div>
            <h1 className="mt-1 font-display text-4xl font-bold text-parchment drop-shadow-lg">Kingdom 846</h1>
            <p className="mt-1 text-sm text-gold-bright/90">{kingdom.motto}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <div className="eyebrow">Season</div>
          <div className="mt-1 font-display text-xl font-bold text-parchment">{kingdom.season}</div>
          <p className="mt-2 text-sm text-parchment/60">Active campaign cycle currently driving the war calendar and event rotation.</p>
        </Panel>
        <Panel>
          <div className="eyebrow">Ruler</div>
          <div className="mt-1 font-display text-xl font-bold text-parchment">{kingdom.king}</div>
          <p className="mt-2 text-sm text-parchment/60">Holds the throne and final authority over all kingdom-wide military and diplomatic action.</p>
        </Panel>
        <Panel>
          <div className="eyebrow">Status</div>
          <div className="mt-1 font-display text-xl font-bold text-gold-bright">{kingdom.status}</div>
          <p className="mt-2 text-sm text-parchment/60">The realm is mobilizing. Rallies forming and shields on standby across all alliances.</p>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center gap-2">
          <Icon name="fire" size={16} className="text-gold-bright" />
          <h2 className="text-lg font-bold text-parchment">Kingdom Doctrine</h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            ['United We Rise', 'No alliance fights alone. Rallies are shared, intelligence is pooled, and the kingdom moves as one body in war.'],
            ['Discipline Wins Wars', 'Shield coverage, march discipline, and prep-phase compliance are non-negotiable. The 80% win rate is built in preparation.'],
            ['Honor in Diplomacy', 'A 5.0/5.0 rival reputation is sacred. NAPs are honored, comms are clean, and rivals become allies.'],
            ['Take What Is Ours', 'We do not wait for glory. We organize, we strike, and we hold what we conquer.']
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-gold/15 bg-white/5 p-4">
              <div className="font-semibold text-gold-bright">{t}</div>
              <p className="mt-1 text-sm text-parchment/60">{d}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
