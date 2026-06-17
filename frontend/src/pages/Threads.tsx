import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Inbox, Search, ChevronRight, AlertTriangle, Loader2, MessageSquare } from 'lucide-react'

interface Thread {
  thread_id: string
  subject: string
  customer_email: string
  status: string
  priority: string
  category: string
  sentiment: string
  last_updated: string
  requires_human: boolean
  human_reason: string
  message_count: number
  latest_preview: string
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'auto_handled', label: 'Auto-Handled' },
  { key: 'sent', label: 'Sent' },
  { key: 'draft', label: 'Drafts' },
  { key: 'skipped', label: 'Skipped' },
]

const DATE_RANGES = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
]

const statusColor: Record<string, string> = {
  auto_sent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  sent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  draft: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  needs_review: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  skipped: 'bg-white/5 text-white/40 border-white/10',
  rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  resolved: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
}
const priorityColor: Record<string, string> = {
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  high: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  normal: 'bg-white/5 text-white/50 border-white/10',
  low: 'bg-white/5 text-white/30 border-white/10',
}
const sentimentColor: Record<string, string> = {
  positive: 'text-emerald-400', neutral: 'text-blue-400',
  negative: 'text-rose-400', urgent: 'text-amber-400', unknown: 'text-white/40',
}

const fmt = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Threads() {
  const navigate = useNavigate()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('needs_review')
  const [dateRange, setDateRange] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ status: tab, date_range: dateRange, search })
    fetch(`/api/threads?${params}`)
      .then(r => r.json())
      .then(d => { setThreads(d.threads || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab, dateRange, search])

  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t) }, [load, search])

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="mb-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Inbox className="w-7 h-7 text-brand" />
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">AI Inbox</span>
        </motion.h1>
        <p className="text-white/40 text-sm mt-1">Conversations grouped by thread — see what needs you, and what AI handled.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-brand/20 text-brand' : 'text-white/50 hover:text-white/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email, subject, text..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand/40" />
        </div>
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-brand/40">
          {DATE_RANGES.map(d => <option key={d.key} value={d.key} className="bg-[#1a1a1a]">{d.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
      ) : threads.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-16 text-center">
          <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70">No conversations here</h3>
          <p className="text-sm text-white/40 mt-1">Nothing matches this tab/filter. Run the pipeline to process emails.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t, i) => (
            <motion.div key={t.thread_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/threads/${encodeURIComponent(t.thread_id)}`)}
              className="liquid-glass rounded-2xl p-5 cursor-pointer hover:bg-white/[0.04] hover:border-white/20 transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {t.requires_human && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    <h3 className="font-semibold text-white/90 truncate">{t.subject || '(no subject)'}</h3>
                  </div>
                  <p className="text-xs text-white/40 mb-2">{t.customer_email} · {fmt(t.last_updated)} · {t.message_count} msg</p>
                  <p className="text-sm text-white/50 line-clamp-1">{t.latest_preview}</p>
                  {t.requires_human && t.human_reason && (
                    <p className="text-xs text-amber-400/80 mt-2">⚠ {t.human_reason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${statusColor[t.status] || statusColor.skipped}`}>{t.status}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${priorityColor[t.priority] || priorityColor.normal}`}>{t.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={sentimentColor[t.sentiment] || sentimentColor.unknown}>{t.sentiment}</span>
                    <span className="text-white/30">{t.category?.replace('_', ' ')}</span>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-brand transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
