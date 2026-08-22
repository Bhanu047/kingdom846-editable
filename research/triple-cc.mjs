// THREE splits against the SAME Crystal Cave beast (Cesares Appraiser 77/690,
// 60000/45000/45000). This is the strongest controlled comparison in the whole
// data set -- one opponent, three compositions.
//
//   50/15/35  (75000/22500/52500)   WON  +33.3
//   52/15/33  (78000/22500/49500)   LOST -20.1
//   46/21/33  (69000/31500/49500)   LOST -38.4
//
// The new middle row is the awkward one: it is only 2 points off the winner on
// two axes and it lost by 53 points. Test what any spill value says about the
// ordering, and whether the ordering is even recoverable.
const T=['infantry','cavalry','archers']
const beats=(x,d)=>(x==='infantry'&&d==='cavalry')||(x==='cavalry'&&d==='archers')||(x==='archers'&&d==='infantry')
const e=s=>(100+s)/100, W=1.09
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
function mk(SPILL){
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
const ME={infantry:{attack:85,lethality:640,defense:85,health:640},
          cavalry:{attack:85,lethality:547.5,defense:85,health:547.5},
          archers:{attack:85,lethality:640,defense:85,health:640}}
const EN=Object.fromEntries(T.map((t,k)=>[t,{count:[60000,45000,45000][k],attack:77,defense:77,lethality:690,health:690}]))
const ar=c=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],...ME[t]}]))
const CASES=[['50/15/35',[75000,22500,52500], 33.3],
             ['52/15/33',[78000,22500,49500],-20.1],
             ['46/21/33',[69000,31500,49500],-38.4]]
console.log(' spill    50/15/35   52/15/33   46/21/33    model order        reality order')
for(const sp of [0.00,0.10,0.20,0.30,0.35]){
  const run=mk(sp)
  const sc=CASES.map(([n,c])=>run(ar(c),EN))
  const order=CASES.map((c,i)=>[c[0],sc[i]]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).join(' > ')
  console.log(`  ${sp.toFixed(2)}   ${sc.map(x=>x.toFixed(1).padStart(8)).join('   ')}    ${order}`)
}
console.log(`  reality                                                        ${CASES.slice().sort((a,b)=>b[2]-a[2]).map(x=>x[0]).join(' > ')}`)
console.log('\n  reality spread across the three: 33.3 to -38.4 = 71.7 points')
const run=mk(0.20); const sc=CASES.map(([n,c])=>run(ar(c),EN))
console.log(`  model spread at spill 0.20:      ${Math.max(...sc).toFixed(1)} to ${Math.min(...sc).toFixed(1)} = ${(Math.max(...sc)-Math.min(...sc)).toFixed(1)} points`)
