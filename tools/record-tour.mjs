/**
 * Record a guided tour of the portal as video.
 *
 * Drives a real browser through every public screen, scrolling each one at a
 * readable pace, and records the whole thing. The point is that this is the
 * actual site -- not a mockup, not a generated impression of one. No video
 * model can show a real interface; a browser can.
 *
 * Needs the built site served locally:
 *   npm run build
 *   NODE_ENV=production PORT=5099 SESSION_SECRET=x DB_PATH=/tmp/t.db node server/index.cjs
 *   node tools/record-tour.mjs
 *
 * Output: dist-video/tour/*.webm  (convert and stitch with make-promo.sh)
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const BASE = process.env.TOUR_BASE || 'http://127.0.0.1:5099'
const OUT = 'dist-video/tour'
const W = 1920, H = 1080

// Each stop: path, how long to dwell, and how far to scroll (0 = stay put).
const STOPS = [
  { path: '/',           dwell: 5200, scroll: 0.70, label: 'Home — crown, status, rankings' },
  { path: '/about',      dwell: 5200, scroll: 0.75, label: 'About — Atlas standing & KvK record' },
  { path: '/alliances',  dwell: 4600, scroll: 0.65, label: 'Alliances' },
  { path: '/events',     dwell: 4400, scroll: 0.60, label: 'Events & countdowns' },
  { path: '/timeline',   dwell: 4400, scroll: 0.65, label: 'Kingdom timeline' },
  { path: '/rankings',   dwell: 3800, scroll: 0.55, label: 'Rankings' },
  { path: '/guides',     dwell: 3800, scroll: 0.55, label: 'Guides' },
  { path: '/battle-lab', dwell: 4200, scroll: 0.50, label: 'Battle Lab' },
  { path: '/transfer',   dwell: 3600, scroll: 0.50, label: 'Transfer' },
]

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
})

for (const stop of STOPS) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: OUT, size: { width: W, height: H } },
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  await page.goto(BASE + stop.path, { waitUntil: 'networkidle' }).catch(() => {})

  // The splash screen holds the first paint for about 1.3s; let it finish and
  // let the entrance animations settle before anything is recorded as "the
  // page".
  await page.waitForTimeout(2600)

  // Dismiss anything sitting over the top -- install prompt, birthday toast --
  // so the tour shows the screen rather than a dialog.
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(300)

  if (stop.scroll > 0) {
    // Smooth, linear scroll of whichever element actually scrolls. The app
    // scrolls an inner container, not the window, so find the tallest
    // overflowing element rather than assuming.
    await page.evaluate(async (frac) => {
      const scroller = [...document.querySelectorAll('*')]
        .filter((el) => {
          const s = getComputedStyle(el)
          return /auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 80
        })
        .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0]
        || document.scrollingElement
      const max = scroller.scrollHeight - scroller.clientHeight
      const target = max * frac
      const steps = 90
      for (let i = 1; i <= steps; i++) {
        scroller.scrollTop = target * (i / steps)
        await new Promise((r) => requestAnimationFrame(r))
      }
    }, stop.scroll)
  }

  await page.waitForTimeout(stop.dwell)
  const video = page.video()
  await ctx.close()                       // flushes the file
  const src = await video.path()
  const name = (stop.path === '/' ? 'home' : stop.path.replace(/\//g, '')) + '.webm'
  fs.renameSync(src, `${OUT}/${name}`)
  console.log(`${name.padEnd(16)} ${stop.label}`)
}

await browser.close()
console.log('\nrecorded', STOPS.length, 'screens into', OUT)
