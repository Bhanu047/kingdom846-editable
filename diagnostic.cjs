const http = require('http')
const { URL } = require('url')

const SOURCES = {
  atlas: 'https://ks-atlas.com/kingdom/846',
  optimizer: 'https://kingshotoptimizer.com/kvk-rankings/kingdom/846',
}

function uniq(xs){ return [...new Set(xs)].slice(0,300) }
function abs(base, src){ try { return new URL(src, base).href } catch { return null } }
function snippets(text, needle, radius=180){
  const out=[]; let p=0; const low=text.toLowerCase(), n=needle.toLowerCase()
  while((p=low.indexOf(n,p))>=0 && out.length<40){ out.push(text.slice(Math.max(0,p-radius), Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' ')); p+=n.length }
  return out
}
async function inspect(which){
  const pageUrl=SOURCES[which]
  if(!pageUrl) throw new Error('invalid source')
  const r=await fetch(pageUrl,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)','accept':'text/html,application/xhtml+xml'}})
  const html=await r.text()
  const scriptSrcs=uniq([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>abs(pageUrl,m[1])).filter(Boolean))
  const inline=[...html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean)
  const result={pageUrl,status:r.status,htmlLength:html.length,scriptSrcs,inlineCount:inline.length,html846:snippets(html,'846'),html795:snippets(html,'795'),htmlRank:snippets(html,'rank'),htmlScore:snippets(html,'score'),inline846:inline.flatMap(s=>snippets(s,'846')).slice(0,40),scriptFindings:[]}
  for(const src of scriptSrcs.slice(0,25)){
    try{
      const sr=await fetch(src,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)'}})
      const txt=await sr.text()
      const urls=uniq([
        ...[...txt.matchAll(/https?:\\?\/\\?\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g)].map(m=>m[0].replaceAll('\\/','/')),
        ...[...txt.matchAll(/["'`]((?:\/api\/|\/data\/|\/assets\/)[^"'`]{1,180})["'`]/g)].map(m=>m[1])
      ])
      const hits846=snippets(txt,'846',220)
      const hits795=snippets(txt,'795',220)
      const hitsApi=[...snippets(txt,'/api/',220),...snippets(txt,'fetch(',220),...snippets(txt,'supabase',220),...snippets(txt,'graphql',220),...snippets(txt,'kingdom',140)].slice(0,50)
      if(hits846.length||hits795.length||hitsApi.length||urls.length) result.scriptFindings.push({src,status:sr.status,length:txt.length,urls:urls.slice(0,60),hits846:hits846.slice(0,15),hits795:hits795.slice(0,15),hitsApi:hitsApi.slice(0,30)})
    }catch(e){ result.scriptFindings.push({src,error:String(e)}) }
  }
  return result
}

async function logDiagnostics(){
  for(const which of ['atlas','optimizer']){
    try{
      const data=await inspect(which)
      console.log(`SOURCE_DIAGNOSTIC_${which.toUpperCase()}=${JSON.stringify(data)}`)
    }catch(e){ console.log(`SOURCE_DIAGNOSTIC_${which.toUpperCase()}_ERROR=${String(e)}`) }
  }
}

const server=http.createServer(async(req,res)=>{
  res.setHeader('content-type','application/json; charset=utf-8')
  try{
    const u=new URL(req.url,'http://localhost')
    if(u.pathname==='/health') return res.end(JSON.stringify({ok:true}))
    if(u.pathname==='/inspect') return res.end(JSON.stringify(await inspect(u.searchParams.get('which')||'atlas')))
    res.statusCode=404; res.end(JSON.stringify({error:'not found'}))
  }catch(e){ res.statusCode=500; res.end(JSON.stringify({error:String(e),stack:e.stack})) }
})
server.listen(process.env.PORT||10000,()=>{ console.log('diagnostic listening'); logDiagnostics() })
