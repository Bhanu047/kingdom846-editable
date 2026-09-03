import { useState, useEffect, useRef } from 'react'
import { Panel, Pill, SectionTitle } from '../components/ui'
import { apiJson } from '../lib/api'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import LanguagePicker from '../components/LanguagePicker'
import { useLanguage, t, categoryLabel, readLabel } from '../lib/i18n'
import { guides as kingdomGuides } from '../data/kingdom'
import { localizeGuide } from '../data/guides.i18n'

/* Two kinds of guide sit on this page and they are not the same thing.
 *
 * The kingdom's own — the NAP rules, the KvK checklist, what happens when you
 * transfer in — are written here, are the rules 846 actually plays by, and are
 * the ones a new arrival has to read. They used to be in the data file and on
 * no page at all: this list only ever rendered the wiki sync, so six guides
 * the kingdom wrote for itself were invisible. They now lead the page, in full,
 * and they are what the Turkish and Chinese translations cover.
 *
 * The wiki library underneath is a hundred links to other people's sites. It is
 * useful and it stays, but it links out to English pages, so it is labelled as
 * such rather than translated into a promise the destination cannot keep.
 */
function GuideRow({ guide, open, onToggle, innerRef, lang, delay }) {
  const art = guide.art || './assets/guide-strategy.png'
  const paragraphs = open && guide.body ? guide.body.split('\n\n').filter(Boolean) : []
  return (
    <div ref={innerRef} className="stagger-in" style={{ animationDelay: delay }}>
      <button
        onClick={onToggle}
        className={`royal-plaque w-full flex items-center gap-3 text-left group ${open ? '!border-gold/50' : ''}`}
      >
        <div className="relative flex-shrink-0">
          <img
            src={art}
            alt=""
            style={guide.artPosition ? { objectPosition: guide.artPosition } : undefined}
            className="w-14 h-14 rounded-lg object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 rounded-lg ring-1 ring-gold/20" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate transition-colors ${open ? 'text-gold-bright' : 'text-parchment group-hover:text-gold-bright'}`}>{guide.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase tracking-wider text-gold/60 font-semibold">{categoryLabel(guide.category, lang)}</span>
            <span className="text-parchment/20">·</span>
            <span className="text-[10px] text-parchment/40">{readLabel(guide.read || guide.readTime, lang)}</span>
          </div>
        </div>
        <Icon name="arrow" size={14} className={`text-gold/30 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Inline expand — no popup, no scroll */}
      {open && (
        <div className="mt-1 mb-1 p-3 rounded-lg border border-gold/30 bg-ink-2/80 stagger-in space-y-3 gold-corners">
          <div className="relative h-24 rounded-lg overflow-hidden">
            <img src={art} alt="" style={guide.artPosition ? { objectPosition: guide.artPosition } : undefined} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-transparent to-transparent" />
            <Pill tone="blue">{categoryLabel(guide.category, lang)}</Pill>
          </div>
          <p className="text-sm text-parchment/60">{guide.excerpt}</p>
          {/* The body was written and then never shown. The wiki rows have none,
              so this stayed empty and nobody noticed; the kingdom's own have
              five to seven paragraphs each. */}
          {paragraphs.length > 0 && (
            <div className="space-y-2 border-t border-gold/10 pt-3">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-parchment/75">{p}</p>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            {guide.source && (
              <a href={guide.source} target="_blank" rel="noreferrer" className="btn-primary text-xs">
                <Icon name="arrow" size={12} /> {t('readFull', lang)}
              </a>
            )}
            <span className="text-xs text-parchment/40 flex items-center gap-1">
              <Icon name="book" size={12} /> {readLabel(guide.read, lang)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Guides() {
  const [activeId, setActiveId] = useState(null)
  const [synced, setSynced] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const activeRef = useRef(null)
  const lang = useLanguage()

  useEffect(() => {
    let cancelled = false
    apiJson('/api/kingshot').then((d) => { if (!cancelled) { setSynced(d); setLoading(false) } }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const own = kingdomGuides.map((g) => localizeGuide(g, lang))
  const allGuides = synced?.guides || []
  const categories = ['All', ...new Set(allGuides.map(g => g.category))].filter(Boolean)
  const filteredGuides = filter === 'All' ? allGuides : allGuides.filter(g => g.category === filter)

  // Scroll the expanded item into view smoothly
  useEffect(() => {
    if (activeId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeId])

  // Keyed by section as well as id: the wiki sync mints its own ids and one
  // colliding with a kingdom guide's would silently open both rows.
  const toggle = (key) => setActiveId((cur) => (cur === key ? null : key))

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t('guidesEyebrow', lang)}
        title={t('guidesTitle', lang)}
        subtitle={t('guidesSubtitle', lang)}
        art="./assets/hero-guides.webp"
      />

      <Panel className="p-4">
        <LanguagePicker />
      </Panel>

      <div className="royal-divider"><span className="royal-divider-icon">◆</span></div>

      {/* The kingdom's own writing */}
      <section>
        <SectionTitle eyebrow="Kingdom 846" title={t('ownTitle', lang)} />
        <p className="-mt-1 mb-3 text-xs leading-relaxed text-parchment/45">{t('ownNote', lang)}</p>
        <div className="space-y-2">
          {own.map((g, i) => (
            <GuideRow
              key={g.id}
              guide={g}
              lang={lang}
              open={activeId === `own:${g.id}`}
              onToggle={() => toggle(`own:${g.id}`)}
              innerRef={activeId === `own:${g.id}` ? activeRef : null}
              delay={`${Math.min(i * 0.03, 0.5)}s`}
            />
          ))}
        </div>
      </section>

      <div className="royal-divider"><span className="royal-divider-icon">◆</span></div>

      {/* The wider Kingshot library, synced from the wiki */}
      <section>
        <SectionTitle eyebrow="Kingshot" title={t('libraryTitle', lang)} />
        <p className="-mt-1 mb-3 text-xs leading-relaxed text-parchment/45">{t('libraryNote', lang)}</p>

        {categories.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === c ? 'bg-gold/20 text-gold-bright border border-gold/50' : 'bg-white/5 text-parchment/50 border border-gold/15 hover:text-parchment'}`}
              >
                {c === 'All' ? t('catAll', lang) : categoryLabel(c, lang)}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {loading && [1, 2, 3].map((i) => (
            <div key={i} className="panel p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
          {!loading && allGuides.length === 0 && (
            <Panel><p className="text-sm text-parchment/50 text-center py-4">{t('empty', lang)}</p></Panel>
          )}
          {filteredGuides.map((g, i) => (
            <GuideRow
              key={g.id}
              guide={g}
              lang={lang}
              open={activeId === `lib:${g.id}`}
              onToggle={() => toggle(`lib:${g.id}`)}
              innerRef={activeId === `lib:${g.id}` ? activeRef : null}
              delay={`${Math.min(i * 0.03, 0.5)}s`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
