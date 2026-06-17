import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import ContactDetail from './pages/ContactDetail'
import Documents from './pages/Documents'
import RAGQuery from './pages/RAGQuery'
import Chat from './pages/Chat'
import ReviewQueue from './pages/ReviewQueue'
import Threads from './pages/Threads'
import ThreadDetail from './pages/ThreadDetail'
import Analytics from './pages/Analytics'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/threads" element={<Threads />} />
          <Route path="/threads/:id" element={<ThreadDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:email" element={<ContactDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/rag" element={<RAGQuery />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
