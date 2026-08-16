const http = require('http')

async function request(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Kingdom846SourceCheck/2.0)',
      accept: 'application/json,text/plain,*/*',
      ...(opts.headers || {}),
    },
  })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: r.status, text, json }
}

function compact(label, value, max = 30000) {
  const s = JSON.stringify(value)
  console.log(label + '=' + (s.length > max ? s.slice(0, max) + '…TRUNCATED' : s))
}

function find846(value, seen = new Set(), out = []) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out
  seen.add(value)
  if (Array.isArray(value)) {
    for (const item of value) find846(item, seen, out)
    return out
  }
  const vals = [value.kingdom, value.kingdom_number, value.kingdomNumber, value.id]
  if (vals.some(v => Number(v) === 846)) out.push(value)
  for (const v of Object.values(value)) find846(v, seen, out)
  return out
}

async function run() {
  // Exact approved Optimizer Kingdom 846 page backend.
  const opt = await request('https://kingshotoptimizer.com/api/kvk-kingdom', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kingdom: 846 }),
  })
  console.log('OPT_STATUS=' + opt.status)
  if (opt.json) {
    compact('OPT_ROOT_KEYS', Object.keys(opt.json))
    compact('OPT_846_OBJECTS', find846(opt.json).slice(0, 25))
    compact('OPT_RAW', opt.json, 50000)
  } else {
    compact('OPT_TEXT', opt.text.slice(0, 5000))
  }

  // Exact approved Atlas Kingdom 846 page data dependencies.
  const atlasTargets = [
    ['ATLAS_COMPARE', 'https://kingshot-atlas.onrender.com/api/v1/compare?kingdoms=846'],
    ['ATLAS_SEARCH', 'https://kingshot-atlas.onrender.com/api/v1/kingdoms?search=846'],
    ['ATLAS_DIRECTORY', 'https://kingshot-atlas.onrender.com/api/v1/kingdoms/directory'],
    ['ATLAS_SNAPSHOT', 'https://ks-atlas.com/snapshots/public-read-rankings.json?v=20260720-mystic-july20'],
  ]

  for (const [label, url] of atlasTargets) {
    const res = await request(url)
    console.log(label + '_STATUS=' + res.status)
    if (res.json) {
      const matches = find846(res.json).slice(0, 25)
      compact(label + '_846', matches, 40000)
      if (!matches.length) compact(label + '_ROOT_KEYS', Array.isArray(res.json) ? ['array', res.json.length] : Object.keys(res.json))
    } else {
      compact(label + '_TEXT', res.text.slice(0, 5000))
    }
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  res.end('{"ok":true,"purpose":"K846 source verification"}')
})

server.listen(process.env.PORT || 10000, () => {
  console.log('diagnostic listening')
  run().catch(err => console.error('SOURCE_ERROR=' + (err?.stack || err)))
})
