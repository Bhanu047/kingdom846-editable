const http = require('http')
const { URL } = require('url')

const SOURCES = {
  atlas: 'https://ks-atlas.com/kingdom/846',
  optimizer: 'https://kingshotoptimizer.com/kvk-rankings/kingdom/846',
}

function uniq(xs){ return [...new Set(xs)] }
function abs(base, src){ try { return new URL(src, base).href } catch { return null } }
function snippets(text, needle, radius=220, max=30){
  const out=[]; let p=0; const low=text.toLowerCase(), n=needle.toLowerCase()
  while((p=low.indexOf(n,p))>=0 && out.length<max){ out.push(text.slice(Math.max(0,p-radius), Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' ')); p+=n.length }
  return out
}
async function fetchText(url){ const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)','accept':'*/*'}}); return {status:r.status,text:await r.text()} }
function assetRefs(text, base){
  const origin = new URL(base).origin
  return uniq([...text.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map(m => new URL('/' + m[0], origin).href))
}
function apiRefs(text, base){
  const refs=[]
  for(const m of text.matchAll(/https?:\\?\/\\?\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/g)) refs.push(m[0].replaceAll('\\/','/'))
  for(const m of text.matchAll(/["'`]((?:\/api\/|\/data\/)[^"'`]{1,180})["'`]/g)) refs.push(abs(base,m[1]))
  return uniq(refs.filter(Boolean))
}

async function inspect(which){
  const pageUrl=SOURCES[which]
  const page=await fetchText(pageUrl)
  const scriptSrcs=uniq([...page.text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>abs(pageUrl,m[1])).filter(Boolean))
  const output={pageUrl,status:page.status,rootScripts:scriptSrcs,modules:[]}
  let queue=[...scriptSrcs], seen=new Set(), depth=0
  while(queue.length && depth<4){
    const next=[]
    for(const src of queue.slice(0,120)){
      if(seen.has(src)) continue; seen.add(src)
      try{
        const r=await fetchText(src)
        const refs=assetRefs(r.text,src)
        const interesting=/kingdom|rank|kvk|supabase|atlas|score|history|matchup/i.test(src) || /kingdom|rank|kvk|supabase|atlas score|matchup|history/i.test(r.text)
        if(interesting){
          output.modules.push({
            src,status:r.status,length:r.text.length,
            apiRefs:apiRefs(r.text,src).filter(u=>/api|supabase|rank|kvk|kingdom|atlas|data/i.test(u)).slice(0,120),
            assetRefs:refs.filter(u=>/kingdom|rank|kvk|query|supabase|data|score|outcome/i.test(u)).slice(0,120),
            hits846:snippets(r.text,'846',300,20),
            hits795:snippets(r.text,'795',300,20),
            hitsRank:snippets(r.text,'rank',240,20),
            hitsScore:snippets(r.text,'score',240,20),
            hitsFetch:snippets(r.text,'fetch(',300,30),
            hitsFrom:snippets(r.text,'.from(',300,30),
          })
        }
        next.push(...refs)
      }catch(e){ output.modules.push({src,error:String(e)}) }
    }
    queue=uniq(next); depth++
  }
  return output
}

async function logDiagnostics(){
  for(const which of ['atlas','optimizer']){
    try{ console.log(`SOURCE_MODULES_${which.toUpperCase()}=${JSON.stringify(await inspect(which))}`) }
    catch(e){ console.log(`SOURCE_MODULES_${which.toUpperCase()}_ERROR=${String(e)}`) }
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
