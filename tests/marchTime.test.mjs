// Regression tests for War Room march times.
//
// The bug these pin: a march time typed as "0:69" parsed to 69 seconds -- every
// calculation built on it was right -- but it was stored and displayed back
// verbatim, so the firing order read "march 0:69" next to a name the caller was
// about to say out loud. Correct maths, misreadable screen.

import test from 'node:test'
import assert from 'node:assert/strict'

import { parseMarchTime, formatMarchTime, normalizeMarchTime } from '../src/lib/marchTime.js'

test('overflowing seconds carry into minutes on display', () => {
  // The reported case, and the reason this module exists.
  assert.equal(normalizeMarchTime('0:69'), '1:09')
  assert.equal(normalizeMarchTime('0:90'), '1:30')
  assert.equal(normalizeMarchTime('2:75'), '3:15')
})

test('normalising never changes what a march time MEANS', () => {
  // The display is allowed to change; the seconds behind it are not. This is
  // the invariant that makes tidying on blur safe -- a rally already built on
  // a value cannot be resynced by rewriting how it is shown.
  for (const typed of ['0:69', '69', '1:09', '1:9', '0:00', '', '0', '12:34', '90', 'abc', '  2:05  ']) {
    assert.equal(parseMarchTime(normalizeMarchTime(typed)), parseMarchTime(typed), `typed ${JSON.stringify(typed)}`)
  }
})

test('a bare number is read as seconds', () => {
  assert.equal(parseMarchTime('69'), 69)
  assert.equal(normalizeMarchTime('69'), '1:09')
  assert.equal(normalizeMarchTime('45'), '0:45')
})

test('seconds are always two digits, minutes never padded', () => {
  assert.equal(formatMarchTime(9), '0:09')
  assert.equal(formatMarchTime(69), '1:09')
  assert.equal(formatMarchTime(600), '10:00')
  assert.equal(formatMarchTime(3700), '61:40')
})

test('nothing typeable produces NaN, a negative, or a throw', () => {
  for (const junk of ['', '   ', 'abc', ':', '::', '-5', '-1:-30', null, undefined, ':30', '5:']) {
    const secs = parseMarchTime(junk)
    assert.ok(Number.isFinite(secs) && secs >= 0, `parse ${JSON.stringify(junk)} -> ${secs}`)
    assert.match(normalizeMarchTime(junk), /^\d+:[0-5]\d$/, `format ${JSON.stringify(junk)}`)
  }
})

test('an already-canonical value is left exactly alone', () => {
  // What stops the blur handler marking a roster unsaved for no reason.
  for (const good of ['0:00', '0:45', '1:09', '10:00', '61:40']) {
    assert.equal(normalizeMarchTime(good), good)
  }
})
