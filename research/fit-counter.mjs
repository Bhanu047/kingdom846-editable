// The kill ratios said it plainly: the stat maths makes the enemy ~10% stronger
// per troop, and reality has the player killing 21% MORE. ~33% is unaccounted
// for, both sides are T10, and the only structural difference in the fight is
// composition -- 50/15/35 against 40/30/30. So sweep the counter triangle
// against SEVEN REAL OUTCOMES.
//
// This is fitting a DOCUMENTED constant, which is exactly what went wrong when
// it was pushed to 2.7x to match another calculator. The difference is the
// target: that was another model's opinion, this is what actually happened in
// seven battles. When published guidance and measured reality disagree, reality
// wins -- but the disagreement gets recorded, not hidden.
const T=['infantry','cavalry','archers']
const beats=(a,d)=>(a==='infantry'&&d==='cavalry')||(a==='cavalry'&&d==='archers')||(a==='archers'&&d==='infantry')
const eff=s=>100+s, tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
const SPILL=0.35
function kills(n,at,df,atype,dtype,sp,C){if(n<=0)return 0
  return Math.sqrt(n)*((eff(at.attack)/100*eff(at.lethality)/100)/(eff(df.defense)/100*eff(df.health)/100))*(beats(atype,dtype)?C:1)*sp}
function volley(A,D,C){const out={infantry:0,cavalry:0,archers:0}
  const live=T.filter(t=>D[t].count>0); if(!live.length)return out
  const front=live[0],back=live.slice(1),s=back.length?SPILL:0
  for(const t of T){const n=A[t].count; if(n<=0)continue
    const vol=t==='archers'?1.10:1; let rem=1
    if(t==='cavalry'&&front!=='archers'&&D.archers.count>0){out.archers+=kills(n,A.cavalry,D.archers,'cavalry','archers',0.20*vol,C);rem=0.80}
    out[front]+=kills(n,A[t],D[front],t,front,rem*(1-s)*vol,C)
    for(const b of back)out[b]+=kills(n,A[t],D[b],t,b,rem*s/back.length*vol,C)}
  return out}
function battle(P0,E0,C){const p=clone(P0),e=clone(E0)
  for(let r=0;r<20000;r++){if(!tot(p)||!tot(e))break
    const dE=volley(p,e,C),dP=volley(e,p,C);let moved=false
    for(const t of T){const a=Math.floor(dE[t]),b=Math.floor(dP[t]);if(a||b)moved=true
      e[t].count=Math.max(0,e[t].count-a);p[t].count=Math.max(0,p[t].count-b)}
    if(!moved)break}
  return (tot(p)/tot(P0)-tot(e)/tot(E0))*100}
const MINE={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
            cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
            archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const B=[[400.0,566.7,[64920,48690,48690],-3.3],[398.0,563.8,[64880,48660,48660],35.3],
         [395.0,559.6,[64840,48630,48630],12.6],[398.0,564.8,[64800,48600,48600],15.2],
         [398.0,564.8,[64800,48600,48600],-28.5],[396.0,561.0,[64760,48570,48570],25.2],
         [393.0,557.1,[64720,48540,48540],40.0]]
const army=Object.fromEntries(T.map((t,k)=>[t,{count:[81750,24525,57225][k],...MINE[t]}]))
const reg=(x,y)=>{const n=x.length,mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n
  let sxy=0,sxx=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2}
  return{slope:sxy/sxx,mean:my}}
const xs=B.map(b=>b[0]), acts=B.map(b=>b[3])
const R=reg(xs,acts)
console.log(`REALITY: slope ${R.slope.toFixed(2)}, mean ${R.mean.toFixed(1)}%, wins 5/7\n`)
console.log(' counter   model slope   vs reality   model mean   level off   model wins')
let best=null
for(const C of [1.10,1.20,1.30,1.40,1.50,1.60,1.70,1.80,2.00]){
  const ps=B.map(([a,L,c])=>{
    const En=Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,defense:a,lethality:L,health:L}]))
    return battle(army,En,C)})
  const P=reg(xs,ps)
  const wins=ps.filter(v=>v>0).length
  const err=Math.abs(P.mean-R.mean)+Math.abs(P.slope-R.slope)*3
  if(!best||err<best.err)best={C,err,slope:P.slope,mean:P.mean,wins}
  console.log(`  ${C.toFixed(2)}    ${P.slope.toFixed(2).padStart(11)}   ${(P.slope/R.slope).toFixed(2).padStart(9)}x   ${P.mean.toFixed(1).padStart(10)}%   ${(P.mean-R.mean).toFixed(1).padStart(9)}     ${wins}/7`)
}
console.log(`\nbest fit: counter ${best.C}  (slope ${best.slope.toFixed(2)} vs ${R.slope.toFixed(2)}, mean ${best.mean.toFixed(1)}% vs ${R.mean.toFixed(1)}%, ${best.wins}/7 wins vs 5/7)`)
