let audioCtx = null
let lastCue = ''
let pendingGoTimer = null
let pendingGoName = ''

function ensureAudio() {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return null
      audioCtx = new AudioContext()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function tone(freq, duration, volume = 0.18, type = 'square', delay = 0) {
  const ctx = ensureAudio()
  if (!ctx) return
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.03)
}

function countdownBeep(number) {
  const freq = number === '3' ? 520 : number === '2' ? 620 : 740
  tone(freq, 0.16, 0.2, 'square')
}

function goBuzzer() {
  // Loud, unmistakable triple-layer GO alarm.
  tone(1050, 0.48, 0.42, 'sawtooth')
  tone(780, 0.52, 0.36, 'square', 0.05)
  tone(1180, 0.34, 0.30, 'sawtooth', 0.30)
}

function scheduleGuaranteedGo(name) {
  if (pendingGoTimer) clearTimeout(pendingGoTimer)
  pendingGoName = name
  // The UI changes from 1 to GO about one second later. Scheduling from
  // the audible "1" guarantees the GO alarm even if the DOM transition
  // is too brief for MutationObserver on a device/browser.
  pendingGoTimer = setTimeout(() => {
    goBuzzer()
    lastCue = `${pendingGoName}:GO`
    pendingGoTimer = null
  }, 950)
}

function inspectWarRoom() {
  if (window.location.hash !== '#/war-room') {
    lastCue = ''
    if (pendingGoTimer) clearTimeout(pendingGoTimer)
    pendingGoTimer = null
    return
  }

  const nowCalling = [...document.querySelectorAll('div')]
    .find((el) => el.textContent?.trim() === 'Now Calling')
  if (!nowCalling) return

  const panel = nowCalling.closest('.panel') || nowCalling.parentElement?.parentElement
  if (!panel) return

  const text = panel.textContent || ''
  const nameNode = panel.querySelector('.font-display.text-4xl')
  const name = nameNode?.textContent?.trim() || 'unknown'

  let cue = ''
  let cueType = ''
  if (/\bGO\b/.test(text)) {
    cue = `${name}:GO`
    cueType = 'go'
  } else {
    const numberNode = [...panel.querySelectorAll('div')]
      .find((el) => ['3', '2', '1'].includes(el.textContent?.trim()))
    if (numberNode) {
      const number = numberNode.textContent.trim()
      cue = `${name}:${number}`
      cueType = number
    }
  }

  if (!cue || cue === lastCue) return
  lastCue = cue

  if (cueType === 'go') {
    // If the scheduled alarm already fired for this player, do not double-play.
    if (pendingGoTimer) {
      clearTimeout(pendingGoTimer)
      pendingGoTimer = null
      goBuzzer()
    }
  } else {
    countdownBeep(cueType)
    if (cueType === '1') scheduleGuaranteedGo(name)
  }
}

// User interaction unlocks Web Audio on browsers with autoplay restrictions.
for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(eventName, ensureAudio, { passive: true })
}

const observer = new MutationObserver(inspectWarRoom)
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
window.addEventListener('hashchange', () => {
  lastCue = ''
  if (pendingGoTimer) clearTimeout(pendingGoTimer)
  pendingGoTimer = null
  setTimeout(inspectWarRoom, 0)
})
