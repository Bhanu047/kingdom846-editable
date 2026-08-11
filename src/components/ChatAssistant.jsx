import { useState, useRef, useEffect } from 'react'
import Icon from './Icon'
import { apiJson } from '../lib/api'

/**
 * Floating AI Chat Widget — visible to all visitors.
 * Talks to /api/ai/chat which calls Google Gemini.
 */
export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Greetings, traveler! I am the Royal Advisor of Kingdom 846. Ask me about alliances, events, guides, or anything about the realm.' + (window.location.hostname.includes('onrender') ? '' : ' (AI activates after admin sets GEMINI_API_KEY)') }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const res = await apiJson('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6)
        })
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The Royal Advisor is resting. Please try again in a moment.' }])
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
    'What alliances are in Kingdom 846?',
    'What events are coming up?',
    'How do I transfer to 846?',
  ]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-gold/40 bg-ink-2 shadow-lg transition-all hover:scale-110"
        style={{ boxShadow: '0 4px 20px rgba(212,175,55,.3)' }}
        aria-label="Open chat"
      >
        {open ? (
          <span className="text-parchment text-xl">×</span>
        ) : (
          <span className="text-gold text-xl float-anim">👑</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-lg border border-gold/30 bg-ink shadow-2xl stagger-in">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-gold/20 bg-ink-2 px-4 py-3">
            <span className="text-lg">👑</span>
            <div>
              <div className="text-sm font-bold gradient-gold">Royal Advisor</div>
              <div className="text-[10px] text-gold/50 flex items-center gap-1">
                <span className="pulse-dot" style={{ width: 5, height: 5 }} /> Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto space-y-3 p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-gold/20 text-parchment'
                      : 'bg-ink-2 border border-gold/10 text-parchment/90'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-ink-2 border border-gold/10 rounded-lg px-3 py-2">
                  <span className="text-sm text-parchment/50">Advisor is thinking</span>
                  <span className="ml-1 inline-flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0s', fontSize: 4 }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '.2s', fontSize: 4 }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '.4s', fontSize: 4 }}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-1 text-[10px] text-gold/80 hover:bg-gold/10 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gold/15 p-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask the Advisor..."
              className="flex-1 bg-transparent text-sm text-parchment placeholder-parchment/30 outline-none"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="grid h-7 w-7 place-items-center rounded-full bg-gold/20 text-gold disabled:opacity-30 hover:bg-gold/30 transition"
            >
              <Icon name="arrow" size={12} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
