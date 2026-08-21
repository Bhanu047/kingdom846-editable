import { Panel } from '../components/ui'
import Icon from '../components/Icon'

const TRANSFER_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdx8MNgIjTr-em6u7eMgZLfVIrfsJHoAX3Q4b95x5lu5aTB0g/viewform?embedded=true'
const TRANSFER_FORM_LINK = 'https://docs.google.com/forms/d/e/1FAIpQLSdx8MNgIjTr-em6u7eMgZLfVIrfsJHoAX3Q4b95x5lu5aTB0g/viewform'

function TransferMonitor({ isAdmin }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <iframe
        src={TRANSFER_FORM_URL}
        width="100%"
        height="700"
        frameBorder="0"
        marginHeight="0"
        marginWidth="0"
        title="846 Transfer Form"
        style={{ border: 'none', minHeight: '700px' }}
      >
        Loading…
      </iframe>
    </Panel>
  )
}

export default function Transfer() {
  return (
    <div className="space-y-4">
      <Panel glow className="relative overflow-hidden p-0">
        <div className="relative h-36 sm:h-44">
          <img src="./assets/hero-transfer.webp" alt="Transfer to 846" className="h-full w-full object-cover" />
          <div className="hero-overlay absolute inset-0" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-6">
            <div className="eyebrow">Recruitment Open</div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold gradient-gold drop-shadow-lg">Transfer to Kingdom 846</h1>
            <p className="mt-1 text-sm text-gold/90">Your power deserves a better home</p>
          </div>
        </div>
      </Panel>
      <TransferMonitor isAdmin={false} />
      <Panel className="text-center">
        <p className="text-sm text-parchment/40">Form not loading? <a href={TRANSFER_FORM_LINK} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright underline">Open form in new tab</a></p>
      </Panel>
    </div>
  )
}
