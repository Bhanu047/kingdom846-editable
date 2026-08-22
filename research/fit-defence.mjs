// A community implementation (vectorphy007/Kingshot, lib/calculators/damage.ts)
// notes on its denominator: "Capping Defense efficiency at approx +200% ...
// but per research, it's a logarithmic curve in reality." i.e. DEFENSIVE STATS
// HAVE DIMINISHING RETURNS. Our engine applies them at full strength.
//
// That is exactly the direction of our error. Both sides here carry ~400-570%
// bonuses; if the defensive side saturates, the player's high Attack/Defense
// profile beats the beast's high Lethality/Health profile, which is what the
// seven real outcomes show and our model does not.
//
// Sweep one damping exponent on the defensive term: kills ~ A*L / (D*H)^k.
const T=['infantry','cavalry','archers']
const beats=(a,d)=>(a==='infantry'&&d==='cavalry')||(a==='cavalry'&&d==='archers')||(a==='archers'&&d==='infantry')
const e=s=>(100+s)/100
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
const SPILL=0.35
function mk(k){
  const kills=(n,at,df,atype,dtype,sp)=> n<=0?0:
    Math.sqrt(n)*((e(at.attack)*e(at.lethality))/Math.pow(e(df.defense)*e(df.health),k))*(beats(atype,dtype)?1.10:1)*sp
  const volley=(A,D)=>{const out={infantry:0,cavalry:0,archers:0}
    const live=T.filter(t=>D[t].count>0); if(!live.length)return out
    const front=live[0],back=live.slice(1),s=back.length?SPILL:0
    for(const t of T){const n=A[t].count; if(n<=0)continue
      const vol=t==='archers'?1.10:1; let rem=1
      if(t==='cavalry'&&front!=='archers'&&D.archers.count>0){out.archers+=kills(n,A.cavalry,D.archers,'cavalry','archers',0.20*vol);rem=0.80}
      out[front]+=kills(n,A[t],D[front],t,front,rem*(1-s)*vol)
      for(const b of back)out[b]+=kills(n,A[t],D[b],t,b,rem*s/back.length*vol)}
    return out}
  return (P0,E0)=>{const p=clone(P0),ee=clone(E0)
    for(let r=0;r<50000;r++){if(!tot(p)||!tot(ee))break
      const dE=volley(p,ee),dP=volley(ee,p);let moved=false
      for(const t of T){const a=Math.floor(dE[t]),b=Math.floor(dP[t]);if(a||b)moved=true
        ee[t].count=Math.max(0,ee[t].count-a);p[t].count=Math.max(0,p[t].count-b)}
      if(!moved)break}
    return (tot(p)/tot(P0)-tot(ee)/tot(E0))*100}
}
const MINE={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
            cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
            archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const B=[[400.0,566.7,[64920,48690,48690],-3.3],[398.0,563.8,[64880,48660,48660],35.3],
         [395.0,559.6,[64840,48630,48630],12.6],[398.0,564.8,[64800,48600,48600],15.2],
         [398.0,564.8,[64800,48600,48600],-28.5],[396.0,561.0,[64760,48570,48570],25.2],
         [393.0,557.1,[64720,48540,48540],40.0]]
const army=Object.fromEntries(T.map((t,k)=>[t,{count:[81750,24525,57225][k],...MINE[t]}]))
const acts=B.map(b=>b[3]), xs=B.map(b=>b[0])
const reg=(x,y)=>{const n=x.length,mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n
  let sxy=0,sxx=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2}
  return{slope:sxy/sxx,mean:my}}
const R=reg(xs,acts)
console.log(`REALITY   mean ${R.mean.toFixed(1)}%   slope ${R.slope.toFixed(2)}   wins 5/7\n`)
console.log('   k     model mean   level off   slope    wins   mean |err|')
let best=null
for(let k=1.00;k>=0.86;k-=0.02){
  const run=mk(k)
  const ps=B.map(([a,L,c])=>{
    const En=Object.fromEntries(T.map((t,j)=>[t,{count:c[j],attack:a,defense:a,lethality:L,health:L}]))
    return run(army,En)})
  const P=reg(xs,ps), wins=ps.filter(v=>v>0).length
  const mae=ps.reduce((s,v,i)=>s+Math.abs(v-acts[i]),0)/ps.length
  if(!best||mae<best.mae)best={k,mae,mean:P.mean,slope:P.slope,wins,ps}
  console.log(`  ${k.toFixed(2)}   ${P.mean.toFixed(1).padStart(9)}%   ${(P.mean-R.mean).toFixed(1).padStart(9)}   ${P.slope.toFixed(2).padStart(6)}   ${wins}/7    ${mae.toFixed(1).padStart(6)}`)
}
console.log(`\nbest k = ${best.k.toFixed(2)}   mean ${best.mean.toFixed(1)}% (reality ${R.mean.toFixed(1)}%)   ${best.wins}/7 wins (reality 5/7)   mean error ${best.mae.toFixed(1)} pts`)
console.log(`  vs the current k=1.00 which scores 0/7 wins and 35.0 pts of mean error`)
