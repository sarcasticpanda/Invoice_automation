import { useEffect, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Clock, MessageSquare, ChevronRight, BarChart2, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RT, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as BT } from 'recharts'

const tipStyle = { backgroundColor:'rgba(15,23,42,0.92)', border:'1px solid rgba(0,0,0,0.15)', borderRadius:'10px', fontSize:'12px', color:'rgba(255,255,255,0.9)' }

interface Contact {
  email: string; total_conversations: number; latest_timestamp: string
  latest_subject: string; dominant_sentiment: string; categories: string[]
}
const sentimentHex: Record<string,string> = { positive:'#10b981', neutral:'#3b82f6', negative:'#f43f5e', urgent:'#f59e0b', unknown:'#9ca3af' }
const sentimentBadge: Record<string,{bg:string;text:string;ring:string}> = {
  positive: { bg:'rgba(5,150,105,0.12)', text:'#065f46', ring:'rgba(5,150,105,0.25)' },
  neutral:  { bg:'rgba(29,78,216,0.10)', text:'#1e40af', ring:'rgba(29,78,216,0.22)' },
  negative: { bg:'rgba(185,28,28,0.10)', text:'#991b1b', ring:'rgba(185,28,28,0.22)' },
  urgent:   { bg:'rgba(180,83,9,0.12)',  text:'#92400e', ring:'rgba(180,83,9,0.25)' },
  unknown:  { bg:'rgba(0,0,0,0.05)',     text:'#64748b', ring:'rgba(0,0,0,0.08)' },
}

export default function History() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history/contacts').then(r=>r.json()).then(d=>{ setContacts(d); setLoading(false) }).catch(()=>setLoading(false))
  }, [])

  const sentimentData = useMemo(()=>{
    const c = contacts.reduce((a,c)=>{ a[c.dominant_sentiment]=(a[c.dominant_sentiment]||0)+1; return a },{} as Record<string,number>)
    return Object.entries(c).map(([name,value])=>({name,value}))
  }, [contacts])

  const categoryData = useMemo(()=>{
    const c = contacts.reduce((a,c)=>{ c.categories.forEach(cat=>{ if(cat) a[cat]=(a[cat]||0)+1 }); return a },{} as Record<string,number>)
    return Object.entries(c).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,5)
  }, [contacts])

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <motion.h1 initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Intelligence Hub</motion.h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>Comprehensive analytics and contact relationship history</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#3D81E3] border-t-transparent animate-spin" />
        </div>
      ) : contacts.length===0 ? (
        <div className="glass-card rounded-2xl p-16 text-center max-w-2xl mx-auto">
          <Clock className="w-14 h-14 text-gray-200 mx-auto mb-6" />
          <h3 className="text-xl font-medium" style={{ color: 'var(--t2)' }}>Awaiting Data</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--t3)' }}>Emails processed by your pipeline will generate analytics here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <PieChartIcon className="w-4 h-4 text-[#3D81E3]" />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Sentiment Overview</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={54} outerRadius={74} paddingAngle={4} dataKey="value">
                      {sentimentData.map((e,i)=><Cell key={i} fill={sentimentHex[e.name]||sentimentHex.unknown} />)}
                    </Pie>
                    <RT contentStyle={tipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.08 }} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Top Topics</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left:20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill:'#64748b', fontSize:12 }} />
                    <BT contentStyle={tipStyle} cursor={{ fill:'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--t2)' }}>
            <MessageSquare className="w-4 h-4 text-[#3D81E3]" /> Contact Histories
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {contacts.map((contact, i) => {
              const badge = sentimentBadge[contact.dominant_sentiment]||sentimentBadge.unknown
              return (
                <motion.div key={contact.email} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}>
                  <Link to={`/history/${encodeURIComponent(contact.email)}`} className="block h-full">
                    <div className="glass-card h-full rounded-2xl p-5 transition-all duration-200 group"
                      onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 4px 24px rgba(0,0,0,0.09)'; el.style.borderColor='rgba(61,129,227,0.25)' }}
                      onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; el.style.boxShadow='0 2px 16px rgba(0,0,0,0.05)'; el.style.borderColor='rgba(255,255,255,0.85)' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                            style={{ background:'rgba(0,0,0,0.07)', color: 'var(--t2)' }}>
                            {contact.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[15px] truncate max-w-[180px] sm:max-w-xs" style={{ color: 'var(--t1)' }}>{contact.email}</h3>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{contact.total_conversations} interaction(s)</p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={{ background:badge.bg, color:badge.text, boxShadow:`0 0 0 1px ${badge.ring}` }}>
                          {contact.dominant_sentiment}
                        </span>
                      </div>

                      <div className="mt-4 pt-4" style={{ borderTop:'1px solid var(--divider)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Latest Thread</span>
                          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--t3)' }}>
                            <Clock className="w-3 h-3" />
                            {new Date(contact.latest_timestamp).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium truncate mb-3" style={{ color: 'var(--t2)' }}>{contact.latest_subject}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {contact.categories.slice(0,3).map(cat=>cat&&(
                              <span key={cat} className="px-2 py-0.5 rounded text-[10px]"
                                style={{ background:'rgba(0,0,0,0.05)', color: 'var(--t2)' }}>{cat.replace('_',' ')}</span>
                            ))}
                          </div>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                            style={{ background:'rgba(0,0,0,0.05)' }}>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#3D81E3]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
