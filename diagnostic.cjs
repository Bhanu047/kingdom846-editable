const http = require('http')

async function ft(url, options={}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)',
      accept:'*/*',
      ...(options.headers || {})
    }
  })
  return { status:r.status, text:await r.text(), ct:r.headers.get('content-type') }
}
function sn(text, needle, radius=1000, max=30) {
  const out=[]; let p=0; const low=text.toLowerCase(), n=needle.toLowerCase()
  while ((p=low.indexOf(n,p))>=0 && out.length<max) {
    out.push(text.slice(Math.max(0,p-radius),Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' '))
    p+=n.length
  }
  return out
}
async function tryPost(url, body) {
  try {
    const r=await ft(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
    return {url,body,status:r.status,ct:r.ct,text:r.text.slice(0,16000)}
  } catch(e) {
    return {url,body,error:String(e)}
  }
}
async function run() {
  const app=(await ft('https://kingshotoptimizer.com/assets/app-DSqfwT3Y.js')).text
  console.log('OPT_SYMBOL='+JSON.stringify({
    function_t:sn(app,'function _t',1400,10),
    const_t:sn(app,'_t=',1400,15),
    kvkApi:sn(app,'/api/kvk-',1400,20),
    kvkConst:sn(app,'const Yt="/api"',1400,10),
    exportE:sn(app,'_t as e',800,5)
  }))
  const attempts=[]
  for (const body of [{},{kingdom:846},{id:846},{kingdom_id:846},{kingdomId:846},846]) {
    attempts.push(await tryPost('https://kingshotoptimizer.com/api/kvk-kingdom',body))
  }
  attempts.push(await tryPost('https://kingshotoptimizer.com/api/kvk-index',{}))
  console.log('OPT_API_ATTEMPTS='+JSON.stringify(attempts))
}
const server=http.createServer((req,res)=>{
  res.setHeader('content-type','application/json')
  res.end(JSON.stringify({ok:true}))
})
server.listen(process.env.PORT||10000,()=>{
  console.log('diagnostic listening')
  run()
})
