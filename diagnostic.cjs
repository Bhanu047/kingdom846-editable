const http = require('http')

async function ft(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)',accept:'*/*'}});return{status:r.status,text:await r.text(),ct:r.headers.get('content-type')}}
function sn(text, needle, radius=900, max=16){const out=[];let p=0;const low=text.toLowerCase(),n=needle.toLowerCase();while((p=low.indexOf(n,p))>=0&&out.length<max){out.push(text.slice(Math.max(0,p-radius),Math.min(text.length,p+n.length+radius)).replace(/\s+/g,' '));p+=n.length}return out}
async function log(name,url,needles,tail=false){const r=await ft(url);console.log(name+'='+JSON.stringify({url,status:r.status,ct:r.ct,length:r.text.length,head:r.text.slice(0,2500),tail:tail?r.text.slice(-10000):'',hits:Object.fromEntries(needles.map(n=>[n,sn(r.text,n)]))}))}
async function run(){
  await log('FOCUS_OPT_APP','https://kingshotoptimizer.com/assets/app-DSqfwT3Y.js',['kvk-rankings','index.json','kingdom.json','kingdom/','.json','fetch(','async function',' as e',' as H',' as L'],true)
  await log('FOCUS_OPT_PATHS','https://kingshotoptimizer.com/assets/rankingsPaths-DosVryNz.js',['index','kingdom','json','path','kvk','data','fetch('],true)
  await log('FOCUS_ATLAS_PROFILE','https://ks-atlas.com/assets/useKingdomProfileQueries-CGODe7vS.js',['kingdom_number','.from(','.select(','eq(','rpc(','fetch(','score','rank','total_kvks','prep_win_rate','battle_win_rate','dominations'],true)
  await log('FOCUS_ATLAS_SUPABASE','https://ks-atlas.com/assets/supabase-Cuj-a9Qj.js',['createClient','supabase.co','anon','from(','rpc('],true)
  await log('FOCUS_ATLAS_PROFILE_UI','https://ks-atlas.com/assets/KingdomProfile-BHkKQUfk.js',['atlas','score','rank','percent','total_kvks','prep','battle','dominations','kingdom_number'],false)
}
const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}))})
server.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run()})
