// Our answer is the OUTLIER, and that is the signal worth acting on.
//
//   Forest of Life          archers
//   community opener        35%
//   Frakinator (4 runs)     33, 21, 33, 33   (mean ~30)
//   ours                    20%
//
// Two independent references say ~30-35%; we say 20%. That is not one tool's
// noise, it is us.
//
// The mechanism was identified earlier: our front row absorbs 100% of incoming
// damage until it dies, so a troop behind the wall deals full output for free
// and the optimiser correctly concludes the best use of a troop is to BE the
// wall. But the source does not say the front row absorbs everything -- it says
// Infantry "absorbs MOST incoming damage" and Archers are "IDEALLY never
// touched". "Most" and "ideally" are not "all". The remainder is unspecified,
// and modelling it as zero is OUR choice, not the game's.
//
// So: sweep it. This is an UNDOCUMENTED structural parameter, calibrated
// against multiple independent references -- not a documented constant bent to
// fit one tool, which is what went wrong with the 2.7x counter.
const T = ['infantry', 'cavalry', 'archers']
const beats = (a, d) => (a==='infantry'&&d==='cavalry')||(a==='cavalry'&&d==='archers')||(a==='archers'&&d==='infantry')
const eff = (s) => 100 + s
const tot = (x) => T.reduce((s, t) => s + x[t].count, 0)
const clone = (x) => Object.fromEntries(T.map((t) => [t, { ...x[t] }]))
const alive = (x) => T.filter((t) => x[t].count > 0)

function kills(n, at, df, atype, dtype, special) {
  if (n <= 0) return 0
  const o = eff(at.attack)/100 * eff(at.lethality)/100
  const d = eff(df.defense)/100 * eff(df.health)/100
  return Math.sqrt(n) * (o/d) * (beats(atype,dtype) ? 1.10 : 1) * special
}
// spill = fraction of a volley that reaches PAST the front row, shared among
// the rows behind it. spill 0 = our current model. spill 1 = no wall at all.
function volley(A, D, spill) {
  const out = { infantry: 0, cavalry: 0, archers: 0 }
  const live = alive(D); if (!live.length) return out
  const front = live[0], back = live.slice(1)
  const deal = (from, n, target, mult) => { out[target] += kills(n, A[from], D[target], from, target, mult) }
  // With nothing behind it, the front row absorbs the whole volley. Letting the
  // spill fraction vanish here made a single-type army take less total damage,
  // which is why an all-Archer corner won at high spill -- a harness artifact,
  // not a result.
  const s = back.length ? spill : 0
  for (const t of T) {
    const n = A[t].count; if (n <= 0) continue
    const isArc = t === 'archers'
    const vol = isArc ? 1.10 : 1
    if (t === 'cavalry' && D.archers.count > 0 && front !== 'archers') {
      // Ambusher first: a fixed 20% of Cavalry always reaches the Archers.
      deal('cavalry', n, 'archers', 0.20 * vol)
      const rest = 0.80
      deal('cavalry', n, front, rest * (1 - s) * vol)
      for (const b of back) deal('cavalry', n, b, rest * s / back.length * vol)
      continue
    }
    deal(t, n, front, (1 - s) * vol)
    for (const b of back) deal(t, n, b, s / back.length * vol)
  }
  return out
}
function battle(P0, E0, spill) {
  const p = clone(P0), e = clone(E0)
  for (let r = 0; r < 4000; r++) {
    if (!tot(p) || !tot(e)) break
    const dE = volley(p, e, spill), dP = volley(e, p, spill)
    let moved = false
    for (const t of T) {
      const a = Math.floor(dE[t]), b = Math.floor(dP[t])
      if (a || b) moved = true
      e[t].count = Math.max(0, e[t].count - a); p[t].count = Math.max(0, p[t].count - b)
    }
    if (!moved) break
  }
  return tot(p)/tot(P0) - tot(e)/tot(E0)
}
// Every real report from this player, across three zones.
const REPORTS = [
  { name:'FoL #2', zone:'Forest of Life', mine:{a:577.3,d:543.1,L:[388.1,388.5,399.0],H:[368.6,368.5,357.8]}, them:{a:400.0,d:400.0,L:566.7,H:566.7}, counts:[64920,48690,48690], total:163500, frak:[57,21,21], opener:[50,15,35], tier:1 },
  { name:'FoL #3', zone:'Forest of Life', mine:{a:577.3,d:543.1,L:[388.1,388.5,399.0],H:[368.6,368.5,357.8]}, them:{a:398.0,d:398.0,L:564.8,H:564.8}, counts:[64800,48600,48600], total:163500, frak:[52,15,33], opener:[50,15,35], tier:1 },
  { name:'FoL #4', zone:'Forest of Life', mine:{a:559.0,d:525.7,L:[382.9,383.3,393.6],H:[359.1,359.0,348.5]}, them:{a:386.0,d:386.0,L:546.7,H:546.7}, counts:[64600,48450,48450], total:163500, frak:[52,15,33], opener:[50,15,35], tier:1 },
  { name:'Molten', zone:'Molten Fort',    mine:{a:897.4,d:903.5,L:[205,205,205],H:[205,205,205]},              them:{a:1051,d:1051,L:186,H:186},       counts:[60000,45000,45000], total:150000, frak:[52,21,27], opener:[60,15,25], tier:1 },
  // Knowledge Nexus is the ONE fight with a known real outcome: the player WON.
  // T11 against the stage's T10, folded into the percentages.
  { name:'KnowNex', zone:'Knowledge Nexus', mine:{a:180.5,d:178.3,L:[166.5,155.5,155.5],H:[155.5,155.5,161.0]}, them:{a:222,d:222,L:222,H:222},        counts:[60000,45000,45000], total:185200, frak:[57,15,27], opener:[50,20,30], tier:1.175, won:true },
]
const dist = (a,b) => Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2])
const build = (r) => {
  const bump = (p) => ((100 + p) * r.tier - 100)
  const mine = Object.fromEntries(T.map((t,i)=>[t,{attack:bump(r.mine.a),defense:bump(r.mine.d),lethality:bump(r.mine.L[i]),health:bump(r.mine.H[i])}]))
  const enemy = Object.fromEntries(T.map((t,i)=>[t,{count:r.counts[i],attack:r.them.a,defense:r.them.d,lethality:r.them.L,health:r.them.H}]))
  return { mine, enemy }
}
function bestFor(r, spill) {
  const { mine, enemy } = build(r)
  let best = null
  for (let i = 0; i <= 100; i += 1) for (let c = 0; c + i <= 100; c += 1) {
    const s = [i, c, 100-i-c]
    const army = Object.fromEntries(T.map((t,k)=>[t,{count:Math.round(r.total*s[k]/100),...mine[t]}]))
    const e = battle(army, enemy, spill)
    if (!best || e > best.e) best = { s, e }
  }
  return best
}
console.log('spill   ' + REPORTS.map(r=>r.name.padEnd(11)).join('') + '  vs Frak  vs opener  COMBINED   KN score')
const rows = []
for (const spill of [0, 0.10, 0.20, 0.25, 0.30, 0.325, 0.35, 0.375, 0.40, 0.45]) {
  let dF = 0, dO = 0; const picks = []
  let knScore = 0
  for (const r of REPORTS) {
    const b = bestFor(r, spill)
    picks.push(b.s.join('/')); dF += dist(b.s, r.frak); dO += dist(b.s, r.opener)
    if (r.won) knScore = b.e
  }
  rows.push({ spill, dF, dO, tot: dF + dO })
  console.log(` ${spill.toFixed(3)}  ${picks.map(p=>p.padEnd(11)).join('')}  ${String(dF).padStart(6)}  ${String(dO).padStart(8)}  ${String(dF+dO).padStart(8)}   ${(knScore*100).toFixed(1)}%`)
}
const win = [...rows].sort((a,b)=>a.tot-b.tot)[0]
console.log(`\nBEST spill = ${win.spill}  (Frak ${win.dF} + opener ${win.dO} = ${win.tot}), vs ${rows[0].tot} at spill 0`)
console.log('targets: ' + REPORTS.map(r=>r.frak.join('/')).join('  '))
console.log('openers: ' + REPORTS.map(r=>r.opener.join('/')).join('  '))
