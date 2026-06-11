import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

export default function Setup() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [geminiKey, setGeminiKey] = useState('')
  const [groqKey,   setGroqKey]   = useState('')
  const [showGem,   setShowGem]   = useState(false)
  const [showGroq,  setShowGroq]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!geminiKey.trim()) { setError('Gemini API key is required'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gemini_key: geminiKey.trim(), groq_key: groqKey.trim() }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Setup failed') }
      navigate('/')
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #dff0ff 0%, #e8f4ff 40%, #f0f9ff 70%, #ecf5ea 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card rounded-3xl p-8 w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#3D81E3,#6366f1)' }}>IF</div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--t1)' }}>One-time setup</h1>
            <p className="text-[13px]" style={{ color: 'var(--t2)' }}>
              Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}! Add your API keys to get started.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Gemini key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
                Google Gemini API Key <span className="text-rose-500">*</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank" rel="noreferrer"
                className="text-[12px] text-[#3D81E3] flex items-center gap-1 hover:underline"
              >
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showGem ? 'text' : 'password'}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full rounded-xl px-4 py-3 pr-10 text-[13px] outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--t1)' }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(61,129,227,0.5)'}
                onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--input-border)'}
              />
              <button type="button" onClick={() => setShowGem(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }}>
                {showGem ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--t3)' }}>
              Free tier covers ~50 emails/day. Used for categorising + writing replies.
            </p>
          </div>

          {/* Groq key (optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
                Groq API Key <span className="text-[11px]" style={{ color: 'var(--t3)' }}>(optional)</span>
              </label>
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                className="text-[12px] text-[#3D81E3] flex items-center gap-1 hover:underline">
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={e => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-xl px-4 py-3 pr-10 text-[13px] outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--t1)' }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(61,129,227,0.5)'}
                onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--input-border)'}
              />
              <button type="button" onClick={() => setShowGroq(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }}>
                {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--t3)' }}>
              Used for the Policy Chat (RAG queries). Free tier is very generous.
            </p>
          </div>

          {error && (
            <div className="text-[13px] text-rose-600 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.18)' }}>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={loading || !geminiKey.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow: '0 4px 16px rgba(61,129,227,0.3)' }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Go to Dashboard</>}
          </motion.button>
        </form>

        {/* Privacy note */}
        <p className="text-[11px] mt-5 text-center leading-relaxed" style={{ color: 'var(--t3)' }}>
          Keys are stored securely on the server and only used to process your emails.
          They are never shared or logged.
        </p>
      </motion.div>
    </div>
  )
}
