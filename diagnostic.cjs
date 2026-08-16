const http = require('http')

async function ft(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)',accept:'*/*'}});return{status:r.status,text:await r.text(),ct:r.headers.get('content-type')}}
function sn(text, needle, radius=700, max=20){const out=[];let p=0;const low=text.toLowerCase(),n=needle.toLowerCase();while((p=low.indexOf(n,p))>=0&&out.length<max){out.push(text.slice(Math.max(0,p-radius),Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' '));p+=n.length}return out}
async function inspect(url, needles){const r=await ft(url);return{url,status:r.status,ct:r.ct,length:r.text.length,head:r.text.slice(0,3500),hits:Object.fromEntries(needles.map(n=>[n,sn(r.text,n)]))}}
async function run(){
 const optUse='https://kingshotoptimizer.com/assets/useKvKRankings-Dih_Iel8.js'
 const optApp='https://kingshotoptimizer.com/assets/app-DSqfwT3Y.js'
 const atlasTargets=[
  'https://ks-atlas.com/assets/KingdomProfile-BHkKQUfk.js',
  'https://ks-atlas.com/assets/useKingdomProfileQueries-CGODe7vS.js',
  'https://ks-atlas.com/assets/kingdomHeroFormatters-CfhvOelT.js',
  'https://ks-atlas.com/assets/KingdomEmbed-BKthTb1y.js',
  'https://ks-atlas.com/assets/query-BkOu_Irq.js',
  'https://ks-atlas.com/assets/supabase-Cuj-a9Qj.js'
 ]
 console.log('TRACE_OPT_USE='+JSON.stringify(await inspect(optUse,['from"./app-','S("index"','S("kingdom"','function S','/data/kvk-rankings','fetch('])))
 console.log('TRACE_OPT_APP='+JSON.stringify(await inspect(optApp,['/data/kvk-rankings','kvk-rankings/index','kingdom-','kingdom/','async function','fetch(','Response','manifest'])))
 for(const u of atlasTargets){console.log('TRACE_ATLAS='+JSON.stringify(await inspect(u,['getKingdom','kingdom_number','kingdomNumber','.from(','.select(','fetch(','score','rank','total_kvks','prep_win_rate','battle_win_rate','dominations','outcomes'])))}
}
const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}))})
server.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run()})
