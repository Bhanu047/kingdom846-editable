// THE TIER TEST. Two Knowledge Nexus battles vs Mad Scholar (222 flat, T10),
// fought at T11 with 185,200 troops against their 150,000 -- a 23% headcount
// advantage AND a tier advantage. Both were total defeats.
//
//   R  46/21/33  85,192/38,892/61,116   DEFEAT  my losses 185,200  theirs 111,481
//   S  50/15/35  92,600/27,780/64,820   DEFEAT  my losses 185,200  theirs 132,400
//
// Knowledge Nexus is the ONLY room fought at T11, so it is the only thing that
// can test TIER_STAT_MULTIPLIER.T11 = 1.175 -- a number extrapolated, never
// sourced, and until now never checked against a magnitude.
import { runBattle, TROOP_TYPES as T, TIER_STAT_MULTIPLIER } from '../src/lib/combat/kingshotCombat.js'
const MINE = {
  infantry: { attack: 180.5, lethality: 166.5, defense: 178.3, health: 155.5 },
  cavalry:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 155.5 },
  archers:  { attack: 180.5, lethality: 155.5, defense: 178.3, health: 161.0 },
}
const B = [
  { id: 'R', counts: [85192, 38892, 61116], split: '46/21/33', myLoss: 185200, theirLoss: 111481 },
  { id: 'S', counts: [92600, 27780, 64820], split: '50/15/35', myLoss: 185200, theirLoss: 132400 },
]
const MY_TOTAL = 185200, THEIR_TOTAL = 150000
const foe = () => Object.fromEntries(T.map((t, k) => [t, {
  count: [60000, 45000, 45000][k], attack: 222, lethality: 222, defense: 222, health: 222, tier: 'T10' }]))
const army = (c, tier) => Object.fromEntries(T.map((t, k) => [t, { count: c[k], ...MINE[t], tier }]))

for (const b of B) b.actual = ((MY_TOTAL - b.myLoss) / MY_TOTAL - (THEIR_TOTAL - b.theirLoss) / THEIR_TOTAL) * 100

console.log('REALITY\n')
console.log('  id  split      result    my survivors   their survivors   edge')
for (const b of B) console.log(`  ${b.id}   ${b.split}   DEFEAT    ${String(MY_TOTAL - b.myLoss).padStart(7)}        ${String(THEIR_TOTAL - b.theirLoss).padStart(7)}        ${b.actual.toFixed(1).padStart(6)}`)
console.log(`\n  PAIRED: same beast, two splits. 50/15/35 beats 46/21/33 by ${(B[1].actual - B[0].actual).toFixed(1)} points.`)

console.log('\n\nWHAT THE MODEL SAYS, PER T11 MULTIPLIER\n')
console.log('  T11 mult   R 46/21/33   S 50/15/35   ranks right   mean error')
const saved = TIER_STAT_MULTIPLIER.T11
for (const m of [1.175, 1.15, 1.12, 1.10, 1.05, 1.00]) {
  TIER_STAT_MULTIPLIER.T11 = m
  const p = B.map((b) => runBattle(army(b.counts, 'T11'), foe(), { maxTurns: 4000 }).survivalEdge * 100)
  const errs = B.map((b, i) => p[i] - b.actual)
  const mean = errs.reduce((s, x) => s + x, 0) / errs.length
  console.log(`   ${m.toFixed(3)}    ${p[0].toFixed(1).padStart(8)}     ${p[1].toFixed(1).padStart(8)}       ${p[1] > p[0] ? 'yes' : 'NO '}       ${mean.toFixed(1).padStart(7)}`)
}
TIER_STAT_MULTIPLIER.T11 = saved
console.log(`\n  shipped value is ${saved}. Positive mean error = we are too optimistic.`)

// The ranking is a SEPARATE question from the level, and this pair is the third
// paired comparison in the file. Sweep spill against it the same way the
// Forest of Life and Crystal Cave pairs were swept.
console.log('\n\nTHE RANKING, PER SPILL (tier held at the shipped 1.175)\n')
console.log('  spill    R 46/21/33   S 50/15/35   S-R    reality says +13.9')
const mod = await import('../src/lib/combat/kingshotCombat.js')
for (const sp of [0.00, 0.10, 0.20, 0.30, 0.35]) {
  // FRONT_ROW_SPILL is a module const, so re-derive the volley split by scaling
  // through a local copy of the sim instead of mutating an export.
  const out = await runWithSpill(sp)
  console.log(`   ${sp.toFixed(2)}   ${out[0].toFixed(1).padStart(9)}    ${out[1].toFixed(1).padStart(9)}   ${(out[1]-out[0]).toFixed(1).padStart(5)}`)
}
async function runWithSpill(SPILL) {
  const TT = ['infantry','cavalry','archers']
  const beats=(x,d)=>(x==='infantry'&&d==='cavalry')||(x==='cavalry'&&d==='archers')||(x==='archers'&&d==='infantry')
  const W = 1.09, TIER = { T11: 1.175, T10: 1.0 }
  const e=s=>(100+s)/100
  const tot=x=>TT.reduce((s,t)=>s+x[t].count,0), clone=x=>Object.fromEntries(TT.map(t=>[t,{...x[t]}]))
  const off=(s,m)=>Math.pow(e(s.attack)*m,W)*Math.pow(e(s.lethality)*m,2-W)
  const def=(s,m)=>Math.pow(e(s.defense)*m,W)*Math.pow(e(s.health)*m,2-W)
  const kills=(n,at,df,a2,dt,sp,ma,md)=> n<=0?0: Math.sqrt(n)*(off(at,ma)/def(df,md))*(beats(a2,dt)?1.10:1)*sp
  const volley=(A,D,ma,md)=>{const out={infantry:0,cavalry:0,archers:0}
    const live=TT.filter(t=>D[t].count>0); if(!live.length)return out
    const front=live[0],back=live.slice(1),s=back.length?SPILL:0
    for(const t of TT){const n=A[t].count; if(n<=0)continue
      const vol=t==='archers'?1.10:1; let rem=1
      if(t==='cavalry'&&front!=='archers'&&D.archers.count>0){out.archers+=kills(n,A.cavalry,D.archers,'cavalry','archers',0.20*vol,ma,md);rem=0.80}
      out[front]+=kills(n,A[t],D[front],t,front,rem*(1-s)*vol,ma,md)
      for(const b of back)out[b]+=kills(n,A[t],D[b],t,b,rem*s/back.length*vol,ma,md)}
    return out}
  return B.map((b) => {
    const p=clone(army(b.counts,'T11')), ee=clone(foe())
    const mp=TIER.T11, me=TIER.T10
    for(let r=0;r<4000;r++){if(!tot(p)||!tot(ee))break
      const dE=volley(p,ee,mp,me), dP=volley(ee,p,me,mp); let moved=false
      for(const t of TT){const x=Math.floor(dE[t]),y=Math.floor(dP[t]);if(x||y)moved=true
        ee[t].count=Math.max(0,ee[t].count-x);p[t].count=Math.max(0,p[t].count-y)}
      if(!moved)break}
    return (tot(p)/MY_TOTAL - tot(ee)/THEIR_TOTAL)*100
  })
}
