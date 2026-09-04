/* How the installed app opens.
 *
 * Reported from an iPhone: a grey screen, then a white one, then the dashboard.
 * The white was ours. Navigations went through networkFirst, which awaits the
 * round trip before returning anything and only consults the cache when fetch
 * REJECTS -- so a slow-but-not-failing connection never fell back at all, and
 * the web view sat on its own white default until the HTML arrived from Oregon.
 *
 * The rule these hold to is the one an installed app lives by: the first paint
 * never waits on the network.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, '..', 'public', 'sw.js'), 'utf8')

/** Load sw.js against stand-in browser globals and hand back its internals. */
function loadWorker({ fetchImpl }) {
  const stores = new Map()
  const added = []
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        async match(key) { return store.get(String(key)) || undefined },
        async put(key, value) { store.set(String(key), value) },
        async add(key) { added.push(String(key)); store.set(String(key), { body: 'fetched' }) },
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(name) { return stores.delete(name) },
  }
  const self = { addEventListener() {}, skipWaiting() {}, clients: { claim() {} }, registration: {} }
  const factory = new Function('self', 'caches', 'fetch', 'URL', 'Response',
    `${source}\n;return { shellFirst, networkFirst, primeBuild, CACHE_VERSION, SHELL_URLS };`)
  return { api: factory(self, caches, fetchImpl, URL, class {}), caches, stores, added }
}

const cachedShell = { ok: true, body: 'cached shell', clone() { return this } }
const freshShell = { ok: true, body: 'fresh shell', clone() { return this } }
const req = 'https://kingdom846.com/'

test('a cached page is served without waiting for the network', async () => {
  let settled = false
  // A connection that is slow rather than broken: this is the case the old
  // code could not survive, because it only fell back when fetch threw.
  const hanging = () => new Promise((resolve) => setTimeout(() => { settled = true; resolve(freshShell) }, 5000))
  const { api, caches } = loadWorker({ fetchImpl: hanging })
  const cache = await caches.open('k846-shell-test')
  await cache.put('/index.html', cachedShell)

  const started = Date.now()
  const response = await api.shellFirst(req, 'k846-shell-test', '/index.html')
  const waited = Date.now() - started

  assert.equal(response.body, 'cached shell')
  assert.ok(waited < 250, `first paint waited ${waited}ms on the network`)
  assert.equal(settled, false, 'it returned before the network had even answered')
})

test('the background refresh replaces the shell for next time', async () => {
  const { api, caches } = loadWorker({ fetchImpl: async () => freshShell })
  const cache = await caches.open('k846-shell-test')
  await cache.put('/index.html', cachedShell)

  assert.equal((await api.shellFirst(req, 'k846-shell-test', '/index.html')).body, 'cached shell')
  // The refresh is not awaited by the response, so give the microtask queue a turn.
  await new Promise((r) => setTimeout(r, 20))
  assert.equal((await api.shellFirst(req, 'k846-shell-test', '/index.html')).body, 'fresh shell')
})

test('with nothing cached it still falls back to the network', async () => {
  const { api } = loadWorker({ fetchImpl: async () => freshShell })
  assert.equal((await api.shellFirst(req, 'k846-shell-test', '/index.html')).body, 'fresh shell')
})

test('offline with nothing cached fails rather than hanging', async () => {
  const { api } = loadWorker({ fetchImpl: async () => { throw new Error('offline') } })
  await assert.rejects(() => api.shellFirst(req, 'k846-shell-test', '/index.html'), /no shell cached/)
})

test('offline with a cached shell opens the app', async () => {
  const { api, caches } = loadWorker({ fetchImpl: async () => { throw new Error('offline') } })
  const cache = await caches.open('k846-shell-test')
  await cache.put('/index.html', cachedShell)
  assert.equal((await api.shellFirst(req, 'k846-shell-test', '/index.html')).body, 'cached shell')
})

test('the shell the app opens from is precached at install', async () => {
  const { api } = loadWorker({ fetchImpl: async () => freshShell })
  assert.ok(api.SHELL_URLS.includes('/index.html'), 'nothing to serve instantly without this')
})

test('the cache version was bumped with the rule change', () => {
  // sw.js says so in its own header: stale entries under an old policy are how
  // a fix fails to reach the phones that need it.
  assert.equal(loadWorker({ fetchImpl: async () => freshShell }).api.CACHE_VERSION, 'v5')
})

test('the fonts do not hold up the first paint', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  const sheets = [...html.matchAll(/<link[^>]*fonts\.googleapis\.com[^>]*>/g)].map((m) => m[0])
  const blocking = sheets.filter((tag) =>
    /rel=["']stylesheet["']/.test(tag) && !/media=["']print["']/.test(tag))
  // The noscript copy is allowed to block: without scripting there is no app to
  // paint anyway.
  const outsideNoscript = blocking.filter((tag) => !html.includes(`<noscript>${tag}`))
  assert.deepEqual(outsideNoscript, [], 'a blocking font stylesheet keeps the app on a white screen')
})

test('the launch screen is precached, crest and all', async () => {
  const { api } = loadWorker({ fetchImpl: async () => freshShell })
  // The screen is on for 1.32s. Anything it needs that is fetched at that
  // moment does not arrive, and it paints as a bare dark rectangle.
  assert.ok(api.SHELL_URLS.includes('/assets/crest-846.webp'),
    'the crest must be local before the launch screen is drawn')
})

test('the app pulls one crest, and a small one', () => {
  const root = path.join(here, '..')
  const webp = fs.statSync(path.join(root, 'public', 'assets', 'crest-846.webp')).size
  assert.ok(webp < 300 * 1024, `the crest is ${(webp / 1024).toFixed(0)} KB`)

  // Two different crest files means the app downloads both. The report
  // exporters in public/ keep the PNG deliberately -- they run on demand, long
  // after launch -- so only the app's own source is checked here.
  const appFiles = ['src/components/AppLaunch.jsx', 'src/components/AppHeader.jsx',
    'src/components/Sidebar.jsx', 'src/index.css']
  for (const rel of appFiles) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    assert.ok(!text.includes('crest-846.png'),
      `${rel} pulls the 956 KB crest; the app should use the webp`)
  }
})

test('the welcome screen is in the page, not behind 370 kB of code', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  assert.ok(html.includes('id="k846-launch"'), 'the launch screen must ship in the HTML')
  assert.ok(html.includes('#k846-launch{'), 'and be styled inline, not from the CSS bundle')
})

test('what reveals the welcome screen runs before any stylesheet', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  // A script does not run while a stylesheet earlier in the document is still
  // loading. With this script below the font links it waited on Google Fonts
  // and on the CSS bundle, so on the first open after a deploy the welcome
  // screen stayed hidden for seconds -- the reported black screen.
  const setter = html.indexOf("setAttribute('data-app-launch'")
  assert.ok(setter > 0, 'the app-mode decision must be in the HTML')
  const firstSheet = html.search(/<link[^>]+rel=["']stylesheet["']/)
  assert.ok(firstSheet > 0, 'expected at least one stylesheet link')
  assert.ok(setter < firstSheet,
    'the script that reveals the welcome screen must come before the first stylesheet')
})

/* The build the new shell asks for, pulled while nobody is waiting.
 *
 * shellFirst hands over the cached shell instantly and refreshes it behind the
 * visit -- so the deploy lands on the NEXT open, and that open had to fetch a
 * quarter of a megabyte of freshly-named JS before it could draw anything.
 * Priming the assets alongside the shell is what makes that open local too.
 */
test('a fresh shell brings its build in with it', async () => {
  const html = `<!doctype html><html><head>
    <script type="module" crossorigin src="./assets/index-Ce8CVWka.js"></script>
    <link rel="stylesheet" href="./assets/index-3BqRtSbR.css">
  </head><body></body></html>`
  const { api, added } = loadWorker({ fetchImpl: async () => ({ ok: true }) })
  await api.primeBuild({ text: async () => html })
  // Relative in the built HTML, absolute in the cache: the paths the browser
  // will actually ask for.
  assert.deepEqual(added.sort(), ['/assets/index-3BqRtSbR.css', '/assets/index-Ce8CVWka.js'])
})

test('priming asks for nothing that is already local', async () => {
  const html = '<script src="./assets/index-abc.js"></script>'
  const { api, added, stores } = loadWorker({ fetchImpl: async () => ({ ok: true }) })
  await api.primeBuild({ text: async () => html })
  assert.deepEqual(added, ['/assets/index-abc.js'], 'first visit fetches it')
  added.length = 0
  await api.primeBuild({ text: async () => html })
  assert.deepEqual(added, [], 'the second finds it cached')
  assert.ok(stores.size)
})

/* The website's share of the welcome screen.
 *
 * Reported as a black rectangle at kingdom846.com with nothing on it. The
 * entrance is an iframe inside the React bundle, so it cannot paint until the
 * bundle has landed AND the iframe has loaded; until then #boot-veil covered
 * the document with a flat #060810 and the welcome screen -- already in the
 * HTML, already painted -- was held at display:none because it was "the app's".
 */
test('the welcome screen is not gated on app mode', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  const rule = html.match(/#k846-launch\{[^}]*\}/)
  assert.ok(rule, 'the launch screen has its own rule')
  assert.ok(!/display:none/.test(rule[0]), 'it must be on screen from the first frame, on the site as well')
  assert.ok(!/html\[data-app-launch\]\s*#k846-launch/.test(html), 'and not behind an app-mode gate')
})

test('the entrance takes the welcome screen away when it has painted', () => {
  const src = fs.readFileSync(path.join(here, '..', 'src', 'components', 'SplashScreen.jsx'), 'utf8')
  // Whoever drops the veil must dismiss the screen above it too, or the site
  // sits behind a crest until the 6-second safety line.
  const reveal = src.slice(src.indexOf('const reveal ='), src.indexOf('const reveal =') + 400)
  assert.match(reveal, /__k846DropVeil/)
  assert.match(reveal, /__k846DismissLaunch/)
})
