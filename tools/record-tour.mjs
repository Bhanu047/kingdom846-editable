/**
 * Record a guided tour of the portal as one continuous video.
 *
 * The site is filmed rather than described: no video model can render a real
 * interface, so a browser drives the real one.
 *
 * Two things about this site shape the script.
 *
 * The front door is an iframe -- /royal-welcome-2/ -- and its ENTER THE REALM
 * button only becomes clickable after roughly half a minute of animation. It
 * is also letter-spaced, so its textContent reads "E N T E R  T H E  R E A L M"
 * and no ordinary text selector matches it; whitespace is stripped before
 * comparing.
 *
 * And the entrance is paid for once per session, so the tour runs in a single
 * context and moves between screens the way the app does -- pushState plus a
 * popstate event, which is exactly what its own router listens for. Nine
 * separate page loads would mean nine trips through the front door.
 *
 * Writes dist-video/tour/tour.webm and segments.json, which records where each
 * screen begins so the cut does not have to guess.
 *
 *   npm run build && node server/index.cjs   (production, on TOUR_BASE)
 *   node tools/record-tour.mjs
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const BASE = process.env.TOUR_BASE || 'http://127.0.0.1:5099'
const OUT = 'dist-video/tour'
const W = 1920, H = 1080

const STOPS = [
  { path: '/',           hold: 10080, scroll: 0.55 },
  { path: '/about',      hold: 11040, scroll: 0.70 },
  { path: '/alliances',  hold: 10080, scroll: 0.60 },
  { path: '/events',     hold: 10080, scroll: 0.55 },
  { path: '/timeline',   hold: 10080, scroll: 0.60 },
  { path: '/rankings',   hold: 9120, scroll: 0.50 },
  { path: '/guides',     hold: 9120, scroll: 0.50 },
  { path: '/battle-lab', hold: 10080, scroll: 0.45 },
  { path: '/transfer',   hold: 9120, scroll: 0.45 },
]

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
})
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT, size: { width: W, height: H } },
})
const page = await ctx.newPage()
const t0 = Date.now()
const at = () => (Date.now() - t0) / 1000

// domcontentloaded, not networkidle: the portal polls, so the network never
// goes idle and the wait simply burns its timeout.
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })

// --- through the front door ------------------------------------------------
const welcome = async () => page.frames().find((f) => /royal-welcome/.test(f.url()))
const clickIn = async (frame, pattern) => frame.evaluate((p) => {
  const rx = new RegExp(p, 'i')
  const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()
  const el = [...document.querySelectorAll('button,a')].find((e) => rx.test(norm(e.textContent)) && e.offsetParent)
  if (!el) return null
  el.click()
  return el.textContent.replace(/\s+/g, ' ').trim()
}, pattern).catch(() => null)

let fr = null
for (let i = 0; i < 40 && !fr; i++) { fr = await welcome(); if (!fr) await page.waitForTimeout(250) }
if (fr) {
  for (let i = 0; i < 20; i++) { if (await clickIn(fr, 'skipintro')) break; await page.waitForTimeout(400) }
  for (let i = 0; i < 90; i++) {
    if (await clickIn(fr, 'enter.*realm')) { console.log(`entered at ${at().toFixed(1)}s`); break }
    await page.waitForTimeout(500)
  }
  for (let i = 0; i < 30 && await welcome(); i++) await page.waitForTimeout(300)
}
await page.waitForTimeout(2500)   // let the portal's entrance animations settle

// --- the tour --------------------------------------------------------------
const segments = []
for (const stop of STOPS) {
  // The app's router listens for popstate, so this is its own navigation path
  // rather than a reload -- which would send us back through the front door.
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, stop.path)
  await page.waitForTimeout(1600)          // route swap + entrance animation

  const start = at()
  await page.evaluate(async (frac) => {
    const scroller = [...document.querySelectorAll('*')]
      .filter((el) => {
        const s = getComputedStyle(el)
        return /auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 80
      })
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
      || document.scrollingElement
    scroller.scrollTop = 0
    const target = (scroller.scrollHeight - scroller.clientHeight) * frac
    for (let i = 1; i <= 100; i++) {
      scroller.scrollTop = target * (i / 100)
      await new Promise((r) => requestAnimationFrame(r))
    }
  }, stop.scroll)
  await page.waitForTimeout(stop.hold)

  const name = stop.path === '/' ? 'home' : stop.path.replace(/\//g, '')
  segments.push({ name, start: +start.toFixed(2), end: +at().toFixed(2) })
  console.log(`  ${name.padEnd(12)} ${start.toFixed(1)}s -> ${at().toFixed(1)}s`)
}

const video = page.video()
await ctx.close()
fs.renameSync(await video.path(), `${OUT}/tour.webm`)
fs.writeFileSync(`${OUT}/segments.json`, JSON.stringify(segments, null, 2))
await browser.close()
console.log(`\n${OUT}/tour.webm  (${segments.length} screens, ${at().toFixed(0)}s)`)
