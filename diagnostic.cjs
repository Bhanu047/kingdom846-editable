const http=require('http')

async function post(body){
  const r=await fetch('https://kingshotoptimizer.com/api/kvk-rankings',{
    method:'POST',
    headers:{'content-type':'application/json','user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)','accept':'application/json'},
    body:JSON.stringify(body)
  })
  const text=await r.text()
  let json=null
  try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,text:text.slice(0,3000)}
}

async function run(){
  const index=await post({type:'index'})
  const detail=await post({type:'kingdom',kingdomId:846})
  const k846=index.json?.result?.kingdoms?.['846'] ?? null
  console.log('K846_OPT_INDEX='+JSON.stringify(k846))
  console.log('K846_OPT_DETAIL='+JSON.stringify(detail.json?.result ?? detail))
}

const s=http.createServer((q,r)=>{r.setHeader('content-type','application/json');r.end('{"ok":true}')})
s.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run().catch(e=>console.error('EXTRACT_ERROR',e))})
