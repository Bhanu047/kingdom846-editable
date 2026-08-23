// Hunt Impact has TWO independent implementations of the same model:
//   page   -> src/lib/combat/huntImpact.js + bearOptimizer.js
//   report -> public/hunt-impact-command-dashboard-v4.js (its own copy)
// Run identical inputs through both and diff. Anything that differs is a bug
// the user sees as "the report doesn't match the screen".
import { computeHuntImpact } from '../src/lib/combat/huntImpact.js'

// ---- the REPORT's maths, lifted verbatim from the dashboard script ----
const TYPES = ['infantry', 'cavalry', 'archers']
const WEIGHTS = { infantry: 1 / 3, cavalry: 1, archers: 4 / 3 }
const HERO = {
  None: { infantry: 1, cavalry: 1, archers: 1 }, Other: { infantry: 1, cavalry: 1, archers: 1 },
  Alcar: { infantry: 2.8, cavalry: 1.1, archers: 1.1 }, Margot: { infantry: 1, cavalry: 1.5, archers: 1 },
  Thrud: { infantry: 1.15, cavalry: 1, archers: 1.15 }, Rosa: { infantry: 1, cavalry: 1, archers: 1.3 },
  Vivian: { infantry: 1, cavalry: 1, archers: 1.15 }, Yang: { infantry: 1, cavalry: 1, archers: 1.35 },
}
const JOINER = {
  None: { type: 'none', values: [0, 0, 0, 0, 0] },
  Chenko: { type: 'lethality', values: [5, 10, 15, 20, 25] },
  Amane: { type: 'attack', values: [5, 10, 15, 20, 25] },
  Hilde: { type: 'attack', values: [3, 6, 9, 12, 15] },
  Yeonwoo: { type: 'lethality', values: [5, 10, 15, 20, 25] },
  Margot: { type: 'attack', values: [5, 10, 15, 20, 25] },
}
const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f)
const normalize = (r) => { const o = Object.fromEntries(TYPES.map(k => [k, Math.max(0, num(r[k]))])); const s = TYPES.reduce((a, k) => a + o[k], 0) || 1; return Object.fromEntries(TYPES.map(k => [k, o[k] / s])) }
const joinerBonus = (js) => js.reduce((a, j) => { const e = JOINER[j.hero] || JOINER.None, b = e.values[j.skillLevel - 1] || 0; if (e.type === 'attack') a.attack += b; if (e.type === 'lethality') a.lethality += b; return a }, { attack: 0, lethality: 0 })
const adjusted = (stats, js) => { const b = joinerBonus(js); return Object.fromEntries(TYPES.map(k => { const s = stats[k], widget = Math.max(0, num(s.widget)), ws = s.widgetStat === 'lethality' ? 'lethality' : 'attack'; return [k, { attack: s.attack + b.attack + (ws === 'attack' ? widget : 0), lethality: s.lethality + b.lethality + (ws === 'lethality' ? widget : 0) }] })) }
const heroMult = (heroes) => { const out = { infantry: 1, cavalry: 1, archers: 1 }; TYPES.forEach(slot => { const m = HERO[heroes[slot]] || HERO.None; TYPES.forEach(k => out[k] *= m[k]) }); return out }
const archerMult = (tier) => { const t = String(tier || '').toUpperCase(); const low = t === 'T1-T6' || (/^T[1-6]$/.test(t) && num(t.slice(1)) <= 6); return 1.1 * (low ? 1 : 1.1) }
const coefficients = (stats, tier, tg, heroes) => { const hm = heroMult(heroes); return {
  infantry: (1 + stats.infantry.attack / 100) * (1 + stats.infantry.lethality / 100) * WEIGHTS.infantry * hm.infantry,
  cavalry: (1 + stats.cavalry.attack / 100) * (1 + stats.cavalry.lethality / 100) * WEIGHTS.cavalry * hm.cavalry,
  archers: (1 + stats.archers.attack / 100) * (1 + stats.archers.lethality / 100) * WEIGHTS.archers * archerMult(tier, tg) * hm.archers } }
const score = (coeff, ratio) => { const r = normalize(ratio); return TYPES.reduce((s, k) => s + coeff[k] * Math.sqrt(r[k]), 0) }
const optimum = (coeff) => { const sq = Object.fromEntries(TYPES.map(k => [k, coeff[k] ** 2])); const d = TYPES.reduce((s, k) => s + sq[k], 0) || 1; return Object.fromEntries(TYPES.map(k => [k, sq[k] / d])) }
const project = (r) => { const inf = Math.floor(r.infantry * 100 + 1e-9), cav = Math.min(100 - inf, Math.max(0, Math.round(r.cavalry * 100))), arc = Math.max(0, 100 - inf - cav); return { infantry: inf, cavalry: cav, archers: arc } }

function reportSide({ stats, tier, tg, counts, heroes, joiners }) {
  const ratio = normalize(counts)
  const total = TYPES.reduce((s, k) => s + Math.max(0, counts[k]), 0)
  const adj = adjusted(stats, joiners)
  const coeff = coefficients(adj, tier, tg, heroes)
  const opt = optimum(coeff)
  const scale = Math.sqrt(total)
  const mean = score(coeff, ratio) * scale
  const optimal = score(coeff, opt) * scale
  return { mean, optimal, eff: optimal > 0 ? (mean / optimal) * 100 : 0,
           currentPct: project(ratio), optimalPct: project(opt) }
}

// ---- identical scenario through both ----
const SCEN = {
  stats: {
    infantry: { attack: 180, lethality: 150, widget: 20, widgetStat: 'attack' },
    cavalry: { attack: 180, lethality: 150, widget: 20, widgetStat: 'attack' },
    archers: { attack: 180, lethality: 150, widget: 20, widgetStat: 'attack' },
  },
  tier: 'T10', tg: 5,
  counts: { infantry: 380000, cavalry: 270000, archers: 350000 },
  heroes: { infantry: 'None', cavalry: 'None', archers: 'None' },
  joiners: [{ hero: 'Chenko', skillLevel: 5 }, { hero: 'Amane', skillLevel: 5 },
            { hero: 'None', skillLevel: 5 }, { hero: 'None', skillLevel: 5 }],
}
const total = TYPES.reduce((s, k) => s + SCEN.counts[k], 0)
const ratio = normalize(SCEN.counts)

const pageRes = computeHuntImpact({
  stats: SCEN.stats, tier: SCEN.tier, tg: SCEN.tg, ratio,
  leadHeroes: SCEN.heroes, troopCounts: SCEN.counts,
  capacity: 1415832, participants: 15, joiners: SCEN.joiners,
})
const rep = reportSide(SCEN)

const pick = (o, ks) => ks.reduce((a, k) => (a[k] = o?.[k], a), {})
console.log('PAGE result keys:', Object.keys(pageRes).join(', '))
console.log('\nPAGE :', JSON.stringify(pick(pageRes, ['actualScore','optimalScore','impactIndex','optimalImpactIndex','efficiency','optimalRatio','totalTroops']), null, 1))
console.log('\nscale =', Math.sqrt(total))
console.log('PAGE actualScore*scale  =', pageRes.actualScore * Math.sqrt(total))
console.log('PAGE optimalScore*scale =', pageRes.optimalScore * Math.sqrt(total))
console.log('PAGE adjusted infantry  =', JSON.stringify(pageRes.adjustedStats.infantry))
console.log('\nREPORT:', JSON.stringify(rep, null, 1))
