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
        async delete(key) { return store.delete(String(key)) },
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(name) { return stores.delete(name) },
  }
  const self = { addEventListener() {}, skipWaiting() {}, clients: { claim() {} }, registration: {} }
  const factory = new Function('self', 'caches', 'fetch', 'URL', 'Response',
    `${source}\n;return { shellFirst, networkFirst, staleWhileRevalidate, primeBuild, CACHE_VERSION, SHELL_URLS };`)
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
  //
  // This literal is part of the bump. The update-banner change moved the worker
  // to v6 and left it reading v5, so the one test guarding the bump has been
  // failing ever since -- move it in the same commit that moves sw.js.
  assert.equal(loadWorker({ fetchImpl: async () => freshShell }).api.CACHE_VERSION, 'v6')
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
  assert.ok(api.SHELL_URLS.includes('/assets/crest-846-md.webp'),
    'the crest must be local before the launch screen is drawn')
})

test('every crest the app pulls is the size it is drawn at', () => {
  const root = path.join(here, '..')
  const sizeOf = (name) => fs.statSync(path.join(root, 'public', 'assets', name)).size

  // One file served every crest in the app, from a 32px header mark to the
  // launch screen -- a quarter of a megabyte for something the size of a
  // favicon. There are now three, each budgeted for the largest place it is
  // drawn, and the two the shell needs come to less than the one it replaced.
  assert.ok(sizeOf('crest-846-sm.webp') < 40 * 1024,
    `the header crest is ${(sizeOf('crest-846-sm.webp') / 1024).toFixed(0)} KB`)
  assert.ok(sizeOf('crest-846-md.webp') < 130 * 1024,
    `the launch crest is ${(sizeOf('crest-846-md.webp') / 1024).toFixed(0)} KB`)
  assert.ok(sizeOf('crest-846-sm.webp') + sizeOf('crest-846-md.webp') < sizeOf('crest-846.webp'),
    'the two shell crests together must cost less than the single plate they replaced')

  // The 600x900 plate and the PNG are both still on disk -- the report
  // exporters in public/ use the PNG deliberately, since they run on demand
  // long after launch -- but nothing the app draws may reach for either.
  const appFiles = ['src/components/AppHeader.jsx', 'src/components/Sidebar.jsx',
    'src/pages/Dashboard.jsx', 'src/index.css', 'index.html']
  for (const rel of appFiles) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    assert.ok(!text.includes('crest-846.png'),
      `${rel} pulls the 956 KB crest; the app should use the webp`)
    assert.ok(!/crest-846\.webp/.test(text),
      `${rel} pulls the full 600x900 crest where a sized variant would do`)
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

/* Two doors, and each keeps its own.
 *
 * The crest screen is the app's. The website's is the nine halls, and while
 * that entrance loads -- it is an iframe inside the React bundle, so it cannot
 * paint until the bundle has landed AND the iframe has loaded -- the cover it
 * sits behind must be the hall it is about to open in, not a flat #060810
 * rectangle. That rectangle is what was reported from an iPhone as a black
 * screen at kingdom846.com with nothing on it.
 */
test('the crest screen stays the app\'s', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  const rule = html.match(/#k846-launch\{[^}]*\}/)
  assert.ok(rule && /display:none/.test(rule[0]), 'hidden by default')
  assert.match(html, /html\[data-app-launch\]\s*#k846-launch\{display:flex\}/, 'shown only in the app')
})

test('the website waits in the hall it is about to open in', () => {
  const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8')
  assert.match(html, /html\[data-hall\]\s*#boot-veil\{[^}]*var\(--k846-hall\)/,
    'the cover carries the hall image, not a flat colour')
  // Same nine, same order, same start -- the entrance picks from these too, and
  // a cover showing a different room than the door behind it is worse than none.
  const entrance = fs.readFileSync(path.join(here, '..', 'public', 'royal-welcome-2', 'index.html'), 'utf8')
  const halls = (s) => (s.match(/'sapphire'\s*,\s*'coronation'[^\]]*/) || [''])[0].replace(/\s+/g, '')
  assert.equal(halls(html), halls(entrance), 'the two lists must not drift apart')
  assert.ok(html.includes('Date.UTC(2026, 7, 24)'), 'and neither must the start of the rotation')
  assert.ok(entrance.includes('Date.UTC(2026, 7, 24)'))
})

test('the entrance takes the welcome screen away when it has painted', () => {
  const src = fs.readFileSync(path.join(here, '..', 'src', 'components', 'SplashScreen.jsx'), 'utf8')
  // Whoever drops the cover must dismiss the app's screen above it too, or the
  // site sits behind a crest until the 6-second safety line.
  const at = src.indexOf('const revealNow =')
  assert.ok(at !== -1, 'the reveal is its own step')
  const revealNow = src.slice(at, at + 400)
  assert.match(revealNow, /__k846DropVeil/)
  assert.match(revealNow, /__k846DismissLaunch/)
})

/* The front door is an iframe, and an iframe load is a navigation.
 *
 * shellFirst answers navigations with the app's cached shell. Applied to the
 * entrance -- /royal-welcome-2/index.html, loaded in a frame -- that puts the
 * app inside the front door. Only the tab's own navigation gets the shell.
 */
test('the entrance iframe is not answered with the app shell', () => {
  const handler = source.slice(source.indexOf("request.mode === 'navigate'"))
  const guard = handler.slice(0, handler.indexOf('\n'))
  assert.match(guard, /destination !== 'iframe'/, 'a frame is not the tab')
  assert.match(guard, /destination !== 'frame'/)
})

/* A bad cached entry, on a cache-first path, is served for ever.
 *
 * Reported from an iPhone with forty tabs open: the entrance drawn, the hall
 * behind it, and the broken-image icon where the crest goes -- on every reload.
 * Media is served cache-first, so a put that ran out of quota half way is the
 * answer to every later request for that file.
 */
test('a failed response in the cache is thrown away, not served', async () => {
  let fetched = 0
  const { api, caches: store } = loadWorker({
    fetchImpl: async () => { fetched += 1; return { ok: true, status: 200, body: 'the real crest', clone: () => ({ body: 'the real crest' }) } },
  })
  const cache = await store.open('k846-assets-test')
  await cache.put('/royal-welcome-2/assets/crest.webp', { ok: false, status: 503, body: 'half a crest' })
  const out = await api.staleWhileRevalidate('/royal-welcome-2/assets/crest.webp', 'k846-assets-test')
  assert.equal(out.body, 'the real crest', 'the network answers, not the poisoned entry')
  assert.equal(fetched, 1)
})

test('a good cached entry is still served without a round trip', async () => {
  let fetched = 0
  const { api, caches: store } = loadWorker({
    fetchImpl: async () => { fetched += 1; return { ok: true, status: 200, body: 'network', clone: () => ({ body: 'network' }) } },
  })
  const cache = await store.open('k846-assets-test')
  await cache.put('/assets/hall.webp', { ok: true, status: 200, body: 'cached' })
  assert.equal((await api.staleWhileRevalidate('/assets/hall.webp', 'k846-assets-test')).body, 'cached')
})

/* <picture> chooses a source on type support alone and never reconsiders. */
test('the crest falls back when the webp fails to load', () => {
  const entrance = fs.readFileSync(path.join(here, '..', 'public', 'royal-welcome-2', 'index.html'), 'utf8')
  const img = entrance.match(/<img class="crest"[^>]*>/)
  assert.ok(img, 'the crest is an img')
  assert.match(img[0], /onerror=/, 'a failed load has somewhere to go')
  assert.match(img[0], /crest\.png\?retry=1/, 'to the png, under a name no cache entry answers to')
  assert.match(img[0], /dataset\.retried/, 'once, not in a loop')
})

/* One welcome screen, not two.
 *
 * The shell re-renders every second -- the header carries a live clock -- and
 * hands SplashScreen a new onEnter each time. With onEnter in the effect's
 * dependencies the whole effect tore down and re-ran once a second, and every
 * teardown released and re-applied the scroll lock and dropped the cover over
 * the page. Dropped inside the first second, while the entrance behind it was
 * still fetching a crest of the better part of a megabyte: the door half-built,
 * and then the door. Reported as "what is this 2 layers of welcome screen".
 */
test('the splash effect runs once, not once a second', () => {
  const src = fs.readFileSync(path.join(here, '..', 'src', 'components', 'SplashScreen.jsx'), 'utf8')
  assert.match(src, /const onEnterRef = useRef\(onEnter\)/, 'onEnter is held in a ref')
  assert.ok(!/\}, \[onEnter\]\)/.test(src), 'and is not a dependency of the effect')
  assert.match(src, /\}, \[\]\)/, 'the effect runs once')
  // The cleanup drops the cover, so it must only run when the screen really goes.
  assert.match(src, /onEnterRef\.current\?\.\(\)/, 'the handler reads it through the ref')
})

test('the cover waits for the entrance to be furnished, not just loaded', () => {
  const src = fs.readFileSync(path.join(here, '..', 'src', 'components', 'SplashScreen.jsx'), 'utf8')
  // iframe `load` means the document is ready; the crest is still on its way.
  assert.match(src, /querySelector\('img\.crest'\)/, 'the crest is what it waits on')
  assert.match(src, /crest\.complete && crest\.naturalWidth > 0/, 'decoded, not merely requested')
  assert.match(src, /REVEAL_CAP/, 'and the wait is capped')
  assert.match(src, /addEventListener\('error', finish\)/, 'a crest that fails still opens the door')
})

test('a crest that fails both sources is hidden, not left as a grey box', () => {
  const entrance = fs.readFileSync(path.join(here, '..', 'public', 'royal-welcome-2', 'index.html'), 'utf8')
  const img = entrance.match(/<img class="crest"[^>]*>/)[0]
  assert.match(img, /visibility='hidden'/, 'the second failure hides it')
})
