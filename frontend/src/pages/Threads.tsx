import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Inbox, Search, ChevronRight, AlertTriangle, Loader2, MessageSquare } from 'lucide-react'

interface Thread {
  thread_id: string; subject: string; customer_email: string; status: string
  priority: string; category: string; sentiment: string; last_updated: string
  requires_human: boolean; human_reason: string; message_count: number; latest_preview: string
}

const TABS = [
  { key:'all',label:'All' }, { key:'needs_review',label:'Needs Review' }, { key:'auto_handled',label:'Auto-Handled' },
  { key:'sent',label:'Sent' }, { key:'draft',label:'Drafts' }, { key:'rejected',label:'Rejected' }, { key:'skipped',label:'Skipped' },
]
const DATE_RANGES = [
  { key:'all',label:'All time' }, { key:'today',label:'Today' }, { key:'yesterday',label:'Yesterday' },
  { key:'7d',label:'Last 7 days' }, { key:'30d',label:'Last 30 days' },
]

const statusBadge: Record<string,{bg:string;text:string;ring:string}> = {
  auto_sent:    { bg:'rgba(5,150,105,0.12)',  text:'#065f46', ring:'rgba(5,150,105,0.25)' },
  sent:         { bg:'rgba(5,150,105,0.12)',  text:'#065f46', ring:'rgba(5,150,105,0.25)' },
  draft:        { bg:'rgba(180,83,9,0.12)',   text:'#92400e', ring:'rgba(180,83,9,0.25)' },
  needs_review: { bg:'rgba(180,83,9,0.12)',   text:'#92400e', ring:'rgba(180,83,9,0.25)' },
  skipped:      { bg:'rgba(0,0,0,0.06)',      text:'#64748b', ring:'rgba(0,0,0,0.10)' },
  rejected:     { bg:'rgba(185,28,28,0.10)',  text:'#991b1b', ring:'rgba(185,28,28,0.22)' },
  resolved:     { bg:'rgba(29,78,216,0.10)',  text:'#1e40af', ring:'rgba(29,78,216,0.22)' },
}
const priorityBadge: Record<string,{bg:string;text:string;ring:string}> = {
  urgent: { bg:'rgba(185,28,28,0.10)', text:'#991b1b', ring:'rgba(185,28,28,0.22)' },
  high:   { bg:'rgba(180,83,9,0.10)',  text:'#92400e', ring:'rgba(180,83,9,0.22)' },
  normal: { bg:'rgba(0,0,0,0.05)',     text:'#64748b', ring:'rgba(0,0,0,0.08)' },
  low:    { bg:'rgba(0,0,0,0.04)',     text:'#94a3b8', ring:'rgba(0,0,0,0.06)' },
}
const sentimentColor: Record<string,string> = {
  positive:'#059669', neutral:'#2563eb', negative:'#dc2626', urgent:'#d97706', unknown:'#94a3b8',
}

const fmt = (iso:string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) }

function Badge({ label, style }: { label:string; style:{bg:string;text:string;ring:string} }) {
  return <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium"
    style={{ background:style.bg, color:style.text, boxShadow:`0 0 0 1px ${style.ring}` }}>{label}</span>
}

export default function Threads() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = TABS.some(t => t.key===searchParams.get('status')) ? searchParams.get('status')! : 'needs_review'
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(initialTab)
  const [dateRange, setDateRange] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ status:tab, date_range:dateRange, search })
    fetch(`/api/threads?${params}`).then(r=>r.json()).then(d=>{ setThreads(d.threads||[]); setLoading(false) }).catch(()=>setLoading(false))
  }, [tab, dateRange, search])

  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return ()=>clearTimeout(t) }, [load, search])

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div className="mb-6">
        <motion.h1 initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          className="text-[28px] font-semibold tracking-tight flex items-center gap-3" style={{ color: 'var(--t1)' }}>
          <Inbox className="w-6 h-6 text-[#3D81E3]" /> AI Inbox
        </motion.h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>Conversations grouped by thread — see what needs you, and what AI handled.</p>
      </div>

      {/* Tabs */}
      <div className="glass-card flex items-center gap-1 p-1 rounded-xl mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all"
            style={tab===t.key
              ? { background:'rgba(61,129,227,0.12)', color:'#1d4ed8', boxShadow:'0 0 0 1px rgba(61,129,227,0.25)' }
              : { color:'#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search email, subject, text…"
            className="w-full pl-10 pr-4 py-2.5 text-[13px] placeholder-gray-400 rounded-xl outline-none"
            style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)', color: 'var(--t1)' }}
            onFocus={e=>(e.target as HTMLInputElement).style.borderColor='rgba(61,129,227,0.4)'}
            onBlur={e=>(e.target as HTMLInputElement).style.borderColor='var(--input-border)'} />
        </div>
        <select value={dateRange} onChange={e=>setDateRange(e.target.value)}
          className="px-3 py-2.5 text-[13px] rounded-xl outline-none"
          style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)', color: 'var(--t2)' }}>
          {DATE_RANGES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-7 h-7 text-[#3D81E3] animate-spin" /></div>
      ) : threads.length===0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold" style={{ color: 'var(--t2)' }}>No conversations here</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>Nothing matches this tab/filter. Run the pipeline to process emails.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t, i) => (
            <motion.div key={t.thread_id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.025 }}
              onClick={() => navigate(`/threads/${encodeURIComponent(t.thread_id)}`)}
              className="glass-card rounded-2xl p-5 cursor-pointer group transition-all"
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 4px 24px rgba(0,0,0,0.09)'; el.style.borderColor='rgba(61,129,227,0.25)' }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 2px 16px rgba(0,0,0,0.05)'; el.style.borderColor='rgba(255,255,255,0.85)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {t.requires_human && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <h3 className="font-semibold truncate text-[15px]" style={{ color: 'var(--t1)' }}>{t.subject||'(no subject)'}</h3>
                  </div>
                  <p className="text-[12px] mb-2" style={{ color: 'var(--t3)' }}>{t.customer_email} · {fmt(t.last_updated)} · {t.message_count} msg</p>
                  <p className="text-[13px] line-clamp-1" style={{ color: 'var(--t2)' }}>{t.latest_preview}</p>
                  {t.requires_human && t.human_reason && <p className="text-xs text-amber-600 mt-2">⚠ {t.human_reason}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <Badge label={t.status}   style={statusBadge[t.status]   ||statusBadge.skipped} />
                    <Badge label={t.priority} style={priorityBadge[t.priority]||priorityBadge.normal} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span style={{ color: sentimentColor[t.sentiment]||sentimentColor.unknown }}>{t.sentiment}</span>
                    <span style={{ color: 'var(--t3)' }}>{t.category?.replace('_',' ')}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#3D81E3] transition-colors" />
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
