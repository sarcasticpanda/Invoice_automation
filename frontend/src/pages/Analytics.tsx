import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Zap, UserCheck, Clock3, Mail, TrendingUp, Loader2, IndianRupee, Users, PieChart as PieIcon,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

interface Analytics {
  total_processed: number
  thread_count: number
  auto_handled: number
  human_review: number
  sent: number
  skipped: number
  rejected: number
  urgent_or_negative: number
  automation_rate: number
  human_intervention_rate: number
  estimated_hours_saved: number
  estimated_cost_saved: number
  sentiment_counts: Record<string, number>
  category_counts: Record<string, number>
  daily_status: { date: string; [k: string]: any }[]
  top_customers: { email: string; count: number }[]
}

const SENT_HEX: Record<string, string> = { positive: '#10b981', neutral: '#3b82f6', negative: '#f43f5e', urgent: '#f59e0b', unknown: '#6b7280' }
const tooltipStyle = { backgroundColor: 'rgba(10,10,12,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }

const card = (i: number) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } })

export default function Analytics() {
  const [a, setA] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setA(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
  if (!a) return <div className="text-center p-24 text-white/50">No analytics available.</div>

  const heroes = [
    { label: 'Automation Rate', value: `${a.automation_rate}%`, sub: `${a.auto_handled} auto-handled`, icon: Zap, grad: 'from-emerald-500 to-green-600' },
    { label: 'Human Intervention', value: `${a.human_intervention_rate}%`, sub: `${a.human_review} need review`, icon: UserCheck, grad: 'from-amber-500 to-orange-600' },
    { label: 'Time Saved', value: `${a.estimated_hours_saved}h`, sub: `≈ ₹${(a.estimated_cost_saved || 0).toLocaleString()}`, icon: Clock3, grad: 'from-brand to-blue-600' },
    { label: 'Total Processed', value: a.total_processed, sub: `${a.thread_count} threads`, icon: Mail, grad: 'from-purple-500 to-violet-600' },
  ]
  const sentimentData = Object.entries(a.sentiment_counts || {}).map(([name, value]) => ({ name, value }))
  const categoryData = Object.entries(a.category_counts || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value })).sort((x, y) => y.value - x.value).slice(0, 6)
  const daily = (a.daily_status || []).map(d => ({ date: d.date?.slice(5), sent: (d.sent || 0) + (d.auto_sent || 0), skipped: d.skipped || 0, review: (d.draft || 0) + (d.needs_review || 0) }))

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <motion.div {...card(0)} className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">Analytics</span>
        </h1>
        <p className="text-white/40 text-sm mt-2">How much your AI is handling — and what it's saving you.</p>
      </motion.div>

      {/* Hero metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {heroes.map((h, i) => (
          <motion.div key={h.label} {...card(i + 1)} className="liquid-glass rounded-2xl p-6 relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${h.grad} opacity-10 blur-2xl`} />
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${h.grad} flex items-center justify-center shadow-lg mb-4`}>
              <h.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">{h.value}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider mt-1">{h.label}</div>
            <div className="text-xs text-white/50 mt-2">{h.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Trend + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <motion.div {...card(5)} className="liquid-glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5"><TrendingUp className="w-5 h-5 text-brand" /><h3 className="font-semibold text-white/90">Daily Activity</h3></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gSkip" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b7280" stopOpacity={0.4} /><stop offset="100%" stopColor="#6b7280" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="sent" stroke="#10b981" fill="url(#gSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="review" stroke="#f59e0b" fill="url(#gRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="skipped" stroke="#6b7280" fill="url(#gSkip)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div {...card(6)} className="liquid-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5"><PieIcon className="w-5 h-5 text-purple-400" /><h3 className="font-semibold text-white/90">Sentiment</h3></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {sentimentData.map((e, i) => <Cell key={i} fill={SENT_HEX[e.name] || SENT_HEX.unknown} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            {sentimentData.map(s => <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-white/50"><span className="w-2 h-2 rounded-full" style={{ background: SENT_HEX[s.name] || SENT_HEX.unknown }} />{s.name} ({s.value})</span>)}
          </div>
        </motion.div>
      </div>

      {/* Categories + top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div {...card(7)} className="liquid-glass rounded-2xl p-6">
          <h3 className="font-semibold text-white/90 mb-5">Top Categories</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 5, 5, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div {...card(8)} className="liquid-glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5"><Users className="w-5 h-5 text-brand" /><h3 className="font-semibold text-white/90">Top Contacts</h3></div>
          <div className="space-y-2">
            {(a.top_customers || []).slice(0, 7).map((c, i) => (
              <div key={c.email} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-white/70 shrink-0">{i + 1}</span>
                  <span className="text-sm text-white/70 truncate">{c.email}</span>
                </div>
                <span className="text-xs text-white/40 shrink-0">{c.count} msg</span>
              </div>
            ))}
            {(a.top_customers || []).length === 0 && <p className="text-sm text-white/30">No contacts yet.</p>}
          </div>
          <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2 text-sm text-emerald-400">
            <IndianRupee className="w-4 h-4" /> Estimated saved: ₹{(a.estimated_cost_saved || 0).toLocaleString()} ({a.estimated_hours_saved}h of work)
          </div>
        </motion.div>
      </div>
    </div>
  )
}
