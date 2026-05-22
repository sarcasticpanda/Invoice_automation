import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { MessageSquarePlus, Loader2, Sparkles, Send, Trash2, FileText } from 'lucide-react'

type Message = { role: string; content: string; sources?: { title: string; snippet: string }[] }
type Session  = { id: string; title: string; last_message?: string | null }

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string|null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const loadSessions = async () => { const r=await fetch('/api/chat/sessions'); const d=await r.json(); setSessions(d.sessions||[]) }
  const openSession = async (id: string) => { setActiveId(id); const r=await fetch(`/api/chat/session/${id}/messages`); const d=await r.json(); setMessages(d.messages||[]) }
  const newChat = () => { setActiveId(null); setMessages([]) }
  const deleteSession = async (id:string, e:React.MouseEvent) => { e.stopPropagation(); await fetch(`/api/chat/session/${id}`,{method:'DELETE'}); if(activeId===id) newChat(); loadSessions() }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const question=input.trim(); if(!question||loading) return
    setInput(''); setMessages(m=>[...m,{role:'user',content:question}]); setLoading(true)
    try {
      const res=await fetch('/api/chat/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,session_id:activeId})})
      if(!res.ok) throw new Error('Request failed')
      const data=await res.json()
      setActiveId(data.session_id); setMessages(m=>[...m,{role:'assistant',content:data.answer,sources:data.sources}]); loadSessions()
    } catch { setMessages(m=>[...m,{role:'assistant',content:'⚠️ Something went wrong. Please try again.'}]) }
    setLoading(false)
  }

  useEffect(()=>{ loadSessions() },[])
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[messages,loading])

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex gap-4">
      {/* Sessions sidebar */}
      <div className="glass-card w-64 shrink-0 rounded-2xl flex flex-col overflow-hidden">
        <button onClick={newChat}
          className="m-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold"
          style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow:'0 4px 14px rgba(61,129,227,0.3)' }}>
          <MessageSquarePlus className="w-4 h-4" /> New chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {sessions.map(s=>(
            <div key={s.id} onClick={()=>openSession(s.id)}
              className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-all"
              style={activeId===s.id?{background:'rgba(61,129,227,0.10)',color:'#1d4ed8'}:{color:'#64748b'}}
              onMouseEnter={e=>{ if(activeId!==s.id)(e.currentTarget as HTMLDivElement).style.background='rgba(0,0,0,0.04)' }}
              onMouseLeave={e=>{ if(activeId!==s.id)(e.currentTarget as HTMLDivElement).style.background='transparent' }}>
              <span className="truncate flex-1">{s.title||'New Conversation'}</span>
              <button onClick={e=>deleteSession(s.id,e)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length===0&&<p className="text-xs text-gray-400 px-3 py-2">No conversations yet</p>}
        </div>
      </div>

      {/* Conversation panel */}
      <div className="glass-card flex-1 rounded-2xl flex flex-col overflow-hidden relative">
        <div className="px-6 py-4" style={{ borderBottom:'1px solid var(--divider)' }}>
          <h1 className="text-base font-semibold" style={{ color: 'var(--t1)' }}>Policy Assistant</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Ask about company policy — answers come from your uploaded documents</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length===0&&!loading&&(
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background:'rgba(61,129,227,0.08)', border:'1px solid rgba(61,129,227,0.15)' }}>
                <Sparkles className="w-7 h-7 text-[#3D81E3]" />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--t2)' }}>How can I help?</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t3)' }}>Ask anything about the company's privacy policy or business documents. I remember the conversation, so you can ask follow-ups.</p>
            </div>
          )}

          {messages.map((m,i)=>m.role==='user'?(
            <div key={i} className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%]"
                style={{ background:'rgba(61,129,227,0.12)', border:'1px solid rgba(61,129,227,0.18)' }}>
                <p className="text-sm" style={{ color: 'var(--t1)' }}>{m.content}</p>
              </div>
            </div>
          ):(
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-sm mt-1"
                style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-6 py-4 max-w-[90%]"
                style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)' }}>
                {m.content.split('\n').map((p,idx)=><p key={idx} className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: 'var(--t2)' }}>{p}</p>)}
                {m.sources&&m.sources.length>0&&(
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop:'1px solid var(--divider)' }}>
                    {m.sources.map((src,idx)=>(
                      <span key={idx} title={src.snippet} className="flex items-center gap-1 text-[10px] rounded-full px-2 py-1"
                        style={{ background:'rgba(0,0,0,0.05)', border:'1px solid rgba(0,0,0,0.07)', color: 'var(--t2)' }}>
                        <FileText className="w-3 h-3" />{src.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading&&<div className="flex items-center gap-3 text-sm" style={{ color: 'var(--t3)' }}><Loader2 className="w-4 h-4 text-[#3D81E3] animate-spin"/>Thinking…</div>}
          <div ref={endRef} />
        </div>

        <div className="p-4" style={{ borderTop:'1px solid var(--divider)' }}>
          <form onSubmit={send} className="flex items-end gap-2">
            <input type="text" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about company policy…" disabled={loading}
              className="flex-1 rounded-xl px-4 py-3.5 text-[13px] placeholder-gray-400 outline-none transition-colors disabled:opacity-50"
              style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)', color: 'var(--t1)' }}
              onFocus={e=>(e.target as HTMLInputElement).style.borderColor='rgba(61,129,227,0.4)'}
              onBlur={e=>(e.target as HTMLInputElement).style.borderColor='var(--input-border)'} />
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} type="submit"
              disabled={loading||!input.trim()}
              className="h-[46px] px-5 rounded-xl text-white font-medium flex items-center justify-center disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow:'0 4px 14px rgba(61,129,227,0.3)' }}>
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}
