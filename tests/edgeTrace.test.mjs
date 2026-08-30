// Regression tests for the War Room's approach trace.
//
// The trace is an SVG dash animation: `strokeDasharray` is set to the path's
// length and `strokeDashoffset` walks it from that length down to zero. The
// entire illusion rests on edgeGeometry() reporting the path's TRUE length.
// Get it wrong and nothing throws -- the dash pattern simply wraps, lighting
// two disconnected stretches of border at once, which still looks like a
// countdown and is not one. That is exactly what the first implementation did
// (a `<rect pathLength="100">`, which Chromium ignores), and it was caught by
// eye rather than by a test. These tests are the eye.

import test from 'node:test'
import assert from 'node:assert/strict'

import { edgeGeometry, EDGE_R, EDGE_INSET } from '../src/lib/edgeTrace.js'

/**
 * Measures a path by walking its commands, INDEPENDENTLY of the closed form
 * edgeGeometry() uses. Only the shapes the generator emits are handled: H, V
 * and quarter-circle A. Anything else is a test failure, not a silent zero --
 * a generator that started emitting curves would otherwise measure short.
 */
function walk(d) {
  const tokens = d.trim().split(/\s+/)
  let i = 0, x = 0, y = 0, total = 0, first = null
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    const cmd = tokens[i++]
    if (cmd === 'M') { x = num(); y = num(); first = first ?? [x, y] }
    else if (cmd === 'H') { const nx = num(); total += Math.abs(nx - x); x = nx }
    else if (cmd === 'V') { const ny = num(); total += Math.abs(ny - y); y = ny }
    else if (cmd === 'A') {
      const rx = num(), ry = num()
      num(); num(); num() // rotation, large-arc, sweep
      const nx = num(), ny = num()
      assert.equal(rx, ry, 'arcs must be circular')
      const chord = Math.hypot(nx - x, ny - y)
      assert.ok(Math.abs(chord - rx * Math.SQRT2) < 1e-9, 'arcs must be quarter circles')
      total += (Math.PI * rx) / 2
      x = nx; y = ny
    } else assert.fail(`unhandled path command ${cmd}`)
  }
  return { length: total, start: first, end: [x, y] }
}

const measure = (d) => walk(d).length

test('reported length is the path length the browser will measure', () => {
  for (const [w, h] of [[406, 314], [404, 312], [406, 268], [320, 500], [1200, 240], [200, 200]]) {
    const { arms, length } = edgeGeometry(w, h)
    for (const d of arms) {
      assert.ok(Math.abs(measure(d) - length) < 1e-6, `${w}x${h}: reported ${length}, walked ${measure(d)}`)
    }
  }
})

test('the two arms are the same length, so the gap stays centred', () => {
  const { arms } = edgeGeometry(406, 314)
  assert.ok(Math.abs(measure(arms[0]) - measure(arms[1])) < 1e-9)
})

test('both arms run top centre to bottom centre, down opposite flanks', () => {
  const w = 406, h = 314
  const { arms } = edgeGeometry(w, h)
  const cx = w / 2
  for (const d of arms) {
    const { start, end } = walk(d)
    assert.deepEqual(start, [cx, EDGE_INSET])
    assert.deepEqual(end, [cx, h - EDGE_INSET])
  }
  // The first horizontal target after the move is the corner each arm turns
  // at; one must be right of centre and the other left.
  const corner = (d) => Number(d.trim().split(/\s+/)[4])
  assert.ok(corner(arms[0]) > cx && corner(arms[1]) < cx)
})

test('the two arms together are exactly one lap of the panel', () => {
  // Independent closed form for a rounded rectangle's perimeter. If this and
  // edgeGeometry ever disagree, one of them has the corner maths wrong.
  const w = 406, h = 314
  const iw = w - 2 * EDGE_INSET, ih = h - 2 * EDGE_INSET
  const lap = 2 * (iw - 2 * EDGE_R) + 2 * (ih - 2 * EDGE_R) + 2 * Math.PI * EDGE_R
  assert.ok(Math.abs(edgeGeometry(w, h).length * 2 - lap) < 1e-9)
})

test('a panel too small for the corner radius still closes', () => {
  // The radius is clamped rather than left to overrun, which would produce
  // arcs that cross and a length longer than the shape.
  for (const [w, h] of [[20, 300], [300, 20], [8, 8], [2.5, 2.5]]) {
    const { arms, length } = edgeGeometry(w, h)
    assert.ok(Number.isFinite(length) && length >= 0)
    for (const d of arms) assert.ok(Math.abs(measure(d) - length) < 1e-6, `${w}x${h}`)
  }
})

test('length matches what Chromium measured on the real panel', () => {
  // Golden, read back from path.getTotalLength() in a headless run of the War
  // Room at a 430px viewport: the call panel measured 404x312 in STANDBY and
  // each arm came back as 699.847 user units.
  assert.ok(Math.abs(edgeGeometry(404, 312).length - 699.847) < 0.01)
})
