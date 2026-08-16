const http = require('http')

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent':'Mozilla/5.0', accept:'application/javascript,text/plain,*/*' } })
  return { status:r.status, text:await r.text() }
}

function snippets(label, text, needles) {
  for (const needle of needles) {
    let from = 0, n = 0
    while (n < 10) {
      const i = text.indexOf(needle, from)
      if (i < 0) break
      console.log(`${label}_${needle.replace(/[^a-z0-9]/gi,'_')}_${n}=` + text.slice(Math.max(0,i-3000), i+5000))
      from = i + needle.length
      n++
    }
  }
}

async function run() {
  const urls = [
    'https://kingshotoptimizer.com/assets/useKvKRankings-Dih_Iel8.js',
    'https://kingshotoptimizer.com/assets/app-DSqfwT3Y.js'
  ]
  for (const url of urls) {
    const x = await get(url)
    console.log('FETCH=' + url + ' STATUS=' + x.status + ' LEN=' + x.text.length)
    snippets(url.includes('useKvK') ? 'HOOK' : 'APP', x.text, ['kvk-kingdom','fetch(','JSON.stringify','/api','kingdomId','kingdom:','type:'])
  }
}

const server = http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end('{"ok":true}')})
server.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run().catch(e=>console.error('ERR='+e.stack))})
