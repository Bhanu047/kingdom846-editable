import { useEffect, useState } from 'react'
import Icon from './Icon'
import { getInstallPrompt, onInstallPromptChange, promptInstall, isStandalone, isIOS, getWaitingRegistration, onUpdateReady, applyUpdate } from '../lib/pwa'
import { trackAction } from '../lib/analytics'

const DISMISS_KEY = 'k846-install-dismissed-v1'
// Long enough that a "not now" is respected, short enough that someone who
// dismissed it in their first week still gets asked again next season.
const DISMISS_DAYS = 30

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch { return false }
}

function Banner({ icon, title, body, action, onDismiss }) {
  return (
    // Lifted clear of the chat assistant's button, which sits at bottom-right
    // 1rem up and is 3.5rem tall -- the same 5rem the chat panel itself uses.
    <div className="fixed inset-x-0 bottom-0 z-[9000] p-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <div className="panel panel-glow gold-corners mx-auto flex max-w-md items-start gap-3 p-4 shadow-2xl">
        <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
          <Icon name={icon} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-parchment">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-parchment/60">{body}</p>
          <div className="mt-3 flex items-center gap-2">
            {action}
            <button onClick={onDismiss} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-parchment/50 hover:text-parchment/80">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(getInstallPrompt)
  const [iosHint, setIosHint] = useState(false)
  const [updateReg, setUpdateReg] = useState(getWaitingRegistration)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => onUpdateReady(setUpdateReg), [])
  useEffect(() => onInstallPromptChange(setPrompt), [])

  // iOS never fires beforeinstallprompt, so the only way to offer installation
  // there is to explain the Share-sheet route by hand. Held back until the
  // visitor has had a moment on the page rather than thrown at them on arrival.
  useEffect(() => {
    if (!isIOS() || isStandalone() || dismissedRecently()) return
    const id = setTimeout(() => setIosHint(true), 20000)
    return () => clearTimeout(id)
  }, [])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setDismissed(true)
    setIosHint(false)
    trackAction('install-dismissed', 'banner')
  }

  async function install() {
    trackAction('install-prompted', 'banner')
    const accepted = await promptInstall()
    trackAction(accepted ? 'install-accepted' : 'install-declined', 'banner')
  }

  // An update is worth interrupting for even when installation was declined —
  // it is the difference between the app people have and the one just shipped.
  if (updateReg) {
    return (
      <Banner
        icon="sparkles"
        title="A new version is ready"
        body="Reload to get the latest kingdom data, guides and fixes."
        onDismiss={() => setUpdateReg(null)}
        action={
          <button onClick={() => applyUpdate(updateReg)} className="btn-primary !py-1.5 !text-xs">
            Reload now
          </button>
        }
      />
    )
  }

  if (dismissed || isStandalone()) return null

  if (prompt) {
    return (
      <Banner
        icon="crown"
        title="Install Kingdom 846"
        body="Add the portal to your home screen — opens like an app, full screen, and works without signal."
        onDismiss={dismiss}
        action={<button onClick={install} className="btn-primary !py-1.5 !text-xs">Install</button>}
      />
    )
  }

  if (iosHint) {
    return (
      <Banner
        icon="crown"
        title="Add Kingdom 846 to your Home Screen"
        body="Tap the Share button below, then choose “Add to Home Screen”. The portal then opens full screen, like an app."
        onDismiss={dismiss}
        action={null}
      />
    )
  }

  return null
}
