import { Panel } from '../components/ui'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'

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
      <PageHeader
        eyebrow="Recruitment Open"
        title="Transfer to Kingdom 846"
        subtitle="Your power deserves a better home."
        art="./assets/hero-transfer.webp"
        alt="Transfer to 846"
      />
      <TransferMonitor isAdmin={false} />
      <Panel className="text-center">
        <p className="text-sm text-parchment/40">Form not loading? <a href={TRANSFER_FORM_LINK} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-bright underline">Open form in new tab</a></p>
      </Panel>
    </div>
  )
}
