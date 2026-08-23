import { useEffect, useId, useMemo, useState } from 'react'
import { trackTool } from '../lib/analytics'
import Icon from '../components/Icon'
import { PlayerNameField } from '../components/ui'
import { usePlayerName } from '../hooks/usePlayerName'
import { buildBearChatMessage, computeBearDamage, optimizeBearFormation } from '../lib/combat/bearOptimizer'
import { applyJoinerBonuses, computeHuntImpact, HUNT_JOINER_HEROES } from '../lib/combat/huntImpact'
import { smoothPath, useCountUp, useReveal } from '../lib/chartAnim'

const TROOPS=[{key:'infantry',label:'Infantry',short:'INF',icon:'shield',color:'#d9b94e'},{key:'cavalry',label:'Cavalry',short:'CAV',icon:'zap',color:'#7f9ed6'},{key:'archers',label:'Archers',short:'ARC',icon:'crosshair',color:'#c8655a'}]
const WIDGET_OPTIONS=[0,5,7.5,10,12.5,15]
const HEROES={infantry:['None','Alcar','Amadeus','Charles','Eric','Forrest','Helga','Howard','Long Fei','Seth','Triton','Zoe'],cavalry:['None','Ava','Chenko','Edwin','Fahd','Gordon','Hilde','Jabel','Margot','Petra','Sophia','Thrud'],archers:['None','Amane','Diana','Jaeger','Marlin','Olive','Quinn','Rosa','Saul','Vivian','Wee & Woo','Yang','Yeonwoo']}
const EMPTY_STATS={infantry:{attack:'',lethality:'',widget:'0',widgetStat:'attack'},cavalry:{attack:'',lethality:'',widget:'0',widgetStat:'attack'},archers:{attack:'',lethality:'',widget:'0',widgetStat:'attack'}}, EMPTY_HEROES={infantry:'None',cavalry:'None',archers:'None'}, EMPTY_COUNTS={infantry:'',cavalry:'',archers:''}, EMPTY_JOINERS=Array.from({length:4},()=>({hero:'None',skillLevel:5}))
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f, clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const validStats=s=>TROOPS.every(t=>n(s[t.key].attack)>0&&n(s[t.key].lethality)>0)
const normalized=s=>Object.fromEntries(TROOPS.map(t=>[t.key,{attack:n(s[t.key].attack),lethality:n(s[t.key].lethality),widget:n(s[t.key].widget),widgetStat:s[t.key].widgetStat==='lethality'?'lethality':'attack'}]))
function ratioFromCounts(c){const total=TROOPS.reduce((s,t)=>s+Math.max(0,n(c[t.key])),0);return total?Object.fromEntries(TROOPS.map(t=>[t.key,Math.max(0,n(c[t.key]))/total])):{infantry:0,cavalry:0,archers:0}}
function fmt(v){if(!Number.isFinite(v))return'—';if(Math.abs(v)>=1e6)return`${(v/1e6).toFixed(2)}M`;if(Math.abs(v)>=1e3)return`${(v/1e3).toFixed(1)}K`;return v.toFixed(2)}

function Field({label,value,onChange,suffix,min=0}){return <label className="block"><span className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45"><span>{label}</span>{suffix&&<span className="text-gold/55">{suffix}</span>}</span><input type="number" value={value} min={min} step="any" onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink/70 px-3 py-2.5 text-sm font-semibold text-parchment outline-none focus:border-gold/45"/></label>}
function Select({label,value,onChange,children}){return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[.12em] text-parchment/45">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-gold/15 bg-ink px-3 py-2.5 text-sm font-semibold text-parchment outline-none">{children}</select></label>}
function UploadBox({title,text,onClick}){return <div className="mb-4 rounded-2xl border border-gold/20 bg-gold/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[9px] font-bold uppercase tracking-[.16em] text-gold/60">Report Import</div><div className="mt-1 font-display text-base font-bold text-parchment">{title}</div><div className="mt-1 text-[10px] text-parchment/45">{text}</div></div><button type="button" onClick={onClick} className="btn-primary btn-royal">Upload Report</button></div></div>}
function TroopStats({stats,setStats,heroes,setHeroes}){return <div className="space-y-3">{TROOPS.map(t=><div key={t.key} className="rounded-2xl border border-gold/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-parchment"><Icon name={t.icon} size={15} className="text-gold/70"/>{t.label}</div><div className="grid grid-cols-2 gap-2"><Field label="Attack" suffix="%" value={stats[t.key].attack} onChange={v=>setStats(s=>({...s,[t.key]:{...s[t.key],attack:v}}))}/><Field label="Lethality" suffix="%" value={stats[t.key].lethality} onChange={v=>setStats(s=>({...s,[t.key]:{...s[t.key],lethality:v}}))}/></div><div className="mt-3"><Select label={`Lead ${t.label==='Archers'?'Archer':t.label} Hero`} value={heroes[t.key]} onChange={v=>setHeroes(h=>({...h,[t.key]:v}))}>{HEROES[t.key].map(h=><option key={h}>{h}</option>)}</Select></div><div className="mt-3"><div className="flex items-end gap-2"><div className="flex-1"><Select label="Widget ATK or LET Value [%]" value={stats[t.key].widget} onChange={v=>setStats(s=>({...s,[t.key]:{...s[t.key],widget:v}}))}>{WIDGET_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}</Select></div><div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1">{['attack','lethality'].map(k=><button key={k} type="button" onClick={()=>setStats(s=>({...s,[t.key]:{...s[t.key],widgetStat:k}}))} className={`rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase ${(stats[t.key].widgetStat||'attack')===k?'bg-gold/15 text-gold-bright':'text-parchment/45'}`}>{k==='attack'?'ATK':'LET'}</button>)}</div></div><div className="mt-1 text-[9px] leading-relaxed text-parchment/35">Only if stats are from a solo beast attack, not a rally. Widget skill levels grant 0/5/7.5/10/12.5/15% — pick whichever stat this hero's widget boosts.</div></div></div>)}</div>}

function CommanderLine({name}){const v=(name||'').trim();return v?<div className="mt-1 text-xs text-parchment/50">Commander: <span className="font-semibold text-gold-bright" data-k846-player-name="true">{v}</span></div>:null}

function CalculatePrompt({label}){return <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-gold/20 bg-gold/[.03] p-8 text-center">
  <div className="grid h-11 w-11 place-items-center rounded-full border border-gold/30 bg-black/30 text-gold-bright"><Icon name="sparkles" size={18}/></div>
  <div className="text-sm font-semibold text-parchment/70">All set.</div>
  <div className="text-xs text-parchment/45">Click <b className="text-gold-bright">{label}</b> above to run the analysis.</div>
</div>}

// A flat stroke colour per segment was what made this donut read as a pie
// chart from a spreadsheet. Each segment now runs through its own SVG gradient
// -- lit on the outer edge, falling to a deeper shade -- and a slow counter
// ring turns behind it so the graphic is never completely still.
//
// Gradients rather than CSS filters on purpose: html2canvas rasterises an SVG
// wholesale, so gradients survive into the downloadable report while a CSS
// filter on the same element would be dropped.
function Donut({ratio,title='Optimal Distribution',center='Best Formation'}){
  const reveal=useReveal()
  const gid=useId()
  const a=Math.round(ratio.infantry*100),b=Math.round(ratio.cavalry*100),c=Math.max(0,100-a-b)
  const R=68,C=2*Math.PI*R
  const segs=[{key:'infantry',pct:a,color:'#5D90E8',lit:'#9FBEF4'},{key:'cavalry',pct:b,color:'#E0B23B',lit:'#F5D888'},{key:'archers',pct:c,color:'#D76158',lit:'#F0A197'}]
  let acc=0
  return <div className="chart-card rounded-2xl p-4">
    <div className="text-center font-display text-lg font-bold text-parchment">{title}</div>
    <div className="relative mx-auto mt-4 h-48 w-48">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <defs>
          {segs.map(s=><linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={s.lit}/><stop offset="55%" stopColor={s.color}/><stop offset="100%" stopColor={s.color} stopOpacity=".72"/></linearGradient>)}
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="15"/>
        <circle cx="80" cy="80" r={R+11} fill="none" stroke="rgba(226,199,125,.14)" strokeWidth="1" strokeDasharray="3 9" className="donut-ring"/>
        {segs.map(s=>{const len=(s.pct/100)*C,start=acc;acc+=len;return <circle key={s.key} cx="80" cy="80" r={R} fill="none" stroke={`url(#${gid}-${s.key})`} strokeWidth="15" strokeLinecap="round" strokeDasharray={reveal?`${len} ${C-len}`:`0 ${C}`} strokeDashoffset={-start} style={{transition:'stroke-dasharray .9s cubic-bezier(.34,1.56,.64,1)',transitionDelay:`${segs.indexOf(s)*140}ms`}}/>})}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-28 w-28 place-items-center rounded-full border border-gold/15 bg-[#07101e] text-center">
          <div><div className="text-[8px] uppercase tracking-widest text-parchment/35">{center}</div><div className="font-mono text-xl font-black text-gold-bright">{a}/{b}/{c}</div></div>
        </div>
      </div>
    </div>
  </div>
}

function gaussian(mean,sigma,bins=24){const lo=Math.max(0,mean-3.2*sigma),hi=mean+3.2*sigma,step=(hi-lo)/bins,raw=Array.from({length:bins},(_,i)=>{const x=lo+(i+.5)*step,z=(x-mean)/sigma;return{x,y:Math.exp(-.5*z*z)}}),sum=raw.reduce((s,d)=>s+d.y,0);return raw.map(d=>({...d,y:d.y/sum}))}

function Histogram({mean,optimal,sigma}){
  const reveal=useReveal(), gid=useId()
  const cur=gaussian(mean,sigma),opt=gaussian(optimal,sigma*Math.max(.75,optimal/Math.max(mean,.001)))
  const all=[...cur,...opt],min=Math.min(...all.map(d=>d.x)),max=Math.max(...all.map(d=>d.x)),my=Math.max(...all.map(d=>d.y))
  const W=760,H=280,L=48,R=18,T=30,B=42,base=H-B
  const x=v=>L+(v-min)/(max-min)*(W-L-R),y=v=>H-B-v/my*(H-T-B)
  const areaPath=pts=>{const s=smoothPath(pts.map(d=>({x:x(d.x),y:y(d.y)})));return`${s} L${x(pts[pts.length-1].x)},${base} L${x(pts[0].x)},${base} Z`}
  const linePath=pts=>smoothPath(pts.map(d=>({x:x(d.x),y:y(d.y)})))
  return <div className="chart-card rounded-2xl p-3 md:p-4">
    <div className="flex flex-wrap justify-between gap-2"><div><div className="chart-title text-[9px] font-bold uppercase tracking-[.16em]">Current vs Optimal Damage Distribution</div><div className="font-display text-lg font-bold text-parchment">10,000-Hunt Projection</div></div><div className="text-[10px] text-parchment/50"><span className="text-[#7f9ed6]">● Current</span> &nbsp; <span className="text-gold-bright">● Optimal</span></div></div>
    <div className="relative mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={`${gid}-cur`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7f9ed6" stopOpacity=".55"/><stop offset="100%" stopColor="#7f9ed6" stopOpacity="0"/></linearGradient>
          <linearGradient id={`${gid}-opt`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e3ba41" stopOpacity=".45"/><stop offset="100%" stopColor="#e3ba41" stopOpacity="0"/></linearGradient>
        </defs>
        {[0,.25,.5,.75,1].map(t=><line key={t} x1={L} x2={W-R} y1={T+t*(H-T-B)} y2={T+t*(H-T-B)} stroke="rgba(226,199,125,.10)"/>)}
        <g style={{transformOrigin:`${L}px ${base}px`,transform:reveal?'scaleX(1)':'scaleX(0)',transition:'transform 1.1s cubic-bezier(.16,1,.3,1)'}}>
          <path d={areaPath(cur)} fill={`url(#${gid}-cur)`}/>
          <path d={linePath(cur)} fill="none" stroke="#9eb9ef" strokeWidth="2.5"/>
          <path d={areaPath(opt)} fill={`url(#${gid}-opt)`}/>
          <path d={linePath(opt)} fill="none" stroke="#e8c558" strokeWidth="2.5"/>
        </g>
        <line x1={x(mean)} x2={x(mean)} y1={T} y2={base} stroke="#7f9ed6" strokeDasharray="5 5" strokeWidth="2"/>
        <line x1={x(optimal)} x2={x(optimal)} y1={T} y2={base} stroke="#e3ba41" strokeDasharray="5 5" strokeWidth="2"/>
      </svg>
      {/* Plain HTML labels, not SVG <text> -- html2canvas 1.4.1 renders SVG
          text (and the whole SVG along with it) blank in exported reports. */}
      <div className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold text-[#9eb9ef]" style={{left:`${x(mean)/W*100}%`,top:`${2/H*100}%`}}>Current {fmt(mean)}</div>
      <div className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold text-[#e8c558]" style={{left:`${x(optimal)/W*100}%`,top:`${16/H*100}%`}}>Optimal {fmt(optimal)}</div>
      <div className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-parchment/50" style={{left:'50%',top:`${(H-18)/H*100}%`}}>Projected Hunt Impact</div>
    </div>
  </div>
}

function Sensitivity({points,mean}){
  const reveal=useReveal()
  if(!points.length)return null
  const W=760,H=240,L=48,R=18,T=20,B=38,x=v=>L+(v+5)/10*(W-L-R),vals=points.flatMap(p=>[p.infantry,p.cavalry,p.archers]),lo=Math.min(...vals),hi=Math.max(...vals),y=v=>H-B-(v-lo)/Math.max(.001,hi-lo)*(H-T-B),path=k=>points.map((p,i)=>`${i?'L':'M'}${x(p.delta)},${y(p[k])}`).join(' ')
  const lines=[['infantry','#5D90E8',0],['cavalry','#E0B23B',120],['archers','#D76158',240]]
  return <div className="chart-card rounded-2xl p-4">
    <div className="chart-title text-[9px] font-bold uppercase tracking-[.15em]">Formation Sensitivity</div>
    <div className="text-xs text-parchment/45">Actual projected impact as each troop share shifts ±5%.</div>
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
      {lines.map(([k,color,delay])=><path key={k} d={path(k)} pathLength="1" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray="1" strokeDashoffset={reveal?0:1} style={{transition:`stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) ${delay}ms`}}/>)}
      <line x1={x(0)} x2={x(0)} y1={T} y2={H-B} stroke="rgba(244,236,211,.35)" strokeDasharray="4 4"/>
      <text x={x(0)} y={H-8} textAnchor="middle" fill="rgba(244,236,211,.55)" fontSize="11">Current {fmt(mean)}</text>
    </svg>
    <div className="flex justify-center gap-4 text-[10px]"><span className="text-[#5D90E8]">● Infantry</span><span className="text-[#E0B23B]">● Cavalry</span><span className="text-[#D76158]">● Archers</span></div>
  </div>
}

function Risk({mean,sigma}){
  const reveal=useReveal()
  const erf=x=>{const s=Math.sign(x),a=Math.abs(x),p=.3275911,a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,q=1/(1+p*a);return s*(1-(((((a5*q+a4)*q+a3)*q+a2)*q+a1)*q)*Math.exp(-a*a))}
  const chance=t=>clamp((1-.5*(1+erf((t-mean)/(sigma*Math.SQRT2))))*100,0,100),thresholds=[.85,.95,1.05,1.15,1.25].map(v=>mean*v)
  return <div className="k-plate p-4">
    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Percentile / Risk — Chance to Exceed</div>
    <div className="mt-4 space-y-3">{thresholds.map((t,i)=>{const c=chance(t);return <div key={t}><div className="mb-1 flex justify-between text-xs"><span className="text-parchment/55">Above {fmt(t)}</span><span className="font-mono font-bold text-gold-bright">{c.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold-bright" style={{width:reveal?`${c}%`:'0%',transition:`width 1s cubic-bezier(.16,1,.3,1) ${i*80}ms`,}}/></div></div>})}</div>
  </div>
}

function CompareBars({current,optimal}){
  const reveal=useReveal()
  const max=Math.max(current,optimal,1)
  const gain=optimal-current
  const gainPct=current>0?gain/current*100:0
  // Two flat fills with a 10px glow behind each. The glow was the rejected
  // look and box-shadow spread is one of the things html2canvas gets wrong, so
  // it never matched the exported report either. These use the same struck
  // material as every other bar on the site, and the GAIN -- the only number
  // here anyone acts on -- is stated rather than left to be worked out by
  // comparing two bar lengths.
  const rows=[['Current',current,'#5D82C4'],['Optimal',optimal,'#E0B23B']]
  return <div className="k-plate p-4">
    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Current vs Optimal Summary</div>
    <div className="mt-5 space-y-4">{rows.map(([l,v,c],i)=><div key={l}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-parchment/55">{l}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-parchment">{fmt(v)}</span>
      </div>
      <div className="k-track h-5 overflow-hidden rounded">
        <div className="k-seg h-full" style={{width:reveal?`${v/max*100}%`:'0%','--c':c,transitionDelay:`${i*120}ms`}}/>
      </div>
    </div>)}</div>
    <div className="mt-4 flex items-center gap-3 border-t border-gold/12 pt-3">
      <span className="text-[10px] uppercase tracking-[.14em] text-parchment/40">Potential gain</span>
      <span className="chart-pop ml-auto font-mono text-lg font-black tabular-nums" style={{color:gain>=0?'#7BE0A8':'#F0A197'}}>
        {gain>=0?'+':''}{fmt(gain)}
      </span>
      <span className="font-mono text-xs font-bold tabular-nums" style={{color:gain>=0?'#7BE0A8':'#F0A197',opacity:.72}}>
        {gain>=0?'+':''}{gainPct.toFixed(1)}%
      </span>
    </div>
  </div>
}

function RangeChart({p5,mean,p95}){
  const reveal=useReveal()
  // The old bar was a fixed three-stop gradient with a marker pinned at 50%,
  // so it drew the same picture whatever the numbers were -- the mean always
  // sat dead centre even when it was nowhere near the middle of the range.
  // The marker now sits where the mean actually falls between p5 and p95.
  const span=Math.max(1,p95-p5)
  const meanAt=Math.min(96,Math.max(4,(mean-p5)/span*100))
  return <div className="k-plate p-4">
    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-gold/60">Damage Range / Confidence</div>
    <div className="mt-5 grid grid-cols-3 text-center">
      <div><div className="text-[9px] uppercase tracking-wider text-parchment/35">Low 5%</div><div className="font-mono text-sm font-bold tabular-nums text-[#7f9ed6]">{fmt(p5)}</div></div>
      <div><div className="text-[9px] uppercase tracking-wider text-parchment/35">Expected</div><div className="font-mono text-base font-black tabular-nums text-gold-bright">{fmt(mean)}</div></div>
      <div><div className="text-[9px] uppercase tracking-wider text-parchment/35">High 5%</div><div className="font-mono text-sm font-bold tabular-nums text-[#d9b94e]">{fmt(p95)}</div></div>
    </div>
    <div className="relative mx-4 mt-5">
      <div className="k-track h-3.5 overflow-hidden rounded-full">
        <div className="h-full" style={{
          backgroundColor:'#5D82C4',
          backgroundImage:'linear-gradient(90deg, #5D82C4 0%, #8A93B8 34%, #D9B94E 62%, #C8655A 100%)',
          width:reveal?'100%':'0%',
          transition:'width 1.1s cubic-bezier(.16,1,.3,1)',
        }}/>
      </div>
      {/* The mean, where it actually falls in the range. */}
      <span className="absolute top-[-7px] h-7 w-[2px] rounded-full bg-parchment" style={{
        left:reveal?`${meanAt}%`:'50%',
        transform:'translateX(-50%)',
        opacity:reveal?1:0,
        transition:'left 1.1s cubic-bezier(.34,1.42,.52,1) .2s, opacity .5s ease .35s',
      }}/>
    </div>
    <div className="mt-2 text-center text-[10px] text-parchment/35">90% of hunts land inside this range</div>
  </div>
}

function KpiCard({label,numeric,format,value,accent,delay}){
  const animated=useCountUp(numeric??0)
  const display=numeric!=null?format(animated):value
  return <div className="chart-rise rounded-2xl border p-4"
    style={{animationDelay:`${delay}ms`,
            borderColor:accent?'var(--suite-soft)':'var(--suite-faint)',
            background:accent?'var(--suite-ink)':'rgba(255,255,255,.025)'}}>
    <div className="text-[9px] uppercase tracking-wider text-parchment/35">{label}</div>
    <div className="chart-pop mt-1 font-mono text-xl font-bold" style={{color:'var(--suite)',animationDelay:`${delay+90}ms`}}>{display}</div>
  </div>
}

export default function BearSuite(){
  // One 'opened' event per mount. The result here is recomputed on every
  // keystroke, so counting results would count typing, not usage.
  useEffect(() => { trackTool('bear') }, [])

 const[tab,setTab]=useState('ratio'),[uploadTarget,setUploadTarget]=useState('ratio'),[formationStats,setFormationStats]=useState(EMPTY_STATS),[formationHeroes,setFormationHeroes]=useState(EMPTY_HEROES),[formationTier,setFormationTier]=useState('T10'),[formationTg,setFormationTg]=useState(0),[impactStats,setImpactStats]=useState(EMPTY_STATS),[impactHeroes,setImpactHeroes]=useState(EMPTY_HEROES),[impactTier,setImpactTier]=useState('T10'),[tg,setTg]=useState(0),[capacity,setCapacity]=useState(''),[participants,setParticipants]=useState(''),[troopCounts,setTroopCounts]=useState(EMPTY_COUNTS),[joiners,setJoiners]=useState(EMPTY_JOINERS),[copied,setCopied]=useState(false)
 const[formationCalculated,setFormationCalculated]=useState(false),[damageCalculated,setDamageCalculated]=useState(false)
 const[playerName,setPlayerName]=usePlayerName()
 useEffect(()=>{setFormationCalculated(false)},[formationStats,formationTier,formationTg,formationHeroes])
 useEffect(()=>{setDamageCalculated(false)},[impactStats,impactTier,tg,troopCounts,impactHeroes,capacity,participants,joiners])
 useEffect(()=>{const onReport=e=>{const r=e.detail||{},withReport=prev=>({infantry:{attack:r.stats?.infantry?.attack??'',lethality:r.stats?.infantry?.lethality??'',widget:prev.infantry.widget,widgetStat:prev.infantry.widgetStat},cavalry:{attack:r.stats?.cavalry?.attack??'',lethality:r.stats?.cavalry?.lethality??'',widget:prev.cavalry.widget,widgetStat:prev.cavalry.widgetStat},archers:{attack:r.stats?.archers?.attack??'',lethality:r.stats?.archers?.lethality??'',widget:prev.archers.widget,widgetStat:prev.archers.widgetStat}});if(uploadTarget==='ratio')setFormationStats(withReport);else{setImpactStats(withReport);if(r.capacity!==''&&r.capacity!=null)setCapacity(String(r.capacity));if(r.participants!==''&&r.participants!=null)setParticipants(String(r.participants));if(r.troopCounts)setTroopCounts({infantry:String(r.troopCounts.infantry??''),cavalry:String(r.troopCounts.cavalry??''),archers:String(r.troopCounts.archers??'')});if(r.tier)setImpactTier(String(r.tier).startsWith('TG')?'T11':r.tier);if(r.tg!==''&&r.tg!=null)setTg(Number(r.tg))}};window.addEventListener('k846:report-applied',onReport);return()=>window.removeEventListener('k846:report-applied',onReport)},[uploadTarget])
 const openUpload=target=>{setUploadTarget(target);const importer=target==='ratio'?window.__k846HuntFormationImport:window.__k846HuntImpactImport;if(importer?.open)importer.open();else if(window.__k846BattleLabImport?.open)window.__k846BattleLabImport.open();else alert('Report reader is loading. Try again in a moment.')}
 const formationReady=validStats(formationStats),formationResult=useMemo(()=>formationReady?optimizeBearFormation({stats:normalized(formationStats),tier:formationTier,tg:formationTg,leadHeroes:formationHeroes}):null,[formationReady,formationStats,formationTier,formationTg,formationHeroes])
 const ratio=useMemo(()=>ratioFromCounts(troopCounts),[troopCounts]),total=useMemo(()=>TROOPS.reduce((s,t)=>s+Math.max(0,n(troopCounts[t.key])),0),[troopCounts]),ready=validStats(impactStats)&&n(capacity)>0&&n(participants)>0&&total>0
 const result=useMemo(()=>ready?computeHuntImpact({stats:normalized(impactStats),tier:impactTier,tg,ratio,leadHeroes:impactHeroes,troopCounts:Object.fromEntries(TROOPS.map(t=>[t.key,n(troopCounts[t.key])])),capacity:n(capacity),participants:n(participants),joiners}):null,[ready,impactStats,impactTier,tg,ratio,impactHeroes,troopCounts,capacity,participants,joiners])
 const mean=result?.impactIndex||0,optimal=result?.optimalImpactIndex||0,eff=result?.efficiency||0,gain=Math.max(0,optimal-mean),active=joiners.filter(j=>j.hero!=='None').length,sigma=mean*clamp(.08+.012*Math.max(0,4-active),.08,.16),p5=Math.max(0,mean-1.645*sigma),p95=mean+1.645*sigma
 // SINGLE SOURCE OF TRUTH for the downloadable report.
 //
 // The dashboard in public/hunt-impact-command-dashboard-v4.js used to rebuild
 // this whole calculation by scraping the DOM -- finding an element whose text
 // is exactly "Infantry", walking up to an ancestor with three inputs, and
 // assuming they are [attack, lethality, hero, widget] in that order. Its maths
 // are identical to this engine's (verified to float precision in
 // research/impact-parity.mjs), so any mismatch a player sees between the screen
 // and their download comes from that scraper reading different inputs than
 // React is actually using -- which a UI change silently causes.
 //
 // Publishing the live state here removes the second source. The report reads
 // this when present and only falls back to scraping if it is missing.
 useEffect(()=>{
  if(typeof window==='undefined')return
  window.__k846HuntImpact = ready&&result ? {
   ready:true, at:Date.now(),
   stats:normalized(impactStats), heroes:impactHeroes, tier:impactTier, tg,
   counts:Object.fromEntries(TROOPS.map(t=>[t.key,n(troopCounts[t.key])])),
   total, ratio, capacity:n(capacity), participants:n(participants), joiners,
   mean, optimal, eff,
  } : { ready:false, at:Date.now() }
 },[ready,result,impactStats,impactHeroes,impactTier,tg,troopCounts,total,ratio,capacity,participants,joiners,mean,optimal,eff])

 const sensitivity=useMemo(()=>{if(!ready||!result)return[];const stats=applyJoinerBonuses(normalized(impactStats),joiners);return Array.from({length:11},(_,i)=>i-5).map(delta=>{const shift=delta/100,scoreFor=target=>{const r={...ratio},others=TROOPS.map(t=>t.key).filter(k=>k!==target);r[target]=clamp(r[target]+shift,0,1);const rem=1-r[target],sum=others.reduce((s,k)=>s+ratio[k],0)||1;others.forEach(k=>r[k]=rem*ratio[k]/sum);return computeBearDamage({stats,ratio:r,totalTroops:Math.max(1,total)})};return{delta,infantry:scoreFor('infantry'),cavalry:scoreFor('cavalry'),archers:scoreFor('archers')}})},[ready,result,impactStats,joiners,total,ratio,impactTier,tg,impactHeroes])
 const currentPct=Object.fromEntries(TROOPS.map(t=>[t.key,Math.round(ratio[t.key]*100)])),optRatio=result?.optimalRatio||result?.ratio||ratio
 async function copyFormation(){if(!formationResult)return;try{await navigator.clipboard.writeText(buildBearChatMessage(formationResult));setCopied(true);setTimeout(()=>setCopied(false),1200)}catch{}}
 const kpis=[
   {label:'Projected Damage',numeric:mean,format:fmt,accent:true},
   {label:'Optimal Damage',numeric:optimal,format:fmt,accent:false},
   {label:'Efficiency',numeric:eff,format:v=>`${v.toFixed(2)}%`,accent:false},
   {label:'Potential Gain',numeric:gain,format:v=>`+${fmt(v)}`,accent:true},
   {label:'Current Formation',numeric:null,value:`${currentPct.infantry}/${currentPct.cavalry}/${currentPct.archers}`,accent:false},
 ]
 return <div data-suite="bear" className="space-y-5"><section className="panel p-4 md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="eyebrow">Bear Calculator</div><h2 className="mt-1 font-display text-2xl font-bold text-parchment">Formation + Impact</h2><p className="mt-1 text-xs text-parchment/50">One live model. Every Hunt Impact visual updates from the same calculation.</p></div><div className="inline-flex rounded-xl border border-gold/15 bg-black/25 p-1"><button onClick={()=>setTab('ratio')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab==='ratio'?'bg-gold/15 text-gold-bright':'text-parchment/45'}`}>Hunt Formation</button><button onClick={()=>setTab('damage')} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${tab==='damage'?'bg-gold/15 text-gold-bright':'text-parchment/45'}`}>Hunt Impact</button></div></div><div className="mt-4 border-t border-gold/10 pt-4"><PlayerNameField value={playerName} onChange={setPlayerName}/></div></section>
 {tab==='ratio'?<div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
   <section className="panel p-5 md:p-6">
     <div className="eyebrow">Hunt Formation Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Rally Bonus Report</h3>
     <UploadBox title="Upload Rally Bonus Screenshot" text="Reads Infantry, Cavalry and Archer Attack + Lethality only." onClick={()=>openUpload('ratio')}/>
     <form onSubmit={e=>{e.preventDefault();if(formationReady)setFormationCalculated(true)}}>
       <TroopStats stats={formationStats} setStats={setFormationStats} heroes={formationHeroes} setHeroes={setFormationHeroes}/>
       <div className="mt-3 grid grid-cols-2 gap-3"><Select label="Troop Tier" value={formationTier} onChange={setFormationTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select><Select label="True Gold" value={String(formationTg)} onChange={v=>setFormationTg(Number(v))}>{Array.from({length:9},(_,i)=><option key={i} value={i}>TG{i}</option>)}</Select></div>
       <p className="mt-2 text-[10px] text-parchment/40">Tier and True Gold are recorded on your report but don't move the split — the optimal ratio depends only on your Attack and Lethality bonuses.</p>
      <button type="submit" disabled={!formationReady} className="btn-primary btn-royal mt-4 w-full justify-center disabled:opacity-40"><Icon name="sparkles" size={15}/> Calculate Hunt Formation</button>
     </form>
   </section>
   <section className="panel panel-glow p-5 md:p-6">
     <div className="eyebrow">Hunt Formation</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Optimal Troop Split</h3>
     <CommanderLine name={playerName}/>
     {!formationReady?<div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Rally Bonus report or enter all six values.</div>:!formationCalculated?<CalculatePrompt label="Calculate Hunt Formation"/>:<>
       <div className="mt-4 space-y-3">{formationResult.troops.map((t,i)=><div key={t.type} className="stagger-in rounded-2xl border border-gold/15 bg-white/[.035] p-4" style={{animationDelay:`${i*70}ms`}}><div className="flex justify-between"><span className="font-display font-bold text-parchment">{t.label}</span><span className="font-mono text-xl font-bold text-gold-bright">{t.percent.toFixed(2)}%</span></div></div>)}</div>
       <div className="stagger-in mt-4" style={{animationDelay:'210ms'}}><Donut ratio={formationResult.ratio}/></div>
       <button onClick={copyFormation} className="btn-primary btn-royal mt-4 w-full justify-center">{copied?'Copied':'Copy Hunt Formation'}</button>
     </>}
   </section>
 </div>:
 <div className="space-y-5">
   <section className="panel p-5 md:p-6">
     <div className="eyebrow">Hunt Impact Input</div><h3 className="mt-1 font-display text-xl font-bold text-parchment">Battle Report</h3>
     <UploadBox title="Upload Battle Report Screenshot" text="Reads combat stats, rally size and troop counts. Review before calculating." onClick={()=>openUpload('damage')}/>
     <form onSubmit={e=>{e.preventDefault();if(ready)setDamageCalculated(true)}}>
       <div className="grid gap-4 xl:grid-cols-2">
         <TroopStats stats={impactStats} setStats={setImpactStats} heroes={impactHeroes} setHeroes={setImpactHeroes}/>
         <div className="flex flex-col gap-4">
           <div className="rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="eyebrow">Detected / Manual Values</div><div className="mt-3 grid grid-cols-2 gap-3"><Field label="Rally Capacity" value={capacity} step={1000} onChange={setCapacity}/><Field label="Participants" value={participants} step={1} onChange={setParticipants}/></div><div className="mt-3 grid grid-cols-3 gap-2">{TROOPS.map(t=><Field key={t.key} label={`${t.short} Troops`} value={troopCounts[t.key]} step={1000} onChange={v=>setTroopCounts(c=>({...c,[t.key]:v}))}/>)}</div><div className="mt-3 grid grid-cols-2 gap-3"><Select label="Troop Tier" value={impactTier} onChange={setImpactTier}><option>T1-T6</option><option>T7-T9</option><option>T10</option><option>T11</option></Select><Select label="True Gold" value={String(tg)} onChange={v=>setTg(Number(v))}>{Array.from({length:9},(_,i)=><option key={i} value={i}>TG{i}</option>)}</Select></div>{total>0&&<div className="mt-4 rounded-xl border border-gold/10 bg-black/20 p-3"><div className="text-[9px] uppercase text-parchment/35">Detected Current Formation</div><div className="mt-1 font-mono text-xl font-bold text-gold-bright">{currentPct.infantry} / {currentPct.cavalry} / {currentPct.archers}</div></div>}</div>
           <div className="rounded-2xl border border-gold/15 bg-white/[.025] p-4"><div className="font-display font-bold text-parchment">Joiner Skill Heroes</div><div className="mt-3 grid gap-3">{joiners.map((slot,i)=><div key={i} className="grid grid-cols-[1fr_90px] gap-2"><Select label={`Joiner ${i+1}`} value={slot.hero} onChange={v=>setJoiners(j=>j.map((x,k)=>k===i?{...x,hero:v}:x))}>{HUNT_JOINER_HEROES.map(h=><option key={h}>{h}</option>)}</Select><Select label="Skill" value={String(slot.skillLevel)} onChange={v=>setJoiners(j=>j.map((x,k)=>k===i?{...x,skillLevel:Number(v)}:x))}>{[1,2,3,4,5].map(l=><option key={l} value={l}>Lv{l}</option>)}</Select></div>)}</div><div className="mt-2 text-[9px] leading-relaxed text-parchment/30">Gordon, Howard, Saul, Fahd, Eric, Petra and Thrud are in the roster but don't have a verified bonus yet, so they add 0 for now. Yeonwoo and Margot aren't listed separately — they're the same joiner effect as Chenko and Amane.</div></div>
           <div className="flex flex-1 flex-col justify-center rounded-2xl border border-gold/10 bg-white/[.02] p-4"><div className="eyebrow">Quick Reference</div><ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-parchment/55"><li><span className="font-semibold text-parchment/75">Rally Capacity</span> is your March Size stat, not a troop count.</li><li><span className="font-semibold text-parchment/75">Participants</span> counts everyone in the rally, including you.</li><li><span className="font-semibold text-parchment/75">True Gold</span> only applies to T10/T11 troops — leave it at TG0 for anything below T10.</li><li><span className="font-semibold text-parchment/75">Efficiency</span> below compares your current split to the mathematically optimal one; 100% means you're already there.</li></ul></div>
         </div>
       </div>
       <button type="submit" disabled={!ready} className="btn-primary btn-royal mt-4 w-full justify-center disabled:opacity-40"><Icon name="sparkles" size={15}/> Calculate Hunt Impact</button>
     </form>
   </section>
   <section className="panel panel-glow p-4 md:p-6">
     <div className="eyebrow">Hunt Impact</div><h3 className="mt-1 font-display text-2xl font-bold text-parchment">Damage Analytics Dashboard</h3>
     <CommanderLine name={playerName}/>
     {!ready?<div className="mt-5 rounded-2xl border border-gold/15 bg-white/[.025] p-6 text-center text-sm text-parchment/45">Upload a Battle Report, then review capacity, participants, troop counts, tier and True Gold.</div>:!damageCalculated?<CalculatePrompt label="Calculate Hunt Impact"/>:<>
       <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{kpis.map((k,i)=><KpiCard key={k.label} {...k} delay={i*70}/>)}</div>
       <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]"><Histogram mean={mean} optimal={optimal} sigma={Math.max(.001,sigma)}/><CompareBars current={mean} optimal={optimal}/></div>
       <div className="mt-4 grid gap-4 lg:grid-cols-2"><Sensitivity points={sensitivity} mean={mean}/><RangeChart p5={p5} mean={mean} p95={p95}/></div>
       <div className="mt-4 grid gap-4 lg:grid-cols-3"><Risk mean={mean} sigma={Math.max(.001,sigma)}/><Donut ratio={ratio} title="Current Formation" center="Current"/><Donut ratio={optRatio} title="Optimal Formation" center="Optimal"/></div>
       <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-[11px] leading-relaxed text-amber-100/60">All dashboard visuals use the same live Hunt Impact result. Damage is in Bear points, calibrated against the reference calculator's own damage plots — single-type rallies land within 2% of it, mixed splits within about 5%. The 10,000-hunt spread around that figure is still a modeled projection, not a measured one.</div>
     </>}
   </section>
 </div>}
 </div>
}
