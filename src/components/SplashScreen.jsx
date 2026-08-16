import { useEffect, useMemo, useRef, useState } from 'react'

function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.28
  master.connect(ctx.destination)
  ;[[523.25,0,.28],[659.25,.08,.32],[783.99,.16,.38],[1046.5,.34,.55]].forEach(([freq,start,dur],i)=>{
    const osc=ctx.createOscillator(), gain=ctx.createGain()
    osc.type=i===3?'sine':'sawtooth'; osc.frequency.value=freq
    gain.gain.setValueAtTime(0,now+start); gain.gain.linearRampToValueAtTime(.12,now+start+.02); gain.gain.exponentialRampToValueAtTime(.001,now+start+dur)
    osc.connect(gain); gain.connect(master); osc.start(now+start); osc.stop(now+start+dur)
  })
}

export default function SplashScreen({ onEnter }) {
  const [fading,setFading]=useState(false)
  const audioCtxRef=useRef(null)
  const isMobile=useMemo(()=>typeof window!=='undefined'&&(window.innerWidth<768||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)),[])
  const particleCount=isMobile?10:24
  useEffect(()=>{document.body.style.overflow='hidden'; const AudioCtx=window.AudioContext||window.webkitAudioContext; if(AudioCtx) audioCtxRef.current=new AudioCtx(); return()=>{document.body.style.overflow=''; try{audioCtxRef.current?.close()}catch{}}},[])
  function enter(){if(fading)return; const ctx=audioCtxRef.current; if(ctx){if(ctx.state!=='running')ctx.resume().then(()=>playEnterSound(ctx)).catch(()=>{});else playEnterSound(ctx)} setFading(true); setTimeout(()=>{document.body.style.overflow='';onEnter?.()},1200)}
  return <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${fading?'splash-fade-out':''}`} style={{background:'#060810'}}>
    <img src="./assets/royal-bg.jpg" alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover" style={{zIndex:1,animation:isMobile?'none':'bg-zoom 20s ease-in-out infinite alternate'}}/>
    <div className="absolute inset-0" style={{zIndex:2,background:'radial-gradient(ellipse at 50% 42%, rgba(6,8,16,.20) 0%, rgba(6,8,16,.72) 68%, rgba(6,8,16,.95) 100%)'}}/>
    <div className="absolute inset-4 rounded-md border border-gold/20" style={{zIndex:8,pointerEvents:'none'}}><div className="absolute inset-1 rounded border border-gold/10"/></div>
    <div className="absolute inset-0 overflow-hidden" style={{zIndex:4,pointerEvents:'none'}}>{Array.from({length:particleCount}).map((_,i)=><span key={i} style={{position:'absolute',bottom:'-10px',left:`${(i*17)%100}%`,width:`${2+(i%3)}px`,height:`${2+(i%3)}px`,borderRadius:'50%',background:i%2?'#E8C766':'#D4AF37',boxShadow:'0 0 8px rgba(212,175,55,.55)',opacity:0,animation:`ember-rise ${8+(i%5)}s linear ${(i*.35)%8}s infinite`}}/>)}</div>
    <main className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center" style={{zIndex:10}}>
      <div className="relative flex items-center justify-center">
        {!isMobile&&<div className="absolute h-72 w-72 rounded-full border border-gold/15" style={{boxShadow:'0 0 80px rgba(212,175,55,.16)',animation:'spin 30s linear infinite'}}/>}
        <img src="./assets/crest-846.png?v=20260816-verified" alt="Kingdom 846 Royal Crest" loading="eager" className="relative w-auto object-contain drop-shadow-2xl" style={{maxHeight:isMobile?'29vh':'38vh',maxWidth:'76vw'}}/>
      </div>
      <div className="mt-4 eyebrow text-gold-bright">One Crown · Four Alliances</div>
      <h1 className="mt-2 font-display text-4xl font-black tracking-[.08em] gradient-gold sm:text-5xl md:text-6xl">KINGDOM 846</h1>
      <div className="mt-3 text-sm tracking-[.55em] text-gold/70">✦ ◆ ✦</div>
      <p className="mt-3 font-serif text-sm italic text-parchment/70 sm:text-base">Where legends are forged in fire and crowned in gold</p>
      <button onClick={enter} className="btn-primary mt-7 min-w-48 !px-8 !py-3 !text-sm">Enter the Realm</button>
      <div className="mt-3 text-[10px] uppercase tracking-[.22em] text-parchment/30">Official Portal · Kingdom 846</div>
    </main>
  </div>
}
