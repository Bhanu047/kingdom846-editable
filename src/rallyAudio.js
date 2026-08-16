let audioCtx = null
let lastCue = ''

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
  tone(freq, 0.14, 0.18, 'square')
}

function goBuzzer() {
  // Strong double buzzer so every GO is unmistakable.
  tone(980, 0.28, 0.28, 'sawtooth')
  tone(760, 0.34, 0.24, 'square', 0.12)
}

function inspectWarRoom() {
  if (window.location.hash !== '#/war-room') {
    lastCue = ''
    return
  }

  const nowCalling = [...document.querySelectorAll('div')]
    .find((el) => el.textContent?.trim() === 'Now Calling')
  if (!nowCalling) {
    lastCue = ''
    return
  }

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

  if (!cue) {
    lastCue = ''
    return
  }
  if (cue === lastCue) return
  lastCue = cue

  if (cueType === 'go') goBuzzer()
  else countdownBeep(cueType)
}

// A user gesture unlocks browser audio before the countdown begins.
for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
  window.addEventListener(eventName, ensureAudio, { passive: true })
}

const observer = new MutationObserver(inspectWarRoom)
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
window.addEventListener('hashchange', () => {
  lastCue = ''
  setTimeout(inspectWarRoom, 0)
})
