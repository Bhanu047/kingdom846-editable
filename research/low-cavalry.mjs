// Whiteout Survival is the same studio's earlier game and shares this combat
// core -- same counter triangle at +10%, same Ambusher 20%, same Volley 10%.
// Its Labyrinth is the direct analogue of Mystic Trials, and the community
// answer there is to run ~3% Lancers, purely so the Lancer HERO's skill can
// trigger, not for the troops' combat value.
//
// Kingshot makes that reason disappear in four of six rooms: Forest of Life,
// Crystal Cave, Knowledge Nexus and Molten Fort do not count heroes at all.
// So in those rooms there is no reason to carry cavalry beyond its raw value.
//
// What does OUR model say about going that low? And what would it cost if the
// model is right and the predecessor's players are wrong?
import { runBattle, TROOP_TYPES as T } from '../src/lib/combat/kingshotCombat.js'
const KN={infantry:{attack:180.5,lethality:166.5,defense:178.3,health:155.5,tier:'T11'},
          cavalry:{attack:180.5,lethality:155.5,defense:178.3,health:155.5,tier:'T11'},
          archers:{attack:180.5,lethality:155.5,defense:178.3,health:161.0,tier:'T11'}}
const CC={infantry:{attack:85,lethality:640,defense:85,health:640,tier:'T10'},
          cavalry:{attack:85,lethality:547.5,defense:85,health:547.5,tier:'T10'},
          archers:{attack:85,lethality:640,defense:85,health:640,tier:'T10'}}
const foe=(a,L,c)=>Object.fromEntries(T.map((t,k)=>[t,{count:c[k],attack:a,lethality:L,defense:a,health:L,tier:'T10'}]))
const ar=(tot,s,sp)=>Object.fromEntries(T.map((t,k)=>[t,{count:Math.round(tot*sp[k]/100),...s[t]}]))
const CASES=[
  {n:'Knowledge Nexus vs Mad Scholar', s:KN, tot:185200, e:foe(222,222,[60000,45000,45000]),
   best:[59,17,24], played:[57,15,28]},
  {n:'Crystal Cave vs Appraiser',      s:CC, tot:150000, e:foe(77,690,[60000,45000,45000]),
   best:[61,16,23], played:[50,15,35]},
]
for(const c of CASES){
  console.log(`\n${c.n}`)
  console.log('  split        model score   vs model best')
  const base=runBattle(ar(c.tot,c.s,c.best),c.e,{maxTurns:4000}).survivalEdge*100
  const rows=[c.best, c.played, [65,10,25],[70,5,25],[72,3,25],[75,0,25],[62,3,35],[57,3,40]]
  for(const sp of rows){
    const v=runBattle(ar(c.tot,c.s,sp),c.e,{maxTurns:4000}).survivalEdge*100
    const tag = sp===c.best?'  <- model best' : (sp===c.played?'  <- you played':'')
    console.log(`  ${sp.join('/').padEnd(10)}  ${v.toFixed(1).padStart(8)}   ${(v-base>=0?'+':'')}${(v-base).toFixed(1).padStart(6)}${tag}`)
  }
}
console.log('\n  Reality gaps between splits run 26-72 points; the model never spans more')
console.log('  than a few. So "the model says -X" is worth far less than one real battle.')
