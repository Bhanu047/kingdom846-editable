import { useState, useRef, useEffect } from 'react'
import Icon from './Icon'
import { apiJson } from '../lib/api'

/**
 * Floating AI Chat Widget — visible to all visitors.
 * Talks to /api/ai/chat which calls Google Gemini with function calling.
 * Features: thinking animation, quick suggestions, typing indicator,
 * AI action badges, glow pulse on new message, auto-scroll.
 */
export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Greetings, traveler! I am the Royal Advisor of Kingdom 846. Ask me about alliances, events, guides, or anything about the realm.' + (window.location.hostname.includes('onrender') ? '' : ' (AI activates after admin sets GEMINI_API_KEY)') }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(false)
  const [aiOnline, setAiOnline] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Check AI status
  useEffect(() => {
    apiJson('/api/ai/status').then(d => setAiOnline(d.configured)).catch(() => {})
    const id = setInterval(() => apiJson('/api/ai/status').then(d => setAiOnline(d.configured)).catch(() => {}), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setUnread(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: msg }])

    try {
      const res = await apiJson('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-6)
        })
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
      if (!open) setUnread(true)
    } catch (err) {
      const errText = err.message?.includes('503') || err.message?.includes('not configured')
        ? 'The Royal Advisor awaits activation. The admin must set the GEMINI_API_KEY to awaken me.'
        : 'The Royal Advisor is resting. Please try again in a moment.'
      setMessages(prev => [...prev, { role: 'assistant', content: errText }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const suggestions = [
    { icon: '⚔️', text: 'What alliances are in Kingdom 846?' },
    { icon: '📅', text: 'What events are coming up?' },
    { icon: '🔄', text: 'How do I transfer to 846?' },
    { icon: '👑', text: 'Who is the current King?' },
  ]

  return (
    <>
      {/* Floating button with glow ring */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full border border-gold/50 bg-ink-2 shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ boxShadow: '0 4px 30px rgba(212,175,55,.35)' }}
        aria-label="Open chat"
      >
        {/* Glow ring */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(212,175,55,.3)',
              animation: 'pulse-ring 2s ease-out infinite',
            }}
          />
        )}
        {/* Unread badge */}
        {unread && (
          <span
            className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] text-white font-bold"
            style={{ animation: 'bounce-in .3s ease' }}
          >
            1
          </span>
        )}
        {open ? (
          <span className="text-parchment text-xl">×</span>
        ) : (
          <span className="text-2xl float-anim">
            {aiOnline ? '🤖' : '👑'}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-gold/30 bg-ink shadow-2xl stagger-in"
          style={{ animation: 'stagger-in .3s ease' }}
        >
          {/* Header with gradient + AI status */}
          <div
            className="flex items-center gap-3 border-b border-gold/20 px-4 py-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,.08), transparent)' }}
          >
            {/* Animated background shimmer */}
            <div
              className="absolute inset-0 opacity-20"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,.1), transparent)', animation: 'shimmer-slide 3s ease-in-out infinite' }}
            />
            <div className="relative text-2xl">{aiOnline ? '🤖' : '👑'}</div>
            <div className="relative flex-1">
              <div className="text-sm font-bold gradient-gold">Royal Advisor AI</div>
              <div className="text-[10px] flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 6, height: 6,
                    background: aiOnline ? '#4ade80' : '#fbbf24',
                    boxShadow: aiOnline ? '0 0 6px #4ade80' : 'none',
                    animation: aiOnline ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  }}
                />
                <span className={aiOnline ? 'text-emerald-400' : 'text-amber-400'}>
                  {aiOnline ? 'AI Online' : 'Awaiting API Key'}
                </span>
              </div>
            </div>
            {/* Mini sparkle */}
            <div className="relative text-gold/30 text-xs">✦</div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto space-y-3 p-3 scroll-smooth">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-gold/20 text-parchment rounded-br-sm'
                      : 'bg-ink-2 border border-gold/10 text-parchment/90 rounded-bl-sm'
                  }`}
                  style={{ animation: 'bounce-in .25s ease' }}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-wider text-gold/40">
                      <span>🤖</span> Advisor
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {/* Thinking indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-ink-2 border border-gold/10 rounded-lg rounded-bl-sm px-3 py-2">
                  <div className="flex items-center gap-2">
                    {/* Animated orbs */}
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="inline-block rounded-full bg-gold/60"
                          style={{
                            width: 6, height: 6,
                            animation: `bounce 0.6s ease-in-out ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-parchment/40">Consulting the scrolls...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {suggestions.map(s => (
                <button
                  key={s.text}
                  onClick={() => send(s.text)}
                  className="flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-[10px] text-gold/80 hover:bg-gold/15 hover:border-gold/40 transition-all hover:scale-105 active:scale-95"
                >
                  <span>{s.icon}</span> {s.text.slice(0, 30)}{s.text.length > 30 ? '…' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-2 border-t border-gold/15 p-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask the Advisor..."
              className="flex-1 bg-transparent text-sm text-parchment placeholder-parchment/30 outline-none"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="grid h-8 w-8 place-items-center rounded-full bg-gold/20 text-gold disabled:opacity-30 hover:bg-gold/35 transition-all hover:scale-110 active:scale-90"
              style={{ boxShadow: input.trim() ? '0 0 8px rgba(212,175,55,.2)' : 'none' }}
            >
              <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
