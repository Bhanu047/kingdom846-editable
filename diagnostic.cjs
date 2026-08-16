const http = require('http')

async function request(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Kingdom846SourceCheck/3.0)',
      accept: 'text/html,application/javascript,application/json,text/plain,*/*',
      ...(opts.headers || {}),
    },
  })
  const text = await r.text()
  return { status: r.status, text }
}

function log(label, value, max = 18000) {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  console.log(label + '=' + (s.length > max ? s.slice(0, max) + '…TRUNCATED' : s))
}

async function run() {
  const pageUrl = 'https://kingshotoptimizer.com/kvk-rankings/kingdom/846'
  const page = await request(pageUrl)
  console.log('PAGE_STATUS=' + page.status)
  const assets = [...page.text.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/g)].map(m => m[1])
  log('JS_ASSETS', assets)

  for (const raw of assets) {
    const url = new URL(raw, pageUrl).href
    const asset = await request(url)
    const text = asset.text
    const needles = ['kvk-kingdom', '/api/kvk', 'kvk-rankings', 'Validation error']
    if (needles.some(n => text.includes(n))) {
      console.log('MATCH_ASSET=' + url)
      for (const n of needles) {
        let from = 0, count = 0
        while (count < 6) {
          const i = text.indexOf(n, from)
          if (i < 0) break
          log('SNIP_' + n.replace(/[^a-z0-9]/gi,'_') + '_' + count, text.slice(Math.max(0, i - 2200), i + 3200), 6000)
          from = i + n.length
          count++
        }
      }
    }
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  res.end('{"ok":true,"purpose":"Optimizer contract inspection"}')
})
server.listen(process.env.PORT || 10000, () => {
  console.log('diagnostic listening')
  run().catch(err => console.error('SOURCE_ERROR=' + (err?.stack || err)))
})
