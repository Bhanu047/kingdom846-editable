import { useEffect, useRef, useState } from 'react'

function playEnterSound(ctx) {
  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = 0.2
  master.connect(ctx.destination)

  const tone = (freq, start, end, peak, type = 'sine') => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now + start)
    gain.gain.setValueAtTime(0.0001, now + start)
    gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + end)
    osc.connect(gain)
    gain.connect(master)
    osc.start(now + start)
    osc.stop(now + end + 0.05)
  }

  tone(52, 0, 1.35, 0.32)
  tone(196, 0.06, 0.72, 0.045, 'triangle')
  tone(293.66, 0.16, 0.9, 0.05, 'triangle')
  tone(392, 0.28, 1.06, 0.055, 'triangle')
  tone(523.25, 0.43, 1.22, 0.05, 'sine')
}

const sparks = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 31 + 9) % 100}%`,
  delay: `${(i * 0.27) % 8}s`,
  duration: `${7 + (i % 7)}s`,
  size: `${1 + (i % 3)}px`,
}))

function RoyalCrown() {
  return (
    <svg className="code-crown" viewBox="0 0 300 165" aria-hidden="true">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f470b" />
          <stop offset="0.28" stopColor="#fff0a1" />
          <stop offset="0.54" stopColor="#cb9323" />
          <stop offset="0.78" stopColor="#ffe99a" />
          <stop offset="1" stopColor="#75490a" />
        </linearGradient>
        <linearGradient id="cv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f1524" />
          <stop offset="1" stopColor="#31060b" />
        </linearGradient>
      </defs>
      <path d="M56 112 Q52 58 87 30 Q106 77 127 29 Q148 75 167 17 Q188 74 207 29 Q229 75 241 35 Q265 61 242 112Z" fill="url(#cv)" stroke="url(#cg)" strokeWidth="7" />
      <path d="M48 110 Q150 134 252 110 L242 143 Q150 157 58 143Z" fill="url(#cg)" stroke="#fff1ad" strokeWidth="2" />
      <ellipse cx="167" cy="39" rx="10" ry="17" fill="#d5a535" stroke="#fff1ad" strokeWidth="2" />
      <path d="M167 2 L175 20 L167 37 L159 20Z" fill="#f9dc70" />
      {[76, 112, 150, 188, 225].map((x, i) => <circle key={x} cx={x} cy="124" r="5" fill={i === 2 ? '#214b8c' : '#8c1722'} stroke="#fff1ad" strokeWidth="1.3" />)}
    </svg>
  )
}

function Lion({ side }) {
  return (
    <svg className={`lion lion-${side}`} viewBox="0 0 190 320" aria-hidden="true">
      <defs>
        <linearGradient id={`lg-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f4309" />
          <stop offset="0.34" stopColor="#f3cf67" />
          <stop offset="0.62" stopColor="#b97910" />
          <stop offset="1" stopColor="#ffeaa1" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#lg-${side})`} strokeLinecap="round" strokeLinejoin="round">
        <path d="M119 55 C146 39 166 58 151 79 C169 81 173 101 157 113 C166 132 150 147 132 139 C124 162 103 166 88 152 C72 174 44 163 43 139 C25 130 27 109 41 100 C31 82 44 63 64 65 C74 46 101 43 119 55Z" strokeWidth="8" />
        <path d="M95 146 C126 168 129 199 114 228 C99 254 97 276 110 298" strokeWidth="11" />
        <path d="M100 183 C76 184 60 202 63 224 C66 247 49 258 38 241" strokeWidth="9" />
        <path d="M118 188 C146 199 151 222 138 241 C127 257 136 274 152 277" strokeWidth="9" />
        <path d="M72 84 C92 74 114 83 122 101 C106 102 95 112 91 126 C72 120 62 101 72 84Z" strokeWidth="7" />
        <path d="M88 79 L83 61 L100 74 M112 82 L126 66 L121 89" strokeWidth="5" />
        <path d="M62 93 C45 84 29 95 32 112 C18 117 18 132 29 140" strokeWidth="5" />
      </g>
      <circle cx="101" cy="99" r="4" fill="#fff1ad" />
    </svg>
  )
}

function Banner({ side }) {
  return (
    <div className={`side-banner side-banner-${side}`} aria-hidden="true">
      <div className="banner-top" />
      <div className="banner-cloth">
        <div className="banner-crown">♛</div>
        <div className="banner-number">846</div>
        <div className="banner-mark">✦</div>
      </div>
    </div>
  )
}

export default function SplashScreen({ onEnter }) {
  const [fading, setFading] = useState(false)
  const audioCtxRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) audioCtxRef.current = new AudioCtx()
    return () => {
      document.body.style.overflow = ''
      try { audioCtxRef.current?.close() } catch {}
    }
  }, [])

  function enter() {
    if (fading) return
    const ctx = audioCtxRef.current
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().then(() => playEnterSound(ctx)).catch(() => {})
      else playEnterSound(ctx)
    }
    setFading(true)
    setTimeout(() => {
      document.body.style.overflow = ''
      onEnter?.()
    }, 1350)
  }

  return (
    <section className={`lux-welcome ${fading ? 'is-opening' : ''}`}>
      <img src="/assets/splash-castle-bg.png" alt="" loading="eager" className="castle-bg" />
      <div className="gold-sky" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="parallax-light light-one" aria-hidden="true" />
      <div className="parallax-light light-two" aria-hidden="true" />
      <div className="floor-gloss" aria-hidden="true" />
      <div className="royal-carpet" aria-hidden="true"><span /></div>

      <div className="column column-left" aria-hidden="true" />
      <div className="column column-right" aria-hidden="true" />
      <Banner side="left" />
      <Banner side="right" />

      <div className="brazier brazier-left" aria-hidden="true"><i /><b /></div>
      <div className="brazier brazier-right" aria-hidden="true"><i /><b /></div>

      <div className="spark-field" aria-hidden="true">
        {sparks.map((s, i) => <i key={i} style={{ left: s.left, animationDelay: s.delay, animationDuration: s.duration, width: s.size, height: s.size }} />)}
      </div>

      <div className="royal-frame" aria-hidden="true">
        <span className="frame-gem frame-gem-tl" />
        <span className="frame-gem frame-gem-tr" />
        <span className="frame-gem frame-gem-bl" />
        <span className="frame-gem frame-gem-br" />
      </div>

      <main className="welcome-content">
        <div className="crest-stage">
          <div className="halo halo-a" />
          <div className="halo halo-b" />
          <div className="halo halo-c" />
          <div className="starburst">✦</div>
          <RoyalCrown />
          <Lion side="left" />
          <Lion side="right" />
          <div className="crest-shell">
            <img src="/assets/crest-846.png?v=royal-luxury" alt="Kingdom 846 Royal Crest" className="crest-image" loading="eager" />
          </div>
          <div className="crest-ribbon"><span>◆</span> KINGDOM 846 <span>◆</span></div>
        </div>

        <div className="oath">ONE CROWN <em>◆</em> FOUR ALLIANCES <em>◆</em> ONE KINGDOM</div>
        <h1>KINGDOM 846</h1>
        <div className="title-ornament"><span /><b>✦ ◆ ✦</b><span /></div>
        <p className="tagline">WHERE LEGENDS ARE FORGED IN FIRE AND CROWNED IN GOLD</p>

        <button onClick={enter} disabled={fading} className="enter-realm">
          <span className="ornament ornament-left">◆</span>
          <span className="button-text">ENTER THE REALM</span>
          <span className="ornament ornament-right">◆</span>
        </button>

        <div className="portal-footer">OFFICIAL ROYAL PORTAL <span>♜</span> KINGDOM 846</div>
      </main>

      <div className="portal-flare" aria-hidden="true" />

      <style>{`
        .lux-welcome{position:fixed;inset:0;z-index:100;overflow:hidden;background:#03050a;color:#f4d675;display:flex;align-items:center;justify-content:center;font-family:Cinzel,Georgia,serif;isolation:isolate}
        .castle-bg{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;object-position:center 43%;z-index:-9;filter:saturate(.9) contrast(1.06) brightness(.7);animation:castleBreath 18s ease-in-out infinite alternate}
        .gold-sky{position:absolute;inset:0;z-index:-8;background:radial-gradient(circle at 50% 21%,rgba(255,214,110,.34) 0%,rgba(210,139,23,.11) 22%,transparent 45%),linear-gradient(180deg,rgba(3,4,8,.08),rgba(3,5,10,.15) 46%,rgba(2,3,8,.88) 100%);mix-blend-mode:screen}
        .vignette{position:absolute;inset:0;z-index:-7;box-shadow:inset 0 0 190px 60px rgba(0,0,0,.88);background:linear-gradient(90deg,rgba(2,3,7,.72),transparent 20%,transparent 80%,rgba(2,3,7,.72))}
        .parallax-light{position:absolute;top:-20%;width:26%;height:120%;z-index:-6;pointer-events:none;filter:blur(8px);opacity:.24;background:linear-gradient(180deg,rgba(255,229,151,.4),rgba(232,185,80,.04) 55%,transparent);transform:rotate(13deg)}
        .light-one{left:28%;animation:lightSweep 8s ease-in-out infinite alternate}.light-two{right:20%;transform:rotate(-14deg);animation:lightSweep2 10s ease-in-out infinite alternate}
        .floor-gloss{position:absolute;left:0;right:0;bottom:-5%;height:38%;z-index:-4;background:linear-gradient(180deg,rgba(10,14,24,.06),rgba(3,5,11,.9)),repeating-linear-gradient(90deg,rgba(236,190,76,.035) 0 1px,transparent 1px 9vw);transform:perspective(650px) rotateX(67deg);transform-origin:bottom;opacity:.9}
        .royal-carpet{position:absolute;left:50%;bottom:-19%;width:min(48vw,760px);height:60%;z-index:-3;transform:translateX(-50%) perspective(700px) rotateX(57deg);transform-origin:bottom;background:linear-gradient(90deg,#6e4a0d 0 2%,#d1a03a 2% 3%,#071d4d 3% 97%,#d1a03a 97% 98%,#6e4a0d 98%);box-shadow:0 0 48px rgba(5,16,42,.9)}
        .royal-carpet span{position:absolute;inset:7% 7%;border:1px solid rgba(232,199,102,.44);box-shadow:inset 0 0 0 6px rgba(4,13,35,.72)}
        .column{position:absolute;top:-5%;bottom:-4%;width:18vw;min-width:140px;z-index:-1;border:2px solid rgba(184,123,28,.6);background:linear-gradient(90deg,#08090c,#3f270a 19%,#a87017 26%,#201506 34%,#050609 52%,#6c430d 79%,#0b0b0d);box-shadow:inset 0 0 38px #000,0 0 24px rgba(224,168,51,.18)}
        .column:before{content:'';position:absolute;top:0;bottom:0;width:30%;left:35%;border-left:1px solid rgba(247,206,105,.4);border-right:1px solid rgba(247,206,105,.2);background:repeating-linear-gradient(0deg,rgba(244,201,95,.08) 0 2px,transparent 2px 22px)}
        .column-left{left:-6%;border-radius:0 46% 0 0}.column-right{right:-6%;border-radius:46% 0 0 0;transform:scaleX(-1)}
        .side-banner{position:absolute;top:9%;width:8vw;min-width:72px;max-width:118px;height:49%;z-index:2;filter:drop-shadow(0 14px 16px rgba(0,0,0,.76))}.side-banner-left{left:4%}.side-banner-right{right:4%}.banner-top{height:7px;background:linear-gradient(90deg,#3c2508,#f2cf67,#6e4810);border-radius:9px;box-shadow:0 0 12px rgba(235,190,75,.3)}
        .banner-cloth{position:relative;height:100%;margin:0 8%;clip-path:polygon(0 0,100% 0,100% 89%,50% 100%,0 89%);background:linear-gradient(90deg,#06142f,#0c2859 49%,#071a3d);border-left:1px solid rgba(227,184,69,.62);border-right:1px solid rgba(227,184,69,.62);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;box-shadow:inset 0 0 24px rgba(0,0,0,.75)}.banner-cloth:before{content:'';position:absolute;inset:8% 18% 12%;border:1px solid rgba(223,174,57,.25)}
        .banner-crown{font-size:clamp(16px,2vw,30px);color:#d9ae3b}.banner-number{font-size:clamp(18px,2.6vw,38px);letter-spacing:.05em;color:#efcd69;text-shadow:0 1px 0 #503005}.banner-mark{color:#b88723}
        .brazier{position:absolute;bottom:8%;width:110px;height:120px;z-index:4}.brazier-left{left:4%}.brazier-right{right:4%}.brazier:after{content:'';position:absolute;left:12%;right:12%;bottom:0;height:42%;border-radius:50% 50% 15% 15%;background:linear-gradient(90deg,#4e2b08,#d79725 28%,#5b3108 50%,#e6ae42 74%,#422508);box-shadow:0 6px 20px #000,inset 0 3px 6px rgba(255,230,142,.35)}
        .brazier i,.brazier b{position:absolute;left:50%;bottom:36%;width:34px;height:70px;border-radius:60% 15% 60% 45%;transform-origin:50% 100%;filter:blur(.3px);background:linear-gradient(#fff7ae 0%,#ffb229 35%,#d24a0a 72%,transparent);box-shadow:0 0 25px #f58a18}.brazier i{transform:translateX(-68%) rotate(-11deg);animation:fireA 1.3s ease-in-out infinite alternate}.brazier b{transform:translateX(-20%) scale(.78) rotate(12deg);animation:fireB 1.05s ease-in-out infinite alternate}
        .spark-field{position:absolute;inset:0;z-index:5;pointer-events:none}.spark-field i{position:absolute;bottom:-10px;border-radius:50%;background:#ffe89a;box-shadow:0 0 8px #f3b83d;opacity:0;animation:sparkRise linear infinite}
        .royal-frame{position:absolute;inset:14px;z-index:8;border:1px solid rgba(231,187,70,.6);box-shadow:inset 0 0 32px rgba(208,146,27,.05);pointer-events:none}.royal-frame:before{content:'';position:absolute;inset:7px;border:1px solid rgba(231,187,70,.18)}
        .frame-gem{position:absolute;width:18px;height:18px;border:1px solid #f1cf6d;background:radial-gradient(circle,#255798 0 26%,#08172f 28% 60%,#bf8a22 63% 100%);transform:rotate(45deg);box-shadow:0 0 10px rgba(236,194,83,.35)}.frame-gem-tl{left:9px;top:9px}.frame-gem-tr{right:9px;top:9px}.frame-gem-bl{left:9px;bottom:9px}.frame-gem-br{right:9px;bottom:9px}
        .welcome-content{position:relative;z-index:10;width:min(94vw,1180px);display:flex;flex-direction:column;align-items:center;text-align:center;padding:1.2vh 22px 2vh;transform:translateY(-.5vh)}
        .crest-stage{position:relative;width:min(56vw,660px);height:min(46vh,445px);display:flex;align-items:center;justify-content:center;margin-bottom:-1vh}.halo{position:absolute;left:50%;top:49%;border-radius:50%;transform:translate(-50%,-50%);border:1px solid rgba(239,194,77,.25)}.halo-a{width:88%;aspect-ratio:1;box-shadow:0 0 58px rgba(235,181,49,.16),inset 0 0 58px rgba(235,181,49,.08);animation:haloSpin 34s linear infinite}.halo-b{width:72%;aspect-ratio:1;border-style:dashed;opacity:.58;animation:haloSpinBack 23s linear infinite}.halo-c{width:58%;aspect-ratio:1;background:radial-gradient(circle,rgba(255,218,117,.23),rgba(209,142,28,.05) 46%,transparent 71%);border:0;filter:blur(5px);animation:haloPulse 4s ease-in-out infinite}.starburst{position:absolute;top:0;left:50%;transform:translateX(-50%);font-size:clamp(20px,3vw,34px);color:#ffe392;text-shadow:0 0 8px #fff0b4,0 0 24px #e3a72d;z-index:9;animation:starTwinkle 2.6s ease-in-out infinite}
        .code-crown{position:absolute;top:0;left:50%;width:min(31vw,335px);transform:translateX(-50%);z-index:7;filter:drop-shadow(0 8px 9px rgba(0,0,0,.68)) drop-shadow(0 0 12px rgba(238,190,70,.24));animation:crownFloat 5.4s ease-in-out infinite}
        .crest-shell{position:relative;z-index:5;width:min(31vw,360px);height:min(31vw,360px);max-height:36vh;display:flex;align-items:center;justify-content:center;padding:2%;border-radius:45% 45% 52% 52%;background:radial-gradient(circle at 50% 25%,rgba(35,78,138,.33),rgba(4,13,31,.25) 55%,rgba(0,0,0,.15));filter:drop-shadow(0 14px 18px rgba(0,0,0,.72))}.crest-image{max-width:100%;max-height:100%;object-fit:contain;filter:saturate(1.08) brightness(1.08) drop-shadow(0 0 12px rgba(235,188,65,.24));animation:crestFloat 5s ease-in-out infinite}
        .lion{position:absolute;z-index:4;top:25%;width:min(15vw,185px);height:59%;filter:drop-shadow(0 8px 9px rgba(0,0,0,.58))}.lion-left{left:1%}.lion-right{right:1%;transform:scaleX(-1)}
        .crest-ribbon{position:absolute;z-index:8;bottom:3%;left:50%;transform:translateX(-50%);min-width:45%;padding:7px 28px;color:#f5d477;font-size:clamp(10px,1.45vw,19px);letter-spacing:.12em;background:linear-gradient(#082054,#051534);border:2px solid #b47a19;border-radius:50% 50% 12px 12px;box-shadow:0 5px 12px rgba(0,0,0,.62),inset 0 0 12px rgba(227,177,56,.12)}.crest-ribbon span{font-size:.65em;color:#d2a53b}
        .oath{font-size:clamp(9px,1.2vw,17px);letter-spacing:.14em;color:#f0d27d;text-shadow:0 2px 10px #000;margin-top:.6vh}.oath em{font-style:normal;color:#c99128;margin:0 .55em}
        .welcome-content h1{margin:.6vh 0 0;font-family:'Cinzel Decorative',Cinzel,Georgia,serif;font-size:clamp(38px,7.1vw,102px);line-height:.95;letter-spacing:.025em;font-weight:800;background:linear-gradient(180deg,#fff1a9 0%,#e5b841 28%,#fff0a1 50%,#9f6610 78%,#f0c452 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 5px 20px rgba(0,0,0,.62);filter:drop-shadow(0 0 12px rgba(229,173,47,.18));animation:titleGlow 4.8s ease-in-out infinite}
        .title-ornament{display:flex;align-items:center;gap:14px;width:min(58vw,720px);margin:1.2vh 0}.title-ornament span{height:1px;flex:1;background:linear-gradient(90deg,transparent,#c78e25)}.title-ornament span:last-child{transform:scaleX(-1)}.title-ornament b{font-weight:400;color:#e6b94d;letter-spacing:.5em;font-size:clamp(9px,1.1vw,14px)}
        .tagline{margin:0;font-size:clamp(10px,1.2vw,16px);letter-spacing:.12em;color:#f3dfaa;text-shadow:0 2px 10px #000}
        .enter-realm{position:relative;margin-top:2.1vh;width:min(46vw,560px);min-width:250px;padding:16px 46px;border:1px solid #b8821f;clip-path:polygon(5% 0,95% 0,100% 28%,100% 72%,95% 100%,5% 100%,0 72%,0 28%);background:linear-gradient(180deg,#0d285b,#071b43 48%,#06142f);color:#f8d879;font-family:Cinzel,Georgia,serif;font-size:clamp(12px,1.5vw,19px);letter-spacing:.12em;box-shadow:0 0 0 1px rgba(255,226,142,.16),0 12px 30px rgba(0,0,0,.58),0 0 28px rgba(214,159,38,.18),inset 0 0 20px rgba(215,165,48,.08);cursor:pointer;overflow:hidden;transition:transform .22s ease,filter .22s ease,box-shadow .22s ease}.enter-realm:before{content:'';position:absolute;top:-70%;left:-30%;width:22%;height:240%;background:linear-gradient(100deg,transparent,rgba(255,242,193,.64),transparent);transform:rotate(13deg);animation:buttonSheen 3.8s ease-in-out 1.8s infinite}.enter-realm:after{content:'';position:absolute;inset:4px;border:1px solid rgba(240,197,87,.28);clip-path:inherit}.enter-realm:hover{transform:translateY(-3px) scale(1.025);filter:brightness(1.08);box-shadow:0 0 0 1px rgba(255,226,142,.24),0 16px 35px rgba(0,0,0,.62),0 0 36px rgba(221,169,48,.32),inset 0 0 28px rgba(215,165,48,.12)}.button-text{position:relative;z-index:3}.ornament{position:absolute;top:50%;transform:translateY(-50%) rotate(45deg);z-index:3;color:#d8a939;font-size:11px}.ornament-left{left:8%}.ornament-right{right:8%}
        .portal-footer{margin-top:1.7vh;font-size:clamp(8px,.9vw,12px);letter-spacing:.28em;color:rgba(242,216,154,.62)}.portal-footer span{margin:0 .8em;color:#c48c25}
        .portal-flare{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 42%,rgba(255,245,202,.88),rgba(225,176,58,.24) 30%,transparent 67%)}
        .is-opening .welcome-content{animation:contentLaunch 1.35s cubic-bezier(.16,1,.3,1) forwards}.is-opening .portal-flare{animation:portalFlash 1.2s ease-out forwards}.is-opening .castle-bg{animation:castleOpen 1.35s ease-out forwards}.is-opening .royal-frame,.is-opening .side-banner,.is-opening .column,.is-opening .brazier{animation:peripheralFade 1.1s ease forwards}
        @keyframes castleBreath{from{transform:scale(1.03)}to{transform:scale(1.09) translate3d(-.7%,-.5%,0)}}
        @keyframes lightSweep{from{transform:translateX(-8%) rotate(13deg);opacity:.14}to{transform:translateX(18%) rotate(13deg);opacity:.3}}
        @keyframes lightSweep2{from{transform:translateX(12%) rotate(-14deg);opacity:.12}to{transform:translateX(-15%) rotate(-14deg);opacity:.26}}
        @keyframes fireA{to{transform:translateX(-68%) rotate(-4deg) scaleY(1.14)}}@keyframes fireB{to{transform:translateX(-20%) scale(.7,1.12) rotate(5deg)}}
        @keyframes sparkRise{0%{transform:translateY(0) scale(.7);opacity:0}18%{opacity:.8}75%{opacity:.38}100%{transform:translate3d(24px,-105vh,0) scale(1.15);opacity:0}}
        @keyframes haloSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes haloSpinBack{to{transform:translate(-50%,-50%) rotate(-360deg)}}@keyframes haloPulse{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(.95)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}
        @keyframes starTwinkle{0%,100%{opacity:.5;transform:translateX(-50%) scale(.86)}50%{opacity:1;transform:translateX(-50%) scale(1.18)}}
        @keyframes crownFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}
        @keyframes crestFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes titleGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(229,173,47,.15))}50%{filter:drop-shadow(0 0 20px rgba(244,194,70,.34))}}
        @keyframes buttonSheen{0%,56%{left:-30%}84%,100%{left:120%}}
        @keyframes contentLaunch{0%{transform:translateY(-.5vh) scale(1);opacity:1}35%{transform:translateY(-1vh) scale(1.02);opacity:1}100%{transform:translateY(-3vh) scale(1.08);opacity:0}}
        @keyframes portalFlash{0%{opacity:0;transform:scale(.7)}18%{opacity:.62}50%{opacity:.2;transform:scale(1.07)}100%{opacity:0;transform:scale(1.25)}}
        @keyframes castleOpen{to{transform:scale(1.16);filter:brightness(1.1) saturate(1.04);opacity:.55}}
        @keyframes peripheralFade{to{opacity:0;filter:blur(3px)}}
        @media(max-width:900px){.column{width:15vw;min-width:90px}.side-banner{display:none}.brazier{transform:scale(.78)}.brazier-left{left:1%}.brazier-right{right:1%}.crest-stage{width:82vw;height:42vh}.code-crown{width:min(48vw,300px)}.lion{width:min(23vw,145px);height:54%;top:28%}.lion-left{left:2%}.lion-right{right:2%}.crest-shell{width:min(46vw,300px);height:min(46vw,300px);max-height:31vh}.crest-ribbon{min-width:56%;padding:6px 20px}.royal-carpet{width:74vw}.welcome-content h1{font-size:clamp(34px,10vw,70px)}.title-ornament{width:76vw}.enter-realm{width:min(72vw,480px)}}
        @media(max-width:560px){.column{opacity:.5;min-width:70px}.brazier{display:none}.royal-frame{inset:8px}.welcome-content{padding:1vh 18px 2vh}.crest-stage{height:39vh;width:92vw;margin-bottom:-.5vh}.code-crown{width:min(58vw,250px)}.lion{width:min(25vw,110px);height:50%;top:31%}.lion-left{left:4%}.lion-right{right:4%}.crest-shell{width:min(55vw,240px);height:min(55vw,240px);max-height:27vh}.crest-ribbon{bottom:4%;min-width:62%;font-size:10px}.oath{font-size:8px;letter-spacing:.09em}.oath em{margin:0 .28em}.welcome-content h1{font-size:clamp(34px,11vw,58px);letter-spacing:.015em}.tagline{max-width:88vw;line-height:1.5}.enter-realm{width:78vw;min-width:0;padding:14px 30px}.portal-footer{font-size:7px;letter-spacing:.2em}.royal-carpet{width:92vw;opacity:.85}}
        @media(max-height:700px){.crest-stage{height:34vh}.code-crown{width:min(28vw,245px)}.crest-shell{max-height:27vh}.enter-realm{margin-top:1.2vh;padding-top:12px;padding-bottom:12px}.portal-footer{margin-top:1vh}.title-ornament{margin:.7vh 0}}
        @media(prefers-reduced-motion:reduce){.castle-bg,.parallax-light,.brazier i,.brazier b,.spark-field i,.halo,.starburst,.code-crown,.crest-image,.welcome-content h1,.enter-realm:before{animation:none!important}.is-opening .welcome-content,.is-opening .portal-flare,.is-opening .castle-bg,.is-opening .royal-frame,.is-opening .side-banner,.is-opening .column,.is-opening .brazier{animation:none!important}.is-opening{opacity:0;transition:opacity .5s ease}}
      `}</style>
    </section>
  )
}
