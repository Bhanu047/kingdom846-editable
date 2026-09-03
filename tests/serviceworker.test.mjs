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
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        async match(key) { return store.get(String(key)) || undefined },
        async put(key, value) { store.set(String(key), value) },
        async add() {},
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(name) { return stores.delete(name) },
  }
  const self = { addEventListener() {}, skipWaiting() {}, clients: { claim() {} }, registration: {} }
  const factory = new Function('self', 'caches', 'fetch', 'URL', 'Response',
    `${source}\n;return { shellFirst, networkFirst, CACHE_VERSION, SHELL_URLS };`)
  return { api: factory(self, caches, fetchImpl, URL, class {}), caches, stores }
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
  assert.equal(loadWorker({ fetchImpl: async () => freshShell }).api.CACHE_VERSION, 'v4')
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
