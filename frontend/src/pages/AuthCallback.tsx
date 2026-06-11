/**
 * Landing page after Google OAuth redirect.
 * Reads ?token= and ?next= from the URL, saves the token, redirects.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const navigate  = useNavigate()
  const { saveToken } = useAuth()

  useEffect(() => {
    const p     = new URLSearchParams(window.location.search)
    const token = p.get('token')
    const next  = p.get('next') || '/'
    if (token) {
      saveToken(token)
      navigate(next, { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #dff0ff 0%, #e8f4ff 40%, #f0f9ff 70%, #ecf5ea 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-[#3D81E3] animate-spin" />
        <p className="text-sm" style={{ color: 'var(--t2)' }}>Signing you in…</p>
      </div>
    </div>
  )
}
