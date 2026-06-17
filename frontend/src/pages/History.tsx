import { useEffect, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Clock, MessageSquare, ChevronRight, BarChart2, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip } from 'recharts'

interface Contact {
  email: string
  total_conversations: number
  latest_timestamp: string
  latest_subject: string
  dominant_sentiment: string
  categories: string[]
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  neutral: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  negative: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  urgent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  unknown: 'bg-white/10 text-white/50 border-white/10',
}

const sentimentHex: Record<string, string> = {
  positive: '#10b981',
  neutral: '#3b82f6',
  negative: '#f43f5e',
  urgent: '#f59e0b',
  unknown: '#9ca3af',
}

export default function History() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history/contacts')
      .then(r => r.json())
      .then(data => {
        setContacts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const sentimentData = useMemo(() => {
    const counts = contacts.reduce((acc, c) => {
      acc[c.dominant_sentiment] = (acc[c.dominant_sentiment] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [contacts])

  const categoryData = useMemo(() => {
    const counts = contacts.reduce((acc, c) => {
      c.categories.forEach(cat => {
        if (!cat) return
        acc[cat] = (acc[cat] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [contacts])

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Intelligence Hub
          </span>
        </motion.h1>
        <p className="text-white/40 text-sm mt-2">Comprehensive analytics and contact relationship history</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-16 text-center max-w-2xl mx-auto">
          <Clock className="w-16 h-16 text-white/10 mx-auto mb-6" />
          <h3 className="text-2xl font-medium text-white/80">Awaiting Data</h3>
          <p className="text-white/40 text-base mt-2">Emails processed by your pipeline will generate analytics here.</p>
        </div>
      ) : (
        <>
          {/* Analytics Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Sentiment Chart */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="liquid-glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <PieChartIcon className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-medium text-white/90">Sentiment Overview</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={sentimentHex[entry.name] || sentimentHex.unknown} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Top Categories */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="liquid-glass rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-medium text-white/90">Top Topics</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                    <BarTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Contact List */}
          <h3 className="text-xl font-bold text-white/90 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand" />
            Contact Histories
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contacts.map((contact, i) => (
              <motion.div
                key={contact.email}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/history/${encodeURIComponent(contact.email)}`} className="block h-full">
                  <div className="liquid-glass h-full rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300 group relative overflow-hidden border border-white/5 hover:border-brand/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/0 to-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl font-bold text-white/80 shrink-0 shadow-inner">
                          {contact.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white/95 truncate max-w-[200px] sm:max-w-xs">{contact.email}</h3>
                          <p className="text-white/40 text-sm mt-1">{contact.total_conversations} recorded interaction(s)</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${sentimentColors[contact.dominant_sentiment] || sentimentColors.unknown}`}>
                        {contact.dominant_sentiment.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Latest Thread</span>
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(contact.latest_timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm font-medium truncate mb-4">{contact.latest_subject}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {contact.categories.slice(0, 3).map(cat => (
                            cat && <span key={cat} className="px-2 py-1 rounded bg-black/40 text-[10px] font-medium text-white/50">
                              {cat.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand transition-colors">
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
