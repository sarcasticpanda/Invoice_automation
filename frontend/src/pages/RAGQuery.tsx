import { useState } from 'react'
import { motion } from 'motion/react'
import { Search, Loader2, Sparkles, Send } from 'lucide-react'

export default function RAGQuery() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ query: string; answer: string } | null>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/rag-query?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Query failed')
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Knowledge Query
          </span>
        </motion.h1>
        <p className="text-white/40 text-sm mt-1">Test the AI's understanding of your uploaded documents</p>
      </div>

      <div className="flex-1 liquid-glass rounded-2xl flex flex-col overflow-hidden relative">
        {/* Background decorative element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-8 flex flex-col">
          {!result && !loading && !error && (
            <div className="m-auto text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold text-white/80 mb-2">Ask anything</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                The AI will search through your indexed documents and synthesize an answer based exclusively on that context.
              </p>
            </div>
          )}

          {error && (
            <div className="m-auto p-4 rounded-xl bg-negative/10 border border-negative/20 text-negative text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="m-auto flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
              <p className="text-sm text-white/50 animate-pulse">Searching knowledge base...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-8 max-w-3xl mx-auto w-full">
              {/* Question */}
              <div className="flex items-start gap-4 justify-end">
                <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[80%]">
                  <p className="text-white/90 text-sm">{result.query}</p>
                </div>
              </div>

              {/* Answer */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-lg mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="liquid-glass border-none rounded-2xl rounded-tl-sm px-6 py-5 max-w-[90%]">
                  <div className="prose prose-invert prose-sm max-w-none">
                    {result.answer.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="text-white/80 leading-relaxed mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto flex items-end gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about your documents..."
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all disabled:opacity-50"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !query.trim()}
              className="h-[48px] px-5 rounded-xl bg-gradient-to-r from-brand to-purple-500 text-white font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand/20 transition-all"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}
