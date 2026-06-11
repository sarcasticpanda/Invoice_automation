import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard    from './pages/Dashboard'
import History      from './pages/History'
import ContactDetail from './pages/ContactDetail'
import Documents    from './pages/Documents'
import RAGQuery     from './pages/RAGQuery'
import Chat         from './pages/Chat'
import ReviewQueue  from './pages/ReviewQueue'
import Threads      from './pages/Threads'
import ThreadDetail from './pages/ThreadDetail'
import Analytics    from './pages/Analytics'
import Landing      from './pages/Landing'
import Login        from './pages/Login'
import Setup        from './pages/Setup'
import AuthCallback from './pages/AuthCallback'
import './index.css'

// Skip auth in local dev (SKIP_AUTH defaults true on the backend)
const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH !== 'false'

function ProtectedLayout() {
  const { token, user, loading } = useAuth()
  if (SKIP_AUTH) return <Layout />                  // local dev — bypass
  if (loading) return null                           // wait for /api/auth/me
  if (!token) return <Navigate to="/login" replace />
  if (token && user && !user.is_setup) return <Navigate to="/setup" replace />
  return <Layout />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/welcome"         element={<Landing />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/setup"           element={<Setup />} />
            <Route path="/auth/callback"   element={<AuthCallback />} />

            {/* Protected dashboard */}
            <Route element={<ProtectedLayout />}>
              <Route path="/"                         element={<Dashboard />} />
              <Route path="/threads"                  element={<Threads />} />
              <Route path="/threads/:id"              element={<ThreadDetail />} />
              <Route path="/analytics"                element={<Analytics />} />
              <Route path="/review"                   element={<ReviewQueue />} />
              <Route path="/history"                  element={<History />} />
              <Route path="/history/:email"           element={<ContactDetail />} />
              <Route path="/documents"                element={<Documents />} />
              <Route path="/rag"                      element={<RAGQuery />} />
              <Route path="/chat"                     element={<Chat />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
