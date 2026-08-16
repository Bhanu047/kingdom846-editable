const http=require('http')

async function ft(url,opts={}){
  const r=await fetch(url,{...opts,headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)','accept':'*/*',...(opts.headers||{})}})
  return {status:r.status,text:await r.text(),ct:r.headers.get('content-type')}
}
function sn(text,needle,radius=1200,max=20){const out=[];let p=0,low=text.toLowerCase(),n=needle.toLowerCase();while((p=low.indexOf(n,p))>=0&&out.length<max){out.push(text.slice(Math.max(0,p-radius),Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' '));p+=n.length}return out}
async function run(){
  const targets=[
    'https://ks-atlas.com/assets/useKingdomProfileQueries-CGODe7vS.js',
    'https://ks-atlas.com/assets/KingdomProfile-BHkKQUfk.js',
    'https://ks-atlas.com/assets/query-BkOu_Irq.js',
    'https://ks-atlas.com/assets/supabase-Cuj-a9Qj.js'
  ]
  for(const url of targets){
    const r=await ft(url)
    console.log('ATLAS_MODULE='+JSON.stringify({url,status:r.status,length:r.text.length,head:r.text.slice(0,4000),kingdom846:sn(r.text,'846',900,10),api:sn(r.text,'kingshot-atlas.onrender.com',1500,20),from:sn(r.text,'.from(',1500,30),rpc:sn(r.text,'.rpc(',1500,30),kingdomNumber:sn(r.text,'kingdom_number',1500,30),score:sn(r.text,'atlas_score',1500,30),rank:sn(r.text,'rank',1000,30)}))
  }
}
const s=http.createServer((q,r)=>{r.setHeader('content-type','application/json');r.end('{"ok":true}')})
s.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run().catch(e=>console.error('ATLAS_ERROR',e))})
