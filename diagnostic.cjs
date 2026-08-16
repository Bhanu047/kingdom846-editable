const http=require('http')
async function ft(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; Kingdom846SourceCheck/1.0)',accept:'*/*'}});return{status:r.status,text:await r.text(),ct:r.headers.get('content-type')}}
function sn(t,n,r=1600,m=20){const o=[];let p=0,l=t.toLowerCase(),x=n.toLowerCase();while((p=l.indexOf(x,p))>=0&&o.length<m){o.push(t.slice(Math.max(0,p-r),Math.min(t.length,p+x.length+r)).replace(/\s+/g,' '));p+=x.length}return o}
async function run(){const a=(await ft('https://kingshotoptimizer.com/assets/app-DSqfwT3Y.js')).text;console.log('OPT_FETCH_FN='+JSON.stringify({oN_assign:sn(a,'oN=',2200,20),oN_function:sn(a,'function oN',2200,20),export_c:sn(a,'oN as c',1000,5),kvk_json:sn(a,'kvk-rankings-data',1800,20),data_json:sn(a,'.json',900,30)}))}
const s=http.createServer((q,r)=>{r.setHeader('content-type','application/json');r.end('{"ok":true}')});s.listen(process.env.PORT||10000,()=>{console.log('diagnostic listening');run()})
