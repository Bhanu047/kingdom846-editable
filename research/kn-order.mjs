// Three splits, one beast, MONOTONE in Infantry share and crossing zero:
//   46/21/33 -> -25.7    50/15/35 -> -11.7    57/15/28 -> +9.7
// That is the cleanest ordering signal in the whole file. Can the model
// reproduce it at ANY combination of the two knobs that could move it?
// If not, the problem is structural, not a constant.
const T=['infantry','cavalry','archers']
const beats=(x,d)=>(x==='infantry'&&d==='cavalry')||(x==='cavalry'&&d==='archers')||(x==='archers'&&d==='infantry')
const e=s=>(100+s)/100, W=1.09
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
function mk(SPILL,TM){
  const off=(s,m)=>Math.pow(e(s.attack)*m,W)*Math.pow(e(s.lethality)*m,2-W)
  const def=(s,m)=>Math.pow(e(s.defense)*m,W)*Math.pow(e(s.health)*m,2-W)
  const kills=(n,at,df,a2,dt,sp,ma,md)=> n<=0?0: Math.sqrt(n)*(off(at,ma)/def(df,md))*(beats(a2,dt)?1.10:1)*sp
  const volley=(A,D,ma,md)=>{const out={infantry:0,cavalry:0,archers:0}
    const live=T.filter(t=>D[t].count>0); if(!live.length)return out
    const front=live[0],back=live.slice(1),s=back.length?SPILL:0
    for(const t of T){const n=A[t].count; if(n<=0)continue
      const vol=t==='archers'?1.10:1; let rem=1
      if(t==='cavalry'&&front!=='archers'&&D.archers.count>0){out.archers+=kills(n,A.cavalry,D.archers,'cavalry','archers',0.20*vol,ma,md);rem=0.80}
      out[front]+=kills(n,A[t],D[front],t,front,rem*(1-s)*vol,ma,md)
      for(const b of back)out[b]+=kills(n,A[t],D[b],t,b,rem*s/back.length*vol,ma,md)}
    return out}
  return (P0,E0)=>{const p=clone(P0),ee=clone(E0)
    for(let r=0;r<4000;r++){if(!tot(p)||!tot(ee))break
      const dE=volley(p,ee,TM,1),dP=volley(ee,p,1,TM);let moved=false
      for(const t of T){const x=Math.floor(dE[t]),y=Math.floor(dP[t]);if(x||y)moved=true
        ee[t].count=Math.max(0,ee[t].count-x);p[t].count=Math.max(0,p[t].count-y)}
      if(!moved)break}
    return (tot(p)/185200-tot(ee)/150000)*100}
}
const MINE={infantry:{attack:180.5,lethality:166.5,defense:178.3,health:155.5},
            cavalry:{attack:180.5,lethality:155.5,defense:178.3,health:155.5},
            archers:{attack:180.5,lethality:155.5,defense:178.3,health:161.0}}
const foe=Object.fromEntries(T.map((t,k)=>[t,{count:[60000,45000,45000][k],attack:222,lethality:222,defense:222,health:222}]))
const ar=c=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],...MINE[t]}]))
const B=[['46/21/33',[85192,38892,61116],-25.7],['50/15/35',[92600,27780,64820],-11.7],['57/15/28',[105564,27780,51856],9.7]]
console.log('  spill  tier    46/21/33  50/15/35  57/15/28   monotone?  pairwise  mean err')
let best=null
for(const sp of [0.00,0.10,0.20,0.30,0.35]) for(const tm of [1.175,1.15,1.12,1.10,1.05]){
  const run=mk(sp,tm)
  const p=B.map(b=>run(ar(b[1]),foe))
  const mono=p[2]>p[1]&&p[1]>p[0]
  const pw=(p[1]>p[0]?1:0)+(p[2]>p[1]?1:0)+(p[2]>p[0]?1:0)
  const err=p.reduce((s,x,i)=>s+(x-B[i][2]),0)/3
  if(!best||pw>best.pw||(pw===best.pw&&Math.abs(err)<Math.abs(best.err)))best={sp,tm,pw,err}
  console.log(`   ${sp.toFixed(2)}  ${tm.toFixed(3)}  ${p.map(x=>x.toFixed(1).padStart(8)).join('  ')}     ${mono?'yes':'NO '}       ${pw}/3   ${err.toFixed(1).padStart(7)}`)
}
console.log(`\n  best pairwise anywhere: ${best.pw}/3 (spill ${best.sp}, tier ${best.tm}, mean err ${best.err.toFixed(1)})`)
console.log('  reality: 57/15/28 > 50/15/35 > 46/21/33, monotone, spanning 35.4 points.')
