// Seven real outcomes give TWO independent things to fit, both from the same
// split -- so this does not need composition variety after all:
//
//   LEVEL       reality mean +13.8%, model mean -19.0%   -> 32.8 points off
//   SENSITIVITY reality -5.62 pts of edge per +1% enemy attack
//               model   -1.46                            -> 4x too flat
//
// The sensitivity miss is the interesting one: it says the PHYSICS damps stat
// differences, not that a constant is off. The obvious suspect is the count
// exponent. kills ~ count^E: at E=0.5 damage is strongly concave, which
// compresses the effect of any rate advantage. Lower E damps more, higher E
// amplifies. Sweep it against the real slope rather than against another tool.
const T=['infantry','cavalry','archers']
const beats=(a,d)=>(a==='infantry'&&d==='cavalry')||(a==='cavalry'&&d==='archers')||(a==='archers'&&d==='infantry')
const eff=s=>100+s, tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
const SPILL=0.35
function kills(n,at,df,atype,dtype,sp,E){if(n<=0)return 0
  return Math.pow(n,E)*((eff(at.attack)/100*eff(at.lethality)/100)/(eff(df.defense)/100*eff(df.health)/100))*(beats(atype,dtype)?1.10:1)*sp}
function volley(A,D,E){const out={infantry:0,cavalry:0,archers:0}
  const live=T.filter(t=>D[t].count>0); if(!live.length)return out
  const front=live[0],back=live.slice(1),s=back.length?SPILL:0
  for(const t of T){const n=A[t].count; if(n<=0)continue
    const vol=t==='archers'?1.10:1; let rem=1
    if(t==='cavalry'&&front!=='archers'&&D.archers.count>0){out.archers+=kills(n,A.cavalry,D.archers,'cavalry','archers',0.20*vol,E);rem=0.80}
    out[front]+=kills(n,A[t],D[front],t,front,rem*(1-s)*vol,E)
    for(const b of back)out[b]+=kills(n,A[t],D[b],t,b,rem*s/back.length*vol,E)}
  return out}
function battle(P0,E0,E){const p=clone(P0),e=clone(E0)
  for(let r=0;r<20000;r++){if(!tot(p)||!tot(e))break
    const dE=volley(p,e,E),dP=volley(e,p,E);let moved=false
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
console.log(`REALITY: slope ${R.slope.toFixed(2)} pts per +1% enemy attack, mean ${R.mean.toFixed(1)}%\n`)
console.log(' E      model slope   vs reality   model mean   level off')
// NEGATIVE: the exponent does nothing to the slope. Which points at why --
// our model LOSES all seven, so its edge is always -(their surviving share) and
// can only vary through that one term. It never crosses zero, so it is measuring
// on one side of a saturated range. Reality spans -28.5% to +40.0% BECAUSE it
// crosses over: near the crossover a small stat change flips the winner and the
// edge swings hugely. So the flat slope may be a SYMPTOM of the level bias, not
// a separate defect. Test that by fixing the level and re-measuring.
for(const E of [0.50,0.55,0.60,0.65,0.70,0.75,0.80,0.85,0.90,1.00]){
  const ps=B.map(([a,L,c])=>{
    const En=Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,defense:a,lethality:L,health:L}]))
    return battle(army,En,E)})
  const P=reg(xs,ps)
  console.log(` ${E.toFixed(2)}   ${P.slope.toFixed(2).padStart(11)}   ${(P.slope/R.slope).toFixed(2).padStart(9)}x   ${P.mean.toFixed(1).padStart(10)}%   ${(P.mean-R.mean).toFixed(1).padStart(9)}`)
}
