import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, X, Loader2, CheckCircle2, Sparkles, Clock } from 'lucide-react'

const fmtTime = (iso: string) => { const d=new Date(iso); return isNaN(d.getTime())?iso:d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) }

type DateFilter = 'all' | 'today' | 'week'

interface Pending {
  timestamp: string; sender_email: string; sender_subject: string; incoming_body: string
  category: string; sentiment: string; generated_reply: string
}

const sentimentBadge: Record<string,{bg:string;text:string}> = {
  positive: { bg:'rgba(5,150,105,0.12)',  text:'#065f46' },
  neutral:  { bg:'rgba(0,0,0,0.06)',      text:'#475569' },
  negative: { bg:'rgba(185,28,28,0.10)',  text:'#991b1b' },
  urgent:   { bg:'rgba(180,83,9,0.12)',   text:'#92400e' },
}

export default function ReviewQueue() {
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string,string>>({})
  const [busy, setBusy] = useState<string|null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [expanded, setExpanded] = useState<Pending|null>(null)

  const filtered = useMemo(()=>{
    if (dateFilter==='all') return items
    const now=Date.now(), cutoff=dateFilter==='today'?86400_000:7*86400_000
    return items.filter(i=>{ const t=new Date(i.timestamp).getTime(); return !isNaN(t)&&now-t<=cutoff })
  },[items,dateFilter])

  const load = () => fetch('/api/review').then(r=>r.json()).then((data:Pending[])=>{
    setItems(data); setEdits(Object.fromEntries(data.map(d=>[d.timestamp,d.generated_reply]))); setLoading(false)
  }).catch(()=>setLoading(false))

  useEffect(()=>{ load() },[])

  const act = async (ts:string, action:'send'|'reject') => {
    setBusy(ts)
    try {
      const res = await fetch(`/api/review/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(action==='send'?{timestamp:ts,reply_text:edits[ts]}:{timestamp:ts})})
      if (!res.ok) { const e=await res.json(); throw new Error(e.detail||'Failed') }
      setItems(prev=>prev.filter(i=>i.timestamp!==ts))
    } catch (err:any) { alert(err.message||'Action failed') }
    setBusy(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Review Queue</motion.h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>Approve, edit, or reject AI-drafted replies before they're sent</p>
        </div>
        <div className="glass-card flex items-center gap-1 p-1 rounded-xl">
          {(['all','today','week'] as DateFilter[]).map(f=>(
            <button key={f} onClick={()=>setDateFilter(f)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all"
              style={dateFilter===f ? { background:'rgba(61,129,227,0.12)',color:'#1d4ed8',boxShadow:'0 0 0 1px rgba(61,129,227,0.25)' } : { color:'#64748b' }}>
              {f==='week'?'Last 7 days':f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-7 h-7 text-[#3D81E3] animate-spin" /></div>
      ) : filtered.length===0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background:'rgba(5,150,105,0.10)', border:'1px solid rgba(5,150,105,0.20)' }}>
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--t2)' }}>{items.length===0?'All clear':'Nothing in this range'}</h3>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>
            {items.length===0?'No replies waiting for review. Run the pipeline in draft mode to queue some.':'No pending replies match this date filter. Try "All".'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {filtered.map((item)=>(
              <motion.div key={item.timestamp} layout initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,scale:0.97,transition:{duration:0.2} }}
                className="glass-card rounded-2xl overflow-hidden">
                {/* Header */}
                <div onClick={()=>setExpanded(item)} className="px-6 py-4 cursor-pointer transition-colors"
                  style={{ borderBottom:'1px solid var(--divider)', background:'var(--card-header-bg)' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='var(--card-header-hover)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='var(--card-header-bg)'}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{item.sender_subject||'(no subject)'}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium"
                        style={{ background:'rgba(61,129,227,0.12)',color:'#1d4ed8',boxShadow:'0 0 0 1px rgba(61,129,227,0.22)' }}>{item.category}</span>
                      {(()=>{ const b=sentimentBadge[item.sentiment]||sentimentBadge.neutral; return(
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium"
                          style={{ background:b.bg,color:b.text }}>{item.sentiment}</span>
                      )})()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--t3)' }}>
                    <span>{item.sender_email}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(item.timestamp)}</span>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--t2)' }}>{item.incoming_body}</p>
                </div>
                {/* Reply editor */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--t2)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-[#3D81E3]" /> AI-drafted reply (editable)
                  </div>
                  <textarea value={edits[item.timestamp]??''} onChange={e=>setEdits(p=>({...p,[item.timestamp]:e.target.value}))}
                    rows={6} className="w-full rounded-xl p-4 text-[13px] leading-relaxed outline-none resize-y transition-colors"
                    style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)', color: 'var(--t1)' }}
                    onFocus={e=>(e.target as HTMLTextAreaElement).style.borderColor='rgba(61,129,227,0.4)'}
                    onBlur={e=>(e.target as HTMLTextAreaElement).style.borderColor='var(--input-border)'} />
                  <div className="flex items-center justify-end gap-3 mt-4">
                    <button onClick={()=>act(item.timestamp,'reject')} disabled={busy===item.timestamp}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm hover:text-rose-600 transition-colors disabled:opacity-40"
                      style={{ border:'1px solid var(--input-border)', color: 'var(--t2)' }}>
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                      onClick={()=>act(item.timestamp,'send')}
                      disabled={busy===item.timestamp||!(edits[item.timestamp]||'').trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                      style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow:'0 4px 14px rgba(61,129,227,0.3)' }}>
                      {busy===item.timestamp?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>} Approve & Send
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {expanded&&(
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={()=>setExpanded(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background:'rgba(15,23,42,0.45)', backdropFilter:'blur(8px)' }}>
            <motion.div initial={{ scale:0.96,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.96,opacity:0 }}
              onClick={e=>e.stopPropagation()}
              className="w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden rounded-2xl"
              className="light-modal"
              style={{ background:'var(--modal-bg)', border:'1px solid var(--card-border)', backdropFilter:'blur(24px)', boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{expanded.sender_subject||'(no subject)'}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{expanded.sender_email} · {fmtTime(expanded.timestamp)}</p>
                </div>
                <button onClick={()=>setExpanded(null)} className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Customer email</div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{expanded.incoming_body}</pre>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#3D81E3]"/>AI-drafted reply</div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed rounded-xl p-4"
                    style={{ background:'rgba(61,129,227,0.05)', border:'1px solid rgba(61,129,227,0.15)' }}>
                    {edits[expanded.timestamp]??expanded.generated_reply}
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
