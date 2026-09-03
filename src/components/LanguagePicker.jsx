import { LANGUAGES, useLanguage, setLanguage, t } from '../lib/i18n'
import Icon from './Icon'

/* Three chips, labelled in their own language.
 *
 * A picker that lists "Turkish" and "Chinese" in English is useless to the
 * reader who needs it — the one word they can find on the page has to be the
 * one they already read. Hence Türkçe and 中文 rather than translations of
 * their names.
 *
 * The scope line under it is not filler. Only the kingdom's own guides and
 * rules are translated; a reader who picks Türkçe and then meets an English
 * rankings table should have been told, not left wondering whether something
 * failed to load.
 */
export default function LanguagePicker({ scopeNote = true, className = '' }) {
  const lang = useLanguage()
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-parchment/40">
          <Icon name="globe" size={12} className="text-gold/60" />
          {t('langLabel', lang)}
        </span>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={lang === l.code}
            lang={l.code}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              lang === l.code
                ? 'border-gold/50 bg-gold/20 text-gold-bright'
                : 'border-gold/15 bg-white/5 text-parchment/50 hover:text-parchment'
            }`}
          >
            {l.native}
          </button>
        ))}
      </div>
      {scopeNote && lang !== 'en' && (
        <p className="mt-2 text-[11px] leading-relaxed text-parchment/40">{t('langScope', lang)}</p>
      )}
    </div>
  )
}
