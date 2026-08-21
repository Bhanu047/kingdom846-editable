import { useState } from 'react'
import Icon from '../components/Icon'

const TABS = [
  { id: 'theory', label: 'Theory-crafting', icon: 'book' },
  { id: 'tests', label: 'Tests', icon: 'shieldCheck' },
  { id: 'thanks', label: 'Acknowledgements', icon: 'star' },
]

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-white/[.025] p-5">
      <div className="font-display text-lg font-bold text-parchment">{title}</div>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-parchment/65">{children}</div>
    </div>
  )
}

function TestCase({ title, setup, result, insight }) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-[#07101e] p-5">
      <div className="flex items-center gap-2 font-display text-base font-bold text-parchment"><Icon name="shieldCheck" size={15} className="text-emerald-300/70" />{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="text-xs leading-relaxed text-parchment/55">{setup}</div>
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[.05] px-4 py-2 text-center font-mono text-sm font-bold text-emerald-200 whitespace-nowrap">{result}</div>
      </div>
      <div className="mt-3 text-[11px] leading-relaxed text-parchment/40">{insight}</div>
    </div>
  )
}

function Theory() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Why √troops, not just troops">
        <p>Every projection on this site scales with the square root of troop count, not troop count itself. Rally and hunt damage in Kingshot isn't a simple per-troop sum — bigger armies see diminishing marginal return per troop, which is why doubling your rally roughly doesn't double your damage. The square-root term is what makes small formation changes worth more at scale than the raw troop count would suggest.</p>
      </Card>
      <Card title="Why the split isn't 33/33/33">
        <p>The Bear formula weighs Infantry, Cavalry and Archers at ⅓ : 1 : 4/3 before anything else is applied, and Archers get an additional counter multiplier since the Bear itself fights as an Infantry unit. Feed identical Attack and Lethality into all three troop types and the model still recommends putting the overwhelming majority into Archers — that's the counter bonus and the weighting doing their job, not a rounding artifact.</p>
      </Card>
      <Card title="Why Attack and Lethality are multiplied, not added">
        <p>Combat power comes from (1 + Attack%) × (1 + Lethality%), not their sum. This is why a Widget bonus applied to whichever stat is currently smaller usually helps more than applying it to the one that's already large — a balanced pair multiplies to more than a lopsided one for the same total input. It's also why Formation and Impact always agree on the same optimal split for the same stats: they both run through this one shared multiplier, not two separate guesses.</p>
      </Card>
      <Card title="Solo attacks vs. rally reports">
        <p>A Widget — the bonus from a hero's Exclusive Gear skill — only fires when that hero is leading a rally or defending a garrison. It does nothing in a solo attack, including a solo Bear/beast hit. That's the entire reason the Widget field exists here: a solo battle report is missing that number, so you enter it by hand; a real rally report already has it baked in, so it stays at 0.</p>
      </Card>
    </div>
  )
}

function Tests() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-parchment/45">These aren't hypothetical — each one was run against the live calculator on this site and the result recorded here is what it actually returned.</p>
      <TestCase
        title="Equal stats still don't split evenly"
        setup="All three troop types set to 50% Attack / 50% Lethality, no hero, no widget, Tier T10."
        result="2% / 27% / 71%"
        insight="If the model just averaged inputs, identical stats would recommend 33/33/33. It doesn't — the ⅓:1:4/3 weighting and the Archer counter bonus dominate even when every input is the same."
      />
      <TestCase
        title="Widget targeting changes the outcome"
        setup="Same equal baseline, then a +60% Widget applied to Archers — first to Attack (20→80, balanced against Lethality 80), then to Lethality instead (80→140, unbalanced)."
        result="84% → 79% Archer share"
        insight="Targeting the smaller stat produced a higher optimal share than targeting the already-larger one, for the exact same +60% input — confirms the multiplicative Attack×Lethality math, not an additive shortcut."
      />
      <TestCase
        title="Formation and Impact agree"
        setup="The same combat stats entered into both the Hunt Formation tab and the Hunt Impact tab, independently."
        result="Identical optimal split"
        insight="Both tabs call the same underlying formula rather than keeping two copies of the math — a discrepancy here would mean the two tabs had drifted apart."
      />
    </div>
  )
}

function Thanks() {
  return (
    <div className="space-y-4">
      <Card title="frakinator's Bear damage calculator">
        <p>The core Bear-formation formula on this site — the ⅓:1:4/3 troop weighting, the Archer counter multiplier, and the idea of a manual Widget input for solo-attack reports — was built to replicate the public calculator at <span className="font-mono text-gold/70">frakinator.streamlit.app</span>. We didn't have access to its source, so everything here is our own independent build against its published behavior, not a copy of its code — but the formula itself, and the idea to build a Kingshot Bear calculator around it at all, is theirs first. Thank you for putting it out there for the community.</p>
      </Card>
      <Card title="The wider Kingshot theory-crafting community">
        <p>Working out exactly how Widgets, Exclusive Gear, and Expedition Skills behave — particularly that a Widget only fires when its hero is leading a rally or defending a garrison, never in a solo attack — came from cross-referencing multiple independent community guide sites' published mechanics writeups. That research directly shaped the Widget field's design on this site.</p>
      </Card>
      <Card title="Kingdom 846">
        <p>And to the alliance itself — every stat, report, and edge case that got tested against this calculator came from real hunts, real rallies, and real feedback from people actually playing. That's what kept the math honest.</p>
      </Card>
    </div>
  )
}

export default function CodexSuite() {
  const [tab, setTab] = useState('theory')
  return (
    <div className="space-y-5">
      <section className="panel p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="eyebrow">Battle Lab Codex</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-parchment">How This Was Built</h2>
            <p className="mt-1 text-xs text-parchment/50">The reasoning behind the formulas, proof they hold up, and who deserves credit.</p>
          </div>
          <div className="inline-flex flex-wrap rounded-xl border border-gold/15 bg-black/25 p-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab === t.id ? 'bg-gold/15 text-gold-bright' : 'text-parchment/45'}`}><Icon name={t.icon} size={13} />{t.label}</button>
            ))}
          </div>
        </div>
      </section>
      {tab === 'theory' && <Theory />}
      {tab === 'tests' && <Tests />}
      {tab === 'thanks' && <Thanks />}
    </div>
  )
}
