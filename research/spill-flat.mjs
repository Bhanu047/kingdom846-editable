// How SHARP is the optimum? If thousands of splits sit within the noise band,
// naming one exact split to the user is false precision -- and it explains why
// the paired comparisons flip sign on a parameter the level fit can't see.
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
const FOL_ME={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
              cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
              archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const en=(a,L,c)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,defense:a,lethality:L,health:L}]))
const ar=(me,c)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],...me[t]}]))
const E=en(391,553.3,[64680,48510,48510])
for(const sp of [0.20,0.35]){
  const run=mk(sp); const all=[]
  for(let i=0;i<=100;i+=2)for(let c=0;c+i<=100;c+=2){const a=100-i-c
    all.push({s:run(ar(FOL_ME,[i,c,a].map(p=>Math.round(163500*p/100))),E),split:[i,c,a]})}
  all.sort((x,y)=>y.s-x.s)
  const top=all[0].s
  const w1=all.filter(x=>x.s>=top-1), w5=all.filter(x=>x.s>=top-5)
  const rng=set=>T.map((_,k)=>{const v=set.map(x=>x.split[k]);return Math.min(...v)+'-'+Math.max(...v)}).join(' / ')
  console.log(`spill ${sp.toFixed(2)}  best ${all[0].split.join('/')} = ${top.toFixed(1)}`)
  console.log(`   within 1.0 pt: ${w1.length}/${all.length} splits, range ${rng(w1)}`)
  console.log(`   within 5.0 pt: ${w5.length}/${all.length} splits, range ${rng(w5)}`)
  const find=s=>all.find(x=>x.split[0]===s[0]&&x.split[1]===s[1])
  console.log(`   50/16/34 scores ${find([50,16,34]).s.toFixed(1)}   46/22/32 scores ${find([46,22,32]).s.toFixed(1)}\n`)
}
