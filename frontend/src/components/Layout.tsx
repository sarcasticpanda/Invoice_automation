import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  LayoutDashboard, Clock, FileText, Search, MessageSquare,
  Inbox, Layers, BarChart3, Sun, Moon, Menu, X, LogOut,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH !== 'false'

const navItems = [
  { path: '/',          label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/threads',   label: 'AI Inbox',     icon: Layers },
  { path: '/review',    label: 'Review Queue', icon: Inbox },
  { path: '/analytics', label: 'Analytics',    icon: BarChart3 },
  { path: '/history',   label: 'Email History',icon: Clock },
  { path: '/documents', label: 'Documents',    icon: FileText },
  { path: '/rag',       label: 'RAG Query',    icon: Search },
  { path: '/chat',      label: 'Policy Chat',  icon: MessageSquare },
]

export default function Layout() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const dark = theme === 'dark'

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('if-sidebar') === 'collapsed'
  })

  const toggleSidebar = () => setCollapsed(c => {
    const next = !c
    localStorage.setItem('if-sidebar', next ? 'collapsed' : 'open')
    return next
  })

  const sideW = collapsed ? 68 : 220

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>

      {/* ── Animated background ─────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">

        {/* ── Sun / Moon — very blurry, barely visible ────── */}
        {dark ? (
          /* Moon glow — soft silver haze at top-right */
          <div className="absolute rounded-full" style={{
            top: -60, right: '15%', width: 320, height: 320,
            background: 'radial-gradient(circle, rgba(226,232,240,0.12) 0%, rgba(148,163,184,0.06) 45%, transparent 75%)',
            filter: 'blur(55px)',
            opacity: 0.7,
          }} />
        ) : (
          /* Sun glow — warm diffuse bloom at top-right */
          <div className="absolute rounded-full" style={{
            top: -80, right: '12%', width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(253,230,138,0.28) 0%, rgba(251,191,36,0.12) 45%, transparent 72%)',
            filter: 'blur(60px)',
            opacity: 0.7,
          }} />
        )}

        {dark ? (
          /* Dark atmosphere orbs */
          <>
            <div className="orb-a absolute rounded-full" style={{
              top: '5%', left: '-8%', width: 560, height: 560,
              background: 'radial-gradient(circle, rgba(61,129,227,0.16) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }} />
            <div className="orb-b absolute rounded-full" style={{
              top: '40%', right: '-10%', width: 480, height: 480,
              background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
              filter: 'blur(65px)',
            }} />
            <div className="orb-a absolute rounded-full" style={{
              bottom: '-5%', left: '20%', width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }} />
            {/* Stars */}
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(1.5px 1.5px at 15% 25%, white, transparent), radial-gradient(1px 1px at 55% 65%, white, transparent), radial-gradient(1.5px 1.5px at 75% 15%, white, transparent), radial-gradient(1px 1px at 35% 78%, white, transparent), radial-gradient(1px 1px at 88% 50%, white, transparent)', backgroundSize: '400px 400px' }} />
          </>
        ) : (
          /* Light atmosphere orbs */
          <>
            <div className="orb-a absolute rounded-full" style={{
              top: '8%', left: '-10%', width: 580, height: 580,
              background: 'radial-gradient(circle, rgba(96,165,250,0.20) 0%, transparent 70%)',
              filter: 'blur(75px)',
            }} />
            <div className="orb-b absolute rounded-full" style={{
              top: '35%', right: '-12%', width: 520, height: 520,
              background: 'radial-gradient(circle, rgba(167,243,208,0.22) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }} />
            {/* Grass bottom glow — very soft */}
            <div className="absolute bottom-0 left-0 right-0" style={{ height: 200 }}>
              <div style={{
                position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
                width: '120%', height: 220,
                background: 'radial-gradient(ellipse 80% 55% at 50% 100%, rgba(52,211,153,0.14) 0%, rgba(16,185,129,0.06) 60%, transparent 100%)',
                filter: 'blur(30px)',
              }} />
            </div>
          </>
        )}
      </div>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: sideW }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0 flex flex-col overflow-hidden"
        style={{
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: dark ? '2px 0 24px rgba(0,0,0,0.22)' : '2px 0 20px rgba(0,0,0,0.05)',
        }}
      >
        {/* Logo row */}
        <div className="px-3 py-5 flex items-center gap-3 relative">
          {/* Clickable logo → welcome */}
          <button
            onClick={() => navigate('/welcome')}
            title="Back to home"
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-[13px] select-none hover:scale-105 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#3D81E3,#6366f1)', letterSpacing: '-0.02em' }}
          >
            IF
          </button>

          {/* Label — hidden when collapsed */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>InvoiceFlow</div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Email Engine</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hamburger toggle — positioned at far right */}
          <button
            onClick={toggleSidebar}
            className="ml-auto shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 mb-2" style={{ height: 1, background: 'var(--divider)' }} />

        {/* Nav */}
        <nav className="flex-1 px-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              className="group flex items-center rounded-xl text-[13px] font-medium transition-all duration-150 overflow-hidden"
              style={({ isActive }) => ({
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 12,
                background: isActive ? 'rgba(61,129,227,0.13)' : 'transparent',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(61,129,227,0.25)' : 'none',
                color: isActive ? (dark ? '#93c5fd' : '#1d4ed8') : 'var(--t3)',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                if (!el.style.boxShadow.includes('61,129')) {
                  el.style.background = 'var(--hover-bg)'
                  el.style.color = 'var(--t1)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                if (!el.style.boxShadow.includes('61,129')) {
                  el.style.background = 'transparent'
                  el.style.color = 'var(--t3)'
                }
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* User row — only in multi-user mode */}
        {!SKIP_AUTH && user && (
          <div className="px-1.5 mb-1">
            <div className="flex items-center rounded-xl overflow-hidden"
              style={{
                padding: collapsed ? '8px 0' : '8px 10px',
                gap: collapsed ? 0 : 8,
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: 'var(--hover-bg)',
                border: '1px solid var(--divider)',
              }}>
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg,#3D81E3,#6366f1)' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div initial={{ opacity:0, width:0 }} animate={{ opacity:1, width:'auto' }} exit={{ opacity:0, width:0 }}
                    transition={{ duration:0.2 }} className="flex-1 overflow-hidden min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color:'var(--t1)' }}>{user.name}</div>
                    <div className="text-[10px] truncate" style={{ color:'var(--t3)' }}>{user.email}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!collapsed && (
                  <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    onClick={logout} title="Sign out"
                    className="w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors hover:text-rose-500"
                    style={{ color:'var(--t3)' }}>
                    <LogOut className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="px-1.5 py-3 space-y-1.5">
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-full flex items-center rounded-xl transition-all overflow-hidden"
            style={{
              padding: collapsed ? '9px 0' : '9px 10px',
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'var(--hover-bg)',
              border: '1px solid var(--divider)',
            }}
          >
            {dark
              ? <Moon className="w-4 h-4 shrink-0" style={{ color: '#93c5fd' }} />
              : <Sun  className="w-4 h-4 shrink-0 text-amber-500" />
            }
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[12px] overflow-hidden whitespace-nowrap"
                  style={{ color: 'var(--t2)' }}
                >
                  {dark ? 'Dark mode' : 'Light mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Status */}
          <div
            className="w-full flex items-center rounded-xl overflow-hidden"
            style={{
              padding: collapsed ? '8px 0' : '8px 10px',
              gap: collapsed ? 0 : 8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'var(--hover-bg)',
              border: '1px solid var(--divider)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] overflow-hidden whitespace-nowrap"
                  style={{ color: 'var(--t3)' }}
                >
                  System Online
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-y-auto min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="p-8 min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
