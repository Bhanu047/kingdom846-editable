// Neither the exponent nor the counter moves the level. So test the SHAPE of the
// damage formula itself.
//
// These seven fights are unusually good for this, because the two sides have
// mirror-image stat profiles:
//     me    Attack 577 / Defense 543  HIGH    Lethality 388 / Health 369  LOW
//     them  Attack 398 / Defense 398  LOW     Lethality 565 / Health 565  HIGH
// Any formula that weights A/D against L/H differently gives a different winner,
// so the real outcomes can discriminate between shapes that all look reasonable.
const T=['infantry','cavalry','archers']
const beats=(a,d)=>(a==='infantry'&&d==='cavalry')||(a==='cavalry'&&d==='archers')||(a==='archers'&&d==='infantry')
const e=s=>(100+s)/100
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
const SPILL=0.35

const SHAPES = {
  'A*L / (D*H)   [current]': (at,df)=> (e(at.attack)*e(at.lethality))/(e(df.defense)*e(df.health)),
  'A*L / D       ':          (at,df)=> (e(at.attack)*e(at.lethality))/ e(df.defense),
  'A / (D*H)     ':          (at,df)=>  e(at.attack)                 /(e(df.defense)*e(df.health)),
  'A / D         ':          (at,df)=>  e(at.attack)                 / e(df.defense),
  'sqrt(A*L/(D*H))':         (at,df)=> Math.sqrt((e(at.attack)*e(at.lethality))/(e(df.defense)*e(df.health))),
  '(A+L)/(D+H)   ':          (at,df)=> (e(at.attack)+e(at.lethality))/(e(df.defense)+e(df.health)),
}
function mk(shape){
  const kills=(n,at,df,atype,dtype,sp)=> n<=0?0: Math.sqrt(n)*shape(at,df)*(beats(atype,dtype)?1.10:1)*sp
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
const reg=(x,y)=>{const n=x.length,mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n
  let sxy=0,sxx=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2}
  return{slope:sxy/sxx,mean:my}}
const xs=B.map(b=>b[0]), acts=B.map(b=>b[3])
const R=reg(xs,acts)
console.log(`REALITY   slope ${R.slope.toFixed(2)}   mean ${R.mean.toFixed(1)}%   wins 5/7\n`)
console.log('shape                      slope    vs real    mean      level off   wins   mean |err|')
for(const [name,shape] of Object.entries(SHAPES)){
  const run=mk(shape)
  const ps=B.map(([a,L,c])=>{
    const En=Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,defense:a,lethality:L,health:L}]))
    return run(army,En)})
  const P=reg(xs,ps)
  const wins=ps.filter(v=>v>0).length
  const mae=ps.reduce((s,v,i)=>s+Math.abs(v-acts[i]),0)/ps.length
  console.log(` ${name}  ${P.slope.toFixed(2).padStart(7)}  ${(P.slope/R.slope).toFixed(2).padStart(7)}x  ${P.mean.toFixed(1).padStart(7)}%  ${(P.mean-R.mean).toFixed(1).padStart(10)}   ${wins}/7    ${mae.toFixed(1).padStart(6)}`)
}
