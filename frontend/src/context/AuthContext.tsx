import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface UserInfo {
  id: string
  email: string
  name: string
  is_setup: boolean
  has_gemini: boolean
}

interface AuthCtx {
  token: string | null
  user: UserInfo | null
  loading: boolean
  saveToken: (t: string) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({
  token: null, user: null, loading: true,
  saveToken: () => {}, logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]   = useState<string | null>(null)
  const [user,  setUser]    = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const API = import.meta.env.VITE_API_URL || ''

  const fetchMe = async (tok: string) => {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) {
        setUser(await res.json())
      } else {
        // Token rejected — clear it
        localStorage.removeItem('if-token')
        setToken(null)
        setUser(null)
      }
    } catch {
      /* network error — keep token, let user retry */
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('if-token')
    if (saved) {
      setToken(saved)
      fetchMe(saved).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const saveToken = (t: string) => {
    localStorage.setItem('if-token', t)
    setToken(t)
    setLoading(true)
    fetchMe(t).finally(() => setLoading(false))
  }

  const logout = () => {
    localStorage.removeItem('if-token')
    setToken(null)
    setUser(null)
    fetch(`${API}/api/auth/logout`, { method: 'POST' }).catch(() => {})
  }

  return (
    <Ctx.Provider value={{ token, user, loading, saveToken, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
