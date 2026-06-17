import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { LayoutDashboard, Clock, FileText, Search, MessageSquare, Inbox, Layers, Zap, Sparkles } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/threads', label: 'AI Inbox', icon: Layers },
  { path: '/review', label: 'Review Queue', icon: Inbox },
  { path: '/history', label: 'Email History', icon: Clock },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/rag', label: 'RAG Query', icon: Search },
  { path: '/chat', label: 'Policy Chat', icon: MessageSquare },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-[#0c0c0c] overflow-hidden">
      {/* Fixed background video */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline
          className="w-full h-full object-cover pointer-events-none opacity-20"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-64 flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-purple-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent">
              InvoiceFlow
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">AI Email Engine</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 mt-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg shadow-brand/5'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="liquid-glass rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-positive animate-pulse-dot" />
              <span className="text-xs text-white/60">System Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/40">
              <Sparkles className="w-3 h-3" />
              <span>Auto-send enabled</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
