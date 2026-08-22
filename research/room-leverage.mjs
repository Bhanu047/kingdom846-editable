// WHICH ROOM IS WORTH A REPORT? Not the one with least data -- the one where
// the two frozen constants have the most LEVERAGE. A battle in a room where a
// constant barely moves the answer cannot test that constant, however new it is.
//
// Measure it directly: how far does the predicted edge move when each constant
// is pushed to the edge of its plausible range?
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
// Tier folds into the percentages, same as the engine does it.
const TIER={T11:1.175,T10:1.0}
const bump=(p,m)=>((100+p)*m-100)
const tiered=(s,t)=>({attack:bump(s.attack,TIER[t]),lethality:bump(s.lethality,TIER[t]),
                      defense:bump(s.defense,TIER[t]),health:bump(s.health,TIER[t])})
const ROOMS=[
  { name:'Forest of Life', total:163500, split:[50,15,35], tier:'T10', eTier:'T10', logged:9,
    me:{infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
        cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
        archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}},
    them:{attack:391,lethality:553.3,defense:391,health:553.3}, eCounts:[64680,48510,48510] },
  { name:'Crystal Cave', total:150000, split:[58,15,27], tier:'T10', eTier:'T10', logged:7,
    me:{infantry:{attack:84.5,lethality:638,defense:84.5,health:638},
        cavalry:{attack:84.5,lethality:536.5,defense:84.5,health:536.5},
        archers:{attack:84.5,lethality:638,defense:84.5,health:638}},
    them:{attack:76,lethality:685,defense:76,health:685}, eCounts:[60000,45000,45000] },
  { name:'Knowledge Nexus', total:185200, split:[50,20,30], tier:'T11', eTier:'T10', logged:0,
    me:{infantry:{attack:180.5,lethality:166.5,defense:178.3,health:155.5},
        cavalry:{attack:180.5,lethality:155.5,defense:178.3,health:155.5},
        archers:{attack:180.5,lethality:155.5,defense:178.3,health:161.0}},
    them:{attack:222,lethality:222,defense:222,health:222}, eCounts:[60000,45000,45000] },
  { name:'Molten Fort', total:150000, split:[60,15,25], tier:'T10', eTier:'T10', logged:0,
    me:{infantry:{attack:897.4,lethality:205,defense:903.5,health:205},
        cavalry:{attack:859.2,lethality:205,defense:865.3,health:205},
        archers:{attack:897.4,lethality:205,defense:903.5,health:205}},
    them:{attack:1051,lethality:186,defense:1051,health:186}, eCounts:[60000,45000,45000] },
]
const army=(r,W_unused)=>Object.fromEntries(T.map((t,k)=>[t,{count:Math.round(r.total*r.split[k]/100),...tiered(r.me[t],r.tier)}]))
const foe=(r)=>Object.fromEntries(T.map((t,k)=>[t,{count:r.eCounts[k],...tiered(r.them,r.eTier)}]))
// How separated are A/D from L/H? That separation is what gives W any grip.
const sep=(r)=>{const a=(100+r.me.infantry.attack)/100,l=(100+r.me.infantry.lethality)/100
  const A=(100+r.them.attack)/100,L=(100+r.them.lethality)/100
  return Math.max(a/l,l/a,A/L,L/A)}
console.log('room               logged   A/D vs L/H   swing if W 1.09->1.00   swing if spill 0.20->0.35')
for(const r of ROOMS){
  const base=mk(0.20,1.09)(army(r),foe(r))
  const dW=mk(0.20,1.00)(army(r),foe(r))-base
  const dS=mk(0.35,1.09)(army(r),foe(r))-base
  console.log(`  ${r.name.padEnd(17)}${String(r.logged).padStart(4)}     ${sep(r).toFixed(1).padStart(6)}x        ${Math.abs(dW).toFixed(1).padStart(6)} pts              ${Math.abs(dS).toFixed(1).padStart(6)} pts`)
}
// The tier multiplier is the OTHER unvalidated number, and it is a different
// axis: it lands on all four stats, so it squares into offence and defence.
// Only one room is fought at T11, so only that room can test it.
console.log('\nthird axis -- the tier multiplier (1.175 for T11), never checked against a magnitude.')
console.log('Only Knowledge Nexus is fought at T11, so only it can test this at all:')
console.log('  T11 multiplier    KN swing vs 1.175')
for(const m of [1.15,1.12,1.10,1.05,1.00]){
  const r=ROOMS.find(x=>x.tier==='T11')
  const base=mk(0.20,1.09)(army(r),foe(r))
  const saved=TIER.T11; TIER.T11=m
  const d=mk(0.20,1.09)(army(r),foe(r))-base
  TIER.T11=saved
  console.log(`      ${m.toFixed(3)}            ${Math.abs(d).toFixed(1).padStart(6)} pts`)
}
// How many KN battles would it take to see a given error, given sd ~= 28?
const SD=28
console.log('\nbattles needed to see an error at 2 sigma, given per-battle sd ~28:')
for(const [label,swing] of [['tier 1.175 vs 1.10',33],['tier 1.175 vs 1.12',20.5],['tier 1.175 vs 1.15',9]]){
  const n=Math.ceil(Math.pow(2*SD/swing,2))
  console.log(`  ${label.padEnd(22)} ${swing.toString().padStart(5)} pts  ->  ~${n} battles`)
}
console.log('\n  "A/D vs L/H" = how far apart the two stat pairs are. W is an exponent that')
console.log('  splits them, so where they are equal it has no grip at all and a battle')
console.log('  there cannot test it, however new the room is.')
