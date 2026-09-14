/**
 * The route table is the single source for three things that used to be kept
 * by hand and drifted: the titles the app sets on navigation, the static
 * shells the build prerenders, and sitemap.xml. These guard the drift.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTES, SITE_ORIGIN, routeById, indexableRoutes } from '../src/data/routes.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const appSrc = fs.readFileSync(path.join(here, '..', 'src', 'App.jsx'), 'utf8')

const knownPages = new Set(
  appSrc.match(/const KNOWN_PAGES = new Set\(\[([\s\S]*?)\]\)/)[1]
        .match(/'[^']+'/g).map((s) => s.slice(1, -1))
)

test('every page the app routes to has an entry in the route table', () => {
  for (const id of knownPages) {
    assert.ok(routeById(id), `KNOWN_PAGES has '${id}' but routes.js does not: it would get the front door's title`)
  }
})

test('the route table invents no page the app cannot render', () => {
  for (const r of ROUTES) {
    assert.ok(knownPages.has(r.id), `routes.js lists '${r.id}', which App.jsx cannot route to`)
  }
})

test('no two routes claim the same path', () => {
  const paths = ROUTES.map((r) => r.path)
  assert.equal(new Set(paths).size, paths.length, 'a duplicate path makes one of them unreachable')
})

test('every indexable route carries what a search result needs', () => {
  for (const r of indexableRoutes()) {
    assert.ok(r.title?.length > 10, `${r.id}: needs a real title`)
    assert.ok(r.description?.length > 40, `${r.id}: needs a description a search engine can show`)
    assert.ok(r.changefreq && r.priority, `${r.id}: sitemap needs changefreq and priority`)
  }
})

test('the signed-in screens are never offered to a crawler', () => {
  for (const id of ['admin', 'console', 'leader-portal', 'war-room', 'settings']) {
    assert.equal(routeById(id).index, false, `${id} must be noindex`)
  }
  const listed = indexableRoutes().map((r) => r.id)
  assert.ok(!listed.includes('admin'), 'admin must never reach sitemap.xml')
})

test('paths are rooted and carry no fragment', () => {
  // The whole point of the move off hash routing: a "#" here would put the
  // route back behind a fragment, where no crawler follows it.
  for (const r of ROUTES) {
    assert.ok(r.path.startsWith('/'), `${r.id}: path must start with /`)
    assert.ok(!r.path.includes('#'), `${r.id}: a fragment is not an indexable URL`)
  }
})

test('titles are distinct, so two routes never look like the same page', () => {
  const titles = indexableRoutes().map((r) => r.title)
  assert.equal(new Set(titles).size, titles.length, 'duplicate titles read as duplicate pages')
})

test('the app no longer routes by fragment', () => {
  assert.ok(!/window\.location\.hash\s*=/.test(appSrc),
    'assigning location.hash puts the route back behind a fragment')
  assert.ok(appSrc.includes('history.pushState'), 'path routing needs pushState')
})

test('the site origin has no trailing slash, so canonicals do not double up', () => {
  assert.ok(!SITE_ORIGIN.endsWith('/'), `${SITE_ORIGIN} + '/about' must not yield a double slash`)
})
