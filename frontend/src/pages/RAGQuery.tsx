import { useState } from 'react'
import { motion } from 'motion/react'
import { Search, Loader2, Sparkles, Send } from 'lucide-react'

export default function RAGQuery() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ query: string; answer: string } | null>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!query.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/rag-query?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Query failed')
      setResult(await res.json())
    } catch (err: any) { setError(err.message||'An error occurred') }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6">
        <motion.h1 initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Knowledge Query</motion.h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>Test the AI's understanding of your uploaded documents</p>
      </div>

      <div className="glass-card flex-1 rounded-2xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 flex flex-col">
          {!result&&!loading&&!error&&(
            <div className="m-auto text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background:'rgba(61,129,227,0.08)', border:'1px solid rgba(61,129,227,0.15)' }}>
                <Search className="w-7 h-7 text-[#3D81E3]" />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--t2)' }}>Ask anything</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--t3)' }}>The AI will search through your indexed documents and synthesize an answer based exclusively on that context.</p>
            </div>
          )}

          {error&&(
            <div className="m-auto p-4 rounded-xl text-rose-600 text-sm"
              style={{ background:'rgba(185,28,28,0.08)', border:'1px solid rgba(185,28,28,0.18)' }}>{error}</div>
          )}

          {loading&&(
            <div className="m-auto flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-[#3D81E3] animate-spin" />
              <p className="text-sm animate-pulse" style={{ color: 'var(--t3)' }}>Searching knowledge base…</p>
            </div>
          )}

          {result&&!loading&&(
            <div className="space-y-8 max-w-3xl mx-auto w-full">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[80%]"
                  style={{ background:'rgba(61,129,227,0.10)', border:'1px solid rgba(61,129,227,0.18)' }}>
                  <p className="text-sm" style={{ color: 'var(--t1)' }}>{result.query}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-sm mt-1"
                  style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)' }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-6 py-5 max-w-[90%]"
                  style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)' }}>
                  {result.answer.split('\n').map((p,i)=><p key={i} className="leading-relaxed mb-3 last:mb-0 text-sm" style={{ color: 'var(--t2)' }}>{p}</p>)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4" style={{ borderTop:'1px solid var(--divider)' }}>
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex items-end gap-2">
            <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask about your documents…" disabled={loading}
              className="flex-1 rounded-xl px-4 py-3.5 text-[13px] placeholder-gray-400 outline-none transition-colors disabled:opacity-50"
              style={{ background:'var(--input-bg)', border:'1px solid var(--input-border)', color: 'var(--t1)' }}
              onFocus={e=>(e.target as HTMLInputElement).style.borderColor='rgba(61,129,227,0.4)'}
              onBlur={e=>(e.target as HTMLInputElement).style.borderColor='var(--input-border)'} />
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} type="submit"
              disabled={loading||!query.trim()}
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
