// TWO PAIRED COMPARISONS now contradict our ranking, in two different rooms:
//
//   Forest of Life, Starving 391/553   50/15/35 WON +24.0   46/21/33 LOST -20.8
//   Crystal Cave,  Appraiser 77/690    50/15/35 WON +33.3   46/21/33 LOST -38.4
//
// Paired against the same beast, so the opponent is controlled. Our model rates
// 46/21/33 the BETTER split both times (+5.5 and +1.4). Reality says the opposite,
// by 44.8 and 71.7 points.
//
// 46/21/33 differs from 50/15/35 mainly in CAVALRY (21 vs 15). FRONT_ROW_SPILL is
// what drives the cavalry share -- it was raised to 0.35 fitting Frakinator's
// answers, which were themselves cavalry-heavy. Sweep it against the paired
// outcomes and check the level fit survives.
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
    for(let r=0;r<50000;r++){if(!tot(p)||!tot(ee))break
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
const FOL=[[400.0,566.7,[64920,48690,48690],-3.3],[398.0,563.8,[64880,48660,48660],35.3],
           [395.0,559.6,[64840,48630,48630],12.6],[398.0,564.8,[64800,48600,48600],15.2],
           [398.0,564.8,[64800,48600,48600],-28.5],[396.0,561.0,[64760,48570,48570],25.2],
           [393.0,557.1,[64720,48540,48540],40.0],[391.0,553.3,[64680,48510,48510],24.0]]
const CC=[[78,701,[60000,45000,45000],-19.5],[78,701,[60000,45000,45000],-41.6],[77,690,[60000,45000,45000],33.3]]
const mean=v=>v.reduce((s,x)=>s+x,0)/v.length
console.log(' spill   pair1 (FoL)   pair2 (CC)   ranks correctly?   FoL err   CC err')
for(const sp of [0.00,0.10,0.20,0.25,0.30,0.35]){
  const run=mk(sp)
  const p1a=run(ar(FOL_ME,[81750,24525,57225]),en(391,553.3,[64680,48510,48510]))
  const p1b=run(ar(FOL_ME,[75210,34335,53955]),en(391,553.3,[64680,48510,48510]))
  const p2a=run(ar(CC_ME,[75000,22500,52500]),en(77,690,[60000,45000,45000]))
  const p2b=run(ar(CC_ME,[69000,31500,49500]),en(77,690,[60000,45000,45000]))
  const ok=(p1a>p1b?1:0)+(p2a>p2b?1:0)
  const fe=mean(FOL.map(([a,L,c])=>run(ar(FOL_ME,[81750,24525,57225]),en(a,L,c))))-mean(FOL.map(b=>b[3]))
  const ce=mean(CC.map(([a,L,c])=>run(ar(CC_ME,[75000,22500,52500]),en(a,L,c))))-mean(CC.map(b=>b[3]))
  console.log(`  ${sp.toFixed(2)}   ${(p1a-p1b).toFixed(1).padStart(11)}   ${(p2a-p2b).toFixed(1).padStart(10)}        ${ok}/2            ${fe.toFixed(1).padStart(6)}   ${ce.toFixed(1).padStart(6)}`)
}
console.log('\n  (pair columns: our score for 50/15/35 minus 46/21/33. POSITIVE = we rank it')
console.log('   the way reality did. Reality had 50/15/35 win both pairs.)')
