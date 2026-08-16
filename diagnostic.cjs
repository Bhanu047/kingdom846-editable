const http = require('http')

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Kingdom846SourceCheck/3.0)',
      accept: 'application/json,text/plain,*/*',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: r.status, text, json }
}

function compact(label, value, max = 60000) {
  const s = JSON.stringify(value)
  console.log(label + '=' + (s.length > max ? s.slice(0, max) + '…TRUNCATED' : s))
}

function collectRelevant(value, path = '$', out = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out
  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectRelevant(v, `${path}[${i}]`, out, seen))
    return out
  }
  const text = JSON.stringify(value)
  if (/846|795|rating|rank|quality|prep|battle|kvk|date|opponent/i.test(text)) {
    const keys = Object.keys(value)
    if (keys.some(k => /kingdom|opponent|rating|rank|quality|prep|battle|kvk|date|history|record|score|result/i.test(k))) {
      out.push({ path, value })
    }
  }
  for (const [k, v] of Object.entries(value)) collectRelevant(v, `${path}.${k}`, out, seen)
  return out
}

async function runOne(label) {
  const res = await post('https://kingshotoptimizer.com/api/kvk-rankings', {
    type: 'kingdom',
    kingdomId: 846,
  })
  console.log(`${label}_STATUS=${res.status}`)
  if (res.json) {
    compact(`${label}_RAW`, res.json)
    compact(`${label}_RELEVANT`, collectRelevant(res.json).slice(0, 120))
  } else {
    compact(`${label}_TEXT`, res.text.slice(0, 10000))
  }
}

async function run() {
  await runOne('OPT_CHECK_1')
  await new Promise(r => setTimeout(r, 1200))
  await runOne('OPT_CHECK_2')
}

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  res.end('{"ok":true,"purpose":"K846 Optimizer verification"}')
})

server.listen(process.env.PORT || 10000, () => {
  console.log('diagnostic listening')
  run().catch(err => console.error('SOURCE_ERROR=' + (err?.stack || err)))
})
