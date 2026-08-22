// Every CONTROLLED comparison now in the data set: two or more splits against
// the SAME beast, so the opponent cancels. Eight pairwise orderings across
// three rooms and five opponents. This is the only evidence that speaks to
// RANKING, which is the one thing the tool actually outputs.
import { runBattle, TROOP_TYPES as T, TIER_STAT_MULTIPLIER } from '../src/lib/combat/kingshotCombat.js'
const FOL={infantry:{attack:577.3,lethality:388.1,defense:543.1,health:368.6},
           cavalry:{attack:577.3,lethality:388.5,defense:543.1,health:368.5},
           archers:{attack:577.3,lethality:399.0,defense:543.1,health:357.8}}
const CC={infantry:{attack:85,lethality:640,defense:85,health:640},
          cavalry:{attack:85,lethality:547.5,defense:85,health:547.5},
          archers:{attack:85,lethality:640,defense:85,health:640}}
const KN=(h)=>({infantry:{attack:180.5,lethality:166.5,defense:178.3,health:h},
                cavalry:{attack:180.5,lethality:155.5,defense:178.3,health:155.5},
                archers:{attack:180.5,lethality:155.5,defense:178.3,health:161.0}})
const mk=(s,tier)=>Object.fromEntries(T.map(t=>[t,{...s[t],tier}]))
const foe=(a,L,c,tier)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,lethality:L,defense:a,health:L,tier}]))
const ar=(c,s)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],...s[t]}]))
// room, beast, enemy, [ {split,counts,stats,edge} ... ]
const GROUPS=[
 {room:'FoL', beast:'Starving',   e:foe(391,553.3,[64680,48510,48510],'T10'), s:mk(FOL,'T10'), arms:[
   {sp:'50/15/35',c:[81750,24525,57225],edge: 24.0},{sp:'46/21/33',c:[75210,34335,53955],edge:-20.8}]},
 {room:'CC',  beast:'Appraiser',  e:foe(77,690,[60000,45000,45000],'T10'), s:mk(CC,'T10'), arms:[
   {sp:'50/15/35',c:[75000,22500,52500],edge: 33.3},{sp:'52/15/33',c:[78000,22500,49500],edge:-20.1},
   {sp:'46/21/33',c:[69000,31500,49500],edge:-38.4}]},
 {room:'KN',  beast:'Mad Scholar',e:foe(222,222,[60000,45000,45000],'T10'), s:mk(KN(155.5),'T11'), arms:[
   {sp:'57/15/28',c:[105564,27780,51856],edge:  9.7},{sp:'50/15/35',c:[92600,27780,64820],edge:-11.7},
   {sp:'46/21/33',c:[85192,38892,61116],edge:-25.7}]},
 {room:'KN',  beast:'Craftsman',  e:foe(220,220,[60000,45000,45000],'T10'), s:mk(KN(155.5),'T11'), arms:[
   {sp:'50/15/35',c:[92600,27780,64820],edge:  8.3},{sp:'45/20/35',c:[83340,37040,64820],edge:-17.7}]},
]
console.log('CONTROLLED COMPARISONS -- what reality says, and whether we agree\n')
let right=0, total=0
for(const g of GROUPS){
  const scored=g.arms.map(a=>({...a,model:runBattle(ar(a.c,g.s),g.e,{maxTurns:4000}).survivalEdge*100}))
  console.log(`  ${g.room} ${g.beast}`)
  for(const a of scored) console.log(`     ${a.sp}   reality ${a.edge.toFixed(1).padStart(6)}   model ${a.model.toFixed(1).padStart(6)}   cav ${a.sp.split('/')[1]}`)
  for(let i=0;i<scored.length;i++)for(let j=i+1;j<scored.length;j++){
    const ok=Math.sign(scored[i].edge-scored[j].edge)===Math.sign(scored[i].model-scored[j].model)
    total++; if(ok)right++
    console.log(`       ${scored[i].sp} vs ${scored[j].sp}  reality ${(scored[i].edge-scored[j].edge>0?'first':'second').padEnd(6)}  model ${(scored[i].model-scored[j].model>0?'first':'second').padEnd(6)}  ${ok?'agree':'DISAGREE'}`)
  }
}
console.log(`\n  pairwise agreement: ${right}/${total}`)
console.log('\n  CAVALRY, across every comparison where it differs:')
console.log('    FoL  15 (+24.0) beats 21 (-20.8)')
console.log('    CC   15 (+33.3) beats 21 (-38.4)')
console.log('    KN   15 ( +9.7) beats 21 (-25.7)   [Mad Scholar]')
console.log('    KN   15 ( +8.3) beats 20 (-17.7)   [Craftsman]')
console.log('    CC   15 (+33.3) vs   15 (-20.1)  -- cavalry EQUAL, no signal')
console.log('  Four for four: the lower-cavalry split won every time it was tested.')
