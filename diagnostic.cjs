const http = require('http')

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)', accept: '*/*' } })
  return { status: r.status, text: await r.text(), contentType: r.headers.get('content-type') }
}
function snippets(text, needle, radius = 420, max = 30) {
  const out = []; let p = 0; const low = text.toLowerCase(), n = needle.toLowerCase()
  while ((p = low.indexOf(n, p)) >= 0 && out.length < max) {
    out.push(text.slice(Math.max(0, p - radius), Math.min(text.length, p + n.length + radius)).replace(/\s+/g, ' ')); p += n.length
  }
  return out
}
function urls(text) {
  const found = []
  for (const m of text.matchAll(/https?:\\?\/\\?\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g)) found.push(m[0].replaceAll('\\/', '/'))
  for (const m of text.matchAll(/["'`]((?:\/api\/|\/data\/|\/assets\/)[^"'`]{1,240})["'`]/g)) found.push(m[1])
  return [...new Set(found)]
}

const targets = {
  optimizer: [
    'https://kingshotoptimizer.com/assets/KvKRankingsTool-Caj3iKNO.js',
    'https://kingshotoptimizer.com/assets/rankingsPaths-DosVryNz.js',
    'https://kingshotoptimizer.com/assets/useKvKRankings-Dih_Iel8.js',
    'https://kingshotoptimizer.com/assets/KvKKingdomView-BFWaDIpP.js'
  ],
  atlas: [
    'https://ks-atlas.com/assets/App-BjeEfDID.js',
    'https://ks-atlas.com/assets/PublicApp-yDEyM15Y.js',
    'https://ks-atlas.com/assets/query-BkOu_Irq.js',
    'https://ks-atlas.com/assets/supabase-Cuj-a9Qj.js',
    'https://ks-atlas.com/assets/ScoreStatPanels-BQi8LMVM.js',
    'https://ks-atlas.com/assets/outcomes-BMokynHn.js'
  ]
}

async function inspectGroup(name) {
  const result = []
  for (const url of targets[name]) {
    try {
      const r = await fetchText(url)
      result.push({
        url, status: r.status, contentType: r.contentType, length: r.text.length,
        urls: urls(r.text).filter(x => /api|supabase|data|rank|kvk|kingdom|match|score|history/i.test(x)).slice(0, 100),
        k846: snippets(r.text, '846'),
        k795: snippets(r.text, '795'),
        fetch: snippets(r.text, 'fetch(', 500, 35),
        from: snippets(r.text, '.from(', 500, 35),
        select: snippets(r.text, '.select(', 500, 35),
        kingdom: snippets(r.text, 'kingdom', 340, 35),
        ranking: snippets(r.text, 'ranking', 340, 35),
        rating: snippets(r.text, 'rating', 340, 35),
        score: snippets(r.text, 'score', 340, 35),
      })
    } catch (e) { result.push({ url, error: String(e) }) }
  }
  return result
}

async function run() {
  for (const name of ['atlas', 'optimizer']) {
    console.log(`DIRECT_MODULES_${name.toUpperCase()}=${JSON.stringify(await inspectGroup(name))}`)
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.url === '/health') return res.end(JSON.stringify({ ok: true }))
  res.end(JSON.stringify({ ok: true, diagnostic: 'startup logs' }))
})
server.listen(process.env.PORT || 10000, () => { console.log('diagnostic listening'); run() })
