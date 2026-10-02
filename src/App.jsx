import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { BottomNav, TopBar } from './components/Header'

const Dashboard = lazy(() => import('./components/Dashboard'))
const TransactionList = lazy(() => import('./components/TransactionList'))
const BudgetPlanner = lazy(() => import('./components/BudgetPlanner'))
const SavingsGoals = lazy(() => import('./components/SavingsGoals'))
const ReportGenerator = lazy(() => import('./components/ReportGenerator'))
const AiBuddy = lazy(() => import('./components/AiBuddy'))

const Loading = () => <div className="py-24 text-center text-on-surface-variant animate-pulse">Memuat…</div>

const NotFound = () => (
  <div className="py-24 text-center space-y-4">
    <div className="icon-disc w-16 h-16 mx-auto bg-primary-fixed/50 text-primary">
      <Compass size={30} />
    </div>
    <h1 className="text-headline-lg text-on-surface">Halaman tidak ditemukan</h1>
    <Link to="/" className="inline-block text-label-lg text-primary hover:underline">
      Kembali ke Home
    </Link>
  </div>
)

function App() {
  return (
    <div className="min-h-screen print:bg-white">
      <TopBar />
      <main className="pb-32 lg:pb-12">
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
      <BottomNav />
    </div>
  )
}

export default App
