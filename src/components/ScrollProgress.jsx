import { useEffect, useRef } from 'react'
import { installScrollProgress } from '../lib/motion'

/**
 * The gilt filament along the top of the page, showing how far down you are.
 *
 * It measured `main` before, which is the flex column carrying overflow-hidden:
 * its scrollTop is always 0 and its scrollHeight always equals its clientHeight,
 * so the bar sat at 0% for every visitor since it was written. The app scrolls
 * an inner pane, and installScrollProgress reads that one.
 */
export default function ScrollProgress() {
  const bar = useRef(null)
  useEffect(() => installScrollProgress(bar.current), [])
  return <div ref={bar} className="k846-scroll-progress" data-html2canvas-ignore="true" aria-hidden="true" />
}
