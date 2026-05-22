import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, FileText, Send, SkipForward, Play, Loader2, Inbox, XCircle } from 'lucide-react'

interface Stats {
  total_chunks: number; total_docs: number; db_status: string
  emails_sent: number; emails_drafted: number; needs_review: number
  emails_skipped: number; emails_rejected: number; total_processed: number
}

const statCards = [
  { key: 'needs_review',    label: 'Needs Review',    icon: Inbox,    grad: ['#f59e0b','#ea580c'], to: '/threads?status=needs_review' },
  { key: 'emails_sent',     label: 'Sent / Resolved', icon: Send,     grad: ['#10b981','#059669'], to: '/threads?status=sent' },
  { key: 'total_processed', label: 'Total Processed', icon: Mail,     grad: ['#3D81E3','#6366f1'], to: '/threads?status=all' },
  { key: 'total_docs',      label: 'Documents',       icon: FileText, grad: ['#a855f7','#7c3aed'], to: '/documents' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [running, setRunning] = useState(false)
  const [pipelineOutput, setPipelineOutput] = useState('')
  const [polling, setPolling] = useState(false)

  const loadStats = () => fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  const loadPolling = () => fetch('/api/pipeline/polling').then(r => r.json()).then(d => setPolling(d.enabled)).catch(() => {})

  useEffect(() => {
    loadStats(); loadPolling()
    const id = setInterval(loadStats, 5000)
    return () => clearInterval(id)
  }, [])

  const togglePolling = async (enabled: boolean) => {
    setPolling(enabled)
    await fetch('/api/pipeline/polling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }).catch(() => {})
  }

  const runPipeline = async () => {
    setRunning(true); setPipelineOutput('')
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_send: true }) })
      const data = await res.json()
      setPipelineOutput(data.stdout || data.message || 'Completed')
      loadStats()
    } catch (e: any) { setPipelineOutput('Error: ' + e.message) }
    setRunning(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Command Center</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>Monitor and control your AI email automation</p>
        </motion.div>

        <div className="flex items-center gap-3">
          {/* Polling toggle */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${polling ? 'bg-emerald-500 animate-pulse-dot' : 'bg-gray-300'}`} />
            <span className="text-[13px] text-gray-600">Auto-Polling</span>
            <button onClick={() => togglePolling(!polling)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-1 ${polling ? 'bg-[#3D81E3]' : 'bg-gray-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${polling ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Run button */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={runPipeline} disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow: '0 4px 16px rgba(61,129,227,0.35)' }}>
            {running ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><Play className="w-4 h-4" />Run Once</>}
          </motion.button>
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {statCards.map((card, i) => (
          <motion.div key={card.key} onClick={() => navigate(card.to)}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="glass-card relative overflow-hidden rounded-2xl cursor-pointer p-5">
            {/* soft accent orb */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
              style={{ background: `radial-gradient(circle, ${card.grad[0]}, transparent)` }} />
            <div className="flex items-center justify-between mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${card.grad[0]},${card.grad[1]})`, boxShadow: `0 4px 12px ${card.grad[0]}50` }}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--t3)' }}>{card.label}</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>
              {stats ? (stats as any)[card.key] ?? '—' : '—'}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary stats */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'DB Status', value: stats.db_status, color: 'text-emerald-600', dot: true, onClick: undefined },
            { label: 'Needs Review', value: stats.needs_review ?? stats.emails_drafted, color: 'text-amber-600', dot: false, onClick: () => navigate('/review') },
            { label: 'Skipped', value: stats.emails_skipped, color: 'text-gray-500', dot: false, onClick: () => navigate('/threads?status=skipped') },
            { label: 'Rejected', value: stats.emails_rejected ?? 0, color: 'text-gray-500', dot: false, onClick: () => navigate('/threads?status=rejected') },
          ].map(s => (
            <div key={s.label} onClick={s.onClick}
              className={`glass-card rounded-xl p-4 flex items-center gap-3 ${s.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
              {s.dot
                ? <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot shrink-0" />
                : null}
              <div>
                <div className="text-[11px] mb-0.5" style={{ color: 'var(--t3)' }}>{s.label}</div>
                <div className={`text-sm font-semibold ${s.color}`}>{s.value}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Pipeline output */}
      {pipelineOutput && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6">
          <h3 className="text-[11px] font-semibold mb-3 uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Pipeline Output</h3>
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto" style={{ color: 'var(--t2)' }}>
            {pipelineOutput}
          </pre>
        </motion.div>
      )}
    </div>
  )
}
