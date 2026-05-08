import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUp, Sparkles, Mail,
  LayoutDashboard, Layers, Inbox,
  BarChart3, FileText, MessageSquare,
  PanelLeft, ChevronLeft, ChevronRight, RotateCw, Share, Plus,
  CheckCircle2, Clock3,
} from 'lucide-react'

const BG_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260611_133301_d5f2a94a-b22e-4e4a-a6b6-eacdddf1f5b0.png&w=1280&q=85'
const GRASS_URL =
  'https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1781191264/grass_eam204.png'

// ── ScaledDashboard ─────────────────────────────────────────────────────────
// Renders children at a fixed DESIGN_W then scales to fit the outer container.
const DESIGN_W = 896

function ScaledDashboard({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!outerRef.current || !innerRef.current) return
    const ro = new ResizeObserver(() => {
      const ow = outerRef.current!.offsetWidth
      const ih = innerRef.current!.offsetHeight
      const s = ow / DESIGN_W
      setScale(s)
      setHeight(ih * s)
    })
    ro.observe(outerRef.current)
    ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={outerRef} style={{ height: height || undefined }}>
      <div
        ref={innerRef}
        style={{ width: DESIGN_W, transformOrigin: 'top left', transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Dashboard Mockup ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Layers, label: 'AI Inbox', badge: '3' },
  { icon: Inbox, label: 'Review Queue', badge: '6' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: FileText, label: 'Documents' },
  { icon: MessageSquare, label: 'Policy Chat' },
]

const STATS = [
  { v: '94%', l: 'AUTO-HANDLED', icon: CheckCircle2 },
  { v: '6',   l: 'NEEDS REVIEW', icon: Inbox },
  { v: '128', l: 'RESOLVED',     icon: CheckCircle2 },
  { v: '11h', l: 'TIME SAVED',   icon: Clock3 },
]

const CATEGORIES = [
  { name: 'Product Enquiries', count: 74, sub: 'Questions answered' },
  { name: 'Complaints',        count: 23, sub: 'Addressed by AI' },
  { name: 'Feedback',          count: 31, sub: 'Filed & logged' },
]

const THREADS = [
  { from: 'priya@acme.com',    subject: 'Refund on order #4821',      pri: 'High', status: 'Needs review', sc: 'text-[#febc2e]/80' },
  { from: 'sam@nimbus.io',     subject: 'How do I reset my plan?',    pri: 'Med',  status: 'Auto-sent',    sc: 'text-[#28c840]/80' },
  { from: 'lee@orbit.co',      subject: 'Pricing for 20 seats?',      pri: 'Med',  status: 'Auto-sent',    sc: 'text-[#28c840]/80' },
  { from: 'jane@startup.io',   subject: 'Where is my invoice PDF?',   pri: 'Low',  status: 'Auto-sent',    sc: 'text-[#28c840]/80' },
  { from: 'tom@clients.net',   subject: 'Cancel subscription please', pri: 'High', status: 'Drafting',     sc: 'text-[#febc2e]/80' },
]

function DashboardMockup() {
  return (
    <div className="rounded-t-2xl overflow-hidden bg-[#1a1a1c] shadow-[0_-20px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 text-left select-none">
      {/* Browser chrome */}
      <div className="bg-[#242427] border-b border-white/5 px-4 py-2.5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-1 flex items-center gap-2 text-white/40">
          <PanelLeft className="w-3.5 h-3.5" />
          <ChevronLeft className="w-3.5 h-3.5 text-white/25" />
          <ChevronRight className="w-3.5 h-3.5 text-white/25" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-[#1a1a1c] rounded-md px-6 py-1 text-[10px] text-white/60">
            invoiceflow.ai
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <RotateCw className="w-3.5 h-3.5" />
          <Share className="w-3.5 h-3.5" />
          <Plus className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* App body */}
      <div className="flex" style={{ minHeight: 420 }}>
        {/* Sidebar — 22% */}
        <div className="border-r border-white/5 bg-[#1e1e21] px-3 py-3.5 flex flex-col gap-3" style={{ width: '22%' }}>
          {/* Logo + grid */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gray-900 flex items-center justify-center text-[7px] font-bold text-white select-none">
                IF
              </div>
              <span className="text-[10px] font-semibold text-white/70">InvoiceFlow</span>
            </div>
          </div>

          {/* Workspace badge */}
          <div className="flex items-center gap-2 py-1">
            <div className="w-4 h-4 rounded bg-[#3D81E3] flex items-center justify-center text-[7px] font-bold text-white">IF</div>
            <span className="text-[10px] text-white/80 font-medium">AI Email Agent</span>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${i === 0 ? 'bg-white/10' : ''}`}
              >
                <item.icon className={`w-3 h-3 ${i === 0 ? 'text-white/80' : 'text-white/40'}`} />
                <span className={`text-[10px] flex-1 ${i === 0 ? 'text-white/80' : 'text-white/50'}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[8px] text-white/40">{item.badge}</span>
                )}
              </div>
            ))}
          </nav>

          {/* Recent threads */}
          <div className="mt-auto">
            <div className="text-[8px] text-white/30 tracking-wider uppercase mb-1.5 px-1">Recent</div>
            {THREADS.slice(0, 3).map(t => (
              <div key={t.from} className="px-1 py-1.5 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#28c840]/70 shrink-0" />
                <span className="text-[9px] text-white/45 truncate">{t.subject}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3D81E3] to-[#6366f1] flex items-center justify-center font-bold text-white text-sm select-none">
                IF
              </div>
              <div>
                <div className="text-sm font-medium text-white">Command Center</div>
                <div className="text-[10px] text-white/45">Smart email automation for every inbox</div>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-[10px] text-white bg-gradient-to-r from-[#3D81E3] to-[#6366f1] px-3 py-1.5 rounded-full">
              <Sparkles className="w-3 h-3" /> Run Pipeline
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 divide-x divide-white/5 rounded-xl bg-white/[0.03] ring-1 ring-white/5">
            {STATS.map(s => (
              <div key={s.l} className="px-4 py-3">
                <div className="text-xl font-medium text-white">{s.v}</div>
                <div className="text-[8px] tracking-wider text-white/35 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map(c => (
              <div key={c.name} className="rounded-lg bg-white/[0.03] ring-1 ring-white/5 p-3">
                <div className="text-[10px] text-white/50 mb-2">{c.name}</div>
                <div className="text-lg font-medium text-white">{c.count}</div>
                <div className="text-[8px] text-white/30 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Inbox table */}
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 overflow-hidden">
            <div className="grid px-4 py-2 border-b border-white/5"
              style={{ gridTemplateColumns: '1fr auto auto' }}>
              <span className="text-[8px] tracking-wider text-white/30 uppercase">Email thread</span>
              <span className="text-[8px] tracking-wider text-white/30 uppercase mr-8">Priority</span>
              <span className="text-[8px] tracking-wider text-white/30 uppercase">Status</span>
            </div>
            {THREADS.map(t => (
              <div
                key={t.from}
                className="grid items-center px-4 py-2.5 border-b border-white/5 last:border-0"
                style={{ gridTemplateColumns: '1fr auto auto' }}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-white/25 shrink-0" />
                  <div>
                    <div className="text-[10px] text-white/70 truncate max-w-[240px]">{t.subject}</div>
                    <div className="text-[9px] text-white/35">{t.from}</div>
                  </div>
                </div>
                <span className="text-[9px] text-white/40 mr-8">{t.pri}</span>
                <span className={`text-[10px] ${t.sc}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Landing Page ─────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()

  return (
    <div
      className="relative min-h-[100svh] overflow-hidden bg-cover bg-center flex flex-col"
      style={{ backgroundImage: `url(${BG_URL})` }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="animate-fade-down relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-10 py-4 sm:py-5 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 text-gray-900">
          <div className="w-6 h-6 rounded-lg bg-gray-900 flex items-center justify-center text-[10px] font-bold text-white tracking-tight select-none">
            IF
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-tight">InvoiceFlow</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
        </div>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-900 text-white text-[13px] font-medium px-4 sm:px-5 py-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            Open Dashboard
          </button>
        </div>

        {/* Mobile drawer */}
      </nav>

      {/* Spacer */}
      <div className="flex-1 min-h-8 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* ── Hero Content ────────────────────────────────────────────────── */}
      <div className="relative z-20 text-center px-5 flex flex-col items-center">
        <h1 className="text-gray-900 font-normal leading-[1.05] tracking-tight text-[40px] min-[400px]:text-[44px] sm:text-6xl lg:text-7xl xl:text-[80px]">
          <span className="block animate-fade-up">Answer every email.</span>
          <span className="block animate-fade-up [animation-delay:100ms]">Automatically.</span>
        </h1>

        {/* Search bar */}
        <form
          onSubmit={e => { e.preventDefault(); navigate('/chat') }}
          className="animate-fade-up [animation-delay:220ms] mt-5 sm:mt-6 w-full max-w-xl"
        >
          <div className="flex items-center gap-3 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-gray-200 pl-5 pr-1.5 py-1.5">
            <input
              className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-500 outline-none py-2"
              placeholder="Ask your policy docs anything..."
            />
            <button
              type="submit"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white hover:scale-105 active:scale-95 transition-transform shrink-0 flex items-center justify-center"
            >
              <ArrowUp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </form>

        {/* Description */}
        <p className="animate-fade-up [animation-delay:340ms] mt-4 sm:mt-5 text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
          AI reads, replies, and routes customer emails —<br />
          you only touch the ones that need you{' '}
          <Sparkles className="inline w-4 h-4 -mt-1 text-amber-500" />
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-up [animation-delay:460ms] mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-gray-800 hover:shadow-lg transition-all"
          >
            Open Dashboard
          </button>
          <button
            onClick={() => navigate('/threads')}
            className="text-gray-700 text-sm font-medium px-6 py-2.5 rounded-full ring-1 ring-gray-300 hover:bg-gray-100 transition-colors"
          >
            See the AI Inbox
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-10 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* ── Dashboard Mockup ─────────────────────────────────────────────── */}
      <div className="animate-hero-rise [animation-delay:620ms] relative z-0 w-[92%] sm:w-[84%] lg:w-[72%] max-w-4xl mx-auto shrink-0 -mb-10 sm:-mb-20 lg:-mb-32">
        <ScaledDashboard>
          <DashboardMockup />
        </ScaledDashboard>
      </div>

      {/* ── Artistic emerald meadow glow ───────────────────────────── */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[7] overflow-hidden" style={{ height: '65%' }}>
        {/* Wide primary sweep — like sunlight hitting the field */}
        <div style={{
          position: 'absolute', bottom: -80, left: '50%', transform: 'translateX(-50%)',
          width: '160%', height: '360px',
          background: 'radial-gradient(ellipse 80% 55% at 50% 100%, rgba(52,211,153,0.30) 0%, rgba(16,185,129,0.13) 55%, transparent 100%)',
        }} />
        {/* Left orb — warm lime glow */}
        <div style={{
          position: 'absolute', bottom: 90, left: '8%',
          width: 320, height: 260,
          background: 'radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        {/* Right orb — cool teal accent */}
        <div style={{
          position: 'absolute', bottom: 60, right: '10%',
          width: 260, height: 210,
          background: 'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)',
          filter: 'blur(42px)',
        }} />
        {/* Centre tight glow just above the ground line */}
        <div style={{
          position: 'absolute', bottom: 0,
          left: '25%', right: '25%', height: 130,
          background: 'radial-gradient(ellipse at 50% 100%, rgba(134,239,172,0.28) 0%, transparent 100%)',
          filter: 'blur(22px)',
        }} />
        {/* Soft vertical fade — blends sky into green */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
          background: 'linear-gradient(to top, rgba(52,211,153,0.10) 0%, transparent 100%)',
        }} />
      </div>

      {/* Grass overlay */}
      <img
        src={GRASS_URL}
        alt=""
        className="pointer-events-none absolute bottom-0 left-0 z-10 w-full select-none"
      />
    </div>
  )
}
