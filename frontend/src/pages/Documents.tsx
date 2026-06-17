import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FileText, Upload, Trash2, Database, Loader2, Eye, X } from 'lucide-react'

interface Document {
  name: string
  size_kb: number
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<{ name: string; content: string } | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openDoc = async (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext !== 'txt') {
      // pdf / docx → let the browser open the raw file in a new tab
      window.open(`/api/documents/${encodeURIComponent(name)}/view`, '_blank')
      return
    }
    setViewLoading(true)
    setViewing({ name, content: '' })
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(name)}/view`)
      const data = await res.json()
      setViewing({ name, content: data.content || '(empty file)' })
    } catch {
      setViewing({ name, content: 'Failed to load document.' })
    } finally {
      setViewLoading(false)
    }
  }

  const loadDocuments = () => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => {
        setDocuments(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadDocuments() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      loadDocuments()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}? This will NOT remove it from the RAG database, only from the local folder.`)) return
    try {
      await fetch(`/api/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      loadDocuments()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Knowledge Base
            </span>
          </motion.h1>
          <p className="text-white/40 text-sm mt-1">Manage documents used by the AI for context</p>
        </div>

        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            accept=".pdf,.txt,.docx" 
            className="hidden" 
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors border border-white/5"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </motion.button>
        </div>
      </div>

      <div className="liquid-glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="font-semibold text-white/80 flex items-center gap-2">
            <Database className="w-4 h-4" /> Indexed Documents
          </h3>
          <span className="text-xs font-medium text-white/40 bg-black/40 px-2.5 py-1 rounded-full">
            {documents.length} files
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No documents found. Upload a PDF, TXT, or DOCX to enrich the AI's knowledge.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {documents.map((doc, i) => (
              <motion.div
                key={doc.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white/90 text-sm">{doc.name}</h4>
                    <p className="text-xs text-white/40 mt-0.5">{doc.size_kb.toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openDoc(doc.name)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-brand hover:bg-brand/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="View file"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.name)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-negative hover:bg-negative/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Document viewer modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewing(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="liquid-glass rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="font-semibold text-white/90 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand" /> {viewing.name}
                </h3>
                <button onClick={() => setViewing(null)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {viewLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
                ) : (
                  <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{viewing.content}</pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
