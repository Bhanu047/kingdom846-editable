import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import Icon from './Icon'
import { popToast } from '../lib/motion'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { toast: () => {} }
  return { toast: ctx.toast }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons = {
    success: 'shieldCheck',
    error: 'shield',
    info: 'sparkles',
  }
  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    error: 'border-crimson/40 bg-crimson/10 text-crimson-200',
    info: 'border-gold/40 bg-gold/10 text-gold',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} icon={icons[t.type] || icons.info} tone={colors[t.type] || colors.info} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* One notice. Split out of the provider so each arrival gets its own element
   and its own spring -- inside the map there was nowhere to hold a ref. */
function Toast({ toast, icon, tone, onDismiss }) {
  const el = useRef(null)
  useEffect(() => { popToast(el.current) }, [])

  return (
    <div
      ref={el}
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${tone}`}
    >
      <Icon name={icon} size={16} />
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        <Icon name="logout" size={14} />
      </button>
    </div>
  )
}
