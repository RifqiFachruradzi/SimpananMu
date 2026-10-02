import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import Header from './components/Header'

const Dashboard = lazy(() => import('./components/Dashboard'))
const TransactionList = lazy(() => import('./components/TransactionList'))
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner'))
const SavingsGoals = lazy(() => import('./components/SavingsGoals'))
const ReportGenerator = lazy(() => import('./components/ReportGenerator'))

const Loading = () => <div className="py-24 text-center text-gray-500 animate-pulse">Memuat…</div>

const NotFound = () => (
  <div className="py-24 text-center space-y-4">
    <p className="text-6xl">🧭</p>
    <h1 className="text-3xl font-black text-gray-900">Halaman tidak ditemukan</h1>
    <Link to="/" className="inline-block text-indigo-600 font-semibold hover:underline">
      Kembali ke Dashboard
    </Link>
  </div>
)

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 print:bg-white">
      <Header />
      <main>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<TransactionList />} />
            <Route path="/budget" element={<BudgetPlanner />} />
            <Route path="/goals" element={<SavingsGoals />} />
            <Route path="/report" element={<ReportGenerator />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default App
