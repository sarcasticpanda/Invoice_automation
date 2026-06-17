import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, User, Mail, Sparkles, Tag, Activity } from 'lucide-react'

interface Conversation {
  timestamp: string
  sender_email: string
  sender_subject: string
  incoming_body: string
  category: string
  sentiment: string
  sentiment_confidence: number
  sentiment_summary: string
  generated_reply: string
  status: string
  thread_id: string
}

const sentimentColors: Record<string, string> = {
  positive: 'text-positive',
  neutral: 'text-blue-400',
  negative: 'text-negative',
  urgent: 'text-urgent',
  unknown: 'text-white/50',
}

export default function ContactDetail() {
  const { email } = useParams<{ email: string }>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/history/contact/${encodeURIComponent(email || '')}`)
      .then(r => r.json())
      .then(data => {
        setConversations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [email])

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-lg shadow-brand/20">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{email}</h1>
            <p className="text-white/40 text-sm mt-1">{conversations.length} total interactions</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {conversations.map((conv, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative pl-8 before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-white/10 last:before:bottom-auto last:before:h-full"
            >
              {/* Timeline Dot */}
              <div className="absolute left-0 top-6 w-[30px] h-[30px] rounded-full bg-[#0c0c0c] border border-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-brand" />
              </div>

              <div className="liquid-glass rounded-2xl overflow-hidden">
                {/* Meta Header */}
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-white/90">{new Date(conv.timestamp).toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      conv.status === 'sent' ? 'bg-positive/20 text-positive' : 
                      conv.status === 'draft' ? 'bg-amber-500/20 text-amber-500' : 
                      'bg-white/10 text-white/50'
                    }`}>
                      {conv.status}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-white/60 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <Tag className="w-3 h-3" /> {conv.category.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-white/60 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <Activity className={`w-3 h-3 ${sentimentColors[conv.sentiment] || sentimentColors.unknown}`} /> 
                      <span className="capitalize">{conv.sentiment}</span> 
                      <span className="opacity-50">({Math.round(conv.sentiment_confidence * 100)}%)</span>
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Incoming */}
                  <div>
                    <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Incoming: {conv.sender_subject}
                    </h4>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                      {conv.incoming_body}
                    </div>
                    {conv.sentiment_summary && (
                      <div className="mt-2 text-xs text-white/50 pl-4 border-l-2 border-white/10">
                        <strong>AI Summary:</strong> {conv.sentiment_summary}
                      </div>
                    )}
                  </div>

                  {/* AI Reply */}
                  {conv.generated_reply && (
                    <div>
                      <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-brand" /> Generated Reply
                      </h4>
                      <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                        {conv.generated_reply}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
