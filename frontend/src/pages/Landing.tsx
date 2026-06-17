import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ChevronDown, Menu, X, ArrowUp, Sparkles, Mail, Inbox, CheckCircle2, Clock3,
} from 'lucide-react'

const GRASS = 'https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1781191264/grass_eam204.png'

export default function Landing() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative min-h-[100svh] overflow-hidden bg-cover bg-center flex flex-col"
      style={{ background: 'linear-gradient(180deg,#dff0ff 0%,#eaf4ff 30%,#f4faf2 70%,#e9f5e4 100%)' }}
    >
      {/* Navbar */}
      <nav className="animate-fade-down relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-10 py-4 sm:py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-gray-900">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">InvoiceFlow</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button className="flex items-center gap-1 text-[13px] text-gray-700 hover:text-gray-900">Toolkit <ChevronDown className="w-3.5 h-3.5" /></button>
          <button className="text-[13px] text-gray-700 hover:text-gray-900">Plans</button>
          <button className="text-[13px] text-gray-700 hover:text-gray-900">News</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="bg-gray-900 text-white text-[13px] font-medium px-4 sm:px-5 py-2 rounded-full hover:bg-gray-800 transition-colors">Open Dashboard</button>
          <button onClick={() => setOpen(o => !o)} className="md:hidden w-9 h-9 rounded-full text-gray-900 hover:bg-gray-900/10 flex items-center justify-center">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {open && (
          <div className="absolute left-4 right-4 top-full rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-gray-200 px-5 py-3 animate-fade-up md:hidden">
            {['Toolkit', 'Plans', 'News'].map(l => (
              <div key={l} className="text-[15px] text-gray-700 hover:text-gray-900 border-b border-gray-200 last:border-b-0 py-2.5">{l}</div>
            ))}
          </div>
        )}
      </nav>

      <div className="flex-1 min-h-8 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* Hero content */}
      <div className="relative z-20 text-center px-5 flex flex-col items-center">
        <h1 className="text-gray-900 font-normal leading-[1.05] tracking-tight text-[40px] min-[400px]:text-[44px] sm:text-6xl lg:text-7xl xl:text-[80px]">
          <span className="block animate-fade-up">Answer every email.</span>
          <span className="block animate-fade-up [animation-delay:100ms]">Automatically.</span>
        </h1>

        <form onSubmit={e => { e.preventDefault(); navigate('/chat') }} className="animate-fade-up [animation-delay:220ms] mt-5 sm:mt-6 w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-full bg-white/60 backdrop-blur-md ring-1 ring-gray-200 pl-5 pr-1.5 py-1.5">
            <input className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-500 outline-none py-2" placeholder="Ask your policy docs anything..." />
            <button type="submit" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white hover:scale-105 active:scale-95 transition-transform shrink-0 flex items-center justify-center">
              <ArrowUp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </form>

        <p className="animate-fade-up [animation-delay:340ms] mt-4 sm:mt-5 text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
          AI reads, replies, and routes customer emails — <br />you only touch the ones that need you <Sparkles className="inline w-4 h-4 -mt-1 text-amber-500" />
        </p>

        <div className="animate-fade-up [animation-delay:460ms] mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => navigate('/')} className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-gray-800 hover:shadow-lg transition-all">Open Dashboard</button>
          <button onClick={() => navigate('/threads')} className="text-gray-700 text-sm font-medium px-6 py-2.5 rounded-full ring-1 ring-gray-300 hover:bg-gray-100 transition-colors">See the AI Inbox</button>
        </div>
      </div>

      <div className="flex-1 min-h-10 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* Dashboard mockup */}
      <div className="animate-hero-rise [animation-delay:620ms] relative z-0 w-[92%] sm:w-[84%] lg:w-[72%] max-w-4xl mx-auto shrink-0 -mb-10 sm:-mb-20 lg:-mb-28">
        <div className="rounded-t-2xl overflow-hidden bg-[#1a1a1c] shadow-[0_-20px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 text-left">
          {/* Title bar */}
          <div className="bg-[#242427] border-b border-white/5 px-4 py-2.5 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
            <div className="flex-1 flex justify-center">
              <div className="bg-[#1a1a1c] rounded-md px-6 py-1 text-[10px] text-white/60">invoiceflow.ai</div>
            </div>
          </div>
          {/* Body */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
                <div>
                  <div className="text-sm font-medium text-white">Command Center</div>
                  <div className="text-[10px] text-white/45">AI email automation</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white bg-gradient-to-r from-brand to-purple-500 px-3 py-1.5 rounded-full"><Sparkles className="w-3 h-3" /> Run Once</div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-4 divide-x divide-white/5 rounded-xl bg-white/[0.03] ring-1 ring-white/5 mb-4">
              {[
                { v: '94%', l: 'AUTO-HANDLED', icon: Zap },
                { v: '6', l: 'NEEDS REVIEW', icon: Inbox },
                { v: '128', l: 'RESOLVED', icon: CheckCircle2 },
                { v: '11h', l: 'TIME SAVED', icon: Clock3 },
              ].map(s => (
                <div key={s.l} className="px-4 py-3">
                  <div className="text-xl font-medium text-white">{s.v}</div>
                  <div className="text-[8px] tracking-wider text-white/35 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            {/* Inbox rows */}
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 divide-y divide-white/5">
              {[
                { who: 'priya@acme.com', s: 'Refund on order #4821', st: 'Needs review', c: 'text-[#febc2e]/90' },
                { who: 'sam@nimbus.io', s: 'How do I reset my plan?', st: 'Auto-sent', c: 'text-[#28c840]/80' },
                { who: 'lee@orbit.co', s: 'Pricing for 20 seats?', st: 'Auto-sent', c: 'text-[#28c840]/80' },
              ].map(r => (
                <div key={r.who} className="flex items-center gap-3 px-4 py-2.5">
                  <Mail className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <span className="text-[11px] text-white/70 w-32 truncate">{r.who}</span>
                  <span className="text-[11px] text-white/50 flex-1 truncate">{r.s}</span>
                  <span className={`text-[10px] ${r.c} shrink-0`}>{r.st}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <img src={GRASS} alt="" className="pointer-events-none absolute bottom-0 left-0 z-10 w-full select-none" />
    </div>
  )
}
