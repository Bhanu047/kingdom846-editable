import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import LegacyBattleLab from './BattleLab.jsx'
import BearSuite from './BearSuite.jsx'

const REQUEST_KEY = 'kingdom846.battleLab.requestedModule'

const TOOLS = [
  { id: 'bear', title: 'Bear', sourceLabel: 'Bear Optimizer', icon: 'target', image: './assets/art-bear-trap.png', description: 'Build your Hunt Formation and measure Hunt Impact for your exact rally stats.', accent: 'from-amber-950/85 via-ink/45 to-transparent' },
  { id: 'mystic', title: 'Mystic', sourceLabel: 'Mystic Trials', icon: 'sparkles', image: './assets/art-hero-meta.png', description: 'Analyze Mystic Trials progression, source rules and tactical planning.', accent: 'from-violet-950/85 via-ink/45 to-transparent' },
  { id: 'battle', title: 'Battle', sourceLabel: 'Battle Simulator', icon: 'swords', image: './assets/art-castle-battle.png', description: 'Compare combat stats, armies and modeled battle outcomes.', accent: 'from-red-950/85 via-ink/45 to-transparent' },
  { id: 'formation', title: 'Formation', sourceLabel: 'Formation Optimizer', icon: 'layers', image: './assets/strategy-war-academy.png', description: 'Build and compare tactical troop formations for different targets.', accent: 'from-emerald-950/85 via-ink/45 to-transparent' },
]

function readRequestedTool() {
  try {
    const requested = sessionStorage.getItem(REQUEST_KEY)
    if (TOOLS.some((tool) => tool.id === requested)) {
      sessionStorage.removeItem(REQUEST_KEY)
      return requested
    }
  } catch {}
  return null
}

function BetaBadge() {
  return <span className="rounded-full border border-amber-300/30 bg-black/35 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-100/90 backdrop-blur">Beta</span>
}

function ToolCard({ tool, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(tool.id)} className="group relative isolate min-h-[290px] overflow-hidden rounded-[24px] border border-gold/25 bg-ink text-left shadow-[0_18px_60px_rgba(0,0,0,.34)] transition duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_22px_70px_rgba(212,175,55,.13)] md:min-h-[350px]">
      <img src={tool.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
      <div className={`absolute inset-0 bg-gradient-to-t ${tool.accent}`} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/5" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 md:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/35 bg-black/45 text-gold-bright shadow-lg backdrop-blur"><Icon name={tool.icon} size={23} /></div>
        <BetaBadge />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <h2 className="font-display text-3xl font-bold uppercase tracking-[0.04em] text-parchment drop-shadow md:text-4xl">{tool.title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-parchment/80 drop-shadow md:text-[15px]">{tool.description}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-bright">Enter tool <span className="transition group-hover:translate-x-1">→</span></div>
      </div>
    </button>
  )
}

export default function BattleLabHub() {
  const [activeTool, setActiveTool] = useState(readRequestedTool)
  const legacyRef = useRef(null)
  const tool = TOOLS.find((item) => item.id === activeTool)

  useEffect(() => {
    if (!activeTool || activeTool === 'bear') return
    const sourceLabel = TOOLS.find((item) => item.id === activeTool)?.sourceLabel
    if (!sourceLabel) return
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      const root = legacyRef.current
      const button = root && [...root.querySelectorAll('button')].find((node) => (node.textContent || '').includes(sourceLabel))
      if (button) {
        button.click()
        window.clearInterval(timer)
      } else if (attempts > 30) window.clearInterval(timer)
    }, 60)
    return () => window.clearInterval(timer)
  }, [activeTool])

  if (!activeTool) {
    return (
      <div className="space-y-6">
        <section className="relative min-h-[300px] overflow-hidden rounded-[26px] border border-gold/25 bg-[#06101f] px-6 py-9 text-center shadow-[0_20px_70px_rgba(0,0,0,.32)] md:min-h-[360px] md:px-10 md:py-12">
          <img src="./assets/strategy-war-academy.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030816]/95 via-[#06101f]/70 to-[#06101f]/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/35" />
          <div className="relative flex min-h-[230px] flex-col items-center justify-center md:min-h-[280px]">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-gold/30 bg-black/45 text-gold-bright backdrop-blur"><Icon name="crosshair" size={27} /></div>
            <h1 className="font-display text-4xl font-bold uppercase tracking-[0.05em] text-parchment drop-shadow md:text-5xl">Battle Lab</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-parchment/75 drop-shadow md:text-base">Four tactical tools. Choose your mission.</p>
            <div className="mt-4"><BetaBadge /></div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 md:gap-5">{TOOLS.map((item) => <ToolCard key={item.id} tool={item} onOpen={setActiveTool} />)}</section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeTool !== 'bear' && <style>{`.bl-final-tool > div > section { display:none !important; }.bl-final-tool > div > div.grid { grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr); }@media(max-width:1279px){.bl-final-tool > div > div.grid{grid-template-columns:minmax(0,1fr);}}`}</style>}
      <section className="relative min-h-[250px] overflow-hidden rounded-[26px] border border-gold/25 bg-ink shadow-[0_20px_70px_rgba(0,0,0,.34)] md:min-h-[310px]">
        <img src={tool.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-r ${tool.accent}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
        <div className="relative flex min-h-[250px] flex-col justify-between p-5 md:min-h-[310px] md:p-8">
          <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => setActiveTool(null)} className="inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-black/45 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-parchment/80 backdrop-blur hover:border-gold/45 hover:text-parchment">← Battle Lab</button><BetaBadge /></div>
          <div><div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-gold/35 bg-black/45 text-gold-bright backdrop-blur"><Icon name={tool.icon} size={23} /></div><h1 className="font-display text-4xl font-bold uppercase tracking-[0.04em] text-parchment drop-shadow md:text-5xl">{tool.title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-parchment/80 drop-shadow md:text-base">{tool.description}</p></div>
        </div>
      </section>
      {activeTool === 'bear' ? <BearSuite /> : <div ref={legacyRef} className="bl-final-tool"><LegacyBattleLab /></div>}
    </div>
  )
}
