export function Modal({ open, onClose, title, eyebrow, children, footer, noScroll }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className={`panel panel-glow ${noScroll ? '' : 'max-h-[85vh] overflow-y-auto'}`}>
          {(title || eyebrow) && (
            <div className="flex items-start justify-between gap-3 border-b border-gold/15 p-5">
              <div>
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                <h3 className="font-display text-lg font-bold text-parchment">{title}</h3>
              </div>
              <button onClick={onClose} className="text-parchment/50 hover:text-parchment">
                <Icon name="chevron" size={18} className="rotate-90" />
              </button>
            </div>
          )}
          <div className="p-5 text-sm text-parchment/80">{children}</div>
          {footer && <div className="border-t border-gold/15 p-4">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
