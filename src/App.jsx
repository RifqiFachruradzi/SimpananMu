import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import ReportGenerator from './components/ReportGenerator'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/report" element={<ReportGenerator />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
