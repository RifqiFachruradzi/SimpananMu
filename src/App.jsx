import { lazy, Suspense } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'

const Dashboard = lazy(() => import('./components/Dashboard'))
const TransactionList = lazy(() => import('./components/TransactionList'))
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner'))
const SavingsGoals = lazy(() => import('./components/SavingsGoals'))
const ReportGenerator = lazy(() => import('./components/ReportGenerator'))
const AiBuddy = lazy(() => import('./components/AiBuddy'))

const Loading = () => <div className="py-24 text-center text-gray-500 animate-pulse">Memuat…</div>

const NotFound = () => (
  <div className="py-24 text-center space-y-4">
    <p className="text-6xl">🧭</p>
    <h1 className="text-3xl font-black text-gray-900">Halaman tidak ditemukan</h1>
    <Link to="/" className="inline-block text-fuchsia-600 font-semibold hover:underline">
      Kembali ke Dashboard
    </Link>
  </div>
)

const BuddyButton = () => {
  const { pathname } = useLocation()
  if (pathname === '/assistant') return null
  return (
    <Link
      to="/assistant"
      className="glossy-btn fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full pl-4 pr-5 py-3 font-bold hover:-translate-y-0.5 hover:brightness-110 transition-all print:hidden"
      aria-label="Buka AI Buddy"
    >
      <span className="text-xl">💖</span>
      <span className="hidden sm:inline">Tanya Buddy</span>
    </Link>
  )
}

function App() {
  return (
    <div className="min-h-screen print:bg-white">
      <Header />
      <main className="pb-24">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<TransactionList />} />
            <Route path="/budget" element={<BudgetPlanner />} />
            <Route path="/goals" element={<SavingsGoals />} />
            <Route path="/report" element={<ReportGenerator />} />
            <Route path="/assistant" element={<AiBuddy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <BuddyButton />
    </div>
  )
}

export default App
