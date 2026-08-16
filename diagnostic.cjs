const http = require('http')

async function ft(url){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)',accept:'*/*'}})
  return {status:r.status,text:await r.text(),ct:r.headers.get('content-type')}
}
function sn(text,needle,radius=1200,max=20){
  const out=[];let p=0;const low=text.toLowerCase(),n=needle.toLowerCase()
  while((p=low.indexOf(n,p))>=0&&out.length<max){out.push(text.slice(Math.max(0,p-radius),Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' '));p+=n.length}
  return out
}
async function run(){
  const u=await ft('https://kingshotoptimizer.com/assets/useKvKRankings-Dih_Iel8.js')
  console.log('EXACT_USE_KVK='+JSON.stringify({status:u.status,length:u.text.length,head:u.text.slice(0,4500),index:sn(u.text,'("index"',1800,10),kingdom:sn(u.text,'("kingdom"',1800,10),imports:sn(u.text,'from"./app-',1800,5)}))
}
const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}))})
server.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run()})
