import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Zap, UserCheck, Clock3, Mail, TrendingUp, Loader2, IndianRupee, Users, PieChart as PieIcon } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

interface Analytics {
  total_processed: number; thread_count: number; auto_handled: number; human_review: number
  sent: number; skipped: number; rejected: number; urgent_or_negative: number
  automation_rate: number; human_intervention_rate: number; estimated_hours_saved: number
  estimated_cost_saved: number; sentiment_counts: Record<string,number>
  category_counts: Record<string,number>; daily_status: { date: string; [k: string]: any }[]
  top_customers: { email: string; count: number }[]
}

const SENT_HEX: Record<string,string> = { positive:'#10b981', neutral:'#3b82f6', negative:'#f43f5e', urgent:'#f59e0b', unknown:'#9ca3af' }
const SENT_META: Record<string,{ emoji:string; label:string }> = {
  positive: { emoji:'🌟', label:'Positive' },
  neutral:  { emoji:'💬', label:'Neutral'  },
  negative: { emoji:'😤', label:'Negative' },
  urgent:   { emoji:'⚡', label:'Urgent'   },
  unknown:  { emoji:'❓', label:'Unknown'  },
}

const tipStyle = {
  backgroundColor: 'rgba(15,23,42,0.92)', border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.9)',
}

const card = (i: number) => ({
  initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 },
  transition: { delay: 0.07*i, duration: 0.45, ease: [0.22,1,0.36,1] as const },
})

export default function Analytics() {
  const navigate = useNavigate()
  const [a, setA] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setA(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="w-7 h-7 text-[#3D81E3] animate-spin" /></div>
  if (!a) return <div className="text-center p-24 text-gray-400">No analytics available.</div>

  const heroes = [
    { label:'Automation Rate',    value:`${a.automation_rate}%`,        sub:`${a.auto_handled} auto-handled`, icon:Zap,      grad:['#10b981','#059669'] },
    { label:'Human Intervention', value:`${a.human_intervention_rate}%`, sub:`${a.human_review} need review`, icon:UserCheck, grad:['#f59e0b','#ea580c'] },
    { label:'Time Saved',         value:`${a.estimated_hours_saved}h`,   sub:`≈ ₹${(a.estimated_cost_saved||0).toLocaleString()}`, icon:Clock3, grad:['#3D81E3','#6366f1'] },
    { label:'Total Processed',    value:a.total_processed,               sub:`${a.thread_count} threads`,     icon:Mail,      grad:['#a855f7','#7c3aed'] },
  ]
  const sentimentData = Object.entries(a.sentiment_counts||{}).map(([name,value])=>({name,value}))
  const categoryData = Object.entries(a.category_counts||{}).map(([name,value])=>({name:name.replace('_',' '),value})).sort((x,y)=>y.value-x.value).slice(0,6)
  const daily = (a.daily_status||[]).map(d=>({ date:d.date?.slice(5), sent:(d.sent||0)+(d.auto_sent||0), skipped:d.skipped||0, review:(d.draft||0)+(d.needs_review||0) }))

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <motion.div {...card(0)} className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>How much your AI is handling — and what it's saving you.</p>
      </motion.div>

      {/* Hero metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {heroes.map((h,i) => (
          <motion.div key={h.label} {...card(i+1)} className="glass-card relative overflow-hidden rounded-2xl p-5">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
              style={{ background:`radial-gradient(circle, ${h.grad[0]}, transparent)` }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background:`linear-gradient(135deg,${h.grad[0]},${h.grad[1]})`, boxShadow:`0 4px 12px ${h.grad[0]}50` }}>
              <h.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>{h.value}</div>
            <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--t3)' }}>{h.label}</div>
            <div className="text-xs mt-2" style={{ color: 'var(--t2)' }}>{h.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Daily + sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <motion.div {...card(5)} className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-[#3D81E3]" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Daily Activity</h3>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gSk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9ca3af" stopOpacity={0.2}/><stop offset="100%" stopColor="#9ca3af" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tipStyle} />
                <Area type="monotone" dataKey="sent"    stroke="#10b981" fill="url(#gS)"  strokeWidth={1.5} />
                <Area type="monotone" dataKey="review"  stroke="#f59e0b" fill="url(#gR)"  strokeWidth={1.5} />
                <Area type="monotone" dataKey="skipped" stroke="#9ca3af" fill="url(#gSk)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div {...card(6)} className="glass-card rounded-2xl p-6">
          {/* Card header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Sentiment Analysis</h3>
              </div>
              <p className="text-[11px] mt-0.5 ml-6" style={{ color: 'var(--t3)' }}>Email tone breakdown</p>
            </div>
            {/* Dominant sentiment badge */}
            {sentimentData.length > 0 && (() => {
              const dom = sentimentData.reduce((a,b)=>a.value>b.value?a:b)
              const meta = SENT_META[dom.name] || SENT_META.unknown
              return (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  style={{ background:`${SENT_HEX[dom.name] || SENT_HEX.unknown}15`, color: SENT_HEX[dom.name]||SENT_HEX.unknown, border:`1px solid ${SENT_HEX[dom.name]||SENT_HEX.unknown}30` }}>
                  <span>{meta.emoji}</span> {meta.label}
                </span>
              )
            })()}
          </div>

          {/* Donut chart with center label */}
          {(() => {
            const total = sentimentData.reduce((s,d)=>s+d.value,0)
            return (
              <>
                <div className="relative h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={56} outerRadius={78}
                        paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {sentimentData.map((e,i) => <Cell key={i} fill={SENT_HEX[e.name]||SENT_HEX.unknown} />)}
                      </Pie>
                      <Tooltip contentStyle={tipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-2xl font-bold leading-none" style={{ color: 'var(--t1)' }}>{total}</div>
                    <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--t3)' }}>emails</div>
                  </div>
                </div>

                {/* Rich legend */}
                <div className="space-y-2 mt-4 pt-4" style={{ borderTop:'1px solid var(--divider)' }}>
                  {sentimentData.map(s => {
                    const pct = total > 0 ? Math.round((s.value/total)*100) : 0
                    const meta = SENT_META[s.name] || SENT_META.unknown
                    const hex = SENT_HEX[s.name] || SENT_HEX.unknown
                    return (
                      <div key={s.name} className="flex items-center gap-2.5">
                        <span className="text-[15px] w-5 text-center leading-none select-none">{meta.emoji}</span>
                        <span className="text-[12px] w-[62px] capitalize font-medium" style={{ color: 'var(--t2)' }}>{meta.label}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.07)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${hex}cc, ${hex})` }} />
                        </div>
                        <span className="text-[12px] font-semibold w-8 text-right tabular-nums" style={{ color: 'var(--t2)' }}>{pct}%</span>
                        <span className="text-[11px] w-5 text-right tabular-nums" style={{ color: 'var(--t3)' }}>{s.value}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </motion.div>
      </div>

      {/* Categories + contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div {...card(7)} className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--t2)' }}>Top Categories</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left:10 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill:'#64748b', fontSize:12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle} cursor={{ fill:'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0,5,5,0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div {...card(8)} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-[#3D81E3]" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Top Contacts</h3>
          </div>
          <div className="space-y-1.5">
            {(a.top_customers||[]).slice(0,7).map((c,i) => (
              <button key={c.email} onClick={() => navigate(`/history/${encodeURIComponent(c.email)}`)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/60"
                style={{ background:'rgba(255,255,255,0.5)', border:'1px solid rgba(0,0,0,0.05)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={{ background:'rgba(0,0,0,0.06)', color: 'var(--t2)' }}>{i+1}</span>
                  <span className="text-[13px] truncate" style={{ color: 'var(--t2)' }}>{c.email}</span>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--t3)' }}>{c.count} msg →</span>
              </button>
            ))}
            {(a.top_customers||[]).length===0 && <p className="text-sm text-gray-400 text-center py-4">No contacts yet.</p>}
          </div>
          <div className="mt-5 pt-4 flex items-center gap-2 text-[13px] text-emerald-600"
            style={{ borderTop:'1px solid var(--divider)' }}>
            <IndianRupee className="w-3.5 h-3.5" />
            Estimated saved: ₹{(a.estimated_cost_saved||0).toLocaleString()} ({a.estimated_hours_saved}h)
          </div>
        </motion.div>
      </div>
    </div>
  )
}
