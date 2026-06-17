import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, X, Loader2, CheckCircle2, Sparkles, Clock } from 'lucide-react'

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type DateFilter = 'all' | 'today' | 'week'

interface Pending {
  timestamp: string
  sender_email: string
  sender_subject: string
  incoming_body: string
  category: string
  sentiment: string
  generated_reply: string
}

const sentimentColor: Record<string, string> = {
  positive: 'text-positive bg-positive/10 border-positive/20',
  neutral: 'text-white/60 bg-white/5 border-white/10',
  negative: 'text-negative bg-negative/10 border-negative/20',
  urgent: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

export default function ReviewQueue() {
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [expanded, setExpanded] = useState<Pending | null>(null)

  const filtered = useMemo(() => {
    if (dateFilter === 'all') return items
    const now = Date.now()
    const cutoff = dateFilter === 'today' ? 86400_000 : 7 * 86400_000
    return items.filter(i => {
      const t = new Date(i.timestamp).getTime()
      return !isNaN(t) && now - t <= cutoff
    })
  }, [items, dateFilter])

  const load = () => {
    fetch('/api/review')
      .then(r => r.json())
      .then((data: Pending[]) => {
        setItems(data)
        setEdits(Object.fromEntries(data.map(d => [d.timestamp, d.generated_reply])))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const act = async (ts: string, action: 'send' | 'reject') => {
    setBusy(ts)
    try {
      const res = await fetch(`/api/review/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'send' ? { timestamp: ts, reply_text: edits[ts] } : { timestamp: ts }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed') }
      setItems(prev => prev.filter(i => i.timestamp !== ts))
    } catch (err: any) {
      alert(err.message || 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Review Queue</span>
          </motion.h1>
          <p className="text-white/40 text-sm mt-1">Approve, edit, or reject AI-drafted replies before they're sent</p>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'today', 'week'] as DateFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                dateFilter === f ? 'bg-brand/20 text-brand' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {f === 'week' ? 'Last 7 days' : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-positive/60" />
          </div>
          <h3 className="text-xl font-semibold text-white/80 mb-2">{items.length === 0 ? 'All clear' : 'Nothing in this range'}</h3>
          <p className="text-sm text-white/40">
            {items.length === 0
              ? 'No replies waiting for review. Run the pipeline in draft mode to queue some.'
              : 'No pending replies match this date filter. Try "All".'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {filtered.map((item) => (
              <motion.div
                key={item.timestamp}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                className="liquid-glass rounded-2xl overflow-hidden"
              >
                {/* Incoming email header — click to expand full detail */}
                <div onClick={() => setExpanded(item)} title="Click to view full email"
                  className="px-6 py-4 border-b border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-semibold text-white/90 truncate">{item.sender_subject || '(no subject)'}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand">{item.category}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${sentimentColor[item.sentiment] || sentimentColor.neutral}`}>{item.sentiment}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{item.sender_email}</span>
                    <span className="flex items-center gap-1 text-white/30">
                      <Clock className="w-3 h-3" /> {fmtTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 mt-2 line-clamp-2">{item.incoming_body}</p>
                </div>

                {/* Editable AI reply */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
                    <Sparkles className="w-3.5 h-3.5 text-brand" /> AI-drafted reply (editable)
                  </div>
                  <textarea
                    value={edits[item.timestamp] ?? ''}
                    onChange={(e) => setEdits(prev => ({ ...prev, [item.timestamp]: e.target.value }))}
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/90 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 resize-y"
                  />

                  <div className="flex items-center justify-end gap-3 mt-4">
                    <button
                      onClick={() => act(item.timestamp, 'reject')}
                      disabled={busy === item.timestamp}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-negative hover:bg-negative/10 border border-white/10 transition-colors disabled:opacity-40"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => act(item.timestamp, 'send')}
                      disabled={busy === item.timestamp || !(edits[item.timestamp] || '').trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand to-purple-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-brand/20 transition-all disabled:opacity-50"
                    >
                      {busy === item.timestamp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Approve & Send
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Full-detail popup */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setExpanded(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="liquid-glass rounded-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white/90 truncate">{expanded.sender_subject || '(no subject)'}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{expanded.sender_email} · {fmtTime(expanded.timestamp)}</p>
                </div>
                <button onClick={() => setExpanded(null)} className="text-white/40 hover:text-white transition-colors shrink-0"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Customer email</div>
                  <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{expanded.incoming_body}</pre>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-brand" /> AI-drafted reply</div>
                  <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed bg-white/5 border border-white/10 rounded-xl p-4">{edits[expanded.timestamp] ?? expanded.generated_reply}</pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
