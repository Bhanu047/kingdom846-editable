import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { isOnline, onNetworkChange } from '../lib/network'

/* The connection strip, under the header.
 *
 * Two states, and the second one matters as much as the first: going offline
 * needs saying, but so does coming back, because otherwise the only way to
 * find out the kingdom is reachable again is to try something and see whether
 * it works. The "back online" note shows itself briefly and then leaves, the
 * way a status message should.
 */
export default function NetworkBanner() {
  const [online, setOnline] = useState(isOnline)
  const [recovered, setRecovered] = useState(false)
  // Nothing is announced until the connection has actually been seen to drop.
  // Without this the "back online" note fires on first load for everyone who
  // was never offline in the first place.
  const wasOffline = useRef(false)

  useEffect(() => onNetworkChange((next) => {
    setOnline(next)
    if (!next) { wasOffline.current = true; setRecovered(false); return }
    if (wasOffline.current) {
      wasOffline.current = false
      setRecovered(true)
    }
  }), [])

  useEffect(() => {
    if (!recovered) return
    const id = setTimeout(() => setRecovered(false), 3200)
    return () => clearTimeout(id)
  }, [recovered])

  if (online && !recovered) return null

  return (
    <div
      className={`net-strip ${online ? 'is-back' : 'is-off'}`}
      role="status"
      aria-live="polite"
    >
      <Icon name={online ? 'sparkles' : 'bell'} size={13} />
      <span>
        {online
          ? 'Back online — the realm is reachable again.'
          : 'No connection — showing what was last saved.'}
      </span>
    </div>
  )
}
