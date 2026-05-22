import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FileText, Upload, Trash2, Database, Loader2, Eye, X } from 'lucide-react'

interface Document { name: string; size_kb: number }

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<{ name: string; content: string } | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openDoc = async (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext !== 'txt') { window.open(`/api/documents/${encodeURIComponent(name)}/view`, '_blank'); return }
    setViewLoading(true); setViewing({ name, content: '' })
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(name)}/view`)
      const data = await res.json()
      setViewing({ name, content: data.content || '(empty file)' })
    } catch { setViewing({ name, content: 'Failed to load document.' }) }
    setViewLoading(false)
  }

  const loadDocuments = () => fetch('/api/documents').then(r=>r.json()).then(d=>{ setDocuments(d); setLoading(false) }).catch(()=>setLoading(false))
  useEffect(() => { loadDocuments() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const formData = new FormData(); formData.append('file', file)
    try { await fetch('/api/upload', { method:'POST', body:formData }); loadDocuments() } catch {}
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return
    try { await fetch(`/api/documents/${encodeURIComponent(filename)}`, { method:'DELETE' }); loadDocuments() } catch {}
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <motion.h1 initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--t1)' }}>Knowledge Base</motion.h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>Manage documents used by the AI for context</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} accept=".pdf,.txt,.docx" className="hidden" />
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold"
            style={{ background:'linear-gradient(135deg,#3D81E3,#6366f1)', boxShadow:'0 4px 16px rgba(61,129,227,0.3)' }}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload Document'}
          </motion.button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--divider)' }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t2)' }}>
            <Database className="w-4 h-4 text-[#3D81E3]" /> Indexed Documents
          </h3>
          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background:'rgba(0,0,0,0.05)', color: 'var(--t3)' }}>
            {documents.length} files
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="w-7 h-7 rounded-full border-2 border-[#3D81E3] border-t-transparent animate-spin" /></div>
        ) : documents.length===0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--t3)' }}>No documents found. Upload a PDF, TXT, or DOCX to enrich the AI's knowledge.</p>
          </div>
        ) : (
          <div>
            {documents.map((doc,i) => (
              <motion.div key={doc.name} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                className="flex items-center justify-between px-6 py-4 group transition-colors"
                style={{ borderBottom:'1px solid var(--divider)' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.5)'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background:'rgba(61,129,227,0.10)', border:'1px solid rgba(61,129,227,0.18)' }}>
                    <FileText className="w-4 h-4 text-[#3D81E3]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[13px]" style={{ color: 'var(--t1)' }}>{doc.name}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{doc.size_kb.toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>openDoc(doc.name)} title="View"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#3D81E3] transition-colors"
                    style={{ background:'rgba(0,0,0,0.05)' }}><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={()=>handleDelete(doc.name)} title="Delete"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors"
                    style={{ background:'rgba(0,0,0,0.05)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewing && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={()=>setViewing(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background:'rgba(15,23,42,0.5)', backdropFilter:'blur(8px)' }}>
            <motion.div initial={{ scale:0.96, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.96, opacity:0 }}
              onClick={e=>e.stopPropagation()}
              className="w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden rounded-2xl"
              className="light-modal"
              style={{ background:'var(--modal-bg)', border:'1px solid var(--card-border)', backdropFilter:'blur(24px)', boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid rgba(0,0,0,0.07)' }}>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><FileText className="w-4 h-4 text-[#3D81E3]" />{viewing.name}</h3>
                <button onClick={()=>setViewing(null)} className="text-gray-400 hover:text-gray-700 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {viewLoading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#3D81E3] animate-spin" /></div>
                  : <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{viewing.content}</pre>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
