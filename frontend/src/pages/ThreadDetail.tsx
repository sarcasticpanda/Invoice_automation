import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Sparkles, User, Send, X, CheckCircle2, Loader2, FileText } from 'lucide-react'

interface Message {
  id: string
  timestamp: string
  direction: 'inbound' | 'outbound'
  sender: string
  body: string
  status: string
  generated_by: string
  rag_sources?: { title?: string }[]
  decision_reason?: string
}
interface Thread {
  thread_id: string
  subject: string
  customer_email: string
  status: string
  priority: string
  category: string
  sentiment: string
  requires_human: boolean
  human_reason: string
  messages: Message[]
  latest_entry: { generated_reply?: string; status?: string }
}

const fmt = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    fetch(`/api/threads/${encodeURIComponent(id || '')}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json() })
      .then((t: Thread) => { setThread(t); setDraft(t.latest_entry?.generated_reply || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const act = async (action: 'approve' | 'reject' | 'mark-resolved') => {
    setBusy(action)
    try {
      const res = await fetch(`/api/threads/${encodeURIComponent(id || '')}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'approve' ? JSON.stringify({ reply_text: draft }) : undefined,
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Action failed') }
      navigate('/threads')
    } catch (err: any) {
      alert(err.message || 'Failed')
    } finally { setBusy(null) }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
  if (!thread) return (
    <div className="max-w-3xl mx-auto text-center p-20">
      <p className="text-white/50">Thread not found.</p>
      <Link to="/threads" className="text-brand text-sm mt-3 inline-block">← Back to inbox</Link>
    </div>
  )

  const pending = thread.requires_human || ['draft', 'needs_review'].includes(thread.latest_entry?.status || '')

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <Link to="/threads" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to inbox
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white/95">{thread.subject || '(no subject)'}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          <span className="text-white/50">{thread.customer_email}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 uppercase tracking-wider">{thread.status}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 uppercase tracking-wider">{thread.priority}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 capitalize">{thread.sentiment}</span>
        </div>
        {thread.requires_human && thread.human_reason && (
          <p className="text-xs text-amber-400/90 mt-2">⚠ Needs review: {thread.human_reason}</p>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4 mb-8">
        {thread.messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.direction === 'outbound' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${m.direction === 'outbound' ? 'bg-gradient-to-br from-brand to-purple-600' : 'bg-white/10'}`}>
              {m.direction === 'outbound' ? <Sparkles className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white/60" />}
            </div>
            <div className={`liquid-glass rounded-2xl px-5 py-3.5 max-w-[85%] ${m.direction === 'outbound' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-white/40">
                <span>{m.direction === 'outbound' ? (m.generated_by === 'human' ? 'Human reply' : 'AI reply') : m.sender}</span>
                <span>· {fmt(m.timestamp)}</span>
                {m.status && <span className="px-1.5 py-0.5 rounded bg-white/5">{m.status}</span>}
              </div>
              <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{m.body}</p>
              {m.rag_sources && m.rag_sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                  {m.rag_sources.map((s, idx) => (
                    <span key={idx} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                      <FileText className="w-3 h-3" /> {s.title || 'source'}
                    </span>
                  ))}
                </div>
              )}
              {m.decision_reason && <p className="text-[10px] text-white/30 mt-2 italic">{m.decision_reason}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Action panel — only when a reply is pending review */}
      {pending ? (
        <div className="liquid-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
            <Sparkles className="w-3.5 h-3.5 text-brand" /> AI-drafted reply (edit before sending)
          </div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/90 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y" />
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => act('mark-resolved')} disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-blue-400 hover:bg-blue-400/10 border border-white/10 transition-colors disabled:opacity-40">
              <CheckCircle2 className="w-4 h-4" /> Mark Resolved
            </button>
            <button onClick={() => act('reject')} disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-rose-400 hover:bg-rose-400/10 border border-white/10 transition-colors disabled:opacity-40">
              <X className="w-4 h-4" /> Reject
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => act('approve')} disabled={!!busy || !draft.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand to-purple-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-brand/20 transition-all disabled:opacity-50">
              {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Approve &amp; Send
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="liquid-glass rounded-2xl p-5 flex items-center justify-between">
          <span className="text-sm text-white/50 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No action needed — this thread is {thread.status}.</span>
          <button onClick={() => act('mark-resolved')} disabled={!!busy}
            className="text-xs text-white/50 hover:text-blue-400 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">Mark Resolved</button>
        </div>
      )}
    </div>
  )
}
