// Eight controlled pairwise comparisons across three rooms and four opponents.
// FRONT_ROW_SPILL is the parameter that sets how attractive the BACK ROW is,
// and cavalry lives there. Reality says cavalry is worse than we model it --
// four for four, the lower-cavalry split won. Sweep spill against the ranking.
const T=['infantry','cavalry','archers']
const beats=(x,d)=>(x==='infantry'&&d==='cavalry')||(x==='cavalry'&&d==='archers')||(x==='archers'&&d==='infantry')
const e=s=>(100+s)/100, W=1.09
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
function mk(SPILL){
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
  return (P0,E0,mp,me,tp,te)=>{const p=clone(P0),ee=clone(E0)
    for(let r=0;r<4000;r++){if(!tot(p)||!tot(ee))break
      const dE=volley(p,ee,mp,me),dP=volley(ee,p,me,mp);let moved=false
      for(const t of T){const x=Math.floor(dE[t]),y=Math.floor(dP[t]);if(x||y)moved=true
        ee[t].count=Math.max(0,ee[t].count-x);p[t].count=Math.max(0,p[t].count-y)}
      if(!moved)break}
    return (tot(p)/tp-tot(ee)/te)*100}
}
const FOL={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
           cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
           archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const CC={infantry:{attack:85,lethality:640,defense:85,health:640},
          cavalry:{attack:85,lethality:547.5,defense:85,health:547.5},
          archers:{attack:85,lethality:640,defense:85,health:640}}
const KN={infantry:{attack:180.5,lethality:166.5,defense:178.3,health:155.5},
          cavalry:{attack:180.5,lethality:155.5,defense:178.3,health:155.5},
          archers:{attack:180.5,lethality:155.5,defense:178.3,health:161.0}}
const foe=(a,L,c)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,lethality:L,defense:a,health:L}]))
const ar=(c,s)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],...s[t]}]))
const G=[
 {n:'FoL Starving', s:FOL,e:foe(391,553.3,[64680,48510,48510]),tm:1,tp:163500,te:161700,a:[
   ['50/15/35',[81750,24525,57225], 24.0],['46/21/33',[75210,34335,53955],-20.8]]},
 {n:'CC Appraiser',s:CC,e:foe(77,690,[60000,45000,45000]),tm:1,tp:150000,te:150000,a:[
   ['50/15/35',[75000,22500,52500], 33.3],['52/15/33',[78000,22500,49500],-20.1],['46/21/33',[69000,31500,49500],-38.4]]},
 {n:'KN MadScholar',s:KN,e:foe(222,222,[60000,45000,45000]),tm:1.10,tp:185200,te:150000,a:[
   ['57/15/28',[105564,27780,51856],  9.7],['50/15/35',[92600,27780,64820],-11.7],['46/21/33',[85192,38892,61116],-25.7]]},
 {n:'KN Craftsman',s:KN,e:foe(220,220,[60000,45000,45000]),tm:1.10,tp:185200,te:150000,a:[
   ['50/15/35',[92600,27780,64820],  8.3],['45/20/35',[83340,37040,64820],-17.7]]},
]
console.log('  spill   pairwise right   mean |model gap|   reality gaps are 14-72')
for(const sp of [0.00,0.05,0.10,0.15,0.20,0.30,0.35]){
  const run=mk(sp); let right=0,total=0,gaps=[]
  for(const g of G){
    const p=g.a.map(x=>run(ar(x[1],g.s),g.e,g.tm,1,g.tp,g.te))
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      total++; if(Math.sign(g.a[i][2]-g.a[j][2])===Math.sign(p[i]-p[j]))right++
      gaps.push(Math.abs(p[i]-p[j]))}
  }
  console.log(`   ${sp.toFixed(2)}       ${right}/${total}              ${(gaps.reduce((s,x)=>s+x,0)/gaps.length).toFixed(1)}`)
}
