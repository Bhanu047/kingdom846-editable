// STAT_PAIR_WEIGHT was fitted with spill at 0.35. Spill has moved to 0.20, and
// the two are coupled (both change which troop takes damage). Re-fit W jointly
// rather than assuming it carried over.
const T=['infantry','cavalry','archers']
const beats=(x,d)=>(x==='infantry'&&d==='cavalry')||(x==='cavalry'&&d==='archers')||(x==='archers'&&d==='infantry')
const e=s=>(100+s)/100
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
function mk(SPILL,W){
  const off=s=>Math.pow(e(s.attack),W)*Math.pow(e(s.lethality),2-W)
  const def=s=>Math.pow(e(s.defense),W)*Math.pow(e(s.health),2-W)
  const kills=(n,at,df,a2,dt,sp)=> n<=0?0: Math.sqrt(n)*(off(at)/def(df))*(beats(a2,dt)?1.10:1)*sp
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
    for(let r=0;r<4000;r++){if(!tot(p)||!tot(ee))break
      const dE=volley(p,ee),dP=volley(ee,p);let moved=false
      for(const t of T){const x=Math.floor(dE[t]),y=Math.floor(dP[t]);if(x||y)moved=true
        ee[t].count=Math.max(0,ee[t].count-x);p[t].count=Math.max(0,p[t].count-y)}
      if(!moved)break}
    return (tot(p)/tot(P0)-tot(ee)/tot(E0))*100}
}
const FOL_ME={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
              cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
              archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const CC_ME={infantry:{attack:85,lethality:640,defense:85,health:640},
             cavalry:{attack:85,lethality:547.5,defense:85,health:547.5},
             archers:{attack:85,lethality:640,defense:85,health:640}}
const en=(a,L,c)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,defense:a,lethality:L,health:L}]))
const ar=(me,c)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],...me[t]}]))
const pct=(me,total,p)=>ar(me,p.map(x=>Math.round(total*x/100)))
const B=[
 ['A','FoL',[50,15,35],400.0,566.7,[64920,48690,48690], -3.3],
 ['B','FoL',[50,15,35],398.0,563.8,[64880,48660,48660], 35.3],
 ['C','FoL',[50,15,35],395.0,559.6,[64840,48630,48630], 12.6],
 ['D','FoL',[50,15,35],398.0,564.8,[64800,48600,48600], 15.2],
 ['E','FoL',[50,15,35],398.0,564.8,[64800,48600,48600],-28.5],
 ['F','FoL',[50,15,35],396.0,561.0,[64760,48570,48570], 25.2],
 ['G','FoL',[50,15,35],393.0,557.1,[64720,48540,48540], 40.0],
 ['H','FoL',[50,15,35],391.0,553.3,[64680,48510,48510], 24.0],
 ['I','FoL',[46,21,33],391.0,553.3,[64680,48510,48510],-20.8],
 ['K','CC', [50,15,35], 78.0,701.0,[60000,45000,45000],-19.5],
 ['L','CC', [50,15,35], 78.0,701.0,[60000,45000,45000],-41.6],
 ['M','CC', [50,15,35], 77.0,690.0,[60000,45000,45000], 33.3],
 ['N','CC', [46,21,33], 77.0,690.0,[60000,45000,45000],-38.4],
 ['O','CC', [52,15,33], 77.0,690.0,[60000,45000,45000],-20.1],
]
const ME={FoL:FOL_ME,CC:CC_ME}, TOT={FoL:163500,CC:150000}
console.log('  W     MAE all   MAE FoL   MAE CC    bias    pairs right')
for(const W of [1.00,1.03,1.06,1.09,1.12,1.15,1.20]){
  const run=mk(0.20,W)
  const errs=B.map(([id,room,split,a,L,c,act])=>run(pct(ME[room],TOT[room],split),en(a,L,c))-act)
  const mae=v=>v.reduce((s,x)=>s+Math.abs(x),0)/v.length
  const fol=errs.filter((_,i)=>B[i][1]==='FoL'), cc=errs.filter((_,i)=>B[i][1]==='CC')
  const p1=run(pct(FOL_ME,163500,[50,15,35]),en(391,553.3,[64680,48510,48510]))-run(pct(FOL_ME,163500,[46,21,33]),en(391,553.3,[64680,48510,48510]))
  const p2=run(pct(CC_ME,150000,[50,15,35]),en(77,690,[60000,45000,45000]))-run(pct(CC_ME,150000,[46,21,33]),en(77,690,[60000,45000,45000]))
  console.log(`  ${W.toFixed(2)}  ${mae(errs).toFixed(1).padStart(7)}   ${mae(fol).toFixed(1).padStart(7)}   ${mae(cc).toFixed(1).padStart(7)}  ${(errs.reduce((s,x)=>s+x,0)/errs.length).toFixed(1).padStart(6)}      ${(p1>0?1:0)+(p2>0?1:0)}/2`)
}
console.log('\n  noise floor (D vs E, identical fight, opposite result): ~17.2')
