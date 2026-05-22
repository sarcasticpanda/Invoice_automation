import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, User, Mail, Sparkles, Tag, Activity } from 'lucide-react'

interface Conversation {
  timestamp: string; sender_email: string; sender_subject: string; incoming_body: string
  category: string; sentiment: string; sentiment_confidence: number; sentiment_summary: string
  generated_reply: string; status: string; thread_id: string
}

const sentimentColors: Record<string,string> = {
  positive:'text-emerald-600', neutral:'text-blue-600', negative:'text-rose-600',
  urgent:'text-amber-600', unknown:'text-gray-400',
}
const statusBadge = (s: string) => {
  if (s==='sent')  return { bg:'rgba(5,150,105,0.10)',  color:'#065f46' }
  if (s==='draft') return { bg:'rgba(180,83,9,0.10)',   color:'#92400e' }
  return               { bg:'rgba(0,0,0,0.06)',        color:'#64748b' }
}

export default function ContactDetail() {
  const { email } = useParams<{ email: string }>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetch(`/api/history/contact/${encodeURIComponent(email||'')}`)
      .then(r=>r.json()).then(d=>{ setConversations(d); setLoading(false) }).catch(()=>setLoading(false))
  },[email])

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm hover:text-gray-800 mb-6 transition-colors" style={{ color: 'var(--t2)' }}>
          <ArrowLeft className="w-4 h-4"/> Back to History
        </Link>
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow:'0 4px 18px rgba(61,129,227,0.3)' }}>
            <User className="w-7 h-7 text-white"/>
          </div>
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>{email}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>{conversations.length} total interactions</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="w-8 h-8 rounded-full border-2 border-[#3D81E3] border-t-transparent animate-spin"/>
        </div>
      ) : (
        <div className="space-y-8">
          {conversations.map((conv,i)=>{
            const sb = statusBadge(conv.status)
            return (
              <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
                className="relative pl-8 before:absolute before:inset-y-0 before:left-[15px] before:w-px last:before:bottom-auto"
                style={{'--tw-before-border':'rgba(0,0,0,0.08)' as any}}>
                <div className="absolute inset-y-0 left-[15px] w-px" style={{background:'rgba(0,0,0,0.08)'}} />
                <div className="absolute left-0 top-6 w-[30px] h-[30px] rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.9)', border:'1px solid rgba(0,0,0,0.12)' }}>
                  <div className="w-2 h-2 rounded-full bg-[#3D81E3]"/>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between" style={{borderBottom:'1px solid var(--divider)',background:'var(--card-header-bg)'}}>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{new Date(conv.timestamp).toLocaleString()}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{background:sb.bg,color:sb.color}}>{conv.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                        style={{background:'rgba(0,0,0,0.05)',border:'1px solid rgba(0,0,0,0.07)', color: 'var(--t2)'}}>
                        <Tag className="w-3 h-3"/>{conv.category.replace('_',' ')}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                        style={{background:'rgba(0,0,0,0.05)',border:'1px solid rgba(0,0,0,0.07)', color: 'var(--t2)'}}>
                        <Activity className={`w-3 h-3 ${sentimentColors[conv.sentiment]||sentimentColors.unknown}`}/>
                        <span className="capitalize">{conv.sentiment}</span>
                        <span style={{ color: 'var(--t3)' }}>({Math.round(conv.sentiment_confidence*100)}%)</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: 'var(--t3)' }}>
                        <Mail className="w-3 h-3"/> Incoming: {conv.sender_subject}
                      </h4>
                      <div className="p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed"
                        style={{background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.06)', color: 'var(--t1)'}}>
                        {conv.incoming_body}
                      </div>
                      {conv.sentiment_summary&&(
                        <div className="mt-2 text-xs pl-4" style={{borderLeft:'2px solid rgba(0,0,0,0.08)', color: 'var(--t3)'}}>
                          <strong style={{ color: 'var(--t2)' }}>AI Summary:</strong> {conv.sentiment_summary}
                        </div>
                      )}
                    </div>

                    {conv.generated_reply&&(
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: 'var(--t3)' }}>
                          <Sparkles className="w-3 h-3 text-[#3D81E3]"/> Generated Reply
                        </h4>
                        <div className="p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed"
                          style={{background:'rgba(61,129,227,0.05)',border:'1px solid rgba(61,129,227,0.15)', color: 'var(--t1)'}}>
                          {conv.generated_reply}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
