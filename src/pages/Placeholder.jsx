import { Panel, Pill } from '../components/ui'
import Icon from '../components/Icon'

export function Placeholder({ title, icon = 'bell', note }) {
  return (
    <div className="grid place-items-center py-20">
      <Panel className="max-w-md text-center" glow>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold/10 text-gold-bright"><Icon name={icon} size={26} /></div>
        <h1 className="mt-4 font-display text-2xl font-bold text-parchment">{title}</h1>
        <p className="mt-2 text-sm text-parchment/60">{note || 'This section is being prepared. Live data and full functionality will be connected in a later phase.'}</p>
        <div className="mt-4 flex justify-center"><Pill tone="gold">Coming Soon</Pill></div>
      </Panel>
    </div>
  )
}
