import React from 'react'
import Icon from './Icon'

/* A page whose code could not be fetched is not a crash, it is a stale build.
 *
 * Every deploy renames the hashed chunks. A phone that opened the site before
 * the deploy is running the previous shell, which asks for chunk names that no
 * longer exist -- so the import for whatever page it renders next rejects, and
 * this boundary caught it and showed "Something went wrong" to somebody who had
 * done nothing wrong. Reported from a phone the morning after a deploy, and it
 * is one reload away from correct every time.
 *
 * So take the reload. Once, and only for this failure: a genuine bug in a page
 * must still surface as an error rather than an endless refresh.
 */
const CHUNK_ERROR = /dynamically imported module|importing a module script failed|failed to fetch dynamically imported module|chunkloaderror|loading chunk \d|unexpected token '<'/i
const RECOVER_KEY = 'k846-chunk-recover'

const isStaleBuild = (error) => {
  const text = `${error?.name || ''} ${error?.message || ''}`
  return CHUNK_ERROR.test(text)
}

/** The worker may be holding the very files that cannot be parsed. */
async function dropCachedBuild() {
  try {
    const names = await caches.keys()
    await Promise.all(names.filter((n) => n.includes('asset') || n.includes('shell')).map((n) => caches.delete(n)))
  } catch { /* no cache API, or it refused -- the reload is still worth taking */ }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    if (!isStaleBuild(error)) return
    // Once per tab. A second failure is a real one and gets the card.
    let already = false
    try { already = sessionStorage.getItem(RECOVER_KEY) === '1' } catch {}
    if (already) return
    try { sessionStorage.setItem(RECOVER_KEY, '1') } catch {}
    dropCachedBuild().then(() => window.location.reload())
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid place-items-center py-20">
          <div className="panel panel-glow max-w-md p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-crimson/10 text-crimson">
              <Icon name="shield" size={26} />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-parchment">Something went wrong</h1>
            <p className="mt-2 text-sm text-parchment/60">
              An unexpected error occurred. Try refreshing the page — your data is safe.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); dropCachedBuild().then(() => window.location.reload()) }}
              className="btn-primary mt-4"
            >
              <Icon name="refresh" size={14} /> Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
