import { useSyncExternalStore } from 'react'

/* Reading language for the kingdom's own writing.
 *
 * 846 is a mixed kingdom and its own roster says so: [KzK] is listed as English
 * & Turkish, [ICE] as English & Chinese. Those two, plus English, are the
 * languages this covers — not a guess at what a game audience might speak, but
 * the languages the alliances themselves declare.
 *
 * Scope is deliberate. What is translated is the writing that belongs to the
 * kingdom: its guides and its rules, the pages a new arrival has to read to know
 * how 846 plays. The rest of the portal is live data — power figures, dates,
 * names — which reads the same in any language, and half-translating chrome
 * around it would only make the page look broken. When a language is picked, the
 * guides page says plainly what is and is not translated.
 *
 * The choice lives on the device rather than the account, because most readers
 * never sign in.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
  { code: 'zh', label: 'Chinese', native: '中文' },
]

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

const STORAGE_KEY = 'k846.lang'

/** The first supported language the browser asks for, or English. */
export function detectLanguage(tags) {
  const list = tags && tags.length ? tags : []
  for (const tag of list) {
    const base = String(tag).toLowerCase().split('-')[0]
    if (LANGUAGE_CODES.includes(base)) return base
  }
  return 'en'
}

function read() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LANGUAGE_CODES.includes(saved)) return saved
  } catch { /* private mode, or storage disabled */ }
  try {
    return detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
  } catch { return 'en' }
}

let current = typeof window === 'undefined' ? 'en' : read()
const listeners = new Set()

export function getLanguage() { return current }

export function setLanguage(code) {
  if (!LANGUAGE_CODES.includes(code) || code === current) return
  current = code
  try { localStorage.setItem(STORAGE_KEY, code) } catch { /* nothing to do */ }
  // Screen readers and the browser's own font picking both go by this, and a
  // page of Chinese labelled lang="en" is read out character by character.
  if (typeof document !== 'undefined') document.documentElement.lang = code
  listeners.forEach((fn) => fn())
}

function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }

/** Stamp <html lang> once at boot, before React renders anything. */
export function installLanguage() {
  if (typeof document !== 'undefined') document.documentElement.lang = current
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, () => 'en')
}

/* UI strings for the parts of the portal that sit around translated writing.
 * English is the fallback for anything missing, so a key added here without its
 * translations degrades to English rather than to a blank label.
 */
const STRINGS = {
  en: {
    guidesEyebrow: 'Knowledge Base',
    guidesTitle: 'Strategy & Guides',
    guidesSubtitle: "The kingdom's own rules and playbooks, plus the wider Kingshot library.",
    ownTitle: 'Written by the Kingdom',
    ownNote: 'Our own rules and playbooks. These are the ones that decide how 846 actually plays.',
    libraryTitle: 'The Wider Library',
    libraryNote: 'Guides collected from across the Kingshot community. These open on English-language sites.',
    readFull: 'Read Full Guide',
    minRead: 'min read',
    empty: 'No guides available yet.',
    langLabel: 'Language',
    langScope: 'The kingdom’s guides and rules are translated. Live figures, names and the rest of the portal stay in English.',
    settingsLangTitle: 'Reading Language',
    settingsLangDesc: "Which language the kingdom's guides and rules are shown in. Saved on this device, so a phone and a laptop can differ.",
    catAll: 'All',
  },
  tr: {
    guidesEyebrow: 'Bilgi Bankası',
    guidesTitle: 'Strateji ve Rehberler',
    guidesSubtitle: 'Krallığın kendi kuralları ve oyun planları, ayrıca geniş Kingshot kütüphanesi.',
    ownTitle: 'Krallığın Kendi Yazdıkları',
    ownNote: "Kendi kurallarımız ve oyun planlarımız. 846'nın nasıl oynadığını asıl bunlar belirler.",
    libraryTitle: 'Geniş Kütüphane',
    libraryNote: 'Kingshot topluluğundan derlenen rehberler. Bunlar İngilizce sitelerde açılır.',
    readFull: 'Rehberin Tamamını Oku',
    minRead: 'dk okuma',
    empty: 'Henüz rehber yok.',
    langLabel: 'Dil',
    langScope: 'Krallığın rehberleri ve kuralları çevrildi. Canlı veriler, isimler ve portalın geri kalanı İngilizce kalır.',
    settingsLangTitle: 'Okuma Dili',
    settingsLangDesc: 'Krallığın rehberleri ve kuralları hangi dilde gösterilsin. Bu cihazda saklanır; telefonunuz ve bilgisayarınız farklı olabilir.',
    catAll: 'Tümü',
  },
  zh: {
    guidesEyebrow: '知识库',
    guidesTitle: '策略与指南',
    guidesSubtitle: '王国自己的规则和打法，加上更广的 Kingshot 资料库。',
    ownTitle: '王国自己写的',
    ownNote: '我们自己的规则和打法。846 到底怎么打，看的就是这些。',
    libraryTitle: '更广的资料库',
    libraryNote: '从 Kingshot 社区收集的指南。这些链接会跳转到英文网站。',
    readFull: '阅读完整指南',
    minRead: '分钟阅读',
    empty: '暂时还没有指南。',
    langLabel: '语言',
    langScope: '王国的指南和规则已翻译。实时数据、名称以及网站其余部分仍为英文。',
    settingsLangTitle: '阅读语言',
    settingsLangDesc: '王国的指南和规则用哪种语言显示。设置保存在本设备上，手机和电脑可以不同。',
    catAll: '全部',
  },
}

/* Guide categories. Both sets are here: the kingdom's own (Strategy, Diplomacy,
 * PvE, PvP, Kingdom, Combat) and the ones the wiki sync assigns (Beginner,
 * Heroes, Economy, Events). An unknown category falls through to itself, so a
 * new one from the sync shows its English name rather than nothing.
 */
const CATEGORIES = {
  tr: {
    Strategy: 'Strateji', Diplomacy: 'Diplomasi', PvE: 'PvE', PvP: 'PvP',
    Kingdom: 'Krallık', Combat: 'Savaş', Beginner: 'Yeni Başlayan',
    Heroes: 'Kahramanlar', Economy: 'Ekonomi', Events: 'Etkinlikler',
  },
  zh: {
    Strategy: '策略', Diplomacy: '外交', PvE: 'PvE', PvP: 'PvP',
    Kingdom: '王国', Combat: '战斗', Beginner: '新手',
    Heroes: '英雄', Economy: '经济', Events: '活动',
  },
}

export function t(key, lang = current) {
  const table = STRINGS[lang] || STRINGS.en
  return table[key] ?? STRINGS.en[key] ?? key
}

export function categoryLabel(category, lang = current) {
  if (!category) return ''
  return CATEGORIES[lang]?.[category] || category
}

/** '6 min' → '6 min read' / '6 dk okuma' / '阅读约 6 分钟'. */
export function readLabel(read, lang = current) {
  const minutes = String(read || '').match(/\d+/)?.[0] || '5'
  if (lang === 'zh') return `阅读约 ${minutes} 分钟`
  return `${minutes} ${t('minRead', lang)}`
}

export { STRINGS as _STRINGS, CATEGORIES as _CATEGORIES }
