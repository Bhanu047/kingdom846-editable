// THE DIAGNOSTIC WE COULD NOT GET FROM ONE ZONE.
//
//   Crystal Cave    model error  +2.0 pts   (essentially exact)
//   Forest of Life  model error -32.8 pts   (badly pessimistic)
//
// What differs is the SHAPE of the two sides' stat profiles:
//
//   Crystal Cave    me   A/D  85    L/H 640     both sides the SAME shape:
//                   them A/D  78    L/H 701     low attack, high lethality
//
//   Forest of Life  me   A/D 577    L/H 388     MIRRORED shapes:
//                   them A/D 391    L/H 553     I am high A/D, they are high L/H
//
// When both sides have the same shape, any error in how A, L, D and H combine
// CANCELS. When the shapes are mirrored it is exposed -- and it is exposed in
// the direction that says the player's high Attack/Defense is worth more than
// our formula credits.
//
// So: sweep the balance between the Attack/Defense pair and the Lethality/Health
// pair, holding the total exponent at 2 so the overall scale is unchanged.
//   offence = (1+A)^a (1+L)^(2-a)      a = 1.0 is the current formula
//   defence = (1+D)^a (1+H)^(2-a)
// Fit against BOTH zones at once: Crystal Cave pins it from one side (it must
// stay accurate), Forest of Life from the other (it must lose 33 points of bias).
const T=['infantry','cavalry','archers']
const beats=(x,d)=>(x==='infantry'&&d==='cavalry')||(x==='cavalry'&&d==='archers')||(x==='archers'&&d==='infantry')
const e=s=>(100+s)/100
const tot=x=>T.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(T.map(t=>[t,{...x[t]}]))
const SPILL=0.35
function mk(a){
  const off=(s)=>Math.pow(e(s.attack),a)*Math.pow(e(s.lethality),2-a)
  const def=(s)=>Math.pow(e(s.defense),a)*Math.pow(e(s.health),2-a)
  const kills=(n,at,df,at2,dt,sp)=> n<=0?0: Math.sqrt(n)*(off(at)/def(df))*(beats(at2,dt)?1.10:1)*sp
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
// --- Forest of Life: 8 fights at 50/15/35 -------------------------------
const FOL_ME={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
              cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
              archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const FOL=[[400.0,566.7,[64920,48690,48690],-3.3],[398.0,563.8,[64880,48660,48660],35.3],
           [395.0,559.6,[64840,48630,48630],12.6],[398.0,564.8,[64800,48600,48600],15.2],
           [398.0,564.8,[64800,48600,48600],-28.5],[396.0,561.0,[64760,48570,48570],25.2],
           [393.0,557.1,[64720,48540,48540],40.0],[391.0,553.3,[64680,48510,48510],24.0]]
const folArmy=Object.fromEntries(T.map((t,k)=>[t,{count:[81750,24525,57225][k],...FOL_ME[t]}]))
// --- Crystal Cave: 2 fights at 50/15/35 ---------------------------------
const CC_ME={infantry:{attack:85.0,lethality:640.0,defense:85.0,health:640.0},
             cavalry:{attack:85.0,lethality:547.5,defense:85.0,health:547.5},
             archers:{attack:85.0,lethality:640.0,defense:85.0,health:640.0}}
const CC=[[78.0,701.0,[60000,45000,45000],-19.5],[78.0,701.0,[60000,45000,45000],-41.6]]
const ccArmy=Object.fromEntries(T.map((t,k)=>[t,{count:[75000,22500,52500][k],...CC_ME[t]}]))

const mean=v=>v.reduce((s,x)=>s+x,0)/v.length
console.log('   a     FoL error   CC error   |combined|   FoL wins (real 6/8)')
let best=null
for(let a=1.00;a<=1.16;a+=0.01){
  const run=mk(a)
  const fp=FOL.map(([x,L,c])=>run(folArmy,Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:x,defense:x,lethality:L,health:L}]))))
  const cp=CC.map(([x,L,c])=>run(ccArmy,Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:x,defense:x,lethality:L,health:L}]))))
  const fe=mean(fp)-mean(FOL.map(b=>b[3])), ce=mean(cp)-mean(CC.map(b=>b[3]))
  const comb=Math.abs(fe)+Math.abs(ce), wins=fp.filter(v=>v>0).length
  if(!best||comb<best.comb)best={a,comb,fe,ce,wins}
  console.log(`  ${a.toFixed(2)}   ${fe.toFixed(1).padStart(9)}   ${ce.toFixed(1).padStart(8)}   ${comb.toFixed(1).padStart(10)}       ${wins}/8`)
}
console.log(`\nbest a = ${best.a.toFixed(2)}   FoL error ${best.fe.toFixed(1)}, CC error ${best.ce.toFixed(1)}, FoL wins ${best.wins}/8 (real 6/8)`)
console.log(`current a = 1.00 gives FoL -32.8, CC +2.0`)

// per-battle error, not just the mean -- and what it does to the RECOMMENDATION,
// since reweighting A against L changes which troop types are favoured.
console.log('\nPER-BATTLE ERROR (mean absolute)')
for(const a of [1.00,1.08,1.10,1.12]){
  const run=mk(a)
  const fp=FOL.map(([x,L,c])=>run(folArmy,Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:x,defense:x,lethality:L,health:L}]))))
  const cp=CC.map(([x,L,c])=>run(ccArmy,Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:x,defense:x,lethality:L,health:L}]))))
  const fmae=mean(fp.map((v,i)=>Math.abs(v-FOL[i][3])))
  const cmae=mean(cp.map((v,i)=>Math.abs(v-CC[i][3])))
  console.log(`  a=${a.toFixed(2)}   FoL MAE ${fmae.toFixed(1).padStart(5)}   CC MAE ${cmae.toFixed(1).padStart(5)}   both ${((fmae*8+cmae*2)/10).toFixed(1)}`)
}
console.log('\nWHAT IT DOES TO THE RECOMMENDED SPLIT (Forest of Life, enemy 391/553.3)')
for(const a of [1.00,1.10]){
  const run=mk(a)
  const E=Object.fromEntries(T.map((t,k)=>[t,{count:[64680,48510,48510][k],attack:391,defense:391,lethality:553.3,health:553.3}]))
  let best=null
  for(let i=0;i<=100;i+=1)for(let c=0;c+i<=100;c+=1){const sp=[i,c,100-i-c]
    const army=Object.fromEntries(T.map((t,k)=>[t,{count:Math.round(163500*sp[k]/100),...FOL_ME[t]}]))
    const v=run(army,E); if(!best||v>best.v)best={sp,v}}
  console.log(`  a=${a.toFixed(2)}   ->  ${best.sp.join('/')}`)
}
