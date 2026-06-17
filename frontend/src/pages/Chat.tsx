import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { MessageSquarePlus, Loader2, Sparkles, Send, Trash2, FileText } from 'lucide-react'

type Message = { role: string; content: string; sources?: { title: string; snippet: string }[] }
type Session = { id: string; title: string; last_message?: string | null }

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadSessions = async () => {
    const res = await fetch('/api/chat/sessions')
    const data = await res.json()
    setSessions(data.sessions || [])
  }

  const openSession = async (id: string) => {
    setActiveId(id)
    const res = await fetch(`/api/chat/session/${id}/messages`)
    const data = await res.json()
    setMessages(data.messages || [])
  }

  const newChat = () => {
    setActiveId(null)
    setMessages([])
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/chat/session/${id}`, { method: 'DELETE' })
    if (activeId === id) newChat()
    loadSessions()
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    setMessages((m) => [...m, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: activeId }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setActiveId(data.session_id)
      setMessages((m) => [...m, { role: 'assistant', content: data.answer, sources: data.sources }])
      loadSessions()
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex gap-4">
      {/* Sessions sidebar */}
      <div className="w-64 shrink-0 liquid-glass rounded-2xl flex flex-col overflow-hidden">
        <button
          onClick={newChat}
          className="m-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand to-purple-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-brand/20 transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" /> New chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                activeId === s.id ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <span className="truncate flex-1">{s.title || 'New Conversation'}</span>
              <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-negative transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-white/30 px-3 py-2">No conversations yet</p>}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="flex-1 liquid-glass rounded-2xl flex flex-col overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="px-6 py-4 border-b border-white/5">
          <h1 className="text-lg font-semibold text-white/90">Policy Assistant</h1>
          <p className="text-xs text-white/40">Ask about company policy — answers come from your uploaded documents</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold text-white/80 mb-2">How can I help?</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                Ask anything about the company's privacy policy or business documents. I remember the conversation, so you can ask follow-ups.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%]">
                  <p className="text-white/90 text-sm">{m.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-lg mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="liquid-glass border-none rounded-2xl rounded-tl-sm px-6 py-4 max-w-[90%]">
                  {m.content.split('\n').map((p, idx) => (
                    <p key={idx} className="text-white/80 text-sm leading-relaxed mb-2 last:mb-0">{p}</p>
                  ))}
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
                      {m.sources.map((src, idx) => (
                        <span key={idx} title={src.snippet} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 border border-white/10 rounded-full px-2 py-1">
                          <FileText className="w-3 h-3" /> {src.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-white/50 text-sm">
              <Loader2 className="w-4 h-4 text-brand animate-spin" /> Thinking...
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <form onSubmit={send} className="relative flex items-end gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about company policy..."
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all disabled:opacity-50"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !input.trim()}
              className="h-[48px] px-5 rounded-xl bg-gradient-to-r from-brand to-purple-500 text-white font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand/20 transition-all"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}
