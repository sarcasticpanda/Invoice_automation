import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, FileText, Send, SkipForward, Play, Loader2, Inbox, XCircle } from 'lucide-react'

interface Stats {
  total_chunks: number
  total_docs: number
  db_status: string
  emails_sent: number
  emails_drafted: number
  needs_review: number
  emails_skipped: number
  emails_rejected: number
  total_processed: number
}

const statCards = [
  { key: 'needs_review', label: 'Needs Review', icon: Inbox, color: 'from-amber-500 to-orange-600', to: '/threads?status=needs_review' },
  { key: 'emails_sent', label: 'Sent / Resolved', icon: Send, color: 'from-emerald-500 to-green-600', to: '/threads?status=sent' },
  { key: 'total_processed', label: 'Total Processed', icon: Mail, color: 'from-brand to-blue-600', to: '/threads?status=all' },
  { key: 'total_docs', label: 'Documents', icon: FileText, color: 'from-purple-500 to-violet-600', to: '/documents' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [running, setRunning] = useState(false)
  const [pipelineOutput, setPipelineOutput] = useState('')

  const [polling, setPolling] = useState(false)

  const loadStats = () => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }

  const loadPolling = () => {
    fetch('/api/pipeline/polling').then(r => r.json()).then(data => setPolling(data.enabled)).catch(() => {})
  }

  useEffect(() => {
    loadStats()
    loadPolling()
    // keep stats fresh + recover if the backend wasn't ready on first load
    const id = setInterval(loadStats, 5000)
    return () => clearInterval(id)
  }, [])

  const togglePolling = async (enabled: boolean) => {
    setPolling(enabled)
    try {
      await fetch('/api/pipeline/polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
    } catch(e) {}
  }

  const runPipeline = async () => {
    setRunning(true)
    setPipelineOutput('')
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_send: true }),
      })
      const data = await res.json()
      setPipelineOutput(data.stdout || data.message || 'Completed')
      loadStats()
    } catch (e: any) {
      setPipelineOutput('Error: ' + e.message)
    }
    setRunning(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Command Center
            </span>
          </motion.h1>
          <p className="text-white/40 text-sm mt-1">Monitor and control your AI email automation</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full ${polling ? 'bg-positive animate-pulse' : 'bg-white/20'}`} />
            <span className="text-sm font-medium text-white/70">Auto-Polling</span>
            <button 
              onClick={() => togglePolling(!polling)}
              className={`ml-2 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${polling ? 'bg-brand' : 'bg-white/20'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${polling ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runPipeline}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand to-purple-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Once
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            onClick={() => navigate(card.to)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="liquid-glass rounded-2xl p-6 group hover:bg-white/[0.03] hover:border-white/20 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white/30 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {stats ? (stats as any)[card.key] : '—'}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10"
        >
          <div className="liquid-glass rounded-xl p-5 flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-positive animate-pulse-dot" />
            <div>
              <div className="text-sm text-white/50">DB Status</div>
              <div className="text-lg font-semibold text-positive">{stats.db_status}</div>
            </div>
          </div>
          <div onClick={() => navigate('/review')} className="liquid-glass rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:border-white/20 transition-colors">
            <Inbox className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-sm text-white/50">Needs Review</div>
              <div className="text-lg font-semibold text-amber-400">{stats.needs_review ?? stats.emails_drafted}</div>
            </div>
          </div>
          <div className="liquid-glass rounded-xl p-5 flex items-center gap-4">
            <SkipForward className="w-5 h-5 text-white/30" />
            <div>
              <div className="text-sm text-white/50">Skipped</div>
              <div className="text-lg font-semibold">{stats.emails_skipped}</div>
            </div>
          </div>
          <div className="liquid-glass rounded-xl p-5 flex items-center gap-4">
            <XCircle className="w-5 h-5 text-white/30" />
            <div>
              <div className="text-sm text-white/50">Rejected</div>
              <div className="text-lg font-semibold">{stats.emails_rejected ?? 0}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pipeline Output */}
      {pipelineOutput && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">Pipeline Output</h3>
          <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {pipelineOutput}
          </pre>
        </motion.div>
      )}
    </div>
  )
}
