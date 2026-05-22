import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Sparkles, User, Send, X, CheckCircle2, Loader2, FileText } from 'lucide-react'

interface Message {
  id: string; timestamp: string; direction: 'inbound'|'outbound'
  sender: string; body: string; status: string; generated_by: string
  rag_sources?: { title?: string }[]; decision_reason?: string
}
interface Thread {
  thread_id: string; subject: string; customer_email: string; status: string
  priority: string; category: string; sentiment: string; requires_human: boolean
  human_reason: string; messages: Message[]
  latest_entry: { generated_reply?: string; status?: string }
}

const fmt = (iso:string) => { const d=new Date(iso); return isNaN(d.getTime())?iso:d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) }

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [thread, setThread] = useState<Thread|null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<string|null>(null)

  const load = () => {
    fetch(`/api/threads/${encodeURIComponent(id||'')}`)
      .then(r=>{ if(!r.ok) throw new Error('not found'); return r.json() })
      .then((t:Thread)=>{ setThread(t); setDraft(t.latest_entry?.generated_reply||''); setLoading(false) })
      .catch(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[id])

  const act = async (action:'approve'|'reject'|'mark-resolved') => {
    setBusy(action)
    try {
      const res=await fetch(`/api/threads/${encodeURIComponent(id||'')}/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:action==='approve'?JSON.stringify({reply_text:draft}):undefined})
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.detail||'Action failed')}
      navigate('/threads')
    } catch(err:any){alert(err.message||'Failed')}
    setBusy(null)
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-7 h-7 text-[#3D81E3] animate-spin"/></div>
  if (!thread) return (
    <div className="max-w-3xl mx-auto text-center p-20">
      <p className="text-gray-400">Thread not found.</p>
      <Link to="/threads" className="text-[#3D81E3] text-sm mt-3 inline-block">← Back to inbox</Link>
    </div>
  )

  const pending = thread.requires_human||['draft','needs_review'].includes(thread.latest_entry?.status||'')

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <Link to="/threads" className="inline-flex items-center gap-2 text-sm hover:text-gray-800 mb-6 transition-colors" style={{ color: 'var(--t2)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to inbox
      </Link>

      <div className="mb-6">
        <h1 className="text-[24px] font-semibold" style={{ color: 'var(--t1)' }}>{thread.subject||'(no subject)'}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-sm" style={{ color: 'var(--t2)' }}>{thread.customer_email}</span>
          {[thread.status, thread.priority, thread.sentiment].map((tag,i)=>(
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background:'rgba(0,0,0,0.06)', border:'1px solid rgba(0,0,0,0.08)', color: 'var(--t2)' }}>{tag}</span>
          ))}
        </div>
        {thread.requires_human&&thread.human_reason&&<p className="text-xs text-amber-600 mt-2">⚠ Needs review: {thread.human_reason}</p>}
      </div>

      {/* Message timeline */}
      <div className="space-y-4 mb-8">
        {thread.messages.map(m=>(
          <div key={m.id} className={`flex gap-3 ${m.direction==='outbound'?'flex-row-reverse':''}`}>
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${m.direction==='outbound'?'':''}` }
              style={m.direction==='outbound'
                ?{background:'linear-gradient(135deg,#3D81E3,#6366f1)'}
                :{background:'rgba(0,0,0,0.07)'}}>
              {m.direction==='outbound'?<Sparkles className="w-4 h-4 text-white"/>:<User className="w-4 h-4 text-gray-500"/>}
            </div>
            <div className={`glass-card rounded-2xl px-5 py-3.5 max-w-[85%] ${m.direction==='outbound'?'rounded-tr-sm':'rounded-tl-sm'}`}
              style={m.direction==='outbound'
                ?{background:'rgba(61,129,227,0.08)',border:'1px solid rgba(61,129,227,0.15)'}
                :{}}>
              <div className="flex items-center gap-2 mb-1.5 text-[11px]" style={{ color: 'var(--t3)' }}>
                <span>{m.direction==='outbound'?(m.generated_by==='human'?'Human reply':'AI reply'):m.sender}</span>
                <span>· {fmt(m.timestamp)}</span>
                {m.status&&<span className="px-1.5 py-0.5 rounded text-[10px]" style={{background:'rgba(0,0,0,0.05)'}}>{m.status}</span>}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--t1)' }}>{m.body}</p>
              {m.rag_sources&&m.rag_sources.length>0&&(
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{borderTop:'1px solid var(--divider)'}}>
                  {m.rag_sources.map((s,idx)=>(
                    <span key={idx} className="flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                      style={{background:'rgba(0,0,0,0.05)',border:'1px solid rgba(0,0,0,0.07)', color: 'var(--t2)'}}>
                      <FileText className="w-3 h-3"/>{s.title||'source'}
                    </span>
                  ))}
                </div>
              )}
              {m.decision_reason&&<p className="text-[10px] mt-2 italic" style={{ color: 'var(--t3)' }}>{m.decision_reason}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Action panel */}
      {pending ? (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--t2)' }}>
            <Sparkles className="w-3.5 h-3.5 text-[#3D81E3]"/>AI-drafted reply (edit before sending)
          </div>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={6}
            className="w-full rounded-xl p-4 text-[13px] leading-relaxed outline-none resize-y transition-colors"
            style={{background:'var(--input-bg)',border:'1px solid var(--input-border)', color: 'var(--t1)'}}
            onFocus={e=>(e.target as HTMLTextAreaElement).style.borderColor='rgba(61,129,227,0.4)'}
            onBlur={e=>(e.target as HTMLTextAreaElement).style.borderColor='var(--input-border)'} />
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={()=>act('mark-resolved')} disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm hover:text-blue-600 transition-colors disabled:opacity-40"
              style={{border:'1px solid var(--input-border)', color: 'var(--t2)'}}>
              <CheckCircle2 className="w-4 h-4"/>Mark Resolved
            </button>
            <button onClick={()=>act('reject')} disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm hover:text-rose-600 transition-colors disabled:opacity-40"
              style={{border:'1px solid var(--input-border)', color: 'var(--t2)'}}>
              <X className="w-4 h-4"/>Reject
            </button>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>act('approve')}
              disabled={!!busy||!draft.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#3D81E3,#6366f1)',boxShadow:'0 4px 14px rgba(61,129,227,0.3)'}}>
              {busy==='approve'?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>} Approve &amp; Send
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <span className="text-sm flex items-center gap-2" style={{ color: 'var(--t2)' }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-500"/>No action needed — this thread is {thread.status}.
          </span>
          <button onClick={()=>act('mark-resolved')} disabled={!!busy}
            className="text-xs rounded-lg px-3 py-1.5 transition-colors hover:text-blue-600"
            style={{border:'1px solid var(--input-border)', color: 'var(--t2)'}}>Mark Resolved</button>
        </div>
      )}
    </div>
  )
}
