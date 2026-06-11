import { motion } from 'motion/react'
import { Zap } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = `${API}/api/auth/login`
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #dff0ff 0%, #e8f4ff 40%, #f0f9ff 70%, #ecf5ea 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card rounded-3xl p-10 w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow: '0 8px 24px rgba(61,129,227,0.35)' }}
          >
            IF
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: 'var(--t1)' }}>
          InvoiceFlow
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--t2)' }}>
          AI-powered email automation for your Gmail inbox
        </p>

        {/* Sign in button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-medium text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(0,0,0,0.12)',
            color: '#1e293b',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          {/* Google logo SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs mt-6 leading-relaxed" style={{ color: 'var(--t3)' }}>
          By signing in you grant InvoiceFlow access to read and reply to emails
          in your Gmail account. Your credentials are never shared.
        </p>

        {/* What it does */}
        <div className="mt-8 pt-6 text-left space-y-3" style={{ borderTop: '1px solid var(--divider)' }}>
          {[
            ['📧', 'Reads unanswered customer emails'],
            ['🤖', 'Drafts AI replies using your documents'],
            ['✅', 'Auto-sends safe replies, queues risky ones'],
            ['📊', 'Tracks everything in a clean dashboard'],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--t2)' }}>
              <span className="text-base">{icon}</span> {text}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
