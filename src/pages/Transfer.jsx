import { Panel } from '../components/ui'
import Icon from '../components/Icon'

const TRANSFER_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdx8MNgIjTr-em6u7eMgZLfVIrfsJHoAX3Q4b95x5lu5aTB0g/viewform?embedded=true'

export function TransferMonitor({ isAdmin }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <iframe
        src={TRANSFER_FORM_URL}
        width="100%"
        height="640"
        frameBorder="0"
        marginHeight="0"
        marginWidth="0"
        title="846 Transfer Form"
        style={{ border: 'none', minHeight: '640px' }}
      >
        Loading…
      </iframe>
    </Panel>
  )
}

export default function Transfer() {
  return (
    <div className="space-y-4">
      <Panel glow>
        <h1 className="font-display text-xl font-bold text-parchment">Transfer to Kingdom 846</h1>
        <p className="mt-1 text-sm text-parchment/60">Fill out the form below to submit your transfer request.</p>
      </Panel>
      <TransferMonitor isAdmin={false} />
    </div>
  )
}
