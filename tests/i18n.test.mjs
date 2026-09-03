/* The kingdom's own writing, in Turkish and Chinese.
 *
 * A missing translation does not throw and does not look broken — it quietly
 * shows English, which is exactly the failure nobody reports. These pin the
 * things that would go wrong silently: a guide added to kingdom.js and never
 * translated, a paragraph dropped from one language, a UI string that exists
 * in English and nowhere else, and a category with no label.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { guides } from '../src/data/kingdom.js'
import { guideTranslations, localizeGuide } from '../src/data/guides.i18n.js'
import {
  LANGUAGES, LANGUAGE_CODES, detectLanguage, t, categoryLabel, readLabel,
  _STRINGS, _CATEGORIES,
} from '../src/lib/i18n.js'

const TRANSLATED = ['tr', 'zh']

test('every guide the kingdom wrote exists in every language it offers', () => {
  for (const lang of TRANSLATED) {
    for (const guide of guides) {
      const tr = guideTranslations[lang][guide.id]
      assert.ok(tr, `${guide.id} has no ${lang} translation`)
      assert.ok(tr.title?.trim(), `${guide.id} (${lang}) has no title`)
      assert.ok(tr.excerpt?.trim(), `${guide.id} (${lang}) has no excerpt`)
    }
  }
})

test('no translation carries a guide the English no longer has', () => {
  const ids = new Set(guides.map((g) => g.id))
  for (const lang of TRANSLATED) {
    for (const id of Object.keys(guideTranslations[lang])) {
      assert.ok(ids.has(id), `${lang} translates "${id}", which is not a guide any more`)
    }
  }
})

test('a translated guide keeps every paragraph of the original', () => {
  for (const guide of guides) {
    const expected = guide.body.split('\n\n').filter(Boolean).length
    for (const lang of TRANSLATED) {
      const got = guideTranslations[lang][guide.id].body.filter((p) => p.trim()).length
      assert.equal(got, expected, `${guide.id} (${lang}) has ${got} paragraphs, English has ${expected}`)
    }
  }
})

test('localizeGuide swaps the writing and leaves the artwork alone', () => {
  const bear = guides.find((g) => g.id === 'bear-trap')
  const tr = localizeGuide(bear, 'tr')
  assert.equal(tr.title, 'Ayı Avı Rally Rehberi')
  assert.equal(tr.art, bear.art)
  assert.equal(tr.artPosition, bear.artPosition)   // the bear's face, hard-won
  assert.equal(tr.translated, true)
  assert.equal(tr.body.split('\n\n').length, bear.body.split('\n\n').length)
})

test('an untranslated guide falls back to English rather than to nothing', () => {
  const invented = { id: 'not-a-guide', title: 'Something New', excerpt: 'x', body: 'y' }
  assert.deepEqual(localizeGuide(invented, 'zh'), invented)
  // English asks for no translation at all.
  const bear = guides.find((g) => g.id === 'bear-trap')
  assert.equal(localizeGuide(bear, 'en').title, bear.title)
})

test('every UI string exists in every language', () => {
  const keys = Object.keys(_STRINGS.en)
  for (const lang of LANGUAGE_CODES) {
    for (const key of keys) {
      assert.ok(_STRINGS[lang][key]?.trim(), `"${key}" is missing in ${lang}`)
    }
    // And nothing translated that English does not define — a stray key is a
    // typo that would never show up on the page.
    for (const key of Object.keys(_STRINGS[lang])) {
      assert.ok(keys.includes(key), `${lang} defines "${key}", which English does not`)
    }
  }
})

test('every category on the guides page has a label in every language', () => {
  const used = new Set(guides.map((g) => g.category))
  // The categories the wiki sync assigns, from server/index.cjs GUIDE_ART.
  for (const c of ['Beginner', 'Heroes', 'Combat', 'Economy', 'Events', 'Strategy']) used.add(c)
  for (const lang of TRANSLATED) {
    for (const c of used) {
      assert.ok(_CATEGORIES[lang][c], `category "${c}" has no ${lang} label`)
      assert.equal(categoryLabel(c, lang), _CATEGORIES[lang][c])
    }
  }
  // An unknown one shows its English name rather than an empty chip.
  assert.equal(categoryLabel('Siegecraft', 'tr'), 'Siegecraft')
  assert.equal(categoryLabel('', 'tr'), '')
})

test('the browser picks the language when the reader has not', () => {
  assert.equal(detectLanguage(['tr-TR', 'en-GB']), 'tr')
  assert.equal(detectLanguage(['zh-Hans-CN']), 'zh')
  assert.equal(detectLanguage(['en-US']), 'en')
  // A language 846 does not speak falls through to the next one it does.
  assert.equal(detectLanguage(['de-DE', 'zh-TW']), 'zh')
  assert.equal(detectLanguage(['ja-JP']), 'en')
  assert.equal(detectLanguage([]), 'en')
  assert.equal(detectLanguage(undefined), 'en')
})

test('read time reads naturally in each language', () => {
  assert.equal(readLabel('6 min', 'en'), '6 min read')
  assert.equal(readLabel('6 min', 'tr'), '6 dk okuma')
  assert.equal(readLabel('6 min', 'zh'), '阅读约 6 分钟')
  // The wiki rows sometimes have nothing at all.
  assert.equal(readLabel(undefined, 'en'), '5 min read')
})

test('the picker names each language in that language', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.native), ['English', 'Türkçe', '中文'])
  assert.equal(t('langLabel', 'zh'), '语言')
  // An unknown key returns itself rather than blanking the label.
  assert.equal(t('no-such-key', 'tr'), 'no-such-key')
})
